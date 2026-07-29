"use client";

import { useEffect, useState } from "react";
import {
  fetchAssociationHealthAmountTable,
  fetchCorporateTaxTable,
  fetchEmploymentIncomeTable,
  fetchLocalTaxTables,
  fetchWithholdingTable,
  type AssociationHealthAmountTable,
  type CorporateTaxTable,
  type EmploymentIncomeTable,
  type LocalTaxTables,
  type WithholdingTable,
} from "@/lib/tools-api";
import staticRefSeed from "@/data/static-ref-seed.json";

type LoadState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

function ready<T>(data: T | null, emptyMessage = "マスタが空です"): LoadState<T> {
  return { data, loading: false, error: data ? null : emptyMessage };
}

const SEED_AS_OF = staticRefSeed.as_of;
const SEED_PREF = staticRefSeed.prefecture_code;

const seededCorp = ready(staticRefSeed.corp as CorporateTaxTable | null);
const seededEmployment = ready(staticRefSeed.employment as EmploymentIncomeTable);
const seededWithholding = ready(
  (staticRefSeed.withholding?.table ?? null) as WithholdingTable | null,
  "該当時点の源泉徴収表がありません",
);
const seededLocal = ready(staticRefSeed.local as LocalTaxTables);
const seededAmount = ready(staticRefSeed.amount as AssociationHealthAmountTable);

/**
 * 法定参照表を事業年度時点で取得する。
 * 初期表示はビルド時シード（SSG HTML に表が入る）を使い、
 * 条件変更時のみ API で再取得する。
 */
export function useReferenceTablesData(fyStart: string, prefectureCode: string) {
  const [corp, setCorp] = useState<LoadState<CorporateTaxTable>>(seededCorp);
  const [local, setLocal] = useState<LoadState<LocalTaxTables>>(seededLocal);
  const [employment, setEmployment] =
    useState<LoadState<EmploymentIncomeTable>>(seededEmployment);
  const [withholding, setWithholding] =
    useState<LoadState<WithholdingTable>>(seededWithholding);
  const [amount, setAmount] = useState<LoadState<AssociationHealthAmountTable>>(
    prefectureCode === SEED_PREF ? seededAmount : { data: null, loading: true, error: null },
  );

  useEffect(() => {
    let cancelled = false;

    if (fyStart === SEED_AS_OF) {
      setCorp(seededCorp);
      setLocal(seededLocal);
      setEmployment(seededEmployment);
      setWithholding(seededWithholding);
      return () => {
        cancelled = true;
      };
    }

    setCorp((prev) => ({ ...prev, loading: true, error: null }));
    setLocal((prev) => ({ ...prev, loading: true, error: null }));
    setEmployment((prev) => ({ ...prev, loading: true, error: null }));
    setWithholding((prev) => ({ ...prev, loading: true, error: null }));

    void fetchCorporateTaxTable()
      .then((table) => {
        if (cancelled) return;
        setCorp({
          data: table,
          loading: false,
          error: table ? null : "法人税マスタが空です",
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setCorp((prev) => ({
          ...prev,
          loading: false,
          error: e instanceof Error ? e.message : "法人税マスタの取得に失敗しました",
        }));
      });

    void fetchLocalTaxTables({ asOf: fyStart })
      .then((tables) => {
        if (cancelled) return;
        setLocal({ data: tables, loading: false, error: null });
      })
      .catch((e) => {
        if (cancelled) return;
        setLocal((prev) => ({
          ...prev,
          loading: false,
          error: e instanceof Error ? e.message : "地方税マスタの取得に失敗しました",
        }));
      });

    void fetchEmploymentIncomeTable({ asOf: fyStart })
      .then((table) => {
        if (cancelled) return;
        setEmployment({ data: table, loading: false, error: null });
      })
      .catch((e) => {
        if (cancelled) return;
        setEmployment((prev) => ({
          ...prev,
          loading: false,
          error: e instanceof Error ? e.message : "給与所得控除マスタの取得に失敗しました",
        }));
      });

    void fetchWithholdingTable({ asOf: fyStart })
      .then((wh) => {
        if (cancelled) return;
        setWithholding({
          data: wh.table,
          loading: false,
          error: wh.table ? null : "該当時点の源泉徴収表がありません",
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setWithholding((prev) => ({
          ...prev,
          loading: false,
          error: e instanceof Error ? e.message : "源泉徴収表の取得に失敗しました",
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [fyStart]);

  useEffect(() => {
    let cancelled = false;

    if (prefectureCode === SEED_PREF && fyStart === SEED_AS_OF) {
      setAmount(seededAmount);
      return () => {
        cancelled = true;
      };
    }

    const t = setTimeout(() => {
      setAmount((prev) => ({ ...prev, loading: true, error: null }));
      void fetchAssociationHealthAmountTable({
        prefectureCode,
        asOf: fyStart,
      })
        .then((table) => {
          if (cancelled) return;
          setAmount({ data: table, loading: false, error: null });
        })
        .catch((e) => {
          if (cancelled) return;
          setAmount((prev) => ({
            ...prev,
            loading: false,
            error:
              e instanceof Error ? e.message : "協会けんぽ保険料額表の取得に失敗しました",
          }));
        });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [prefectureCode, fyStart]);

  return { corp, local, employment, withholding, amount };
}
