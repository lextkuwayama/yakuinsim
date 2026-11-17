"""役員報酬最適化 — 法人税と個人の税・社会保険のトレードオフを試算する。

会社の「役員報酬控除前利益」を固定し、年間役員報酬を変化させたときの
合計負担（法人税＋所得税＋復興特別所得税＋住民税＋社会保険料〈労使〉）を求め、
合計手取り（会社内部留保＋役員手取り）が最大＝合計負担が最小となる点を探索する。

マスタから取得する値（ハードコードしない）:
- 協会けんぽ・厚生年金: legal_calc_service.calc_association_health_premium（等級表）
- 基礎控除（所得税）: legal_master(deduction.basic)
- 復興特別所得税率: legal_master(income_tax.reconstruction_surcharge_rate)
- 住民税基礎控除: legal_master(resident_tax.basic_deduction)
- 所得税の速算表: legal_master(income_tax_bracket)
- 給与所得控除: ref_table(employment_income_deduction)
- 個人住民税: legal_calc_service.calc_individual_resident_tax
- 法人地方税: legal_calc_service.calc_corporate_local_taxes

簡易化の前提（結果に明示する）:
- 定期同額給与（月額）と事前確定届出給与（年額・原則年1回）の分配を探索できる。
- 役員は雇用保険の対象外。労災は無視。
- 社会保険料は協会けんぽ等級表＋都道府県料率（月額）および標準賞与額×料率（届出給与）。
- 所得控除は基礎控除と社会保険料控除のみ。
- 外形標準課税（付加価値割・資本割）と事業所税は未対応。
- 届出期限・支給時期の適法性は判定しない（金額分配の税・社保試算のみ）。
"""

from __future__ import annotations

import datetime as _dt
import math
from typing import Any, Optional, TypedDict

from services import legal_calc_service, legal_master_service

# 画面に資本金・従業員・所在地入力が無い間の既定シナリオ（assumptions に明示）。
DEFAULT_COMPANY_SCENARIO: dict[str, Any] = {
    "id": "tokyo23_sme_standard",
    "label": "東京23区・中小（資本金1,000万円・従業員30人・標準税率）",
    "capital": 10_000_000,
    "employees": 30,
    "jurisdiction": "tokyo_23",
    "use_excess_rate": False,
}


class CompanyScenario(TypedDict, total=False):
    id: str
    label: str
    capital: int
    employees: int
    jurisdiction: str
    use_excess_rate: bool


def _floor(value: float) -> int:
    return max(0, int(math.floor(value)))


def _floor_1000(value: float) -> int:
    return max(0, int(math.floor(value / 1000)) * 1000)


def _require_rate(master_key: str, as_of: str, *, label: str) -> float:
    entry = legal_master_service.lookup_rate(master_key, as_of)
    if not entry or entry.get("value") is None:
        raise ValueError(f"{label}マスタがありません（{master_key} / as_of={as_of}）")
    return float(entry["value"])


def _require_amount(master_key: str, as_of: str, *, label: str) -> int:
    entry = legal_master_service.lookup_rate(master_key, as_of)
    if not entry or entry.get("value") is None:
        raise ValueError(f"{label}マスタがありません（{master_key} / as_of={as_of}）")
    return int(entry["value"])


def _corporate_burden(
    taxable_income: int,
    fiscal_year_start: str,
    *,
    small_business: bool,
    scenario: dict[str, Any],
) -> dict[str, Any]:
    """法人税＋地方法人税＋法人住民税（法人税割・均等割）＋事業税＋特別法人事業税。"""
    result = legal_calc_service.calc_corporate_local_taxes(
        taxable_income,
        fiscal_year_start,
        small_business=small_business,
        capital=int(scenario["capital"]),
        employees=int(scenario["employees"]),
        jurisdiction=str(scenario["jurisdiction"]),
        use_excess_rate=bool(scenario.get("use_excess_rate", False)),
    )
    return {
        "national": int(result["national"]),
        "local_corporate": int(result["local_corporate"]),
        "resident_levy": int(result["resident_levy"]),
        "percapita": int(result["percapita"]),
        "enterprise": int(result["enterprise"]),
        "special_enterprise": int(result["special_enterprise"]),
        "total": int(result["total"]),
        "detail": result,
    }


