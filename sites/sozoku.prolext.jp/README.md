# https://sozoku.prolext.jp/ 公開構成

争族LPは直下のまま、役員報酬シミュレーターを `/sim-officer/` に追加する前提の作業用フォルダです。

## URL マップ

| URL | 中身 | ホスト |
|-----|------|--------|
| `https://sozoku.prolext.jp/` | 争族危険度チェック（このフォルダの `index.html`） | GitHub Pages（現状どおり） |
| `https://sozoku.prolext.jp/sim-officer/` | 役員報酬シミュレーター（静的ビルド成果物） | 同上（`sim-officer/` 配下） |
| `https://xxxx.vercel.app` | 計算 API（FastAPI） | Vercel（独自ドメインなしで可） |

新規サブドメインや DNS 追加は不要です。

## フォルダ構成

```
sites/sozoku.prolext.jp/
  index.html          ← 争族 LP（GitHub Pages ルート）
  sim-officer/        ← 役員報酬フロントの静的書き出し先
  README.md           ← 本手順
```

本番の GitHub Pages リポジトリへは、この中身をそのまま（または同等の配置で）デプロイします。

## やるべきことチェックリスト

### A. GitHub Pages 側（このフォルダ）

1. [ ] 既存の Pages リポジトリのルートに `index.html`（争族）があることを確認
2. [ ] ルートに `sim-officer/` ディレクトリを追加
3. [ ] 下記 B の静的ビルド成果を `sim-officer/` にコピーして push
4. [ ] `https://sozoku.prolext.jp/` が従来どおり表示されること
5. [ ] `https://sozoku.prolext.jp/sim-officer/` が開くこと

### B. 本リポジトリ — フロント静的化

1. [x] Next.js に `basePath: '/sim-officer'` と静的エクスポート（`output: 'export'`）を設定
2. [x] API 呼び出しを `NEXT_PUBLIC_SIM_OFFICER_API_URL` 直呼びに変更
3. [x] `npm run build` の出力を `sites/sozoku.prolext.jp/sim-officer/` へ配置（API: `https://yakuinsim.vercel.app`）

### C. Vercel 側（API だけ）

1. [x] `backend/` を Vercel にデプロイ
2. [x] 環境変数 `SIM_OFFICER_CORS_ORIGINS=https://sozoku.prolext.jp`
3. [x] `/health` が 200 になること
4. [ ] 画面から最適化 API が呼べること（Pages 配置後）

## 注意

- GitHub Pages は静的配信のみ。`/sim-officer/api/...` を同じオリジンで FastAPI に流すことはできません。API は `*.vercel.app` 直呼びが前提です。
- 争族 LP（`index.html`）はこのリポジトリ内の作業用コピーです。本番 Pages リポジトリが別なら、そちらのルート配置を正として同期してください。
- 来月の本格公開（商用）前に Vercel は Pro への移行を検討してください（Hobby は非商用のみ）。
