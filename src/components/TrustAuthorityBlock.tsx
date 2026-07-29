import { ExternalLink } from "lucide-react";
import { COMPANY } from "@/config/seo";

/** 専門家チームの権威性・安心感ブロック（顔写真なしでも機能する構成）。 */
export function TrustAuthorityBlock() {
  return (
    <section
      id="experts"
      className="scroll-mt-16 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-black text-slate-900">専門家チームが無料で個別診断</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {COMPANY.providerLabel} は、{COMPANY.tagline}を行う専門家チームです。
        シミュレーターの結果を出発点に、御社の事業計画・資金繰り・将来設計まで踏まえた役員報酬の決め方をご提案します。
      </p>

      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          {
            title: "税務",
            body: "法人税・所得税・社会保険のバランスを、法令と実務の両面から整理します。",
          },
          {
            title: "不動産・事業承継",
            body: "資産構成や承継の視点も含め、報酬設計の中長期的な影響を確認します。",
          },
          {
            title: "保険・IFA",
            body: "キャッシュフローやリスクヘッジの観点から、無理のない報酬水準を検討します。",
          },
        ].map((item) => (
          <li key={item.title} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-black text-[var(--taxx-green-700)]">{item.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.body}</p>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm leading-relaxed text-slate-600">{COMPANY.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={COMPANY.companyUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-black text-blue-600 hover:text-blue-700"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          会社概要を見る
        </a>
        <span className="text-[11px] text-slate-400">
          ※個別の数値事例はお客様の状況により異なるため、まずは無料相談で現状をお聞かせください。
        </span>
      </div>
    </section>
  );
}