def _income_tax(taxable_income: int, as_of: str) -> int:
    """所得税の速算表から税額を求める（課税所得は1,000円未満切捨）。"""
    brackets = legal_master_service.list_income_tax_brackets(as_of)
    if not brackets:
        raise ValueError(f"所得税速算表マスタがありません（as_of={as_of}）")
    taxable = _floor_1000(taxable_income)
    for b in brackets:
        bmin = int(b.get("bracket_min") or 0)
        bmax = b.get("bracket_max")
        if taxable >= bmin and (bmax is None or taxable < int(bmax)):
            rate = float(b.get("rate") or 0)
            base = int(b.get("base_deduction") or 0)
            return _floor(taxable * rate - base)
    return 0


def _split_bonus_payments(annual_bonus: int, payment_count: int) -> list[int]:
    """年額の事前確定届出給与を支給回数に等分（端数は最終回へ）。"""
    count = max(1, int(payment_count))
    total = max(0, int(annual_bonus))
    if total <= 0:
        return [0] * count
    base = total // count
    rem = total - base * count
    payments = [base] * count
    payments[-1] += rem
    return payments


def _social_insurance(
    monthly_salary: int,
    as_of: str,
    *,
    executive_age: int,
    prefecture_code: str,
    care_applicable: bool,
    annual_bonus: int = 0,
    bonus_payment_count: int = 1,
) -> dict[str, Any]:
    """協会けんぽ経路で社会保険料（労使・年額）を算出する。

    月額は等級表（calc_association_health_premium）、事前確定届出給与は
    標準賞与額×料率（calc_association_bonus_premium）。
    年齢により厚年（70歳未満）・健保（75歳未満）を適用する。
    """
    empty = {
        "employee_annual": 0,
        "employer_annual": 0,
        "total_annual": 0,
        "employee_monthly_annual": 0,
        "employer_monthly_annual": 0,
        "employee_bonus_annual": 0,
        "employer_bonus_annual": 0,
        "grade_health": None,
        "grade_pension": None,
        "standard_monthly_health": 0,
        "standard_monthly_pension": 0,
        "standard_bonus_health": 0,
        "standard_bonus_pension": 0,
    }
    if executive_age >= 75:
        return empty

    apply_health = executive_age < 75
    apply_pension = executive_age < 70
    care = care_applicable and apply_health

    employee_monthly_annual = 0
    employer_monthly_annual = 0
    grade_health = None
    grade_pension = None
    std_m_health = 0
    std_m_pension = 0

    if monthly_salary > 0:
        prem = legal_calc_service.calc_association_health_premium(
            monthly_salary,
            prefecture_code=prefecture_code,
            care_applicable=care,
            as_of=as_of,
        )
        health_employee = float(prem["health_employee"] or 0) + float(
            prem["child_support_employee"] or 0
        )
        health_full = float(prem["health_full"] or 0) + float(prem["child_support_full"] or 0)
        pension_employee = float(prem["pension_employee"] or 0)
        pension_full = float(prem["pension_full"] or 0)
        childcare_employer = float(prem["childcare_contrib_employer"] or 0)

        employee_m = 0.0
        employer_m = 0.0
        if apply_health:
            employee_m += health_employee
            employer_m += max(0.0, health_full - health_employee)
            grade_health = prem.get("grade_health")
            std_m_health = int(prem.get("standard_monthly_health") or 0)
        if apply_pension:
            employee_m += pension_employee
            employer_m += max(0.0, pension_full - pension_employee) + childcare_employer
            grade_pension = prem.get("grade_pension")
            std_m_pension = int(prem.get("standard_monthly_pension") or 0)

        employee_monthly_annual = _floor(employee_m) * 12
        employer_monthly_annual = _floor(employer_m) * 12

    employee_bonus_annual = 0
    employer_bonus_annual = 0
    std_b_health = 0
    std_b_pension = 0
    if annual_bonus > 0 and (apply_health or apply_pension):
        payments = _split_bonus_payments(annual_bonus, bonus_payment_count)
        bonus_prem = legal_calc_service.calc_association_bonus_premium(
            payments,
            prefecture_code=prefecture_code,
            care_applicable=care,
            as_of=as_of,
        )
        if apply_health and apply_pension:
            employee_bonus_annual = int(bonus_prem["employee_total"] or 0)
            employer_bonus_annual = int(bonus_prem["employer_total"] or 0)
            std_b_health = int(bonus_prem["standard_bonus_health"] or 0)
            std_b_pension = int(bonus_prem["standard_bonus_pension"] or 0)
        else:
            # 70〜74歳: 健保のみ（厚年なし）
            health_std = int(bonus_prem["standard_bonus_health"] or 0) if apply_health else 0
            pension_std = int(bonus_prem["standard_bonus_pension"] or 0) if apply_pension else 0
            rates = legal_calc_service.lookup_association_health_rate(
                prefecture_code, as_of=as_of
            )
            health_rate = float(rates["health_care_rate"] if care else rates["health_rate"])
            child_support_rate = float(rates.get("child_support_rate") or 0)
            pension_rate = float(rates.get("pension_rate") or 0)
            childcare_contrib_rate = float(rates.get("childcare_contrib_rate") or 0)

            health_full = health_std * health_rate
            child_full = health_std * child_support_rate
            pension_full = pension_std * pension_rate
            childcare_full = pension_std * childcare_contrib_rate

            def _half_yen(full: float) -> float:
                # legal_calc_service._round_half_yen(full / 2) と同値
                return math.floor(full + 1e-9) / 2 if full else 0.0

            h_emp = _half_yen(health_full)
            c_emp = _half_yen(child_full)
            p_emp = _half_yen(pension_full)
            employee_bonus_annual = _floor(h_emp + c_emp + p_emp)
            employer_bonus_annual = (
                _floor(health_full - h_emp)
                + _floor(child_full - c_emp)
                + _floor(pension_full - p_emp)
                + _floor(childcare_full)
            )
            std_b_health = health_std
            std_b_pension = pension_std

    employee_annual = employee_monthly_annual + employee_bonus_annual
    employer_annual = employer_monthly_annual + employer_bonus_annual
    return {
        "employee_annual": employee_annual,
        "employer_annual": employer_annual,
        "total_annual": employee_annual + employer_annual,
        "employee_monthly_annual": employee_monthly_annual,
        "employer_monthly_annual": employer_monthly_annual,
        "employee_bonus_annual": employee_bonus_annual,
        "employer_bonus_annual": employer_bonus_annual,
        "grade_health": grade_health,
        "grade_pension": grade_pension,
        "standard_monthly_health": std_m_health,
        "standard_monthly_pension": std_m_pension,
        "standard_bonus_health": std_b_health,
        "standard_bonus_pension": std_b_pension,
    }


