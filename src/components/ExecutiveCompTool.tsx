"use client";

import { useEffect, type ReactNode } from "react";
import type { ExecCompCandidate } from "@/lib/tools-api";
import { PartnerToolShell } from "@/components/PartnerToolShell";
import {
  ExecutiveCompReferenceTables,
  ExecutiveCompSectionNav,
} from "@/components/ExecutiveCompReferenceTables";
import { LineConsultationCta } from "@/components/LineConsultationCta";
import { SeoContent } from "@/components/SeoContent";
import {
  BONUS_PAYMENT_OPTIONS,
  BONUS_STEP_OPTIONS,
  STEP_OPTIONS,
  useExecutiveCompSimulation,
} from "@/components/useExecutiveCompSimulation";
import {
  Field,
  ManYenInput,
  ManYenSlider,
  NumInput,
  ResultCard,
  manYen,
  yen,
} from "@/components/ui";
import { toolsTheme } from "@/lib/theme";

function signedYen(n: number): string {
  if (n === 0) return yen(0);
  const abs = yen(Math.abs(n));
  return n > 0 ? `+${abs}` : `−${abs}`;
}

const selectCls = `rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm ${toolsTheme.focusInput}`;

function Section({
  step,
  title,
  aside,
  children,
}: {
  step: number;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--taxx-green-600)] text-[11px] text-white">
            {step}
          </span>
          {title}
        </h3>
        {aside}
      </div>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}

type CompareRow = {
  label: string;
  now: number;
  next: number;
  /** 増えると良い項目は up、減ると良い項目は down、良し悪しのない項目は neutral */
  better: "up" | "down" | "neutral";
  strong?: boolean;
};

