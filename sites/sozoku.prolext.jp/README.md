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

### B. 本リポジトリ（sim-officer-comp）— フロント静的化（未実装なら次作業）

1. [ ] Next.js に `basePath: '/sim-officer'` と静的エクスポート（`output: 'export'`）を設定
2. [ ] API 呼び出しを rewrite 依存から外し、`NEXT_PUBLIC_SIM_OFFICER_API_URL`（例: `https://xxxx.vercel.app`）直呼びに変更
3. [ ] `npm run build` の出力を `sites/sozoku.prolext.jp/sim-officer/` へ配置

### C. Vercel 側（API だけ）

1. [ ] `backend/` を Vercel にデプロイ（Hobby で社内検証可）
2. [ ] 環境変数 `SIM_OFFICER_CORS_ORIGINS=https://sozoku.prolext.jp`
3. [ ] `/health` が 200 になること
4. [ ] 画面から最適化 API が呼べること

## 注意

- GitHub Pages は静的配信のみ。`/sim-officer/api/...` を同じオリジンで FastAPI に流すことはできません。API は `*.vercel.app` 直呼びが前提です。
- 争族 LP（`index.html`）はこのリポジトリ内の作業用コピーです。本番 Pages リポジトリが別なら、そちらのルート配置を正として同期してください。
- 来月の本格公開（商用）前に Vercel は Pro への移行を検討してください（Hobby は非商用のみ）。