def _evaluate(
    monthly_salary: int,
    profit: int,
    fiscal_year_start: str,
    as_of: str,
    *,
    small_business: bool,
    executive_age: int,
    prefecture_code: str,
    care_applicable: bool,
    basic_income_deduction: int,
    resident_basic_deduction: int,
    reconstruction_rate: float,
    include_social: bool,
    company_scenario: dict[str, Any],
    annual_bonus: int = 0,
    bonus_payment_count: int = 1,
) -> dict[str, Any]:
    monthly_annual = max(0, int(monthly_salary)) * 12
    bonus = max(0, int(annual_bonus))
    annual_salary = monthly_annual + bonus

    if include_social:
        si = _social_insurance(
            monthly_salary,
            as_of,
            executive_age=executive_age,
            prefecture_code=prefecture_code,
            care_applicable=care_applicable,
            annual_bonus=bonus,
            bonus_payment_count=bonus_payment_count,
        )
    else:
        si = {
            "employee_annual": 0,
            "employer_annual": 0,
            "total_annual": 0,
            "employee_monthly_annual": 0,
            "employer_monthly_annual": 0,
            "employee_bonus_annual": 0,
            "employer_bonus_annual": 0,
            "grade_health": None,
            "grade_pension": None,
            "standard_monthly_health": 0,
            "standard_monthly_pension": 0,
            "standard_bonus_health": 0,
            "standard_bonus_pension": 0,
        }
    employee_si = int(si["employee_annual"])
    employer_si = int(si["employer_annual"])

    company_taxable = _floor_1000(profit - annual_salary - employer_si)
    corp = _corporate_burden(
        company_taxable,
        fiscal_year_start,
        small_business=small_business,
        scenario=company_scenario,
    )
    corporate_tax = corp["total"]

    if annual_salary <= 0:
        income_tax = 0
        reconstruction_tax = 0
        resident_tax = 0
    else:
        emp = legal_calc_service.calc_employment_income(annual_salary, as_of=as_of)
        employment_income = int(emp["employment_income"])

        taxable_it = max(0, employment_income - employee_si - basic_income_deduction)
        income_tax = _income_tax(taxable_it, as_of)
        reconstruction_tax = _floor(income_tax * reconstruction_rate)

        taxable_rt = max(0, employment_income - employee_si - resident_basic_deduction)
        rt = legal_calc_service.calc_individual_resident_tax(taxable_rt, as_of)
        resident_tax = int(rt["total"])

    total_burden = (
        corporate_tax
        + employee_si
        + employer_si
        + income_tax
        + reconstruction_tax
        + resident_tax
    )
    company_retained = profit - annual_salary - employer_si - corporate_tax
    executive_take_home = (
        annual_salary - employee_si - income_tax - reconstruction_tax - resident_tax
    )
    combined_net = profit - total_burden

    return {
        "monthly_salary": monthly_salary,
        "annual_bonus": bonus,
        "bonus_payment_count": max(1, int(bonus_payment_count)),
        "monthly_annual": monthly_annual,
        "annual_salary": annual_salary,
        "company_taxable": company_taxable,
        "corporate_tax": corporate_tax,
        "corporate_breakdown": corp,
        "employee_social": employee_si,
        "employer_social": employer_si,
        "total_social": employee_si + employer_si,
        "employee_social_monthly": int(si.get("employee_monthly_annual") or 0),
        "employer_social_monthly": int(si.get("employer_monthly_annual") or 0),
        "employee_social_bonus": int(si.get("employee_bonus_annual") or 0),
        "employer_social_bonus": int(si.get("employer_bonus_annual") or 0),
        "social_grade_health": si.get("grade_health"),
        "social_grade_pension": si.get("grade_pension"),
        "income_tax": income_tax,
        "reconstruction_tax": reconstruction_tax,
        "resident_tax": resident_tax,
        "total_burden": total_burden,
        "company_retained": company_retained,
        "executive_take_home": executive_take_home,
        "combined_net": combined_net,
    }


