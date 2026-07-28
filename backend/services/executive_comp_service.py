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
- 賞与は考慮しない。役員は雇用保険の対象外。労災は無視。
- 社会保険料は協会けんぽ等級表＋都道府県料率で算出（画面の保険料額表と同経路）。
- 所得控除は基礎控除と社会保険料控除のみ。
- 外形標準課税（付加価値割・資本割）と事業所税は未対応。
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


def _social_insurance(
    monthly_salary: int,
    as_of: str,
    *,
    executive_age: int,
    prefecture_code: str,
    care_applicable: bool,
) -> dict[str, Any]:
    """協会けんぽ等級表経路で社会保険料（労使・年額）を算出する。

    画面の保険料額表（calc_association_health_premium）と同一ロジック。
    年齢により厚年（70歳未満）・健保（75歳未満）を適用する。
    """
    if monthly_salary <= 0 or executive_age >= 75:
        return {
            "employee_annual": 0,
            "employer_annual": 0,
            "total_annual": 0,
            "grade_health": None,
            "grade_pension": None,
            "standard_monthly_health": 0,
            "standard_monthly_pension": 0,
        }

    prem = legal_calc_service.calc_association_health_premium(
        monthly_salary,
        prefecture_code=prefecture_code,
        care_applicable=care_applicable and executive_age < 75,
        as_of=as_of,
    )

    apply_health = executive_age < 75
    apply_pension = executive_age < 70

    health_employee = float(prem["health_employee"] or 0) + float(prem["child_support_employee"] or 0)
    health_full = float(prem["health_full"] or 0) + float(prem["child_support_full"] or 0)
    pension_employee = float(prem["pension_employee"] or 0)
    pension_full = float(prem["pension_full"] or 0)
    childcare_employer = float(prem["childcare_contrib_employer"] or 0)

    employee_m = 0.0
    employer_m = 0.0
    if apply_health:
        employee_m += health_employee
        employer_m += max(0.0, health_full - health_employee)
    if apply_pension:
        employee_m += pension_employee
        employer_m += max(0.0, pension_full - pension_employee) + childcare_employer

    employee_annual = _floor(employee_m) * 12
    employer_annual = _floor(employer_m) * 12
    return {
        "employee_annual": employee_annual,
        "employer_annual": employer_annual,
        "total_annual": employee_annual + employer_annual,
        "grade_health": prem.get("grade_health") if apply_health else None,
        "grade_pension": prem.get("grade_pension") if apply_pension else None,
        "standard_monthly_health": int(prem.get("standard_monthly_health") or 0) if apply_health else 0,
        "standard_monthly_pension": int(prem.get("standard_monthly_pension") or 0) if apply_pension else 0,
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
) -> dict[str, Any]:
    annual_salary = monthly_salary * 12

    if include_social:
        si = _social_insurance(
            monthly_salary,
            as_of,
            executive_age=executive_age,
            prefecture_code=prefecture_code,
            care_applicable=care_applicable,
        )
    else:
        si = {
            "employee_annual": 0,
            "employer_annual": 0,
            "total_annual": 0,
            "grade_health": None,
            "grade_pension": None,
            "standard_monthly_health": 0,
            "standard_monthly_pension": 0,
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
    executive_take_home = annual_salary - employee_si - income_tax - reconstruction_tax - resident_tax
    combined_net = profit - total_burden

    return {
        "monthly_salary": monthly_salary,
        "annual_salary": annual_salary,
        "company_taxable": company_taxable,
        "corporate_tax": corporate_tax,
        "corporate_breakdown": corp,
        "employee_social": employee_si,
        "employer_social": employer_si,
        "total_social": employee_si + employer_si,
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
    current_monthly: Optional[int] = None,
    company_scenario: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """役員報酬を刻みで振って合計負担が最小（合計手取り最大）となる点を探索する。

    current_monthly を渡すと、その月額を評価し optimal との差額（delta）も返す。
    health_rate は互換のため受け取るが、等級表経路では料率マスタを優先する（上書きしない）。
    """
    del health_rate  # 等級表経路では都道府県マスタの料率を使う
    profit = max(0, int(pretax_profit))
    age = int(executive_age)
    if age < 18 or age > 99:
        raise ValueError("役員年齢は18〜99歳で入力してください")
    as_of = as_of or fiscal_year_start or _dt.date.today().isoformat()
    scenario = {**DEFAULT_COMPANY_SCENARIO, **(company_scenario or {})}

    rates_meta = legal_calc_service.lookup_association_health_rate(prefecture_code, as_of=as_of)
    care_applicable = 40 <= age <= 64
    resolved_health_rate = float(
        rates_meta["health_care_rate"] if care_applicable else rates_meta["health_rate"]
    )
    pension_rate = float(rates_meta.get("pension_rate") or 0)
    if not pension_rate:
        pension_rate = _require_rate(
            "social_insurance.pension.rate", as_of, label="厚生年金保険料率"
        )

    basic_income_deduction = _require_amount("deduction.basic", as_of, label="基礎控除（所得税）")
    reconstruction_rate = _require_rate(
        "income_tax.reconstruction_surcharge_rate", as_of, label="復興特別所得税率"
    )
    resident_basic_deduction = _require_amount(
        "resident_tax.basic_deduction", as_of, label="住民税基礎控除"
    )

    eval_kwargs = dict(
        small_business=small_business,
        executive_age=age,
        prefecture_code=prefecture_code,
        care_applicable=care_applicable,
        basic_income_deduction=basic_income_deduction,
        resident_basic_deduction=resident_basic_deduction,
        reconstruction_rate=reconstruction_rate,
        include_social=include_social,
        company_scenario=scenario,
    )

    max_monthly = profit // 12
    step = max(10000, int(monthly_step))
    if max_monthly > 0 and (max_monthly // step) > 40:
        step = int(math.ceil((max_monthly / 40) / 10000) * 10000)

    candidates: list[dict[str, Any]] = []
    monthly = 0
    guard = 0
    while monthly <= max_monthly and guard < 100:
        guard += 1
        candidates.append(
            _evaluate(monthly, profit, fiscal_year_start, as_of, **eval_kwargs)
        )
        monthly += step

    if not candidates:
        candidates.append(_evaluate(0, profit, fiscal_year_start, as_of, **eval_kwargs))

    optimal = max(candidates, key=lambda c: c["combined_net"])

    current: Optional[dict[str, Any]] = None
    delta: Optional[dict[str, Any]] = None
    if current_monthly is not None:
        cur_m = max(0, int(current_monthly))
        existing = next((c for c in candidates if c["monthly_salary"] == cur_m), None)
        current = existing or _evaluate(cur_m, profit, fiscal_year_start, as_of, **eval_kwargs)
        if existing is None:
            candidates.append(current)
            candidates.sort(key=lambda c: c["monthly_salary"])
        delta = {
            "monthly_salary": current["monthly_salary"] - optimal["monthly_salary"],
            "annual_salary": current["annual_salary"] - optimal["annual_salary"],
            "combined_net": current["combined_net"] - optimal["combined_net"],
            "total_burden": current["total_burden"] - optimal["total_burden"],
            "corporate_tax": current["corporate_tax"] - optimal["corporate_tax"],
            "income_tax": (current["income_tax"] + current["reconstruction_tax"])
            - (optimal["income_tax"] + optimal["reconstruction_tax"]),
            "resident_tax": current["resident_tax"] - optimal["resident_tax"],
            "total_social": current["total_social"] - optimal["total_social"],
            "company_retained": current["company_retained"] - optimal["company_retained"],
            "executive_take_home": current["executive_take_home"] - optimal["executive_take_home"],
        }

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
        "pretax_profit": profit,
        "fiscal_year_start": fiscal_year_start,
        "as_of": as_of,
        "small_business": small_business,
        "include_social": include_social,
        "executive_age": age,
        "monthly_step": step,
        "prefecture_code": prefecture_code,
        "optimal": optimal,
        "current": current,
        "delta": delta,
        "candidates": candidates,
        "assumptions": {
            "pension_rate": pension_rate,
            "health_rate": resolved_health_rate,
            "executive_age": age,
            "care_applicable": care_applicable,
            "pension_applicable": age < 70,
            "health_applicable": age < 75,
            "prefecture": rates_meta.get("prefecture"),
            "basic_income_deduction": basic_income_deduction,
            "resident_basic_deduction": resident_basic_deduction,
            "reconstruction_rate": reconstruction_rate,
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
            "jurisdiction": sample_local.get("jurisdiction_label") or sample_local.get("jurisdiction"),
            "fallback_used": [],
            "notes": [
                "賞与は考慮していません（役員報酬は毎月定額の前提）。",
                "役員は雇用保険の対象外として計算しています。",
                "社会保険料は協会けんぽの標準報酬等級表×都道府県料率で算出し、画面の保険料額表と同経路です。",
                "健康保険料率は協会けんぽ都道府県マスタから取得します。",
                f"役員年齢は{age}歳。40〜64歳は介護保険を加算し、70歳以上は厚生年金、75歳以上は健康保険を計算対象外としています。",
                "65歳以上の介護保険料（市区町村が徴収）と75歳以上の後期高齢者医療保険料は本試算に含みません。",
                f"住民税の基礎控除は{resident_basic_deduction:,}円、所得控除は基礎控除と社会保険料控除のみで概算しています。",
                f"法人地方税シナリオ: {scenario.get('label')}（資本金・従業員・所在地の入力UIは未実装）。事業所税・外形標準課税は対象外。",
                "事業税の損金算入（翌期）は考慮していません。実際の判断は税理士にご確認ください。",
            ],
        },
    }
