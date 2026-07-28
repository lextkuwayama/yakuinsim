/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath: "/sim-officer",

  // 静的エクスポートでは rewrites は使えない。
  // ローカル開発で API プロキシが必要な場合は output: "export" をコメントアウトし、
  // SIM_OFFICER_API_URL を使った rewrites に切り替えること。
};

export default nextConfig;
