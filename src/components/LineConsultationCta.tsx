import { getPartnerConfig } from "@/config/partner";

type Props = {
  /** 結果表示直後など、文脈に合わせた見出し */
  title?: string;
  description?: string;
  /** 最適月額を埋め込んだ強調表示 */
  highlightYen?: string | null;
  className?: string;
};

/** LINE 相談への CTA（緑ボタン）。 */
export function LineConsultationCta({
  title,
  description,
  highlightYen,
  className = "",
}: Props) {
  const { consultationUrl, consultationLabel } = getPartnerConfig();
  if (!consultationUrl) return null;

  const resolvedTitle =
    title ??
    (highlightYen
      ? `あなたの最適な役員報酬（月額）の目安は ${highlightYen} です`
      : "試算結果を踏まえた個別相談も承っています");

  const resolvedDescription =
    description ??
    (highlightYen
      ? "実際の節税スキームや個別事情を踏まえた確認は、LINE から無料でご相談ください。"
      : "具体的な報酬設計や個別事情を踏まえた確認が必要な場合は、LINE からご相談ください。");

  return (
    <section
      className={`rounded-xl border border-[#B7E4D7] bg-[#F0FFF9] px-4 py-4 text-center shadow-sm ${className}`}
    >
      <p className="text-sm font-black text-[#066B4E]">{resolvedTitle}</p>
      <p className="mt-1 text-xs leading-relaxed text-[#2F6F5C]">{resolvedDescription}</p>
      <a
        href={consultationUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center justify-center rounded-full bg-[#06C755] px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#05B54D]"
      >
        {consultationLabel}
      </a>
    </section>
  );
}
