"use client";

import { useEffect } from "react";
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
import { Field, NumInput, ResultCard, yen } from "@/components/ui";
import { toolsTheme } from "@/lib/theme";

function signedYen(n: number): string {
  if (n === 0) return yen(0);
  const abs = yen(Math.abs(n));
  return n > 0 ? `+${abs}` : `−${abs}`;
}

export function ExecutiveCompTool() {
  const sim = useExecutiveCompSimulation();

  useEffect(() => {
    if (!sim.result || sim.dirty) return;
    const row = sim.optimalRowRef.current ?? sim.currentRowRef.current;
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [sim.result, sim.dirty, sim.optimalRowRef, sim.currentRowRef]);

  const shellProps = {
    title: "役員報酬 最適化シミュレーター",
    subtitle:
      "会社の利益を入力するだけで、法人税・所得税・住民税・社会保険料の合計負担が最小になる定期同額給与と事前確定届出給与の分配を無料でシミュレーションします。",
    category: "法人税・所得税・社保",
    asOf: sim.result?.as_of ?? undefined,
    maxWidthClass: "max-w-6xl" as const,
  };

  const { result, dirty, current, delta, compareCurrent, includeBonus } = sim;

  const isSameCandidate = (
    a: { monthly_salary: number; annual_bonus?: number },
    b: { monthly_salary: number; annual_bonus?: number },
  ) =>
    a.monthly_salary === b.monthly_salary &&
    (a.annual_bonus ?? 0) === (b.annual_bonus ?? 0);

  return (
    <PartnerToolShell {...shellProps}>
      <ExecutiveCompSectionNav />

      <div id="sim" className="scroll-mt-16 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="役員報酬控除前の会社利益（年額・円）" htmlFor="profit">
            <NumInput
              id="profit"
              value={sim.profit}
              onValueChange={(n) => {
                sim.setProfit(n);
                sim.markDirty();
              }}
              formatWithCommas
              className={`w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm ${toolsTheme.focusInput}`}
            />
          </Field>
          <Field label="いまの定期同額給与（月額・円）" htmlFor="current">
            <NumInput
              id="current"
              value={sim.currentMonthly}
              onValueChange={(n) => {
                sim.setCurrentMonthly(n);
                sim.markDirty();
              }}
              formatWithCommas
              className={`w-48 ${toolsTheme.currentInput}`}
            />
          </Field>
          {includeBonus ? (
            <Field label="いまの事前確定届出給与（年額・円）" htmlFor="current-bonus">
              <NumInput
                id="current-bonus"
                value={sim.currentBonus}
                onValueChange={(n) => {
                  sim.setCurrentBonus(n);
                  sim.markDirty();
                }}
                formatWithCommas
                className={`w-48 ${toolsTheme.currentInput}`}
              />
            </Field>
          ) : null}
          <Field label="役員の年齢（歳）" htmlFor="executive-age">
            <NumInput
              id="executive-age"
              value={sim.executiveAge}
              min={18}
              onValueChange={(n) => {
                sim.setExecutiveAge(Math.min(99, n));
                sim.markDirty();
              }}
              className={`w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm ${toolsTheme.focusInput}`}
            />
          </Field>
          <Field label="事業年度開始日" htmlFor="fy">
            <input
              id="fy"
              type="date"
              value={sim.fyStart}
              onChange={(e) => {
                sim.setFyStart(e.target.value);
                sim.markDirty();
              }}
              className={`rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm ${toolsTheme.focusInput}`}
            />
          </Field>
          <Field label="協会けんぽ支部（都道府県）" htmlFor="pref">
            <select
              id="pref"
              value={sim.prefCode}
              onChange={(e) => {
                sim.setPrefCode(e.target.value);
                sim.markDirty();
              }}
              className={`rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm ${toolsTheme.focusInput}`}
            >
              {sim.prefectures.map((p) => (
                <option key={p.prefecture_code} value={p.prefecture_code}>
                  {p.prefecture}（{p.prefecture_code}）
                </option>
              ))}
            </select>
          </Field>
          <Field label="月額の探索刻み" htmlFor="step">
            <select
              id="step"
              value={sim.monthlyStep}
              onChange={(e) => {
                sim.setMonthlyStep(Number(e.target.value));
                sim.markDirty();
              }}
              className={`rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm ${toolsTheme.focusInput}`}
            >
              {STEP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          {includeBonus ? (
            <>
              <Field label="届出給与の探索刻み" htmlFor="bonus-step">
                <select
                  id="bonus-step"
                  value={sim.bonusStep}
                  onChange={(e) => {
                    sim.setBonusStep(Number(e.target.value));
                    sim.markDirty();
                  }}
                  className={`rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm ${toolsTheme.focusInput}`}
                >
                  {BONUS_STEP_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="届出給与の支給回数" htmlFor="bonus-payments">
                <select
                  id="bonus-payments"
                  value={sim.bonusPaymentCount}
                  onChange={(e) => {
                    sim.setBonusPaymentCount(Number(e.target.value));
                    sim.markDirty();
                  }}
                  className={`rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm ${toolsTheme.focusInput}`}
                >
                  {BONUS_PAYMENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          ) : null}
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <input
              type="checkbox"
              checked={sim.includeBonus}
              onChange={(e) => {
                sim.setIncludeBonus(e.target.checked);
                sim.markDirty();
              }}
              className="h-4 w-4"
            />
            事前確定届出給与を含めて最適化
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <input
              type="checkbox"
              checked={sim.smallBusiness}
              onChange={(e) => {
                sim.setSmallBusiness(e.target.checked);
                sim.markDirty();
              }}
              className="h-4 w-4"
            />
            中小法人（資本金1億円以下）
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <input
              type="checkbox"
              checked={sim.includeSocial}
              onChange={(e) => {
                sim.setIncludeSocial(e.target.checked);
                sim.markDirty();
              }}
              className="h-4 w-4"
            />
            社会保険料を含める
          </label>
          <label className={`flex items-center gap-2 ${toolsTheme.currentLabel}`}>
            <input
              type="checkbox"
              checked={sim.compareCurrent}
              onChange={(e) => {
                sim.setCompareCurrent(e.target.checked);
                sim.markDirty();
              }}
              className="h-4 w-4"
            />
            いまの設定と比較
          </label>
        </div>
        {sim.prefError ? (
          <p className="mt-2 text-[11px] font-bold text-amber-700">{sim.prefError}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={sim.runOptimize}
            disabled={sim.loading}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-black text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sim.loading ? "計算中…" : "確定して計算"}
          </button>
          {dirty && result ? (
            <span className={toolsTheme.dirtyHint}>入力が変わっています。再計算してください。</span>
          ) : null}
          {!result && !sim.loading && !sim.error ? (
            <span className="text-xs text-slate-500">
              会社利益と役員報酬を入れたら「確定して計算」を押してください。
            </span>
          ) : null}
        </div>

        <div>
          <ResultCard
            tone="taxx"
            metrics={
              result && !dirty
                ? [
                    {
                      label: includeBonus
                        ? "最適な定期同額給与（月額）"
                        : "最適な役員報酬（月額）",
                      value: yen(result.optimal.monthly_salary),
                      sub: includeBonus
                        ? `月額年換算 ${yen(result.optimal.monthly_annual ?? result.optimal.monthly_salary * 12)}`
                        : `年額 ${yen(result.optimal.annual_salary)}`,
                    },
                    ...(includeBonus
                      ? [
                          {
                            label: "最適な事前確定届出給与（年額）",
                            value: yen(result.optimal.annual_bonus ?? 0),
                            sub: `報酬合計 ${yen(result.optimal.annual_salary)}`,
                          },
                        ]
                      : []),
                    {
                      label: "合計手取り（会社＋役員）",
                      value: yen(result.optimal.combined_net),
                      sub:
                        sim.savingsVsZero && sim.savingsVsZero > 0
                          ? `報酬ゼロ比 +${yen(sim.savingsVsZero)}`
                          : undefined,
                    },
                    {
                      label: "合計負担（税＋社会保険）",
                      value: yen(result.optimal.total_burden),
                    },
                  ]
                : null
            }
            placeholder={
              sim.error
                ? `エラー: ${sim.error}`
                : sim.loading
                  ? "計算中…"
                  : dirty && result
                    ? "入力変更後は「確定して計算」で再計算します。"
                    : "会社利益・役員報酬を確定したら「確定して計算」を押してください。"
            }
            breakdown={
              result && !dirty ? (
                <div className="space-y-0.5 text-xs text-slate-500">
                  <div>法人関係税 {yen(result.optimal.corporate_tax)}</div>
                  <div>
                    所得税 {yen(result.optimal.income_tax + result.optimal.reconstruction_tax)} ／
                    住民税 {yen(result.optimal.resident_tax)}
                  </div>
                  <div>
                    社会保険料（労使） {yen(result.optimal.total_social)}
                    {result.assumptions.care_applicable ? "（介護保険を含む）" : ""}
                    {includeBonus && (result.optimal.annual_bonus ?? 0) > 0
                      ? `／うち届出給与分 ${yen(
                          (result.optimal.employee_social_bonus ?? 0) +
                            (result.optimal.employer_social_bonus ?? 0),
                        )}`
                      : ""}
                  </div>
                </div>
              ) : null
            }
          />

          {compareCurrent && current && delta && !dirty ? (
            <div className={toolsTheme.currentPanel}>
              <h4 className={toolsTheme.currentPanelTitle}>いまの設定との差額（いま − 最適）</h4>
              <div className="mt-3 flex flex-wrap gap-3">
                <div className={toolsTheme.currentCard}>
                  <div className="text-[10px] font-bold text-slate-500">定期同額給与（月額）の差</div>
                  <div className={toolsTheme.currentCardValue}>{signedYen(delta.monthly_salary)}</div>
                  <div className="text-[10px] text-slate-500">
                    いま {yen(current.monthly_salary)} → 最適 {yen(result!.optimal.monthly_salary)}
                  </div>
                </div>
                {includeBonus ? (
                  <div className={toolsTheme.currentCard}>
                    <div className="text-[10px] font-bold text-slate-500">事前確定届出給与の差</div>
                    <div className={toolsTheme.currentCardValue}>
                      {signedYen(delta.annual_bonus ?? 0)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      いま {yen(current.annual_bonus ?? 0)} → 最適{" "}
                      {yen(result!.optimal.annual_bonus ?? 0)}
                    </div>
                  </div>
                ) : null}
                <div className={toolsTheme.currentCard}>
                  <div className="text-[10px] font-bold text-slate-500">合計手取りの差</div>
                  <div
                    className={`text-lg font-black ${
                      delta.combined_net < 0
                        ? "text-red-700"
                        : delta.combined_net > 0
                          ? "text-[var(--taxx-green-700)]"
                          : "text-slate-700"
                    }`}
                  >
                    {signedYen(delta.combined_net)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    いま {yen(current.combined_net)} ／ 最適 {yen(result!.optimal.combined_net)}
                  </div>
                </div>
                <div className={toolsTheme.currentCard}>
                  <div className="text-[10px] font-bold text-slate-500">合計負担の差</div>
                  <div
                    className={`text-lg font-black ${
                      delta.total_burden > 0
                        ? "text-red-700"
                        : delta.total_burden < 0
                          ? "text-[var(--taxx-green-700)]"
                          : "text-slate-700"
                    }`}
                  >
                    {signedYen(delta.total_burden)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    いま {yen(current.total_burden)} ／ 最適 {yen(result!.optimal.total_burden)}
                  </div>
                </div>
              </div>
              <div className={toolsTheme.currentDetail}>
                <div>法人関係税 {signedYen(delta.corporate_tax)}</div>
                <div>所得税＋復興 {signedYen(delta.income_tax)}</div>
                <div>住民税 {signedYen(delta.resident_tax)}</div>
                <div>社会保険（労使） {signedYen(delta.total_social)}</div>
                <div>会社内部留保 {signedYen(delta.company_retained)}</div>
                <div>役員手取り {signedYen(delta.executive_take_home)}</div>
              </div>
              {delta.combined_net < 0 ? (
                <p className="mt-2 text-[11px] font-bold text-red-700">
                  いまの設定は最適より合計手取りが {yen(Math.abs(delta.combined_net))} 少ない見込みです。
                </p>
              ) : delta.combined_net === 0 ? (
                <p className={`mt-2 ${toolsTheme.optimalText}`}>いまの設定は最適点と一致しています。</p>
              ) : (
                <p className={`mt-2 ${toolsTheme.optimalText}`}>
                  いまの設定の方が合計手取りが多く見えます（刻み・前提の範囲内）。
                </p>
              )}
            </div>
          ) : null}

          {result && !dirty && includeBonus && result.optimal.monthly_salary === 0 && (result.optimal.annual_bonus ?? 0) > 0 ? (
            <p className="mt-2 text-[11px] font-bold text-amber-700">
              試算上の最適は「月額0円＋事前確定届出給与」です。社会保険の標準賞与上限の影響で合計負担が下がることがありますが、実務上は生活費・社会保険加入・税務リスクを踏まえ、税理士等にご確認ください。
            </p>
          ) : null}
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            {includeBonus
              ? "定期同額給与と事前確定届出給与の分配を探索します。届出給与の社会保険料は標準賞与額×料率（健保は年度累計上限・厚年は1回上限）で概算します。届出期限・支給時期の適法性は判定しません。"
              : "役員報酬は毎月定額（事前確定届出給与なし）の前提です。"}
            社会保険料は協会けんぽの等級表経路で算出します。40〜64歳は介護保険を加算し、70歳以上は厚生年金、75歳以上は健康保険を対象外とします。法人側は法人税・地方税、個人側は給与所得控除・基礎控除・社会保険料控除を考慮します。
          </p>

          {result && !dirty ? (
            <LineConsultationCta
              className="mt-4"
              variant="result"
              highlightYen={yen(result.optimal.monthly_salary)}
            />
          ) : null}
        </div>
      </div>

      {result && !dirty ? (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-black text-slate-700">
            {includeBonus
              ? "定期同額×事前確定届出給与の負担シミュレーション（濃緑=最適"
              : "役員報酬別の負担シミュレーション（濃緑=最適"}
            {compareCurrent ? "／薄緑=いまの設定" : ""}）
          </h3>
          <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full border-collapse text-right text-[11px] text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500">
                <tr>
                  <th className="border-b border-slate-200 px-3 py-2 text-left">
                    {includeBonus ? "定期同額（月額）" : "役員報酬（月額）"}
                  </th>
                  {includeBonus ? (
                    <th className="border-b border-slate-200 px-3 py-2">事前確定届出（年額）</th>
                  ) : null}
                  <th className="border-b border-slate-200 px-3 py-2">報酬合計</th>
                  <th className="border-b border-slate-200 px-3 py-2">法人関係税</th>
                  <th className="border-b border-slate-200 px-3 py-2">所得税＋復興</th>
                  <th className="border-b border-slate-200 px-3 py-2">住民税</th>
                  <th className="border-b border-slate-200 px-3 py-2">社会保険（労使）</th>
                  <th className="border-b border-slate-200 px-3 py-2">合計負担</th>
                  <th className="border-b border-slate-200 px-3 py-2">合計手取り</th>
                </tr>
              </thead>
              <tbody>
                {result.candidates.map((c: ExecCompCandidate) => {
                  const isOptimal = isSameCandidate(c, result.optimal);
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
                          <span className={toolsTheme.optimalBadge}>最適</span>
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

      <SeoContent />

      <ExecutiveCompReferenceTables
        fyStart={sim.fyStart}
        smallBusiness={sim.smallBusiness}
        prefectureCode={sim.prefCode}
        highlightOptimalMonthly={sim.highlightOptimalMonthly}
        highlightCurrentMonthly={sim.highlightCurrentMonthly}
        corporateBreakdown={!dirty && result ? result.optimal.corporate_breakdown : null}
        scrollToken={
          !dirty && result
            ? `${result.optimal.monthly_salary}-${current?.monthly_salary ?? ""}-${result.as_of}`
            : null
        }
      />
    </PartnerToolShell>
  );
}
