#!/usr/bin/env python3
"""法定マスタの静的シードをフロント用 JSON として書き出す。

SSG（output: export）でも初期 HTML に税率表などが載るよう、
API と同形のスナップショットを src/data/static-ref-seed.json に生成する。
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
ROOT = BACKEND.parent
OUT = ROOT / "src" / "data" / "static-ref-seed.json"
DEFAULT_AS_OF = "2026-04-01"
DEFAULT_PREF = "13"


def main() -> int:
    sys.path.insert(0, str(BACKEND))
    from services import corporate_tax_service, legal_calc_service, ref_table_service
    from services.withholding_tax_service import (
        get_table as get_withholding_monthly_table,
        list_tables as list_withholding_tables,
        reload_tables as reload_withholding_tables,
    )

    corporate_tax_service.reload_table()
    ref_table_service.reload_ref_tables()
    reload_withholding_tables()

    def public_ref(table_id: str) -> dict:
        table = ref_table_service.get_ref_table(table_id)
        version = ref_table_service.effective_version(table_id, DEFAULT_AS_OF, fallback=True)
        if not table or not version:
            raise RuntimeError(f"missing ref table: {table_id}")
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

    emp_table = ref_table_service.get_ref_table("employment_income_deduction")
    emp_ver = ref_table_service.effective_version(
        "employment_income_deduction", DEFAULT_AS_OF, fallback=True
    )
    if not emp_table or not emp_ver:
        raise RuntimeError("missing employment income table")

    amount = legal_calc_service.build_association_health_amount_table(
        DEFAULT_PREF, as_of=DEFAULT_AS_OF
    )

    seed = {
        "as_of": DEFAULT_AS_OF,
        "prefecture_code": DEFAULT_PREF,
        "corp": corporate_tax_service.get_table(),
        "employment": {
            "label_ja": emp_table.get("label_ja"),
            "source_law": emp_table.get("source_law"),
            "source_url": emp_table.get("source_url"),
            "notes": emp_table.get("notes", []),
            "valid_from": emp_ver.get("valid_from"),
            "valid_to": emp_ver.get("valid_to"),
            "label": emp_ver.get("label"),
            "columns": emp_ver.get("columns", []),
            "rows": emp_ver.get("rows", []),
        },
        "withholding": {
            "tables": list_withholding_tables(),
            "table": get_withholding_monthly_table(DEFAULT_AS_OF, fallback=True),
        },
        "local": {
            "resident_levy": public_ref("corporate_resident_levy"),
            "enterprise": public_ref("corporate_enterprise_tax"),
            "percapita": public_ref("corporate_resident_percapita"),
        },
        "amount": amount,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(seed, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