def _candidate_key(c: dict[str, Any]) -> tuple[int, int]:
    return (int(c["monthly_salary"]), int(c.get("annual_bonus") or 0))


def _resolve_context(
    pretax_profit: int,
    fiscal_year_start: str,
    *,
    executive_age: int,
    prefecture_code: str,
    as_of: Optional[str],
    company_scenario: Optional[dict[str, Any]],
    bonus_payment_count: int,
) -> dict[str, Any]:
    """共通の年齢・料率・控除・評価引数を解決する。"""
    profit = max(0, int(pretax_profit))
    age = int(executive_age)
    if age < 18 or age > 99:
        raise ValueError("役員年齢は18〜99歳で入力してください")
    payments = max(1, min(4, int(bonus_payment_count)))
    resolved_as_of = as_of or fiscal_year_start or _dt.date.today().isoformat()
    scenario = {**DEFAULT_COMPANY_SCENARIO, **(company_scenario or {})}

    rates_meta = legal_calc_service.lookup_association_health_rate(
        prefecture_code, as_of=resolved_as_of
    )
    care_applicable = 40 <= age <= 64
    resolved_health_rate = float(
        rates_meta["health_care_rate"] if care_applicable else rates_meta["health_rate"]
    )
    pension_rate = float(rates_meta.get("pension_rate") or 0)
    if not pension_rate:
        pension_rate = _require_rate(
            "social_insurance.pension.rate", resolved_as_of, label="厚生年金保険料率"
        )

    basic_income_deduction = _require_amount(
        "deduction.basic", resolved_as_of, label="基礎控除（所得税）"
    )
    reconstruction_rate = _require_rate(
        "income_tax.reconstruction_surcharge_rate",
        resolved_as_of,
        label="復興特別所得税率",
    )
    resident_basic_deduction = _require_amount(
        "resident_tax.basic_deduction", resolved_as_of, label="住民税基礎控除"
    )

    eval_kwargs = dict(
        executive_age=age,
        prefecture_code=prefecture_code,
        care_applicable=care_applicable,
        basic_income_deduction=basic_income_deduction,
        resident_basic_deduction=resident_basic_deduction,
        reconstruction_rate=reconstruction_rate,
        company_scenario=scenario,
        bonus_payment_count=payments,
    )
    return {
        "profit": profit,
        "age": age,
        "payments": payments,
        "as_of": resolved_as_of,
        "scenario": scenario,
        "rates_meta": rates_meta,
        "care_applicable": care_applicable,
        "resolved_health_rate": resolved_health_rate,
        "pension_rate": pension_rate,
        "basic_income_deduction": basic_income_deduction,
        "reconstruction_rate": reconstruction_rate,
        "resident_basic_deduction": resident_basic_deduction,
        "eval_kwargs": eval_kwargs,
    }


