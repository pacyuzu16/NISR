"""Build the aggregated dataset behind the web app from RDHS 2025 microdata.

Input  (git-ignored, never published):  hackathon/microdata/RWPR91FL.dta, RWKR91FL.dta
Static input (published report tables): hackathon/data/rdhs2025_district_child_nutrition.csv (Table D.4)
Output (aggregates only):               hackathon/web/public/data/gukura.json

Every estimate is survey-weighted. Confidence intervals use Taylor linearisation over the
two-stage cluster design (PSU within strata), the same approach used in the DHS report.

Run from hackathon/:  .venv/bin/python analysis/build_outputs.py
"""
import json
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
import statsmodels.api as sm
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold

ROOT = Path(__file__).resolve().parents[1]
MICRO = ROOT / "microdata"
OUT = ROOT / "web" / "public" / "data" / "gukura.json"

DISTRICTS = {11: "Nyarugenge", 12: "Gasabo", 13: "Kicukiro", 21: "Nyanza", 22: "Gisagara", 23: "Nyaruguru",
             24: "Huye", 25: "Nyamagabe", 26: "Ruhango", 27: "Muhanga", 28: "Kamonyi", 31: "Karongi",
             32: "Rutsiro", 33: "Rubavu", 34: "Nyabihu", 35: "Ngororero", 36: "Rusizi", 37: "Nyamasheke",
             41: "Rulindo", 42: "Gakenke", 43: "Musanze", 44: "Burera", 45: "Gicumbi", 51: "Rwamagana",
             52: "Nyagatare", 53: "Gatsibo", 54: "Kayonza", 55: "Kirehe", 56: "Ngoma", 57: "Bugesera"}
PROVINCES = {1: "Kigali", 2: "South", 3: "West", 4: "North", 5: "East"}

# Earlier RDHS rounds, from the published survey reports (stunting, children under 5)
TREND = [("2005", 51.0), ("2010", 44.0), ("2014–15", 38.0), ("2019–20", 33.0)]


def wprop(y, w, psu, strata):
    """Weighted proportion (in %) with a design-based 95% CI."""
    y, w = np.asarray(y, float), np.asarray(w, float)
    est = np.sum(w * y) / np.sum(w)
    z = pd.DataFrame({"z": w * (y - est) / np.sum(w), "psu": psu, "strata": strata})
    tot = z.groupby(["strata", "psu"]).z.sum().reset_index()
    var = sum(len(g) / (len(g) - 1) * np.sum((g.z - g.z.mean()) ** 2) for _, g in tot.groupby("strata") if len(g) > 1)
    se = np.sqrt(var)
    return {"value": round(100 * est, 1), "low": round(100 * max(0, est - 1.96 * se), 1),
            "high": round(100 * min(1, est + 1.96 * se), 1), "n": int(len(y))}


# ---------------------------------------------------------------- household-member file: official estimates
pr = pd.read_stata(MICRO / "RWPR91FL.dta", convert_categoricals=False,
                   columns=["hv005", "hv021", "hv022", "hv103", "hv024", "hv270", "hc1", "hc70", "shdistrict"])
pr = pr[(pr.hv103 == 1) & (pr.hc70 < 9990)].copy()
pr["stunted"] = (pr.hc70 < -200).astype(float)
pr["w"] = pr.hv005 / 1e6


def pr_prop(mask, col="stunted"):
    d = pr[mask]
    return wprop(d[col], d.w, d.hv021, d.hv022)


national = pr_prop(np.ones(len(pr), bool))
total_stunted_w = (pr.w * pr.stunted).sum()

age_curve = []
for a in range(0, 60, 6):
    r = pr_prop((pr.hc1 >= a) & (pr.hc1 < a + 6))
    age_curve.append({"from": a, "to": a + 5, **r})

provinces = [{"name": n, **pr_prop(pr.hv024 == c)} for c, n in PROVINCES.items()]

# ---------------------------------------------------------------- children's file: context + model
kr = pd.read_stata(MICRO / "RWKR91FL.dta", convert_categoricals=False)
kr = kr[(kr.b5 == 1) & (kr.hw70 < 9990)].copy()
kr["stunted"] = (kr.hw70 < -200).astype(int)
kr["w"] = kr.v005 / 1e6

improved_water = {11, 12, 13, 14, 21, 31, 41, 51, 61, 62, 71}
improved_toilet = {11, 12, 13, 21, 22, 41}
mh = kr.v438.where(kr.v438 < 9990) / 10

