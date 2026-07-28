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

type LoadState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

function idle<T>(): LoadState<T> {
  return { data: null, loading: true, error: null };
}

/** 法定参照表を事業年度時点で個別取得する。 */
export function useReferenceTablesData(fyStart: string, prefectureCode: string) {
  const [corp, setCorp] = useState<LoadState<CorporateTaxTable>>(idle);
  const [local, setLocal] = useState<LoadState<LocalTaxTables>>(idle);
  const [employment, setEmployment] = useState<LoadState<EmploymentIncomeTable>>(idle);
  const [withholding, setWithholding] = useState<LoadState<WithholdingTable>>(idle);
  const [amount, setAmount] = useState<LoadState<AssociationHealthAmountTable>>(idle);

  useEffect(() => {
    let cancelled = false;

    setCorp({ data: null, loading: true, error: null });
    setLocal({ data: null, loading: true, error: null });
    setEmployment({ data: null, loading: true, error: null });
    setWithholding({ data: null, loading: true, error: null });

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
        setCorp({
          data: null,
          loading: false,
          error: e instanceof Error ? e.message : "法人税マスタの取得に失敗しました",
        });
      });

    void fetchLocalTaxTables({ asOf: fyStart })
      .then((tables) => {
        if (cancelled) return;
        setLocal({ data: tables, loading: false, error: null });
      })
      .catch((e) => {
        if (cancelled) return;
        setLocal({
          data: null,
          loading: false,
          error: e instanceof Error ? e.message : "地方税マスタの取得に失敗しました",
        });
      });

    void fetchEmploymentIncomeTable({ asOf: fyStart })
      .then((table) => {
        if (cancelled) return;
        setEmployment({ data: table, loading: false, error: null });
      })
      .catch((e) => {
        if (cancelled) return;
        setEmployment({
          data: null,
          loading: false,
          error: e instanceof Error ? e.message : "給与所得控除マスタの取得に失敗しました",
        });
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
        setWithholding({
          data: null,
          loading: false,
          error: e instanceof Error ? e.message : "源泉徴収表の取得に失敗しました",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [fyStart]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setAmount({ data: null, loading: true, error: null });
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
          setAmount({
            data: null,
            loading: false,
            error:
              e instanceof Error ? e.message : "協会けんぽ保険料額表の取得に失敗しました",
          });
        });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [prefectureCode, fyStart]);

  return { corp, local, employment, withholding, amount };
}
