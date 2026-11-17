/** SEO / FAQ コンテンツ（静的出力でも HTML に載せる）。 */

export const SITE_TITLE =
  "【無料】役員報酬シミュレーター｜税金・社会保険料を最適化して手取りを最大化";

export const SITE_DESCRIPTION =
  "会社の利益を入力するだけで、法人税・所得税・社会保険料の合計負担が最小になる定期同額給与と事前確定届出給与の分配を自動計算する無料シミュレーターです。登録不要ですぐに使えます。";

export const SITE_KEYWORDS = [
  "役員報酬 シミュレーション",
  "役員報酬 最適化",
  "事前確定届出給与 シミュレーション",
  "役員報酬 決め方",
  "役員報酬 手取り 計算",
  "役員報酬 社会保険料",
  "法人税 所得税 バランス",
  "役員報酬 シミュレーター",
  "無料",
];

export const COMPANY = {
  legalName: "株式会社PROLEXT",
  taxFirmName: "PROLEXT税理士法人",
  /** 提供元の表記（会社概要・出典・構造化データ用） */
  providerLabel: "株式会社PROLEXT 及び PROLEXT税理士法人",
  brandName: "PROLEXT",
  tagline: "税務・不動産・保険の総合資産コンサルティング",
  description:
    "地主様・富裕層・企業の複雑な税金対策・事業承継対策を、不動産・保険・IFAの専門家と共にサポートします。",
  companyUrl: "https://prolext.jp/company",
  siteUrl: "https://prolext.jp/",
} as const;

export type FaqItem = { question: string; answer: string };

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "役員報酬はいつ変更できますか？",
    answer:
      "原則として、事業年度開始の日から3か月以内に改定する必要があります（定期同額給与）。期中の自由な増減は損金不算入となるおそれがあります。本シミュレーターは定期同額給与に加え、事前確定届出給与との分配も試算できます。",
  },
  {
    question: "事前確定届出給与（役員賞与）には対応していますか？",
    answer:
      "対応しています。「事前確定届出給与を含めて最適化」をオンにすると、定期同額給与（月額）と事前確定届出給与（年額）の分配を探索し、税・社会保険料の合計負担が小さくなる組合せを提示します。社会保険料は標準賞与額×料率で概算します。届出期限・支給時期の適法性や複数人役員の組み合わせは判定しない簡易試算です。",
  },
  {
    question: "計算結果は税務申告にそのまま使えますか？",
    answer:
      "使えません。公表されている法令・料率をもとにした参考情報であり、税務・社会保険のアドバイスではありません。配偶者控除・扶養・外形標準課税など未反映の項目もあります。最終判断は税理士等の専門家へご確認ください。",
  },
  {
    question: "社会保険料はどう計算していますか？",
    answer:
      "協会けんぽの等級表・都道府県別料率を用いて、健康保険料（介護保険を含む場合あり）と厚生年金保険料を労使合計で試算します。役員は雇用保険・労災の対象外としています。",
  },
  {
    question: "最適な役員報酬とは何を最大化していますか？",
    answer:
      "法人税等・所得税・住民税・社会保険料の合計負担を抑え、会社の内部留保と役員の手取りを合わせた「合計手取り」が大きくなる月額を探索しています。報酬を上げると法人税は下がりやすい一方、個人の税・社保は上がるため、そのバランスを見ます。",
  },
  {
    question: "自分で金額を決めて試算できますか？",
    answer:
      "できます。「自分で金額を決めて試算」モードでは、定期同額給与（月額）と事前確定届出給与（年額）を自由に入力し、その組合せの税・社会保険料・手取りを1点評価できます。自動最適化とは別に、希望額の感度を確認したいときに使えます。",
  },
];

export const SOURCE_LINKS = [
  {
    label: "国税庁 No.5759 役員給与の損金算入時期",
    url: "https://www.nta.go.jp/taxes/shiraberu/taxanswer/hojin/5759.htm",
  },
  {
    label: "国税庁 給与所得控除",
    url: "https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm",
  },
  {
    label: "全国健康保険協会（協会けんぽ）保険料額表",
    url: "https://www.kyoukaikenpo.or.jp/g3/cat330/sb3150/",
  },
] as const;

/** 本番ページの正規URL（パンくず・canonical 用）。 */
export const SITE_CANONICAL_URL = "https://sozoku.prolext.jp/sim-officer/";

export type BreadcrumbItem = { name: string; url: string };

export const BREADCRUMB_ITEMS: BreadcrumbItem[] = [
  { name: "ホーム", url: COMPANY.siteUrl },
  { name: "役員報酬シミュレーター", url: SITE_CANONICAL_URL },
];

export type RelatedLink = {
  title: string;
  description: string;
  url: string;
  /** 同一ドメイン群の内部リンクか、公式の関連ガイドか */
  kind: "internal" | "guide";
};

/** クローラビリティ向上のための関連リンク（コラム追加時はここを差し替え）。 */
export const RELATED_LINKS: RelatedLink[] = [
  {
    title: "相続税シミュレーション",
    description: "同サイト内の相続税試算ツール。事業承継・資産設計の検討にも活用できます。",
    url: "https://sozoku.prolext.jp/",
    kind: "internal",
  },
  {
    title: "PROLEXT 会社概要",
    description: "税務・不動産・保険の専門家チームについて。個別相談の前に会社情報を確認できます。",
    url: COMPANY.companyUrl,
    kind: "internal",
  },
  {
    title: "定期同額給与の注意点（国税庁）",
    description: "役員報酬をいつ改定できるか、損金算入の要件を公式に確認できます。",
    url: "https://www.nta.go.jp/taxes/shiraberu/taxanswer/hojin/5759.htm",
    kind: "guide",
  },
  {
    title: "給与所得控除の仕組み（国税庁）",
    description: "役員報酬の手取り試算に関わる給与所得控除の公式解説です。",
    url: "https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm",
    kind: "guide",
  },
  {
    title: "よくある質問（FAQ）",
    description: "改定時期・賞与対応・社会保険の扱いなど、シミュレーター利用時の疑問をまとめています。",
    url: `${SITE_CANONICAL_URL}#faq`,
    kind: "internal",
  },
];