function CurrentComparison({
  current,
  focus,
  includeBonus,
}: {
  current: ExecCompCandidate;
  focus: ExecCompCandidate;
  includeBonus: boolean;
}) {
  const gain = focus.combined_net - current.combined_net;
  const burdenCut = current.total_burden - focus.total_burden;
  const groups: { title: string; rows: CompareRow[] }[] = [
    {
      title: "役員報酬",
      rows: [
        { label: "毎月の役員報酬", now: current.monthly_salary, next: focus.monthly_salary, better: "neutral" },
        ...(includeBonus
          ? [
              {
                label: "役員賞与（年間）",
                now: current.annual_bonus ?? 0,
                next: focus.annual_bonus ?? 0,
                better: "neutral" as const,
              },
            ]
          : []),
        { label: "年間の報酬合計", now: current.annual_salary, next: focus.annual_salary, better: "neutral" },
      ],
    },
    {
      title: "税金と社会保険料",
      rows: [
        { label: "法人の税金", now: current.corporate_tax, next: focus.corporate_tax, better: "down" },
        {
          label: "所得税",
          now: current.income_tax + current.reconstruction_tax,
          next: focus.income_tax + focus.reconstruction_tax,
          better: "down",
        },
        { label: "住民税", now: current.resident_tax, next: focus.resident_tax, better: "down" },
        { label: "社会保険料（会社＋本人）", now: current.total_social, next: focus.total_social, better: "down" },
        { label: "合計", now: current.total_burden, next: focus.total_burden, better: "down", strong: true },
      ],
    },
    {
      title: "手取り",
      rows: [
        { label: "会社に残るお金", now: current.company_retained, next: focus.company_retained, better: "up" },
        { label: "役員の手取り", now: current.executive_take_home, next: focus.executive_take_home, better: "up" },
        { label: "会社と役員の手取り合計", now: current.combined_net, next: focus.combined_net, better: "up", strong: true },
      ],
    },
  ];

  const diffCls = (row: CompareRow) => {
    const d = row.next - row.now;
    if (d === 0 || row.better === "neutral") return "text-slate-600";
    const good = row.better === "up" ? d > 0 : d < 0;
    return good ? "text-[var(--taxx-green-700)]" : "text-red-600";
  };

  return (
    <div className={toolsTheme.currentPanel}>
      <h4 className={toolsTheme.currentPanelTitle}>いまの金額と比べると</h4>
      <div className="mt-2 rounded-lg bg-white px-4 py-3 ring-1 ring-[var(--taxx-green-200)]">
        {gain > 0 ? (
          <>
            <p className="text-sm font-bold text-slate-800">
              おすすめの金額にすると、会社と役員の手取り合計が
              <span className="mx-1 text-xl font-black text-[var(--taxx-green-700)]">
                年 {manYen(gain)}
              </span>
              増える見込みです。
            </p>
            {burdenCut > 0 ? (
              <p className="mt-0.5 text-[11px] text-slate-500">
                税金と社会保険料の合計が {yen(burdenCut)} 減るためです。
              </p>
            ) : null}
          </>
        ) : gain === 0 ? (
          <p className="text-sm font-bold text-slate-800">いまの金額がおすすめと同じです。</p>
        ) : (
          <p className="text-sm font-bold text-slate-800">
            いまの金額の方が手取り合計が {yen(-gain)} 多くなっています（探す間隔の範囲内での比較です）。
          </p>
        )}
      </div>

      <div className="mt-3 overflow-auto rounded-lg bg-white ring-1 ring-slate-200">
        <table className="min-w-full border-collapse text-right text-xs tabular-nums text-slate-700">
          <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">項目（年間）</th>
              <th className="px-3 py-2">いま</th>
              <th className="px-3 py-2">おすすめ</th>
              <th className="px-3 py-2">おすすめにすると</th>
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g.title}>
              <tr>
                <th
                  colSpan={4}
                  className="border-t border-slate-200 bg-slate-50/60 px-3 py-1 text-left text-[10px] font-black text-slate-400"
                >
                  {g.title}
                </th>
              </tr>
              {g.rows.map((r) => {
                const d = r.next - r.now;
                return (
                  <tr key={r.label} className={r.strong ? "bg-[var(--taxx-green-50)]/60 font-black" : ""}>
                    <td className="border-t border-slate-100 px-3 py-1.5 text-left">{r.label}</td>
                    <td className="border-t border-slate-100 px-3 py-1.5 text-slate-500">{yen(r.now)}</td>
                    <td className="border-t border-slate-100 px-3 py-1.5 font-bold text-slate-900">
                      {yen(r.next)}
                    </td>
                    <td className={`border-t border-slate-100 px-3 py-1.5 font-bold ${diffCls(r)}`}>
                      {d === 0 ? "変わらず" : signedYen(d)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
      <p className="mt-2 text-[10px] text-slate-500">
        緑は手取りが増える・負担が減る変化、赤はその逆です。
      </p>
    </div>
  );
}

export function ExecutiveCompTool() {
  const sim = useExecutiveCompSimulation();

  useEffect(() => {
    if (!sim.result || sim.dirty || sim.mode !== "optimize") return;
    const row = sim.optimalRowRef.current ?? sim.currentRowRef.current;
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [sim.result, sim.dirty, sim.mode, sim.optimalRowRef, sim.currentRowRef]);

  const isManual = sim.mode === "manual";
  const shellProps = {
    title: "役員報酬 最適化シミュレーター",
    subtitle:
      "会社の利益から、税金と社会保険料の負担が少なくなる役員報酬・役員賞与（事前確定届出給与）の組み合わせを試算できます。金額を自分で決めて計算することもできます。",
    category: "法人税・所得税・社保",
    asOf: sim.result?.as_of ?? undefined,
    maxWidthClass: "max-w-6xl" as const,
  };

  const { result, dirty, current, compareCurrent, includeBonus, focus } = sim;
  const showBonus = isManual || includeBonus;
  const trialAnnualTotal = sim.trialMonthly * 12 + sim.trialBonus;
  const trialOverProfit = trialAnnualTotal > sim.profit;
  const roundUpTo = (n: number, unit: number) => Math.ceil(n / unit) * unit;
  const trialMonthlyMax = Math.max(1_000_000, roundUpTo(sim.profit / 12, 500_000));
  const trialBonusMax = Math.max(5_000_000, roundUpTo(sim.profit, 5_000_000));

  const isSameCandidate = (
    a: { monthly_salary: number; annual_bonus?: number },
    b: { monthly_salary: number; annual_bonus?: number },
  ) =>
    a.monthly_salary === b.monthly_salary &&
    (a.annual_bonus ?? 0) === (b.annual_bonus ?? 0);

  const update = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    sim.markDirty();
  };

  return (
    <PartnerToolShell {...shellProps}>
      <ExecutiveCompSectionNav />

      <div id="sim" className="scroll-mt-16 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          {(
            [
              {
                key: "optimize",
                title: "おすすめの金額を探す",
                desc: "会社の利益から、手取りが多くなる金額を自動で探します",
              },
              {
                key: "manual",
                title: "金額を自分で決めて計算する",
                desc: "毎月の報酬と賞与を入れて、税金・手取りを確認します",
              },
            ] as const
          ).map((m) => {
            const active = sim.mode === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => sim.changeMode(m.key)}
                aria-pressed={active}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-[var(--taxx-green-500)] bg-[var(--taxx-green-50)] ring-2 ring-[var(--taxx-green-200)]"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div
                  className={`text-sm font-black ${
                    active ? "text-[var(--taxx-green-800)]" : "text-slate-700"
                  }`}
                >
                  {m.title}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">{m.desc}</div>
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          <Section step={1} title="会社と役員について">
            <Field
              label="会社の利益（年間）"
              htmlFor="profit"
              hint="役員報酬を払う前の利益です"
            >
              <ManYenInput
                id="profit"
                value={sim.profit}
                onValueChange={update(sim.setProfit)}
                className="w-44"
              />
            </Field>
            <Field label="役員の年齢" htmlFor="executive-age" hint="社会保険の対象判定に使います">
              <div className="flex items-center gap-1">
                <NumInput
                  id="executive-age"
                  value={sim.executiveAge}
                  min={18}
                  onValueChange={(n) => {
                    sim.setExecutiveAge(Math.min(99, n));
                    sim.markDirty();
                  }}
                  className={`w-20 rounded-lg border border-slate-300 bg-white px-3 py-2 text-right text-sm font-bold shadow-sm ${toolsTheme.focusInput}`}
                />
                <span className="text-xs font-bold text-slate-500">歳</span>
              </div>
            </Field>
            <Field label="都道府県（協会けんぽ）" htmlFor="pref" hint="健康保険料率が変わります">
              <select
                id="pref"
                value={sim.prefCode}
                onChange={(e) => update(sim.setPrefCode)(e.target.value)}
                className={selectCls}
              >
                {sim.prefectures.map((p) => (
                  <option key={p.prefecture_code} value={p.prefecture_code}>
                    {p.prefecture}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="事業年度の開始日" htmlFor="fy" hint="適用する税率・料率の時点です">
              <input
                id="fy"
                type="date"
                value={sim.fyStart}
                onChange={(e) => update(sim.setFyStart)(e.target.value)}
                className={selectCls}
              />
            </Field>
          </Section>

          {isManual ? (
            <Section
              step={2}
              title="役員報酬の金額"
              aside={
                <span className="text-[11px] text-slate-500">
                  スライダーを動かすと結果がすぐ変わります
                </span>
              }
            >
              <div className="grid w-full gap-3 md:grid-cols-2">
                <ManYenSlider
                  id="trial-monthly"
                  label="毎月の役員報酬"
                  hint="定期同額給与（毎月同じ額）・1万円単位"
                  value={sim.trialMonthly}
                  onValueChange={update(sim.setTrialMonthly)}
                  max={trialMonthlyMax}
                  step={10_000}
                />
                <ManYenSlider
                  id="trial-bonus"
                  label="役員賞与（年間の合計）"
                  hint="事前確定届出給与・10万円単位。賞与なしなら 0"
                  value={sim.trialBonus}
                  onValueChange={update(sim.setTrialBonus)}
                  max={trialBonusMax}
                  step={100_000}
                />
              </div>
              {sim.trialBonus > 0 ? (
                <Field label="賞与の支給回数" htmlFor="bonus-payments" hint="年間合計を均等に分けます">
                  <select
                    id="bonus-payments"
                    value={sim.bonusPaymentCount}
                    onChange={(e) => update(sim.setBonusPaymentCount)(Number(e.target.value))}
                    className={selectCls}
                  >
                    {BONUS_PAYMENT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <div className="self-center rounded-lg bg-white px-4 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
                年間の報酬合計
                <span className="ml-2 text-base font-black tabular-nums text-slate-900">
                  {manYen(trialAnnualTotal)}
                </span>
                <div className="text-[10px] text-slate-400">
                  {manYen(sim.trialMonthly)} × 12か月
                  {sim.trialBonus > 0 ? ` ＋ 賞与 ${manYen(sim.trialBonus)}` : ""}
                </div>
                {trialOverProfit ? (
                  <div className="mt-1 text-[10px] font-bold text-amber-700">
                    会社の利益を超えています（会社は赤字の計算になります）
                  </div>
                ) : null}
              </div>
            </Section>
          ) : (
            <>
              <Section step={2} title="探し方">
                <label className="flex items-center gap-2 self-center text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={sim.includeBonus}
                    onChange={(e) => update(sim.setIncludeBonus)(e.target.checked)}
                    className="h-4 w-4"
                  />
                  役員賞与（事前確定届出給与）も組み合わせて探す
                </label>
                {includeBonus ? (
                  <Field label="賞与の支給回数" htmlFor="bonus-payments">
                    <select
                      id="bonus-payments"
                      value={sim.bonusPaymentCount}
                      onChange={(e) => update(sim.setBonusPaymentCount)(Number(e.target.value))}
                      className={selectCls}
                    >
                      {BONUS_PAYMENT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}
              </Section>

              <Section
                step={3}
                title="いまの役員報酬（比較用）"
                aside={
                  <label className={`flex items-center gap-2 ${toolsTheme.currentLabel}`}>
                    <input
                      type="checkbox"
                      checked={sim.compareCurrent}
                      onChange={(e) => update(sim.setCompareCurrent)(e.target.checked)}
                      className="h-4 w-4"
                    />
                    いまの金額と比べる
                  </label>
                }
              >
                {compareCurrent ? (
                  <>
                    <Field label="毎月の役員報酬" htmlFor="current">
                      <ManYenInput
                        id="current"
                        value={sim.currentMonthly}
                        onValueChange={update(sim.setCurrentMonthly)}
                        tone="current"
                      />
                    </Field>
                    {includeBonus ? (
                      <Field label="役員賞与（年間の合計）" htmlFor="current-bonus" hint="なしなら 0">
                        <ManYenInput
                          id="current-bonus"
                          value={sim.currentBonus}
                          onValueChange={update(sim.setCurrentBonus)}
                          tone="current"
                        />
                      </Field>
                    ) : null}
                  </>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    チェックを入れると、いまの金額とおすすめの差額を表示します。
                  </p>
                )}
              </Section>
            </>
          )}

          <details className="rounded-xl border border-slate-200 px-4 py-3">
            <summary className="cursor-pointer text-xs font-black text-slate-600">
              詳しい設定（通常は変更不要）
            </summary>
            <div className="mt-3 flex flex-wrap items-start gap-4">
              <label className="flex items-center gap-2 self-center text-xs font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={sim.smallBusiness}
                  onChange={(e) => update(sim.setSmallBusiness)(e.target.checked)}
                  className="h-4 w-4"
                />
                中小法人（資本金1億円以下）
              </label>
              <label className="flex items-center gap-2 self-center text-xs font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={sim.includeSocial}
                  onChange={(e) => update(sim.setIncludeSocial)(e.target.checked)}
                  className="h-4 w-4"
                />
                社会保険料を含めて計算する
              </label>
              {!isManual ? (
                <>
                  <Field label="毎月の報酬を探す間隔" htmlFor="step">
                    <select
                      id="step"
                      value={sim.monthlyStep}
                      onChange={(e) => update(sim.setMonthlyStep)(Number(e.target.value))}
                      className={selectCls}
                    >
                      {STEP_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {includeBonus ? (
                    <Field label="賞与を探す間隔" htmlFor="bonus-step">
                      <select
                        id="bonus-step"
                        value={sim.bonusStep}
                        onChange={(e) => update(sim.setBonusStep)(Number(e.target.value))}
                        className={selectCls}
                      >
                        {BONUS_STEP_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : null}
                </>
              ) : null}
            </div>
          </details>
        </div>
        {sim.prefError ? (
          <p className="mt-2 text-[11px] font-bold text-amber-700">{sim.prefError}</p>
        ) : null}

        {isManual ? null : (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={sim.runCalculate}
              disabled={sim.loading}
              className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sim.loading ? "計算中…" : "おすすめの金額を探す"}
            </button>
            {dirty && result ? (
              <span className={toolsTheme.dirtyHint}>入力が変わりました。もう一度押すと再計算します。</span>
            ) : null}
          </div>
        )}

        <div
          className={`transition-opacity ${
            isManual && (sim.loading || dirty) && focus ? "opacity-60" : ""
          }`}
        >
          <ResultCard
            tone="taxx"
            metrics={
              focus
                ? [
                    {
                      label: isManual ? "毎月の役員報酬" : "おすすめの毎月の役員報酬",
                      value: yen(focus.monthly_salary),
                      sub: `年間 ${manYen(focus.monthly_annual ?? focus.monthly_salary * 12)}`,
                    },
                    ...(showBonus
                      ? [
                          {
                            label: isManual ? "役員賞与（年間）" : "おすすめの役員賞与（年間）",
                            value: yen(focus.annual_bonus ?? 0),
                            sub: `報酬合計 ${manYen(focus.annual_salary)}`,
                          },
                        ]
                      : []),
                    {
                      label: "会社と役員の手取り合計",
                      value: yen(focus.combined_net),
                      sub:
                        !isManual && sim.savingsVsZero && sim.savingsVsZero > 0
                          ? `報酬なしより +${manYen(sim.savingsVsZero)}`
                          : `会社に残る ${manYen(focus.company_retained)} ／ 役員の手取り ${manYen(focus.executive_take_home)}`,
                    },
                    {
                      label: "税金と社会保険料の合計",
                      value: yen(focus.total_burden),
                    },
                  ]
                : null
            }
            placeholder={
              sim.error
                ? `エラー: ${sim.error}`
                : sim.loading
                  ? "計算中…"
                  : isManual
                    ? "金額を入れると、ここに結果が出ます。"
                    : dirty && result
                      ? "入力が変わりました。ボタンを押すと再計算します。"
                      : "会社の利益を入れて「おすすめの金額を探す」を押すと、ここに結果が出ます。"
            }
            breakdown={
              focus ? (
                <div className="space-y-0.5 text-xs text-slate-500">
                  <div>法人の税金 {yen(focus.corporate_tax)}</div>
                  <div>
                    所得税 {yen(focus.income_tax + focus.reconstruction_tax)} ／ 住民税{" "}
                    {yen(focus.resident_tax)}
                  </div>
                  <div>
                    社会保険料（会社＋本人） {yen(focus.total_social)}
                    {result?.assumptions.care_applicable ? "（介護保険を含む）" : ""}
                    {showBonus && (focus.annual_bonus ?? 0) > 0
                      ? `／うち賞与分 ${yen(
                          (focus.employee_social_bonus ?? 0) + (focus.employer_social_bonus ?? 0),
                        )}`
                      : ""}
                  </div>
                </div>
              ) : null
            }
          />

          {!isManual && compareCurrent && current && focus && !dirty ? (
            <CurrentComparison current={current} focus={focus} includeBonus={includeBonus} />
          ) : null}

          {!isManual &&
          result &&
          !dirty &&
          includeBonus &&
          result.optimal &&
          result.optimal.monthly_salary === 0 &&
          (result.optimal.annual_bonus ?? 0) > 0 ? (
            <p className="mt-2 text-[11px] font-bold text-amber-700">
              計算上は「毎月の報酬0円＋賞与のみ」が有利になりました。賞与の社会保険料に上限があるためですが、生活費や社会保険の加入、税務上のリスクも踏まえて税理士等にご相談ください。
            </p>
          ) : null}
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            {isManual
              ? "入力した金額の組み合わせで計算します。スライダーや入力欄で金額を変えると、すぐに再計算します。"
              : includeBonus
                ? "毎月の役員報酬と役員賞与の組み合わせを探します。"
                : "毎月の役員報酬だけ（賞与なし）で探します。"}
            賞与の社会保険料は「標準賞与額×料率」で概算し、健康保険は年間573万円、厚生年金は1回150万円が上限です。事前確定届出給与の届出期限・支給時期の要件は判定していません。
          </p>

          {focus && (isManual || !dirty) ? (
            <LineConsultationCta
              className="mt-4"
              variant="result"
              highlightYen={yen(focus.monthly_salary)}
            />
          ) : null}
        </div>
      </div>

      {!isManual && result && !dirty && result.optimal ? (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-black text-slate-700">
            金額ごとの比較（濃い緑＝おすすめ
            {compareCurrent ? "／薄い緑＝いまの金額" : ""}）
          </h3>
          <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full border-collapse text-right text-[11px] text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500">
                <tr>
                  <th className="border-b border-slate-200 px-3 py-2 text-left">毎月の報酬</th>
                  {includeBonus ? (
                    <th className="border-b border-slate-200 px-3 py-2">賞与（年間）</th>
                  ) : null}
                  <th className="border-b border-slate-200 px-3 py-2">年間の報酬合計</th>
                  <th className="border-b border-slate-200 px-3 py-2">法人の税金</th>
                  <th className="border-b border-slate-200 px-3 py-2">所得税</th>
                  <th className="border-b border-slate-200 px-3 py-2">住民税</th>
                  <th className="border-b border-slate-200 px-3 py-2">社会保険料</th>
                  <th className="border-b border-slate-200 px-3 py-2">税・社保の合計</th>
                  <th className="border-b border-slate-200 px-3 py-2">手取り合計</th>
                </tr>
              </thead>
              <tbody>
                {result.candidates.map((c: ExecCompCandidate) => {
                  const isOptimal = isSameCandidate(c, result.optimal!);
                  const isCurrent = !!current && isSameCandidate(c, current) && !isOptimal;
                  const isBoth = !!current && isSameCandidate(c, current) && isOptimal;
                  return (
                    <tr
                      key={`${c.monthly_salary}-${c.annual_bonus ?? 0}`}
                      ref={
                        isCurrent || isBoth
                          ? sim.currentRowRef
                          : isOptimal
                            ? sim.optimalRowRef
                            : undefined
                      }
                      className={
                        isBoth || isOptimal
                          ? toolsTheme.optimalRow
                          : isCurrent
                            ? toolsTheme.currentRow
                            : "odd:bg-slate-50/50"
                      }
                    >
                      <td className="border-b border-slate-100 px-3 py-2 text-left tabular-nums">
                        {yen(c.monthly_salary)}
                        {isOptimal || isBoth ? (
                          <span className={toolsTheme.optimalBadge}>おすすめ</span>
                        ) : null}
                        {isCurrent || isBoth ? (
                          <span className={toolsTheme.currentBadge}>いま</span>
                        ) : null}
                      </td>
                      {includeBonus ? (
                        <td className="border-b border-slate-100 px-3 py-2 tabular-nums">
                          {yen(c.annual_bonus ?? 0)}
                        </td>
                      ) : null}
                      <td className="border-b border-slate-100 px-3 py-2 tabular-nums">
                        {yen(c.annual_salary)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 tabular-nums">
                        {yen(c.corporate_tax)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 tabular-nums">
                        {yen(c.income_tax + c.reconstruction_tax)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 tabular-nums">
                        {yen(c.resident_tax)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 tabular-nums">
                        {yen(c.total_social)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 tabular-nums">
                        {yen(c.total_burden)}
                      </td>
                      <td
                        className={`border-b border-slate-100 px-3 py-2 tabular-nums ${
                          isOptimal || isCurrent || isBoth ? "" : "text-slate-500"
                        }`}
                      >
                        {yen(c.combined_net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="mt-3 space-y-1 text-[11px] leading-relaxed text-slate-500">
            {result.assumptions.notes.map((n, i) => (
              <li key={i}>・{n}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {isManual && focus && result ? (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-black text-slate-700">計算の内訳</h3>
          <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full border-collapse text-right text-[11px] text-slate-700">
              <tbody>
                {(
                  [
                    ["毎月の役員報酬", focus.monthly_salary],
                    ["役員賞与（年間）", focus.annual_bonus ?? 0],
                    ["年間の報酬合計", focus.annual_salary],
                    ["会社の課税所得", focus.company_taxable],
                    ["法人の税金", focus.corporate_tax],
                    ["所得税（復興特別所得税を含む）", focus.income_tax + focus.reconstruction_tax],
                    ["住民税", focus.resident_tax],
                    ["社会保険料（会社＋本人）", focus.total_social],
                    ["会社に残るお金", focus.company_retained],
                    ["役員の手取り", focus.executive_take_home],
                  ] as const
                ).map(([label, amount]) => (
                  <tr key={label} className="odd:bg-slate-50/50">
                    <td className="border-b border-slate-100 px-3 py-2 text-left font-bold">{label}</td>
                    <td className="border-b border-slate-100 px-3 py-2 tabular-nums">{yen(amount)}</td>
                  </tr>
                ))}
                <tr className={toolsTheme.optimalRow}>
                  <td className="border-b border-slate-100 px-3 py-2 text-left font-black">
                    会社と役員の手取り合計
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 font-black tabular-nums">
                    {yen(focus.combined_net)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <ul className="mt-3 space-y-1 text-[11px] leading-relaxed text-slate-500">
            {result.assumptions.notes.map((n, i) => (
              <li key={i}>・{n}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <SeoContent />

      <ExecutiveCompReferenceTables
        fyStart={sim.fyStart}
        smallBusiness={sim.smallBusiness}
        prefectureCode={sim.prefCode}
        highlightOptimalMonthly={sim.highlightOptimalMonthly}
        highlightCurrentMonthly={sim.highlightCurrentMonthly}
        corporateBreakdown={!dirty && focus ? focus.corporate_breakdown : null}
        scrollToken={
          !dirty && focus
            ? `${focus.monthly_salary}-${focus.annual_bonus ?? 0}-${result?.as_of ?? ""}`
            : null
        }
      />
    </PartnerToolShell>
  );
}
