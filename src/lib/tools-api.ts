// 公開 API クライアント。
// 静的エクスポート時は NEXT_PUBLIC_SIM_OFFICER_API_URL で外部 API を直呼び。
// ローカル開発（rewrite 経由）では空文字 → 同一オリジンの /api に飛ぶ。

const API_ORIGIN =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SIM_OFFICER_API_URL) || "";

async function getJson<T>(path: string): Promise<T> {
  const base = API_ORIGIN || "/api";
  const url = API_ORIGIN
    ? `${base}/api/public/tools${path}`
    : `${base}/public/tools${path}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body?.detail) detail = body.detail;
    } catch {
      /* noop */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

// --- 法人税率 ---

export type CorporateTaxPeriod = { label: string; start: string };
export type CorporateTaxRow = {
  corp_type: string;
  segment: string;
  income_band: string;
  rates: number[];
  consolidated_rate: number | null;
  note?: string;
};
export type CorporateTaxTable = {
  label_ja: string;
  law_asof: string;
  source_law: string;
  source_url: string;
  periods: CorporateTaxPeriod[];
  rows: CorporateTaxRow[];
  notes: string[];
  small_business_threshold: number;
};

export async function fetchCorporateTaxTable(): Promise<CorporateTaxTable | null> {
  const data = await getJson<{ table: CorporateTaxTable | null }>("/corporate-tax/table");
  return data.table;
}

// --- 給与所得控除 ---

export type RefColumn = { key: string; label: string; type: string };
export type EmploymentIncomeTable = {
  label_ja: string;
  source_law: string | null;
  source_url: string | null;
  notes: string[];
  valid_from: string | null;
  valid_to: string | null;
  label: string | null;
  columns: RefColumn[];
  rows: Record<string, unknown>[];
};

export async function fetchEmploymentIncomeTable(params: {
  asOf?: string;
} = {}): Promise<EmploymentIncomeTable> {
  const q = new URLSearchParams();
  if (params.asOf) q.set("as_of", params.asOf);
  const suffix = q.toString() ? `?${q}` : "";
  return getJson<EmploymentIncomeTable>(`/employment-income/table${suffix}`);
}

// --- 源泉徴収税額表（月額表） ---

export type WithholdingTableSummary = {
  year_label?: string;
  valid_from?: string | null;
  valid_to?: string | null;
};

export type WithholdingTable = {
  label_ja: string;
  year_label: string;
  valid_from?: string | null;
  valid_to?: string | null;
  source_law?: string;
  source_url?: string;
  columns: string[];
  rows: { min: number; max: number; kou: number[]; otsu: number }[];
  low_band: { max: number; otsu_rate: number };
  high_income_kou?: { min: number; rate: number; kou: number[] }[];
  high_income_otsu?: { min: number; base: number; over: number; rate: number }[];
  over_7_deduction: number;
};

export async function fetchWithholdingTable(params: {
  asOf?: string;
} = {}): Promise<{
  tables: WithholdingTableSummary[];
  table: WithholdingTable | null;
}> {
  const q = new URLSearchParams();
  if (params.asOf) q.set("as_of", params.asOf);
  const suffix = q.toString() ? `?${q}` : "";
  return getJson<{ tables: WithholdingTableSummary[]; table: WithholdingTable | null }>(
    `/withholding/table${suffix}`,
  );
}

// --- 役員報酬 最適化シミュレーター ---

export type LocalTaxBand = {
  income_band: string | null;
  portion: number;
  rate: number;
  tax: number;
};

export type LocalTaxCalc = {
  taxable_income: number;
  fiscal_year_start: string;
  jurisdiction: string;
  jurisdiction_label: string;
  use_excess_rate: boolean;
  reduced_rate_applicable: boolean;
  capital: number;
  employees: number;
  national: number;
  local_corporate: number;
  local_corporate_rate: number;
  resident_levy: number;
  resident_levy_rate: number;
  percapita: number;
  percapita_band?: string | null;
  enterprise: number;
  enterprise_bands: LocalTaxBand[];
  special_enterprise: number;
  special_enterprise_rate: number;
  total: number;
  office_tax: number | null;
};

export type ExecCompCorporateBreakdown = {
  national: number;
  local_corporate: number;
  resident_levy: number;
  percapita: number;
  enterprise: number;
  special_enterprise: number;
  total: number;
  detail?: LocalTaxCalc | null;
};

export type ExecCompCandidate = {
  monthly_salary: number;
  annual_salary: number;
  company_taxable: number;
  corporate_tax: number;
  corporate_breakdown: ExecCompCorporateBreakdown;
  employee_social: number;
  employer_social: number;
  total_social: number;
  income_tax: number;
  reconstruction_tax: number;
  resident_tax: number;
  total_burden: number;
  company_retained: number;
  executive_take_home: number;
  combined_net: number;
};

export type ExecCompDelta = {
  monthly_salary: number;
  annual_salary: number;
  combined_net: number;
  total_burden: number;
  corporate_tax: number;
  income_tax: number;
  resident_tax: number;
  total_social: number;
  company_retained: number;
  executive_take_home: number;
};

export type ExecCompResult = {
  pretax_profit: number;
  fiscal_year_start: string;
  as_of: string;
  executive_age: number;
  small_business: boolean;
  include_social: boolean;
  monthly_step: number;
  optimal: ExecCompCandidate;
  current: ExecCompCandidate | null;
  delta: ExecCompDelta | null;
  candidates: ExecCompCandidate[];
  assumptions: {
    pension_rate: number;
    health_rate: number;
    executive_age: number;
    care_applicable: boolean;
    pension_applicable: boolean;
    health_applicable: boolean;
    basic_income_deduction: number;
    resident_basic_deduction: number;
    reconstruction_rate: number;
    company_scenario?: {
      id?: string;
      label?: string;
      capital?: number;
      employees?: number;
      jurisdiction?: string;
      use_excess_rate?: boolean;
    };
    corporate_local_tax_rate: number;
    corporate_resident_levy_rate: number;
    corporate_percapita: number;
    special_enterprise_rate: number;
    notes: string[];
  };
};

export async function optimizeExecutiveComp(params: {
  pretaxProfit: number;
  fiscalYearStart: string;
  executiveAge: number;
  smallBusiness: boolean;
  prefectureCode?: string;
  monthlyStep: number;
  includeSocial: boolean;
  currentMonthly?: number;
}): Promise<ExecCompResult> {
  const q = new URLSearchParams({
    pretax_profit: String(params.pretaxProfit),
    fiscal_year_start: params.fiscalYearStart,
    executive_age: String(params.executiveAge),
    small_business: String(params.smallBusiness),
    monthly_step: String(params.monthlyStep),
    include_social: String(params.includeSocial),
  });
  if (params.prefectureCode) q.set("prefecture_code", params.prefectureCode);
  if (params.currentMonthly != null) q.set("current_monthly", String(params.currentMonthly));
  return getJson<ExecCompResult>(`/executive-comp/optimize?${q}`);
}

// --- 法人地方税 ---

export type LocalTaxTableColumn = {
  key: string;
  label: string;
  type: string;
};

export type LocalTaxRefTable = {
  id: string;
  label_ja: string;
  source_law: string | null;
  source_url: string | null;
  notes: string[];
  valid_from: string | null;
  valid_to: string | null;
  label: string | null;
  columns: LocalTaxTableColumn[];
  rows: Record<string, unknown>[];
};

export type LocalTaxTables = {
  resident_levy: LocalTaxRefTable;
  percapita: LocalTaxRefTable;
  enterprise: LocalTaxRefTable;
};

export async function fetchLocalTaxTables(params: {
  asOf?: string;
} = {}): Promise<LocalTaxTables> {
  const q = new URLSearchParams();
  if (params.asOf) q.set("as_of", params.asOf);
  const suffix = q.toString() ? `?${q}` : "";
  return getJson<LocalTaxTables>(`/local-tax/tables${suffix}`);
}

// --- 協会けんぽ ---

export type AssociationHealthPref = {
  prefecture_code: string;
  prefecture: string;
  health_rate: number;
  health_care_rate: number;
  source_url?: string | null;
};

export type AssociationHealthAmountRow = {
  grade_health: number;
  grade_pension: number | null;
  standard_monthly: number;
  remuneration_min: number | null;
  remuneration_max: number | null;
  health_full: number;
  health_half: number;
  health_care_full: number;
  health_care_half: number;
  child_support_full: number;
  child_support_half: number;
  pension_full: number;
  pension_half: number;
  pension_standard_monthly: number;
};

export type AssociationHealthAmountTable = {
  prefecture_code: string;
  prefecture: string;
  source_url?: string | null;
  valid_from?: string | null;
  label?: string | null;
  health_rate: number;
  care_rate: number;
  health_care_rate: number;
  child_support_rate: number;
  pension_rate: number;
  childcare_contrib_rate: number;
  grades_valid_from?: string | null;
  rows: AssociationHealthAmountRow[];
};

export async function fetchAssociationHealthPrefectures(params: {
  asOf?: string;
} = {}): Promise<{
  prefectures: AssociationHealthPref[];
  valid_from: string | null;
  label: string | null;
}> {
  const q = new URLSearchParams();
  if (params.asOf) q.set("as_of", params.asOf);
  const suffix = q.toString() ? `?${q}` : "";
  return getJson(`/association-health/prefectures${suffix}`);
}

export async function fetchAssociationHealthAmountTable(params: {
  prefectureCode: string;
  asOf?: string;
}): Promise<AssociationHealthAmountTable> {
  const q = new URLSearchParams({ prefecture_code: params.prefectureCode });
  if (params.asOf) q.set("as_of", params.asOf);
  return getJson(`/association-health/amount-table?${q}`);
}
