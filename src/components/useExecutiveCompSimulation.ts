"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  optimizeExecutiveComp,
  fetchAssociationHealthPrefectures,
  type ExecCompResult,
  type AssociationHealthPref,
} from "@/lib/tools-api";

export const STEP_OPTIONS = [
  { label: "10万円刻み", value: 100000 },
  { label: "20万円刻み", value: 200000 },
  { label: "50万円刻み", value: 500000 },
];

export function useExecutiveCompSimulation() {
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
  const [currentMonthly, setCurrentMonthly] = useState(800000);
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
      currentMonthly: compareCurrent ? currentMonthly : undefined,
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
    currentMonthly,
    compareCurrent,
  ]);

  const savingsVsZero = useMemo(() => {
    if (!result) return null;
    const zero = result.candidates.find((c) => c.monthly_salary === 0);
    if (!zero) return null;
    return result.optimal.combined_net - zero.combined_net;
  }, [result]);

  const delta = result?.delta ?? null;
  const current = result?.current ?? null;

  const highlightOptimalMonthly = !dirty && result ? result.optimal.monthly_salary : null;
  const highlightCurrentMonthly =
    !dirty && result && compareCurrent && current ? current.monthly_salary : null;

  return {
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
    currentMonthly,
    setCurrentMonthly,
    compareCurrent,
    setCompareCurrent,
    result,
    error,
    loading,
    dirty,
    markDirty,
    runOptimize,
    savingsVsZero,
    delta,
    current,
    highlightOptimalMonthly,
    highlightCurrentMonthly,
    optimalRowRef,
    currentRowRef,
  };
}
