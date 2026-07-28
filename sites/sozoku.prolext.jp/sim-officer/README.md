# 役員報酬シミュレーター（静的配置先）

`https://sozoku.prolext.jp/sim-officer/` 向けの静的ビルド成果物です。

- API: `https://yakuinsim.vercel.app`
- 生成元: リポジトリルートで `NEXT_PUBLIC_SIM_OFFICER_API_URL=https://yakuinsim.vercel.app npm run build`
- `.nojekyll` は GitHub Pages が `_next` を無視しないための空ファイル

## 本番 Pages への載せ方

争族の GitHub Pages リポジトリのルートに、この `sim-officer/` フォルダごとコピーして push してください。
