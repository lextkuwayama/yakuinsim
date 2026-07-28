# 役員報酬最適化シミュレーター

法人の「役員報酬控除前利益」を固定したうえで、月額役員報酬の候補を探索し、**法人＋役員合算の税金・社会保険料負担を最小化**（＝会社内部留保＋役員手取りを最大化）する月額を提示するスタンドアロンツールです。

参考試算用です。最終的な税務判断は税理士等へ確認してください。

---

## 概要

| 項目 | 内容 |
|------|------|
| 目的 | 役員報酬水準のトレードオフ（法人税 vs 個人税・社保）を可視化し、最適月額を提示 |
| UI | Next.js（`http://localhost:3002`） |
| API | FastAPI / Uvicorn（`http://127.0.0.1:8002`） |
| データ | 法定マスタ（CSV→SQLite）＋時点付き参照テーブル（JSON） |

Next.js は `/api/public/tools/*` をバックエンドへ rewrite します。フロントからは同一オリジンの API として呼び出せます。

---

## アーキテクチャ

```
ブラウザ (localhost:3002)
    │
    ▼
Next.js (App Router) ──rewrite──▶ FastAPI (8002)
    │                               │
    │                               ├─ executive_comp_service … 最適化
    │                               ├─ corporate_tax / legal_calc … 法人税・地方税
    │                               ├─ withholding / ref_table … 源泉・控除表
    │                               └─ legal_master (SQLite) … 税率・控除マスタ
    ▼
ExecutiveCompTool + 参照表 UI
```

### 主なディレクトリ

| パス | 役割 |
|------|------|
| `src/app/` | Next.js ルート（実質 `/` のみ） |
| `src/components/` | シミュレーター本体・参照表・パートナーシェル |
| `src/lib/` | API クライアント・表示整形・テーマ |
| `src/config/partner.ts` | パートナー名・Powered by 表示 |
| `backend/main.py` | FastAPI エントリ・公開 GET API |
| `backend/services/` | 最適化・税計算・マスタ解決 |
| `backend/config/` | 法人税率・源泉表・法定マスタ CSV |
| `backend/config/ref_tables/` | 給与所得控除・協会けんぽ・標準報酬など時点付き JSON |
| `start.ps1` / `start.bat` | UI + API 一括起動 |

---

## 起動方法

### 推奨（Windows）

```powershell
.\start.ps1
```

または `start.bat`。初回は次を自動実行します。

1. `npm install`（`node_modules` が無い場合）
2. `backend/.venv` 作成と `requirements.txt` インストール
3. API（8002）と Next.js（3002）を別 PowerShell で起動

### 手動

```powershell
# API
cd backend
.\.venv\Scripts\uvicorn main:app --reload --host 127.0.0.1 --port 8002

# UI（別ターミナル）
npm run dev
```

| スクリプト | 内容 |
|------------|------|
| `npm run dev` | `next dev -p 3002` |
| `npm run build` | 本番ビルド |
| `npm run start` | `next start -p 3002` |
| `npm run lint` | ESLint |

---

## 環境変数

`.env.example` を参考に設定できます。

| 変数 | 既定 | 説明 |
|------|------|------|
| `SIM_OFFICER_API_URL` | `http://localhost:8002` | Next.js rewrite 先 |
| `SIM_OFFICER_CORS_ORIGINS` | `http://localhost:3002` | FastAPI の許可 Origin（カンマ区切り可） |
| `NEXT_PUBLIC_EXEC_COMP_PARTNER_NAME` | （なし） | 画面ヘッダーのパートナー名 |
| `NEXT_PUBLIC_EXEC_COMP_PARTNER_SITE_URL` | （なし） | パートナーサイト URL |
| `NEXT_PUBLIC_EXEC_COMP_POWERED_BY_URL` | `https://taxx.jp` | Powered by リンク |

初回 API 起動時に `backend/storage/legal_master.db` が生成され、`legal_master_seed.csv` から法定マスタが投入されます。

---

## 画面の使い方

トップページ（`/`）がシミュレーター本体です。

### 主な入力

- 役員報酬控除前の会社利益
- 現在の月額役員報酬（比較用）
- 役員年齢
- 事業年度開始日（適用マスタの時点解決に使用）
- 協会けんぽ支部（現状マスタは実質東京中心）
- 探索刻み（例: 10万円）
- 中小法人判定
- 社会保険料を計算に含めるか

### 主な出力

- 最適月額・年額
- 合計手取り（会社内部留保＋役員手取り）
- 合計負担と税目・社保の内訳
- 現設定との差額
- 探索した候補一覧
- 下部の法定参照表（最適値・現報酬の該当行をハイライト）

実装の中心: `src/components/ExecutiveCompTool.tsx`

---

## API

プレフィックス: `/api/public/tools`（すべて GET）

| エンドポイント | 内容 |
|----------------|------|
| `/health` | ヘルスチェック（ルート直下） |
| `/corporate-tax/table` | 法人税率表 |
| `/employment-income/table?as_of=` | 給与所得控除マスタ |
| `/withholding/table?as_of=` | 源泉徴収月額表 |
| `/executive-comp/optimize` | **最適化本体** |
| `/local-tax/tables?as_of=` | 法人住民税・事業税などの参照表 |
| `/association-health/prefectures?as_of=` | 協会けんぽ支部・料率一覧 |
| `/association-health/amount-table` | 標準報酬等級ごとの保険料額表 |

### 最適化 API（`/executive-comp/optimize`）

**必須クエリ**

