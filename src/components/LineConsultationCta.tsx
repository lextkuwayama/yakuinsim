import { getPartnerConfig } from "@/config/partner";

type Props = {
  /** 結果表示直後など、文脈に合わせた見出し */
  title?: string;
  description?: string;
  /** 最適月額を埋め込んだ強調表示 */
  highlightYen?: string | null;
  className?: string;
  /** 結果直後など強調バリエーション */
  variant?: "default" | "result";
};

/** LINE 相談への CTA（緑ボタン）。 */
export function LineConsultationCta({
  title,
  description,
  highlightYen,
  className = "",
  variant = "default",
}: Props) {
  const { consultationUrl, consultationLabel } = getPartnerConfig();
  if (!consultationUrl) return null;

  const isResult = variant === "result" || Boolean(highlightYen);

  const resolvedTitle =
    title ??
    (highlightYen
      ? `目安の役員報酬（月額）は ${highlightYen}`
      : "自社に合った最適な役員報酬を無料診断");

  const resolvedDescription =
    description ??
    (isResult
      ? "この結果は一定条件に基づく簡易版です。自社の実情に合わせた正確な最適額を知りたい方は、専門家が無料で個別診断します。"
      : "シミュレーションだけでは判断しきれない個別事情も、税務・不動産・保険の専門家チームが無料で整理します。");

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

/** スマホ下部に固定する LINE 相談バナー。 */
export function LineFloatingCta() {
  const { consultationUrl, consultationLabel } = getPartnerConfig();
  if (!consultationUrl) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <a
        href={consultationUrl}
        target="_blank"
        rel="noreferrer"
        className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-full bg-[#06C755] px-4 py-3.5 text-sm font-black text-white shadow-[0_8px_24px_rgba(6,199,85,0.35)]"
      >
        <span>プロに無料相談（LINE）</span>
        <span className="sr-only">{consultationLabel}</span>
      </a>
    </div>
  );
}
