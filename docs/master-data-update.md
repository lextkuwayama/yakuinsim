# 法定マスタの更新手順

役員報酬シミュレーターの税率・控除・参照表は **ファイルで管理** しています。  
Web 上の管理画面は未実装（[機能 C：将来の追加開発](#機能-cweb-管理画面将来)）のため、**CSV / JSON を編集 → コマンド一発で検証 → git push** が現行の運用です。

---

## マスタの種類と置き場所

| 種類 | パス | 形式 |
|------|------|------|
| 法定マスタ（所得税・社保料率など） | `backend/config/legal_master_seed.csv` | CSV |
| 参照表（給与所得控除・協会けんぽ等） | `backend/config/ref_tables/*.json` | JSON |
| 法人税率 | `backend/config/corporate_tax_rate.json` | JSON |
| 源泉徴収月額表 | `backend/config/withholding_monthly_*.json` | JSON |

本番 API（Vercel）はデプロイ時にこれらのファイルを読み込みます。SQLite は起動時に CSV から自動生成されます。

---

## 手順 A：ローカルで更新（推奨・現行運用）

### 1. ファイルを編集

例：令和8年分の給与所得控除を更新する場合

```
backend/config/ref_tables/employment_income_deduction.json
```

例：基礎控除額を CSV で更新する場合

```
backend/config/legal_master_seed.csv
```

### 2. 検証＋ローカル DB 再投入（コマンド一発）

**Windows（PowerShell）**

```powershell
.\update-masters.ps1
```

検証だけ（DB に書き込まない）:

```powershell
.\update-masters.ps1 --check-only
```

静的サイトの初期表示用マスタ（SEO / SSG）も更新する場合:

```powershell
npm run export-ref-seed
```

これで `src/data/static-ref-seed.json` が再生成され、次のフロントビルドで税率表などが HTML 初期出力に含まれます。

**macOS / Linux**

```bash
cd backend
python -m venv .venv   # 初回のみ
source .venv/bin/activate
pip install -r requirements.txt
python scripts/update_masters.py
```

成功すると次のような表示になります。

- CSV / JSON の構文チェック OK
- ローカル `backend/storage/legal_master.db` への再投入
- 本番反映の git 手順の案内

### 3. ローカル API で動作確認

```powershell
.\start.ps1
```

- http://localhost:3002 でシミュレーターを開く
- 「確定して計算」と参照表が期待どおりか確認

### 4. 本番（Vercel）へ反映

```powershell
git add backend/config/
git commit -m "Update legal master data for R8"
git push origin main
```

- [yakuinsim](https://github.com/lextkuwayama/yakuinsim) の `main` に push すると Vercel が自動デプロイ
- 数分後: https://yakuinsim.vercel.app/health
- 画面: https://sozoku.prolext.jp/sim-officer/

フロントの変更が不要なら **API リポジトリ（yakuinsim）の push だけ** で本番マスタは更新されます。

---

## 手順 B：JSON だけ差し替える場合

`legal_master_seed.csv` を触らないときは、該当 JSON を編集してから:

```powershell
.\update-masters.ps1 --check-only   # 構文チェックのみでも可
git add backend/config/ref_tables/（変更ファイル）
git commit -m "Update ref table: ..."
git push origin main
```

Vercel 再デプロイ後、API は新しい JSON をそのまま読み込みます。

---

## よくある更新パターン

| やりたいこと | 編集するファイル |
|--------------|------------------|
| 給与所得控除の改正 | `ref_tables/employment_income_deduction.json` |
| 協会けんぽ料率 | `ref_tables/association_health_rates.json` |
| 所得税速算表・基礎控除 | `legal_master_seed.csv` |
| 法人税率 | `corporate_tax_rate.json` |
| 源泉徴収月額表 | `withholding_monthly_2026.json`（年ごとにファイル追加も可） |

`valid_from` / `valid_to` を正しく設定すると、事業年度（`fiscal_year_start`）に応じた版が自動選択されます。

---

## トラブルシュート

| 症状 | 対処 |
|------|------|
| `update-masters.ps1` で venv エラー | 一度 `.\start.ps1` を実行するか、手動で `backend\.venv` を作成 |
| JSON 構文エラー | `update-masters.ps1` のエラー行を修正（カンマ・引用符） |
| 本番だけ古い値 | Vercel の Deployments で最新デプロイが成功しているか確認 |
| 参照表が空 | `as_of`（事業年度）に該当する `valid_from` の版があるか JSON を確認 |

---

## 機能 C：Web 管理画面（将来）

以下は **未実装** です。外注見積の「追加開発」として検討してください。

| 項目 | 内容 |
|------|------|
| 概要 | ブラウザから CSV をアップロードし、マスタを更新 |
| 想定工数 | 15〜25 人日（認証・監査ログ・バリデーション UI 込み） |
| 技術的課題 | Vercel はファイルシステムが読み取り専用のため、永続化には Blob ストレージや Git 連携 API が必要 |
| 現行代替 | 本ドキュメントの **手順 A**（ローカル編集 + `update-masters.ps1` + git push） |

社内運用であれば、現行の **手順書 + 一発コマンド** で年次改正対応は十分可能です。一般公開後に非エンジニアが更新する必要が出た段階で Web 管理画面を検討するのが現実的です。

---

## 外注見積用メモ（非機能要件）

```
【マスタ更新運用】
- 現行: CSV/JSON 直編集 + update-masters.ps1 + git push
- 将来（機能C）: Web 管理画面から CSV アップロード
- 年次改正時の検証: 代表3パターンで最適化 API と参照表の整合確認
```
