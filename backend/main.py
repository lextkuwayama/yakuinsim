"""役員報酬シミュレーター専用 API（DocuGrid / TAXX 本体から独立）。

公開エンドポイントは本体の /api/public/tools/* と同形。
計算ロジック・法定マスタは本ディレクトリにコピーした正本を使う（二重管理）。
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from services import corporate_tax_service, legal_calc_service, legal_master_service, ref_table_service
from services.executive_comp_service import optimize_executive_comp
from services.withholding_tax_service import (
    get_table as get_withholding_monthly_table,
    list_tables as list_withholding_tables,
    reload_tables as reload_withholding_tables,
)


def _cors_origins() -> list[str]:
    raw = os.getenv(
        "SIM_OFFICER_CORS_ORIGINS",
        "http://localhost:3002,https://sozoku.prolext.jp,https://lextkuwayama.github.io",
    )
    return [o.strip() for o in raw.split(",") if o.strip()]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    legal_master_service.init_legal_master_db()
    yield


app = FastAPI(
    title="Officer Comp Simulator API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/")
@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


PREFIX = "/api/public/tools"


@app.get(f"{PREFIX}/corporate-tax/table")
def public_corporate_tax_table() -> dict[str, Any]:
    corporate_tax_service.reload_table()
    return {"table": corporate_tax_service.get_table()}


@app.get(f"{PREFIX}/employment-income/table")
def public_employment_income_table(
    as_of: Optional[str] = Query(None),
) -> dict[str, Any]:
    ref_table_service.reload_ref_tables()
    table = ref_table_service.get_ref_table("employment_income_deduction")
    # 表示用: 指定時点に厳密一致が無くても最寄りマスタを返す
    version = ref_table_service.effective_version(
        "employment_income_deduction", as_of, fallback=True
    )
    if not table or not version:
        raise HTTPException(status_code=404, detail="給与所得控除マスタが登録されていません")
    return {
        "label_ja": table.get("label_ja"),
        "source_law": table.get("source_law"),
        "source_url": table.get("source_url"),
        "notes": table.get("notes", []),
        "valid_from": version.get("valid_from"),
        "valid_to": version.get("valid_to"),
        "label": version.get("label"),
        "columns": version.get("columns", []),
        "rows": version.get("rows", []),
    }


@app.get(f"{PREFIX}/withholding/table")
def public_withholding_table(as_of: Optional[str] = Query(None)) -> dict[str, Any]:
    reload_withholding_tables()
    # 表示用: 令和8年分しか無くても表を返す（計算は別経路）
    return {
        "tables": list_withholding_tables(),
        "table": get_withholding_monthly_table(as_of, fallback=True),
    }


@app.get(f"{PREFIX}/executive-comp/optimize")
def public_executive_comp_optimize(
    pretax_profit: int = Query(..., ge=0),
    fiscal_year_start: str = Query(...),
    executive_age: int = Query(..., ge=18, le=99),
    small_business: bool = Query(True),
    prefecture_code: str = Query("13"),
    health_rate: Optional[float] = Query(None, gt=0, le=0.3),
    monthly_step: int = Query(100000, ge=10000),
    include_social: bool = Query(True),
    current_monthly: Optional[int] = Query(None, ge=0),
    as_of: Optional[str] = Query(None),
) -> dict[str, Any]:
    try:
        return optimize_executive_comp(
            pretax_profit,
            fiscal_year_start,
            executive_age=executive_age,
            small_business=small_business,
            prefecture_code=prefecture_code,
            health_rate=health_rate,
            monthly_step=monthly_step,
            include_social=include_social,
            current_monthly=current_monthly,
            as_of=as_of,
        )
    except ValueError as exc:
        # 入力不正・マスタ欠損はクライアントエラー（404 は「表が無い」表示用に残す）
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _public_ref_table(table_id: str, as_of: Optional[str]) -> dict[str, Any]:
    table = ref_table_service.get_ref_table(table_id)
    # 表示用エンドポイント: 時点不一致でも最寄りバージョンを返す
    version = ref_table_service.effective_version(table_id, as_of, fallback=True)
    if not table or not version:
        raise HTTPException(status_code=404, detail=f"ref table not found: {table_id}")
    return {
        "id": table.get("id"),
        "label_ja": table.get("label_ja"),
        "source_law": table.get("source_law"),
        "source_url": table.get("source_url"),
        "notes": table.get("notes", []),
        "valid_from": version.get("valid_from"),
        "valid_to": version.get("valid_to"),
        "label": version.get("label"),
        "columns": version.get("columns", []),
        "rows": version.get("rows", []),
    }


@app.get(f"{PREFIX}/local-tax/tables")
def public_local_tax_tables(as_of: Optional[str] = Query(None)) -> dict[str, Any]:
    ref_table_service.reload_ref_tables()
    return {
        "resident_levy": _public_ref_table("corporate_resident_levy", as_of),
        "percapita": _public_ref_table("corporate_resident_percapita", as_of),
        "enterprise": _public_ref_table("corporate_enterprise_tax", as_of),
    }


@app.get(f"{PREFIX}/association-health/prefectures")
def public_association_health_prefectures(as_of: Optional[str] = Query(None)) -> dict[str, Any]:
    ref_table_service.reload_ref_tables()
    version = ref_table_service.effective_version(
        "association_health_rates", as_of, fallback=True
    )
    resolved_as_of = version.get("valid_from") if version else as_of
    return {
        "prefectures": legal_calc_service.list_association_health_prefectures(
            as_of=resolved_as_of
        ),
        "valid_from": version.get("valid_from") if version else None,
        "label": version.get("label") if version else None,
    }


@app.get(f"{PREFIX}/association-health/amount-table")
def public_association_health_amount_table(
    prefecture_code: str = Query("13"),
    as_of: Optional[str] = Query(None),
) -> dict[str, Any]:
    try:
        return legal_calc_service.build_association_health_amount_table(
            prefecture_code, as_of=as_of
        )
    except ValueError:
        # 表示用: 指定時点の料率マスタが無い場合は最新へフォールバック
        try:
            return legal_calc_service.build_association_health_amount_table(
                prefecture_code, as_of=None
            )
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