feat = pd.DataFrame({
    "age": pd.cut(kr.hw1, [-1, 5, 11, 23, 35, 47, 59],
                  labels=["0–5 months", "6–11 months", "12–23 months", "24–35 months", "36–47 months", "48–59 months"]),
    "sex": kr.b4.map({1: "Boy", 2: "Girl"}),
    "wealth": kr.v190.map({1: "Poorest", 2: "Poorer", 3: "Middle", 4: "Richer", 5: "Richest"}),
    "mother_education": kr.v106.map({0: "No schooling", 1: "Primary", 2: "Secondary", 3: "Higher"}),
    "residence": kr.v025.map({1: "Urban", 2: "Rural"}),
    "mother_height": pd.cut(mh, [0, 145, 150, 155, 300],
                            labels=["Under 145 cm", "145–149 cm", "150–154 cm", "155 cm or taller"],
                            right=False).astype(object).fillna("Not measured"),
    "birth_interval": np.select([kr.b11.isna(), kr.b11 < 24, kr.b11 < 48],
                                ["First child", "Under 2 years", "2–4 years"], "4 years or more"),
    "birth_size": kr.m18.map({1: "Average or larger", 2: "Average or larger", 3: "Average or larger",
                              4: "Smaller than average", 5: "Smaller than average"}).fillna("Not reported"),
    "water": np.where(kr.v113.isin(improved_water), "Improved source", "Unimproved source"),
    "toilet": np.where(kr.v116.isin(improved_toilet), "Improved", "Unimproved or none"),
    "diarrhoea": np.where(kr.h11.isin([1, 2]), "Yes", "No"),
    "insurance": kr.v481.map({0: "No", 1: "Yes"}),
    "province": kr.v024.map(PROVINCES),
}).astype(str)

REFERENCE = {"age": "0–5 months", "sex": "Girl", "wealth": "Richest", "mother_education": "Higher",
             "residence": "Urban", "mother_height": "155 cm or taller", "birth_interval": "4 years or more",
             "birth_size": "Average or larger", "water": "Improved source", "toilet": "Improved",
             "diarrhoea": "No", "insurance": "Yes", "province": "Kigali"}
ORDER = {
    "age": ["0–5 months", "6–11 months", "12–23 months", "24–35 months", "36–47 months", "48–59 months"],
    "sex": ["Girl", "Boy"],
    "wealth": ["Poorest", "Poorer", "Middle", "Richer", "Richest"],
    "mother_education": ["No schooling", "Primary", "Secondary", "Higher"],
    "residence": ["Urban", "Rural"],
    "mother_height": ["Under 145 cm", "145–149 cm", "150–154 cm", "155 cm or taller", "Not measured"],
    "birth_interval": ["First child", "Under 2 years", "2–4 years", "4 years or more"],
    "birth_size": ["Smaller than average", "Average or larger", "Not reported"],
    "water": ["Unimproved source", "Improved source"],
    "toilet": ["Unimproved or none", "Improved"],
    "diarrhoea": ["Yes", "No"],
    "insurance": ["No", "Yes"],
    "province": ["Kigali", "South", "West", "North", "East"],
}
assert all(set(feat[c].unique()) <= set(ORDER[c]) for c in feat), "unexpected category level"

y, w = kr.stunted.values, kr.w.values
psu, strata = kr.v021.values, kr.v022.values

gaps = {}
for c in feat:
    gaps[c] = []
    for lv in ORDER[c]:
        m = (feat[c] == lv).values
        if m.sum() >= 50:
            gaps[c].append({"level": lv, **wprop(y[m], w[m], psu[m], strata[m])})

# District context (children's file: children of interviewed mothers)
kr_d = kr.sdistrict.map(DISTRICTS)
def context_for(m):
    def share(cond):
        return round(100 * np.average(np.asarray(cond)[m], weights=w[m]), 1)

    return {
        "poorest_two_quintiles": share(kr.v190.isin([1, 2])),
        "mother_secondary_plus": share(kr.v106 >= 2),
        "short_birth_interval": share(kr.b11 < 24),
        "improved_toilet": share(kr.v116.isin(improved_toilet)),
        "insured": share(kr.v481 == 1),
    }


context = {name: context_for((kr_d == name).values) for name in DISTRICTS.values()}
context_national = context_for(np.ones(len(kr), bool))

# ---------------------------------------------------------------- model
cols = [(c, lv) for c in ORDER for lv in ORDER[c] if lv != REFERENCE[c] and (feat[c] == lv).any()]
X = pd.DataFrame({f"{c}={lv}": (feat[c] == lv).astype(float) for c, lv in cols})

# 1) Inference: weighted logistic regression with cluster-robust standard errors
wn = w / w.mean()
glm = sm.GLM(y, sm.add_constant(X), family=sm.families.Binomial(), var_weights=wn).fit(
    cov_type="cluster", cov_kwds={"groups": psu})
