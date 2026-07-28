/** パートナー／スタンドアロン公開用設定（env で上書き）。 */

export type PartnerConfig = {
  partnerName: string | null;
  partnerSiteUrl: string | null;
  poweredByUrl: string;
  poweredByLabel: string;
  consultationUrl: string | null;
  consultationLabel: string;
};

export function getPartnerConfig(): PartnerConfig {
  return {
    partnerName: process.env.NEXT_PUBLIC_EXEC_COMP_PARTNER_NAME?.trim() || null,
    partnerSiteUrl: process.env.NEXT_PUBLIC_EXEC_COMP_PARTNER_SITE_URL?.trim() || null,
    poweredByUrl:
      process.env.NEXT_PUBLIC_EXEC_COMP_POWERED_BY_URL?.trim() || "https://prolext.jp/",
    poweredByLabel:
      process.env.NEXT_PUBLIC_EXEC_COMP_POWERED_BY_LABEL?.trim() || "PROLEXT",
    consultationUrl:
      process.env.NEXT_PUBLIC_EXEC_COMP_CONSULTATION_URL?.trim() ||
      "https://u.prolextol.jp/line/open/RkzL7KSs9y4m?mtid=uqe1XZeM0XEo",
    consultationLabel:
      process.env.NEXT_PUBLIC_EXEC_COMP_CONSULTATION_LABEL?.trim() || "個別試算・相談はこちら",
  };
}
