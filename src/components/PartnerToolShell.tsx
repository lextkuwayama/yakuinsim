import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { LineConsultationCta, LineFloatingCta } from "@/components/LineConsultationCta";
import { BreadcrumbNav } from "@/components/SeoContent";
import { TrustAuthorityBlock } from "@/components/TrustAuthorityBlock";
import { getPartnerConfig } from "@/config/partner";
import { SOURCE_LINKS } from "@/config/seo";
import { toolsTheme } from "@/lib/theme";

function assetPath(path: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

function SoftDisclaimer() {
  return (
    <div
      className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] leading-relaxed text-slate-600 shadow-sm"
      role="note"
    >
      <p className="text-xs font-black text-slate-800">ご利用にあたって</p>
      <p className="mt-1">
        本シミュレーターは一定の条件に基づく<strong>簡易試算</strong>です。詳細な税務・社会保険料の最適化は、
        専門家による個別相談をご利用ください。
      </p>
    </div>
  );
}

function Disclaimer() {
  return (
    <div className={toolsTheme.notice}>
      <p className="text-xs font-black text-[var(--taxx-green-900)]">免責事項</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-4 text-[11px] leading-relaxed">
        <li>
          本ツールの計算結果は、公表されている法令等をもとにした<strong>参考情報</strong>であり、
          税務・社会保険に関するアドバイスではありません。
        </li>
        <li>
          実際の税額・社会保険料・最適な役員報酬の水準は、個別の会社・役員の状況により異なります。
          結果の正確性・完全性・最新性を保証するものではありません。
        </li>
        <li>
          役員報酬は毎月定額（賞与なし）など、簡易化した前提での試算です。
          配偶者控除・扶養控除・外形標準課税など、すべての特例・控除を反映しているわけではありません。
        </li>
        <li>本ツールの利用により生じた損害について、運営者は一切の責任を負いません。</li>
        <li>最終的な税務判断は、税理士等の専門家にご確認ください。</li>
      </ul>
    </div>
  );
}

/** スタンドアロン用シェル（DocuGrid / TAXX Tools 導線なし、Powered by のみ）。 */
export function PartnerToolShell({
  title,
  subtitle,
  category,
  asOf,
  children,
  maxWidthClass = "max-w-6xl",
}: {
  title: string;
  subtitle?: string;
  category?: string;
  asOf?: string;
  children: ReactNode;
  maxWidthClass?: string;
}) {
  const { partnerName, partnerSiteUrl, poweredByUrl, poweredByLabel, consultationUrl, appVersion } =
    getPartnerConfig();
  const displayName = partnerName ?? "役員報酬シミュレーター";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className={`mx-auto flex ${maxWidthClass} items-center justify-between gap-4 px-4 py-3`}>
          <div className="flex min-w-0 items-center gap-3">
            <a
              href={poweredByUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-2 bg-transparent py-1 transition hover:opacity-80"
              aria-label={`${poweredByLabel} 公式サイトへ`}
            >
              <img
                src={assetPath("/prolext-mark-gold-v2.png")}
                alt=""
                width={36}
                height={40}
                className="h-7 w-auto object-contain sm:h-8"
              />
              <span
                className="text-[15px] font-semibold tracking-[0.04em] text-[#1A1716] sm:text-base"
                style={{ fontFamily: "Georgia, 'Times New Roman', Times, serif" }}
              >
                {poweredByLabel}
              </span>
            </a>
            {partnerSiteUrl ? (
              <a
                href={partnerSiteUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate text-sm font-black text-slate-900 hover:text-blue-700"
              >
                {displayName}
              </a>
            ) : (
              <span className="truncate text-sm font-black text-slate-900">{displayName}</span>
            )}
          </div>
          <span className="hidden text-[10px] font-bold text-slate-400 sm:inline">
            Powered by {poweredByLabel}
          </span>
        </div>
      </header>

      <main className={`mx-auto ${maxWidthClass} px-4 py-8 pb-28 md:pb-8`}>
        <BreadcrumbNav className="mb-4" />
        <header className="mb-6">
          {category ? (
            <span className="mb-2 inline-block rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-black text-slate-600">
              {category}
            </span>
          ) : null}
          <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
            {asOf ? <span>適用時点: {asOf}</span> : null}
            {SOURCE_LINKS.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="h-3 w-3" />
                {s.label}
              </a>
            ))}
          </div>
        </header>

        <SoftDisclaimer />

        {children}

        <div className="mt-8">
          <TrustAuthorityBlock />
        </div>

        <Disclaimer />

        {consultationUrl ? <LineConsultationCta className="mt-6" /> : null}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className={`mx-auto ${maxWidthClass} px-4 py-6 text-center`}>
          <p className="text-[11px] text-slate-400">
            {partnerName ? (
              <>
                {partnerSiteUrl ? (
                  <a href={partnerSiteUrl} className="font-bold text-slate-500 hover:text-slate-700">
                    {partnerName}
                  </a>
                ) : (
                  <span className="font-bold text-slate-500">{partnerName}</span>
                )}
                {" · "}
              </>
            ) : null}
            <a href={poweredByUrl} className="hover:text-slate-600">
              Powered by {poweredByLabel}
            </a>
            {" · "}
            計算結果は参考情報です
            {" · "}
            {appVersion}
          </p>
        </div>
      </footer>

      <LineFloatingCta />
    </div>
  );
}