def _assumptions_block(
    *,
    ctx: dict[str, Any],
    fiscal_year_start: str,
    small_business: bool,
    include_bonus: bool,
    notes: list[str],
) -> dict[str, Any]:
    scenario = ctx["scenario"]
    age = ctx["age"]
    sample_local = legal_calc_service.calc_corporate_local_taxes(
        0,
        fiscal_year_start,
        small_business=small_business,
        capital=int(scenario["capital"]),
        employees=int(scenario["employees"]),
        jurisdiction=str(scenario["jurisdiction"]),
        use_excess_rate=bool(scenario.get("use_excess_rate", False)),
    )
    return {
        "pension_rate": ctx["pension_rate"],
        "health_rate": ctx["resolved_health_rate"],
        "executive_age": age,
        "care_applicable": ctx["care_applicable"],
        "pension_applicable": age < 70,
        "health_applicable": age < 75,
        "prefecture": ctx["rates_meta"].get("prefecture"),
        "include_bonus": include_bonus,
        "bonus_payment_count": ctx["payments"],
        "basic_income_deduction": ctx["basic_income_deduction"],
        "resident_basic_deduction": ctx["resident_basic_deduction"],
        "reconstruction_rate": ctx["reconstruction_rate"],
        "company_scenario": {
            "id": scenario.get("id"),
            "label": scenario.get("label"),
            "capital": scenario.get("capital"),
            "employees": scenario.get("employees"),
            "jurisdiction": scenario.get("jurisdiction"),
            "use_excess_rate": scenario.get("use_excess_rate", False),
        },
        "corporate_local_tax_rate": sample_local.get("local_corporate_rate"),
        "corporate_resident_levy_rate": sample_local.get("resident_levy_rate"),
        "corporate_percapita": sample_local.get("percapita"),
        "special_enterprise_rate": sample_local.get("special_enterprise_rate"),
        "jurisdiction": sample_local.get("jurisdiction_label")
        or sample_local.get("jurisdiction"),
        "fallback_used": [],
        "notes": notes,
    }