| パラメータ | 制約 |
|------------|------|
| `pretax_profit` | 0 以上（整数） |
| `fiscal_year_start` | 事業年度開始日 |
| `executive_age` | 18〜99 |

**任意クエリ**

| パラメータ | 既定 | 説明 |
|------------|------|------|
| `small_business` | `true` | 中小法人の軽減税率 |
| `prefecture_code` | `13` | 協会けんぽ支部 |
| `health_rate` | （マスタ） | 健保料率の上書き |
| `monthly_step` | `100000` | 探索刻み（最低 1 万円） |
| `include_social` | `true` | 社保を含めるか |
| `current_monthly` | — | 現報酬との比較 |
| `as_of` | — | マスタ時点の上書き |

**応答の要点**

- `optimal` … 最適候補
- `candidates` … 探索候補
- `current` / `delta` … 現報酬比較
- `assumptions` … 適用料率・年齢判定・注意事項

実装: `backend/main.py` / `backend/services/executive_comp_service.py`

---

## 計算ロジック

### 最適化の考え方

1. 月額 0 円から `floor(利益 / 12)` までを `monthly_step` 刻みで評価
2. 候補が多すぎる場合は刻みを自動で粗くする（表示・計算量の抑制）
3. **合計手取り（`combined_net`）が最大**の候補を最適とする

### 基本式

```
年額報酬           = 月額 × 12
会社課税所得       = floor_1000(利益 − 年額報酬 − 会社負担社保)
合計負担           = 法人関係税 + 本人社保 + 会社社保 + 所得税 + 復興税 + 住民税
会社内部留保       = 利益 − 年額報酬 − 会社社保 − 法人関係税
役員手取り         = 年額報酬 − 本人社保 − 所得税 − 復興税 − 住民税
合計手取り         = 利益 − 合計負担
                 （＝ 会社内部留保 + 役員手取り）
```

### 法人税・地方税

次の合計です（標準前提: 資本金 1,000 万円・従業員 30 人・東京 23 区・標準税率）。

- 法人税（国税）
- 地方法人税
- 法人住民税（法人税割・均等割）
- 法人事業税（所得割）
- 特別法人事業税

中小法人時は年 800 万円以下部分に軽減税率を適用します。画面から資本金・従業員数・所在地は変更できません。

### 個人所得税・住民税

1. 給与収入 − 給与所得控除 → 給与所得
2. 所得税課税所得 = max(0, 給与所得 − 本人社保 − 基礎控除)（1,000 円未満切捨）
3. 所得税は速算表、復興特別所得税は所得税の 2.1%（切捨）
4. 住民税は給与所得から本人社保と基礎控除 43 万円を引いた所得に対する所得割＋均等割等

個人の所得控除は **基礎控除と社会保険料控除のみ** です。

### 社会保険

- 協会けんぽの支部別料率（40〜64 歳は介護込み）
- 厚生年金は原則 70 歳未満、健康保険は原則 75 歳未満
- **標準報酬等級表 × 都道府県料率**で算出し、画面の保険料額表と同じ経路（`calc_association_health_premium`）
- 子ども・子育て支援金・事業主拠出金も含む

---

## 前提・対象外（重要）

計算結果は次の簡易化を前提としています。

- 賞与なし。役員報酬は毎月定額
- 役員は雇用保険・労災の対象外
- 社会保険は協会けんぽ等級表経路（画面の保険料額表と同経路）
- 65 歳以上の介護、75 歳以上の後期高齢者医療は未対応
- 配偶者・扶養・医療費・生命保険・住宅ローン等の所得控除は未考慮
- 外形標準課税（付加価値割・資本割）、事業所税、事業税の翌期損金算入は未対応
- 法人地方税は既定シナリオ「東京23区・資本金1,000万円・従業員30人・標準税率」（入力UI未実装）
- 協会けんぽ料率マスタの登録状況により、都道府県選択は実質東京のみになり得る
- 税率・控除は年次改正があるため、JSON / CSV の更新が必要

画面・API の `assumptions` にも同様の注意が載ります。

---

## 法定マスタの更新

| 種類 | 場所 | 用途 |
|------|------|------|
| 法定マスタ CSV | `backend/config/legal_master_seed.csv` | 所得税ブラケット、基礎控除、年金料率など（SQLite へシード） |
| 参照テーブル JSON | `backend/config/ref_tables/*.json` | 給与所得控除、協会けんぽ、標準報酬上限、法人地方税など |
| 法人税率 | `backend/config/corporate_tax_rate.json` | 法人税 |
| 源泉徴収表 | `backend/config/withholding_monthly_*.json` | 月額表の表示・参照 |

時点（`valid_from` / `valid_to` や `as_of` / `fiscal_year_start`）で有効版を解決します。ハードコードせずマスタから読む設計です。

---

## 技術スタック

- **Frontend**: Next.js 14（App Router）、React 18、TypeScript、Tailwind CSS、lucide-react
- **Backend**: Python、FastAPI、Uvicorn、SQLite（法定マスタ）

---

## 開発メモ

- 本リポジトリは DocuGrid / TAXX 本体から独立したコピーとして完結する構成です（計算ロジック・法定マスタの正本はこのディレクトリ内）。

---

## 公開構成（sozoku.prolext.jp）

争族LPを直下のまま、役員報酬を `/sim-officer/` に載せる手順は
[`sites/sozoku.prolext.jp/README.md`](sites/sozoku.prolext.jp/README.md) を参照。

- 画面（静的）: GitHub Pages（`sites/sozoku.prolext.jp/`）
- 計算 API: Vercel（`*.vercel.app`）
