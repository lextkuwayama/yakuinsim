#!/usr/bin/env python3
"""法定マスタ（CSV / JSON）の検証とローカル DB 再投入。

使い方（リポジトリルート）:
  .\\update-masters.ps1
  または backend/.venv 有効化後:
  python backend/scripts/update_masters.py

本番反映は git push → Vercel 自動デプロイ（docs/master-data-update.md 参照）。
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
CONFIG = BACKEND / "config"
SEED_CSV = CONFIG / "legal_master_seed.csv"


def _ensure_import_path() -> None:
    if str(BACKEND) not in sys.path:
        sys.path.insert(0, str(BACKEND))


def validate_master_files() -> list[str]:
    """設定ファイルの存在・JSON 構文をチェックする。"""
    errors: list[str] = []

    if not SEED_CSV.is_file():
        errors.append(f"必須 CSV がありません: {SEED_CSV}")
    else:
        try:
            text = SEED_CSV.read_text(encoding="utf-8-sig")
            if not text.strip():
                errors.append(f"CSV が空です: {SEED_CSV}")
        except OSError as exc:
            errors.append(f"CSV を読めません: {SEED_CSV} ({exc})")

    required_json = [
        CONFIG / "corporate_tax_rate.json",
    ]
    for path in required_json:
        if not path.is_file():
            errors.append(f"必須 JSON がありません: {path}")

    ref_dir = CONFIG / "ref_tables"
    if not ref_dir.is_dir():
        errors.append(f"ref_tables ディレクトリがありません: {ref_dir}")

    for path in sorted(CONFIG.rglob("*.json")):
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            errors.append(f"JSON 構文エラー: {path} ({exc})")
        except OSError as exc:
            errors.append(f"JSON を読めません: {path} ({exc})")

    return errors


def reseed_local_db() -> dict:
    _ensure_import_path()
    from services import (
        corporate_tax_service,
        legal_master_service,
        ref_table_service,
        withholding_tax_service,
    )

    result = legal_master_service.seed_from_file(mode="replace")
    legal_master_service.init_legal_master_db()
    ref_table_service.reload_ref_tables()
    withholding_tax_service.reload_tables()
    corporate_tax_service.reload_table()
    summary = legal_master_service.summary()
    return {"seed": result, "summary": summary}


def main() -> int:
    parser = argparse.ArgumentParser(description="法定マスタの検証とローカル DB 再投入")
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="ファイル検証のみ（DB 再投入しない）",
    )
    args = parser.parse_args()

    print("== マスタファイル検証 ==")
    errors = validate_master_files()
    if errors:
        for msg in errors:
            print(f"  [ERROR] {msg}", file=sys.stderr)
        return 1

    json_count = len(list(CONFIG.rglob("*.json")))
    print(f"  OK  CSV: {SEED_CSV.name}")
    print(f"  OK  JSON: {json_count} ファイル")

    if args.check_only:
        print("\n検証のみ完了（--check-only）")
        return 0

    print("\n== ローカル SQLite 再投入 ==")
    try:
        payload = reseed_local_db()
    except Exception as exc:
        print(f"  [ERROR] 再投入に失敗: {exc}", file=sys.stderr)
        return 1

    seed = payload.get("seed") or {}
    summary = payload.get("summary") or {}
    print(f"  投入: {seed.get('imported', '?')} 行 (mode={seed.get('mode', 'replace')})")
    print(f"  DB: {summary.get('db_path', '?')}")
    print(f"  件数: {summary.get('entry_count', '?')} エントリ")

    print("\n== 次のステップ（本番反映） ==")
    print("  1. git add backend/config/")
    print("  2. git commit -m \"Update legal master data\"")
    print("  3. git push origin main  → Vercel が自動デプロイ")
    print("  4. https://yakuinsim.vercel.app/health で確認")
    print("\n詳細: docs/master-data-update.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