def _build_search_grid(
    profit: int,
    monthly_step: int,
    *,
    include_bonus: bool,
    bonus_step: int,
) -> tuple[int, int, list[tuple[int, int]]]:
    """(月額, 事前確定届出給与年額) の探索格子を作る。候補数は概ね80以下に抑える。"""
    max_monthly = profit // 12
    step = max(10000, int(monthly_step))
    max_monthly_points = 20 if include_bonus else 40
    if max_monthly > 0 and (max_monthly // step) > max_monthly_points:
        step = int(math.ceil((max_monthly / max_monthly_points) / 10000) * 10000)

    monthly_values: list[int] = []
    m = 0
    while m <= max_monthly and len(monthly_values) < 100:
        monthly_values.append(m)
        m += step
    if not monthly_values:
        monthly_values = [0]

    pairs: list[tuple[int, int]] = []
    if not include_bonus:
        pairs = [(mv, 0) for mv in monthly_values]
        return step, max(100000, int(bonus_step)), pairs

    b_step = max(100000, int(bonus_step))
    # 月額数 × 届出給与段数が多くなりすぎないよう刻みを調整
    target_total = 80
    bonus_levels_budget = max(4, target_total // max(1, len(monthly_values)))

    for mv in monthly_values:
        remaining = max(0, profit - mv * 12)
        local_step = b_step
        if remaining > 0 and (remaining // local_step) > bonus_levels_budget:
            local_step = int(
                math.ceil((remaining / bonus_levels_budget) / 100000) * 100000
            )
            local_step = max(100000, local_step)
        b = 0
        seen_b: set[int] = set()
        while b <= remaining:
            if b not in seen_b:
                pairs.append((mv, b))
                seen_b.add(b)
            if local_step <= 0:
                break
            b += local_step
        if remaining not in seen_b:
            pairs.append((mv, remaining))

    return step, b_step, pairs


def evaluate_executive_comp(
    pretax_profit: int,
    fiscal_year_start: str,
    *,
    monthly_salary: int,
    annual_bonus: int = 0,
    executive_age: int,
    small_business: bool = True,
    prefecture_code: str = "13",
    as_of: Optional[str] = None,
    include_social: bool = True,
    bonus_payment_count: int = 1,
    company_scenario: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """指定した定期同額給与・事前確定届出給与の組合せを1点だけ試算する。"""
    ctx = _resolve_context(
        pretax_profit,
        fiscal_year_start,
        executive_age=executive_age,
        prefecture_code=prefecture_code,
        as_of=as_of,
        company_scenario=company_scenario,
        bonus_payment_count=bonus_payment_count,
    )
    monthly = max(0, int(monthly_salary))
    bonus = max(0, int(annual_bonus))
    selected = _evaluate(
        monthly,
        ctx["profit"],
        fiscal_year_start,
        ctx["as_of"],
        small_business=small_business,
        include_social=include_social,
        annual_bonus=bonus,
        **ctx["eval_kwargs"],
    )
    notes = [
        "入力した毎月の役員報酬（定期同額給与）と役員賞与（事前確定届出給与）で計算しています。",
        f"役員賞与は年{ctx['payments']}回・均等支給として計算しています。"
        "届出期限・支給時期の要件は判定していません。",
        "社会保険料は月額＝標準報酬等級表×都道府県料率、届出給与＝標準賞与額×料率（健保年度累計・厚年1回上限あり）で算出します。",
        "役員は雇用保険の対象外として計算しています。",
        "健康保険料率は協会けんぽ都道府県マスタから取得します。",
        f"役員年齢は{ctx['age']}歳。40〜64歳は介護保険を加算し、70歳以上は厚生年金、75歳以上は健康保険を計算対象外としています。",
        "65歳以上の介護保険料（市区町村が徴収）と75歳以上の後期高齢者医療保険料は本試算に含みません。",
        f"住民税の基礎控除は{ctx['resident_basic_deduction']:,}円、所得控除は基礎控除と社会保険料控除のみで概算しています。",
        f"法人地方税シナリオ: {ctx['scenario'].get('label')}（資本金・従業員・所在地の入力UIは未実装）。事業所税・外形標準課税は対象外。",
        "事業税の損金算入（翌期）は考慮していません。実際の判断は税理士にご確認ください。",
    ]
    return {
        "mode": "manual",
        "pretax_profit": ctx["profit"],
        "fiscal_year_start": fiscal_year_start,
        "as_of": ctx["as_of"],
        "small_business": small_business,
        "include_social": include_social,
        "include_bonus": bonus > 0,
        "bonus_payment_count": ctx["payments"],
        "executive_age": ctx["age"],
        "prefecture_code": prefecture_code,
        "selected": selected,
        "optimal": None,
        "current": None,
        "delta": None,
        "candidates": [selected],
        "assumptions": _assumptions_block(
            ctx=ctx,
            fiscal_year_start=fiscal_year_start,
            small_business=small_business,
            include_bonus=True,
            notes=notes,
        ),
    }


def optimize_executive_comp(
    pretax_profit: int,
    fiscal_year_start: str,
    *,
    executive_age: int,
    small_business: bool = True,
    prefecture_code: str = "13",
    health_rate: Optional[float] = None,
    monthly_step: int = 100000,
    as_of: Optional[str] = None,
    include_social: bool = True,
    include_bonus: bool = False,
    bonus_step: int = 500000,
    bonus_payment_count: int = 1,
    current_monthly: Optional[int] = None,
    current_bonus: Optional[int] = None,
    company_scenario: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """役員報酬（月額）と事前確定届出給与の分配を探索し、合計手取り最大点を返す。

    include_bonus=False のときは従来どおり月額のみ（届出給与=0）。
    current_monthly / current_bonus を渡すと、その組合せとの差額（delta）も返す。
    health_rate は互換のため受け取るが、等級表経路では料率マスタを優先する（上書きしない）。
    """
    del health_rate  # 等級表経路では都道府県マスタの料率を使う
    ctx = _resolve_context(
        pretax_profit,
        fiscal_year_start,
        executive_age=executive_age,
        prefecture_code=prefecture_code,
        as_of=as_of,
        company_scenario=company_scenario,
        bonus_payment_count=bonus_payment_count,
    )
    profit = ctx["profit"]
    age = ctx["age"]
    payments = ctx["payments"]
    as_of = ctx["as_of"]
    scenario = ctx["scenario"]
    eval_kwargs = {
        **ctx["eval_kwargs"],
        "small_business": small_business,
        "include_social": include_social,
    }

    step, resolved_bonus_step, pairs = _build_search_grid(
        profit,
        monthly_step,
        include_bonus=include_bonus,
        bonus_step=bonus_step,
    )

    candidates: list[dict[str, Any]] = []
    for monthly, bonus in pairs:
        candidates.append(
            _evaluate(
                monthly,
                profit,
                fiscal_year_start,
                as_of,
                annual_bonus=bonus,
                **eval_kwargs,
            )
        )

    if not candidates:
        candidates.append(
            _evaluate(0, profit, fiscal_year_start, as_of, annual_bonus=0, **eval_kwargs)
        )

    optimal = max(candidates, key=lambda c: c["combined_net"])

    current: Optional[dict[str, Any]] = None
    delta: Optional[dict[str, Any]] = None
    if current_monthly is not None:
        cur_m = max(0, int(current_monthly))
        cur_b = max(0, int(current_bonus or 0))
        if not include_bonus:
            cur_b = 0
        existing = next(
            (
                c
                for c in candidates
                if c["monthly_salary"] == cur_m and int(c.get("annual_bonus") or 0) == cur_b
            ),
            None,
        )
        current = existing or _evaluate(
            cur_m, profit, fiscal_year_start, as_of, annual_bonus=cur_b, **eval_kwargs
        )
        if existing is None:
            candidates.append(current)
            candidates.sort(key=lambda c: (_candidate_key(c)[0], _candidate_key(c)[1]))
        delta = {
            "monthly_salary": current["monthly_salary"] - optimal["monthly_salary"],
            "annual_bonus": int(current.get("annual_bonus") or 0)
            - int(optimal.get("annual_bonus") or 0),
            "annual_salary": current["annual_salary"] - optimal["annual_salary"],
            "combined_net": current["combined_net"] - optimal["combined_net"],
            "total_burden": current["total_burden"] - optimal["total_burden"],
            "corporate_tax": current["corporate_tax"] - optimal["corporate_tax"],
            "income_tax": (current["income_tax"] + current["reconstruction_tax"])
            - (optimal["income_tax"] + optimal["reconstruction_tax"]),
            "resident_tax": current["resident_tax"] - optimal["resident_tax"],
            "total_social": current["total_social"] - optimal["total_social"],
            "company_retained": current["company_retained"] - optimal["company_retained"],
            "executive_take_home": current["executive_take_home"]
            - optimal["executive_take_home"],
        }

    # 表示用: 合計手取り降順で並べ、同一月額なら届出給与昇順
    candidates.sort(
        key=lambda c: (-c["combined_net"], c["monthly_salary"], int(c.get("annual_bonus") or 0))
    )

    notes = [
        (
            "毎月の役員報酬（定期同額給与）と役員賞与（事前確定届出給与）の組み合わせを探しています。"
            if include_bonus
            else "役員賞与は含めず、毎月の役員報酬（定期同額給与）だけで探しています。"
        ),
        (
            f"役員賞与は年{payments}回・均等支給として計算しています。"
            "届出期限・支給時期の要件は判定していません。"
            if include_bonus
            else "賞与も含めて探す場合は「役員賞与（事前確定届出給与）も組み合わせて探す」にチェックを入れてください。"
        ),
        "社会保険料は月額＝標準報酬等級表×都道府県料率、届出給与＝標準賞与額×料率（健保年度累計・厚年1回上限あり）で算出します。",
        "役員は雇用保険の対象外として計算しています。",
        "健康保険料率は協会けんぽ都道府県マスタから取得します。",
        f"役員年齢は{age}歳。40〜64歳は介護保険を加算し、70歳以上は厚生年金、75歳以上は健康保険を計算対象外としています。",
        "65歳以上の介護保険料（市区町村が徴収）と75歳以上の後期高齢者医療保険料は本試算に含みません。",
        f"住民税の基礎控除は{ctx['resident_basic_deduction']:,}円、所得控除は基礎控除と社会保険料控除のみで概算しています。",
        f"法人地方税シナリオ: {scenario.get('label')}（資本金・従業員・所在地の入力UIは未実装）。事業所税・外形標準課税は対象外。",
        "事業税の損金算入（翌期）は考慮していません。実際の判断は税理士にご確認ください。",
    ]

    return {
        "mode": "optimize",
        "pretax_profit": profit,
        "fiscal_year_start": fiscal_year_start,
        "as_of": as_of,
        "small_business": small_business,
        "include_social": include_social,
        "include_bonus": include_bonus,
        "bonus_step": resolved_bonus_step,
        "bonus_payment_count": payments,
        "executive_age": age,
        "monthly_step": step,
        "prefecture_code": prefecture_code,
        "selected": None,
        "optimal": optimal,
        "current": current,
        "delta": delta,
        "candidates": candidates,
        "assumptions": _assumptions_block(
            ctx=ctx,
            fiscal_year_start=fiscal_year_start,
            small_business=small_business,
            include_bonus=include_bonus,
            notes=notes,
        ),
    }
