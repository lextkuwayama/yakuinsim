import type { Metadata } from "next";
import { getPartnerConfig } from "@/config/partner";
import "./globals.css";

const { partnerName } = getPartnerConfig();
const titleSuffix = partnerName ? ` — ${partnerName}` : "";

export const metadata: Metadata = {
  title: `役員報酬 最適化シミュレーター${titleSuffix}`,
  description:
    "会社の利益を固定し、役員報酬を変えたときの法人税・所得税・住民税・社会保険料の合計負担が最小になる月額を試算。法定マスタも同一ページで確認できます。",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
