/** @type {import('next').NextConfig} */

// ローカル開発用: rewrite で API をプロキシ。
// `npm run dev` はこのファイルを使う（package.json の --config 参照）。

const api =
  (process.env.SIM_OFFICER_API_URL || "http://localhost:8002").replace(/\/$/, "");

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/public/tools/:path*",
        destination: `${api}/api/public/tools/:path*`,
      },
    ];
  },
};

export default nextConfig;