ci = glm.conf_int()

# 2) Out-of-sample performance: logistic vs gradient boosting, 5-fold CV
cv = StratifiedKFold(5, shuffle=True, random_state=7)
auc = {"logistic": [], "gradient_boosting": []}
oof = np.zeros(len(y))
for tr, te in cv.split(X, y):
    lr = LogisticRegression(max_iter=3000, C=1e6).fit(X.iloc[tr], y[tr], sample_weight=w[tr])
    gb = HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, max_iter=300, random_state=7)
    gb.fit(X.iloc[tr], y[tr], sample_weight=w[tr])
    oof[te] = lr.predict_proba(X.iloc[te])[:, 1]
    auc["logistic"].append(roc_auc_score(y[te], oof[te], sample_weight=w[te]))
    auc["gradient_boosting"].append(roc_auc_score(y[te], gb.predict_proba(X.iloc[te])[:, 1], sample_weight=w[te]))
auc = {k: round(float(np.mean(v)), 3) for k, v in auc.items()}

dec = pd.qcut(oof, 10, labels=False, duplicates="drop")
calibration = [{"decile": int(d) + 1,
                "predicted": round(100 * np.average(oof[dec == d], weights=w[dec == d]), 1),
                "observed": round(100 * np.average(y[dec == d], weights=w[dec == d]), 1)}
               for d in sorted(set(dec))]

coefficients = {}
for c in ORDER:
    coefficients[c] = {}
    for lv in ORDER[c]:
        k = f"{c}={lv}"
        if lv == REFERENCE[c]:
            coefficients[c][lv] = {"beta": 0.0, "or": 1.0, "low": 1.0, "high": 1.0, "p": None, "reference": True}
        elif k in glm.params:
            coefficients[c][lv] = {"beta": round(float(glm.params[k]), 4), "or": round(float(np.exp(glm.params[k])), 2),
                                   "low": round(float(np.exp(ci.loc[k, 0])), 2),
                                   "high": round(float(np.exp(ci.loc[k, 1])), 2),
                                   "p": round(float(glm.pvalues[k]), 4), "reference": False}

# ---------------------------------------------------------------- districts (report Table D.4 + microdata CIs)
d4 = pd.read_csv(ROOT / "data" / "rdhs2025_district_child_nutrition.csv").set_index("district")
districts = []
for code, name in DISTRICTS.items():
    m = pr.shdistrict == code
    est = pr_prop(m)
    assert abs(est["value"] - d4.loc[name, "stunting_pct"]) < 0.05, f"{name} does not match Table D.4"
    districts.append({
        "name": name, "code": code, "province": d4.loc[name, "province"],
        "stunting": est, "severe": float(d4.loc[name, "severe_stunting_pct"]),
        "underweight": float(d4.loc[name, "underweight_pct"]), "wasting": float(d4.loc[name, "wasting_pct"]),
        "overweight": float(d4.loc[name, "overweight_pct"]),
        "share_of_stunted": round(100 * (pr.w[m] * pr.stunted[m]).sum() / total_stunted_w, 1),
        "context": context[name],
    })

out = {
    "meta": {
        "generated": date.today().isoformat(),
        "source": "NISR, MOH and ICF. Rwanda Demographic and Health Survey 2025 (RDHS 2025): Final Report and microdata.",
        "children_measured": national["n"],
        "children_in_model": int(len(y)),
    },
    "national": {"stunting": national, "severe": 6.4, "underweight": 6.1, "wasting": 0.9, "overweight": 5.1,
                 "context": context_national},
    "trend": [{"label": l, "value": v} for l, v in TREND] + [{"label": "2025", "value": national["value"]}],
    "provinces": provinces,
    "age_curve": age_curve,
    "districts": districts,
    "gaps": gaps,
    "model": {"intercept": round(float(glm.params["const"]), 4), "reference": REFERENCE, "order": ORDER,
              "coefficients": coefficients, "cv_auc": auc, "calibration": calibration, "n": int(len(y))},
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1))

print(f"National {national['value']}% [{national['low']}–{national['high']}], n={national['n']}")
print("Provinces:", {p['name']: p['value'] for p in provinces})
print("CV AUC:", auc)
print("Largest shares of stunted children:",
      sorted(((d["name"], d["share_of_stunted"]) for d in districts), key=lambda t: -t[1])[:4])
for c in ["wealth", "mother_height", "birth_interval", "birth_size", "insurance", "water", "toilet"]:
    print(c, {lv: (v["or"], v["low"], v["high"]) for lv, v in coefficients[c].items() if not v["reference"]})
print("Wrote", OUT.relative_to(ROOT), f"{OUT.stat().st_size / 1024:.0f} KB")
