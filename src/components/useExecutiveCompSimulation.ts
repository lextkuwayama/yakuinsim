"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  optimizeExecutiveComp,
  evaluateExecutiveComp,
  fetchAssociationHealthPrefectures,
  type ExecCompCandidate,
  type ExecCompResult,
  type AssociationHealthPref,
} from "@/lib/tools-api";

export const STEP_OPTIONS = [
  { label: "10万円ごと", value: 100000 },
  { label: "20万円ごと", value: 200000 },
  { label: "50万円ごと", value: 500000 },
];

export const BONUS_STEP_OPTIONS = [
  { label: "50万円ごと", value: 500000 },
  { label: "100万円ごと", value: 1000000 },
  { label: "200万円ごと", value: 2000000 },
];

export const BONUS_PAYMENT_OPTIONS = [
  { label: "年1回", value: 1 },
  { label: "年2回（均等）", value: 2 },
];

export type SimMode = "optimize" | "manual";

export function useExecutiveCompSimulation() {
  const [mode, setMode] = useState<SimMode>("optimize");
  const [profit, setProfit] = useState(20_000_000);
  const [executiveAge, setExecutiveAge] = useState(45);
  const [fyStart, setFyStart] = useState("2026-04-01");
  const [smallBusiness, setSmallBusiness] = useState(true);
  const [prefCode, setPrefCode] = useState("13");
  const [prefectures, setPrefectures] = useState<AssociationHealthPref[]>([
    { prefecture_code: "13", prefecture: "東京都", health_rate: 0.0985, health_care_rate: 0.1147 },
  ]);
  const [prefError, setPrefError] = useState<string | null>(null);
  const [monthlyStep, setMonthlyStep] = useState(100000);
  const [includeSocial, setIncludeSocial] = useState(true);
  const [includeBonus, setIncludeBonus] = useState(true);
  const [bonusStep, setBonusStep] = useState(500000);
  const [bonusPaymentCount, setBonusPaymentCount] = useState(1);
  const [currentMonthly, setCurrentMonthly] = useState(800000);
  const [currentBonus, setCurrentBonus] = useState(0);
  const [trialMonthly, setTrialMonthly] = useState(800000);
  const [trialBonus, setTrialBonus] = useState(0);
  const [compareCurrent, setCompareCurrent] = useState(true);

  const [result, setResult] = useState<ExecCompResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(true);

  const optimalRowRef = useRef<HTMLTableRowElement | null>(null);
  const currentRowRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    void fetchAssociationHealthPrefectures({ asOf: fyStart })
      .then((r) => {
        if (r.prefectures.length) {
          setPrefectures(r.prefectures);
          setPrefError(null);
        } else {
          setPrefError("協会けんぽ支部一覧が空です。東京都の既定値を使います。");
        }
      })
      .catch((e) => {
        setPrefError(
          e instanceof Error
            ? `支部一覧の取得に失敗しました（${e.message}）。東京都の既定値を使います。`
            : "支部一覧の取得に失敗しました。東京都の既定値を使います。",
        );
      });
  }, [fyStart]);

  const markDirty = useCallback(() => setDirty(true), []);

  const changeMode = useCallback((next: SimMode) => {
    setMode(next);
    setResult(null);
    setError(null);
    setDirty(true);
  }, []);

  const runOptimize = useCallback(() => {
    setLoading(true);
    setError(null);
    void optimizeExecutiveComp({
      pretaxProfit: profit,
      fiscalYearStart: fyStart,
      executiveAge,
      smallBusiness,
      prefectureCode: prefCode,
      monthlyStep,
      includeSocial,
      includeBonus,
      bonusStep: includeBonus ? bonusStep : undefined,
      bonusPaymentCount: includeBonus ? bonusPaymentCount : undefined,
      currentMonthly: compareCurrent ? currentMonthly : undefined,
      currentBonus: compareCurrent && includeBonus ? currentBonus : undefined,
    })
      .then((r) => {
        setResult(r);
        setDirty(false);
        setError(null);
      })
      .catch((e) => {
        setResult(null);
        setDirty(true);
        setError(e instanceof Error ? e.message : "計算に失敗しました");
      })
      .finally(() => setLoading(false));
  }, [
    profit,
    executiveAge,
    fyStart,
    smallBusiness,
    prefCode,
    monthlyStep,
    includeSocial,
    includeBonus,
    bonusStep,
    bonusPaymentCount,
    currentMonthly,
    currentBonus,
    compareCurrent,
  ]);

  const evalSeqRef = useRef(0);

  const runEvaluate = useCallback(() => {
    const seq = ++evalSeqRef.current;
    setLoading(true);
    setError(null);
    void evaluateExecutiveComp({
      pretaxProfit: profit,
      fiscalYearStart: fyStart,
      executiveAge,
      smallBusiness,
      prefectureCode: prefCode,
      includeSocial,
      monthlySalary: trialMonthly,
      annualBonus: trialBonus,
      bonusPaymentCount,
    })
      .then((r) => {
        if (seq !== evalSeqRef.current) return;
        setResult(r);
        setDirty(false);
        setError(null);
      })
      .catch((e) => {
        if (seq !== evalSeqRef.current) return;
        setResult(null);
        setDirty(true);
        setError(e instanceof Error ? e.message : "計算に失敗しました");
      })
      .finally(() => {
        if (seq === evalSeqRef.current) setLoading(false);
      });
  }, [
    profit,
    executiveAge,
    fyStart,
    smallBusiness,
    prefCode,
    includeSocial,
    trialMonthly,
    trialBonus,
    bonusPaymentCount,
  ]);

  // 自分で決めるモードは入力のたびに自動で再計算する（スライダー操作中の連打を間引く）
  useEffect(() => {
    if (mode !== "manual") return;
    const id = window.setTimeout(runEvaluate, 350);
    return () => window.clearTimeout(id);
  }, [mode, runEvaluate]);

  const runCalculate = useCallback(() => {
    if (mode === "manual") {
      runEvaluate();
    } else {
      runOptimize();
    }
  }, [mode, runEvaluate, runOptimize]);

  const focus: ExecCompCandidate | null = useMemo(() => {
    if (!result) return null;
    if (mode === "manual") return result.selected ?? result.candidates[0] ?? null;
    if (dirty) return null;
    return result.optimal;
  }, [result, dirty, mode]);

  const savingsVsZero = useMemo(() => {
    if (!result || !focus || mode !== "optimize") return null;
    const zero = result.candidates.find(
      (c) => c.monthly_salary === 0 && (c.annual_bonus ?? 0) === 0,
    );
    if (!zero) return null;
    return focus.combined_net - zero.combined_net;
  }, [result, focus, mode]);

  const delta = result?.delta ?? null;
  const current = result?.current ?? null;

  const highlightOptimalMonthly =
    !dirty && result && mode === "optimize" && result.optimal
      ? result.optimal.monthly_salary
      : null;
  const highlightCurrentMonthly =
    mode === "manual"
      ? !dirty && focus
        ? focus.monthly_salary
        : null
      : !dirty && result && compareCurrent && current
        ? current.monthly_salary
        : null;

  return {
    mode,
    changeMode,
    profit,
    setProfit,
    executiveAge,
    setExecutiveAge,
    fyStart,
    setFyStart,
    smallBusiness,
    setSmallBusiness,
    prefCode,
    setPrefCode,
    prefectures,
    prefError,
    monthlyStep,
    setMonthlyStep,
    includeSocial,
    setIncludeSocial,
    includeBonus,
    setIncludeBonus,
    bonusStep,
    setBonusStep,
    bonusPaymentCount,
    setBonusPaymentCount,
    currentMonthly,
    setCurrentMonthly,
    currentBonus,
    setCurrentBonus,
    trialMonthly,
    setTrialMonthly,
    trialBonus,
    setTrialBonus,
    compareCurrent,
    setCompareCurrent,
    result,
    focus,
    error,
    loading,
    dirty,
    markDirty,
    runCalculate,
    savingsVsZero,
    delta,
    current,
    highlightOptimalMonthly,
    highlightCurrentMonthly,
    optimalRowRef,
    currentRowRef,
  };
}
