import { ExternalLink } from "lucide-react";
import { COMPANY, FAQ_ITEMS, SOURCE_LINKS, SITE_DESCRIPTION } from "@/config/seo";
import { getPartnerConfig } from "@/config/partner";

/** 検索エンジン向けの解説テキスト（使い方・背景・FAQ・提供元）。 */
export function SeoContent() {
  return (
    <div className="mt-10 space-y-8 text-slate-700">
      <section id="howto" className="scroll-mt-16 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">シミュレーターの使い方</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          会社の利益と現在の役員報酬を入れるだけで、法人税・所得税・住民税・社会保険料のバランスを見ながら
          「役員報酬の決め方」の目安を無料でシミュレーションできます。
        </p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "会社利益を入力",
              body: "役員報酬控除前の会社利益（年額）を入力します。いまの役員報酬（月額）も入れると比較しやすくなります。",
            },
            {
              step: "2",
              title: "条件を整える",
              body: "事業年度開始日・協会けんぽの都道府県・中小法人区分・社会保険の有無を確認します。",
            },
            {
              step: "3",
              title: "確定して計算",
              body: "「確定して計算」を押すと、合計負担が小さくなる役員報酬の目安と一覧表が表示されます。",
            },
          ].map((item) => (
            <li
              key={item.step}
              className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <p className="text-[11px] font-black text-[var(--taxx-green-700)]">ステップ {item.step}</p>
              <p className="mt-1 text-sm font-black text-slate-900">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="why" className="scroll-mt-16 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">なぜ役員報酬の最適化が必要なのか</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
          <p>
            役員報酬を上げると、会社側では損金が増えて<strong>法人税</strong>の負担が下がりやすくなります。
            一方で、個人側では<strong>所得税・住民税</strong>と<strong>社会保険料</strong>が増え、手取りが減ることもあります。
          </p>
          <p>
            つまり「法人税と所得税のバランス」を見極めないと、会社と役員を合わせた合計の手取りは最大化できません。
            本ツールは、報酬水準を変えながら税と社会保険の合計負担を比較し、役員報酬シミュレーションの出発点を提供します。
          </p>
          <p>
            実際の最適な決め方は、事業計画・資金繰り・将来の退職金・複数役員の有無など個別事情で変わります。
            試算結果は参考情報としてご利用ください。
          </p>
        </div>
      </section>

      <section id="faq" className="scroll-mt-16 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">よくある質問（FAQ）</h2>
        <dl className="mt-4 space-y-4">
          {FAQ_ITEMS.map((item) => (
            <div key={item.question} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
              <dt className="text-sm font-black text-slate-900">Q. {item.question}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-slate-600">A. {item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="company" className="scroll-mt-16 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">会社概要（提供元）</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          本シミュレーターは{" "}
          <a
            href={COMPANY.siteUrl}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-blue-600 hover:text-blue-700"
          >
            {COMPANY.legalName}
          </a>
          {" 及び "}
          <span className="font-bold text-slate-800">{COMPANY.taxFirmName}</span>
          {" "}
          が提供しています。{COMPANY.tagline}を行い、企業の役員報酬設計や資産に関する相談にも対応しています。
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{COMPANY.description}</p>
      </section>

      <section id="about" className="scroll-mt-16 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">出典</h2>
        <ul className="mt-3 space-y-1.5">
          {SOURCE_LINKS.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="h-3 w-3" />
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** FAQ 構造化データ（リッチリザルト用）。 */
export function FaqJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** WebApplication / SoftwareApplication の簡易マークアップ。 */
export function AppJsonLd() {
  const { consultationUrl } = getPartnerConfig();
  const data = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "役員報酬シミュレーター",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "JPY",
    },
    provider: {
      "@type": "Organization",
      name: COMPANY.providerLabel,
      alternateName: [COMPANY.brandName, COMPANY.legalName, COMPANY.taxFirmName],
      url: COMPANY.siteUrl,
      description: COMPANY.description,
      sameAs: [COMPANY.companyUrl],
    },
    description: SITE_DESCRIPTION,
    ...(consultationUrl
      ? { potentialAction: { "@type": "CommunicateAction", target: consultationUrl } }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
