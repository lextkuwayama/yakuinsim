"use client";

import { useEffect } from "react";
import type { ExecCompCandidate } from "@/lib/tools-api";
import { PartnerToolShell } from "@/components/PartnerToolShell";
import {
  ExecutiveCompReferenceTables,
  ExecutiveCompSectionNav,
} from "@/components/ExecutiveCompReferenceTables";
import {
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
      "会社の利益を固定し、役員報酬を振ったときの「法人税＋所得税＋住民税＋社会保険」の合計負担が最小になる月額を探索します。",
    category: "法人税・所得税・社保",
    sourceUrl: "https://www.nta.go.jp/taxes/shiraberu/taxanswer/hojin/5759.htm",
    sourceLabel: "国税庁 No.5759 ほか",
    asOf: sim.result?.as_of ?? undefined,
    maxWidthClass: "max-w-6xl" as const,
  };

  const { result, dirty, current, delta, compareCurrent } = sim;

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
          <Field label="いまの役員報酬（月額・円）" htmlFor="current">
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
          <Field label="探索刻み" htmlFor="step">
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
                      label: "最適な役員報酬（月額）",
                      value: yen(result.optimal.monthly_salary),
                      sub: `年額 ${yen(result.optimal.annual_salary)}`,
                    },
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
                  <div className="text-[10px] font-bold text-slate-500">役員報酬（月額）の差</div>
                  <div className={toolsTheme.currentCardValue}>{signedYen(delta.monthly_salary)}</div>
                  <div className="text-[10px] text-slate-500">
                    いま {yen(current.monthly_salary)} → 最適 {yen(result!.optimal.monthly_salary)}
                  </div>
                </div>
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

          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            役員報酬は毎月定額（賞与なし）の前提です。社会保険料は協会けんぽの等級表経路で算出します。40〜64歳は介護保険を加算し、70歳以上は厚生年金、75歳以上は健康保険を対象外とします。法人側は法人税・地方税、個人側は給与所得控除・基礎控除・社会保険料控除を考慮します。
          </p>
        </div>
      </div>

      {result && !dirty ? (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-black text-slate-700">
            役員報酬別の負担シミュレーション（濃緑=最適
            {compareCurrent ? "／薄緑=いまの設定" : ""}）
          </h3>
          <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full border-collapse text-right text-[11px] text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500">
                <tr>
                  <th className="border-b border-slate-200 px-3 py-2 text-left">役員報酬（月額）</th>
                  <th className="border-b border-slate-200 px-3 py-2">年額</th>
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
                  const isOptimal = c.monthly_salary === result.optimal.monthly_salary;
                  const isCurrent =
                    !!current && c.monthly_salary === current.monthly_salary && !isOptimal;
                  const isBoth =
                    !!current &&
                    c.monthly_salary === current.monthly_salary &&
                    c.monthly_salary === result.optimal.monthly_salary;
                  return (
                    <tr
                      key={c.monthly_salary}
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
