import type { Metadata } from "next";
import Script from "next/script";
import { getPartnerConfig } from "@/config/partner";
import { SITE_CANONICAL_URL, SITE_DESCRIPTION, SITE_KEYWORDS, SITE_TITLE } from "@/config/seo";
import "./globals.css";

const { partnerName } = getPartnerConfig();
const title = partnerName ? `${SITE_TITLE} — ${partnerName}` : SITE_TITLE;
const configuredGtmId =
  process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID?.trim() || "GTM-528TGMTT";
const googleTagManagerId = /^GTM-[A-Z0-9]+$/.test(configuredGtmId)
  ? configuredGtmId
  : null;

export const metadata: Metadata = {
  title,
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  metadataBase: new URL(SITE_CANONICAL_URL),
  alternates: { canonical: SITE_CANONICAL_URL },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png", sizes: "64x64" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  robots: { index: true, follow: true },
  openGraph: {
    title,
    description: SITE_DESCRIPTION,
    url: SITE_CANONICAL_URL,
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
      <body>
        {googleTagManagerId ? (
          <>
            <Script id="google-tag-manager" strategy="afterInteractive">
              {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${googleTagManagerId}');`}
            </Script>
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${googleTagManagerId}`}
                height="0"
                width="0"
                className="hidden"
                title="Google Tag Manager"
              />
            </noscript>
          </>
        ) : null}
        {children}
      </body>
    </html>
  );
}
