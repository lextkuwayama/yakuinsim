import type { Metadata } from "next";
import { getPartnerConfig } from "@/config/partner";
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_TITLE } from "@/config/seo";
import "./globals.css";

const { partnerName } = getPartnerConfig();
const title = partnerName ? `${SITE_TITLE} — ${partnerName}` : SITE_TITLE;

export const metadata: Metadata = {
  title,
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  robots: { index: true, follow: true },
  openGraph: {
    title,
    description: SITE_DESCRIPTION,
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
