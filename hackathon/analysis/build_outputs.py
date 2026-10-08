"""Build aggregated outputs for the app from RDHS 2025 microdata.

Reads the raw DHS recode files in ../microdata (git-ignored, never published) and writes
only aggregated results to ../data:
  - district_stunting_microdata.csv  weighted district estimates with 95% CIs
  - stunting_model.json              logistic-regression coefficients + model evaluation
  - stunting_gaps.csv                weighted stunting by background characteristic

Run:  .venv/bin/python analysis/build_outputs.py
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold

ROOT = Path(__file__).resolve().parents[1]
MICRO = ROOT / "microdata"
OUT = ROOT / "data"

DISTRICTS = {11: "Nyarugenge", 12: "Gasabo", 13: "Kicukiro", 21: "Nyanza", 22: "Gisagara", 23: "Nyaruguru",
             24: "Huye", 25: "Nyamagabe", 26: "Ruhango", 27: "Muhanga", 28: "Kamonyi", 31: "Karongi",
             32: "Rutsiro", 33: "Rubavu", 34: "Nyabihu", 35: "Ngororero", 36: "Rusizi", 37: "Nyamasheke",
             41: "Rulindo", 42: "Gakenke", 43: "Musanze", 44: "Burera", 45: "Gicumbi", 51: "Rwamagana",
             52: "Nyagatare", 53: "Gatsibo", 54: "Kayonza", 55: "Kirehe", 56: "Ngoma", 57: "Bugesera"}


def weighted_mean_ci(y, w, psu, strata):
    """Weighted proportion with a Taylor-linearised SE that accounts for clustering (PSU within strata)."""
    est = np.sum(w * y) / np.sum(w)
    z = w * (y - est) / np.sum(w)
    df = pd.DataFrame({"z": z, "psu": psu, "strata": strata})
    tot = df.groupby(["strata", "psu"]).z.sum().reset_index()
    var = 0.0
    for _, g in tot.groupby("strata"):
        n = len(g)
        if n > 1:
            var += n / (n - 1) * np.sum((g.z - g.z.mean()) ** 2)
    se = np.sqrt(var)
    return est, max(0.0, est - 1.96 * se), min(1.0, est + 1.96 * se)


# ---------- 1. District estimates from the household-member file (matches report Table D.4) ----------
pr = pd.read_stata(MICRO / "RWPR91FL.dta", convert_categoricals=False,
                   columns=["hv005", "hv021", "hv022", "hv103", "hc70", "shdistrict"])
pr = pr[(pr.hv103 == 1) & (pr.hc70 < 9990)].copy()
pr["stunted"] = (pr.hc70 < -200).astype(float)
pr["w"] = pr.hv005 / 1e6
rows = []
for code, name in DISTRICTS.items():
    d = pr[pr.shdistrict == code]
    est, lo, hi = weighted_mean_ci(d.stunted.values, d.w.values, d.hv021.values, d.hv022.values)
    rows.append(dict(district=name, stunting_pct=round(100 * est, 1), ci_low=round(100 * lo, 1),
                     ci_high=round(100 * hi, 1), n_children=len(d)))
nat = weighted_mean_ci(pr.stunted.values, pr.w.values, pr.hv021.values, pr.hv022.values)
dist = pd.DataFrame(rows)
dist.to_csv(OUT / "district_stunting_microdata.csv", index=False)
print(f"National stunting (PR, de facto): {100 * nat[0]:.1f}% [{100 * nat[1]:.1f}–{100 * nat[2]:.1f}]")

# ---------- 2. Child-level model from the children's file ----------
kr = pd.read_stata(MICRO / "RWKR91FL.dta", convert_categoricals=False)
kr = kr[(kr.b5 == 1) & (kr.hw70 < 9990)].copy()
kr["stunted"] = (kr.hw70 < -200).astype(int)
kr["w"] = kr.v005 / 1e6
age = kr.hw1

improved_water = {11, 12, 13, 14, 21, 31, 41, 51, 61, 62, 71}
improved_toilet = {11, 12, 13, 21, 22, 41}
mh = kr.v438.where(kr.v438 < 9990) / 10

feat = pd.DataFrame({
    "age": pd.cut(age, [-1, 5, 11, 23, 35, 47, 59], labels=["0-5m", "6-11m", "12-23m", "24-35m", "36-47m", "48-59m"]),
    "sex": kr.b4.map({1: "Boy", 2: "Girl"}),
    "wealth": kr.v190.map({1: "Poorest", 2: "Poorer", 3: "Middle", 4: "Richer", 5: "Richest"}),
    "mother_education": kr.v106.map({0: "None", 1: "Primary", 2: "Secondary", 3: "Higher"}),
    "residence": kr.v025.map({1: "Urban", 2: "Rural"}),
    "mother_height": pd.cut(mh, [0, 145, 150, 155, 300], labels=["<145cm", "145-150cm", "150-155cm", "155cm+"],
                            right=False).astype(object).fillna("Not measured"),
    "birth_interval": np.select([kr.b11.isna(), kr.b11 < 24, kr.b11 < 48], ["First birth", "<24 months", "24-47 months"],
                                "48+ months"),
    "birth_size": kr.m18.map({1: "Average or larger", 2: "Average or larger", 3: "Average or larger",
                              4: "Small", 5: "Small"}).fillna("Unknown"),
    "water": np.where(kr.v113.isin(improved_water), "Improved", "Unimproved"),
    "toilet": np.where(kr.v116.isin(improved_toilet), "Improved", "Unimproved"),
    "recent_diarrhea": np.where(kr.h11.isin([1, 2]), "Yes", "No"),
    "health_insurance": kr.v481.map({0: "No", 1: "Yes"}),
    "province": kr.v024.map({1: "Kigali", 2: "South", 3: "West", 4: "North", 5: "East"}),
}).astype(str)

REFERENCE = {"age": "0-5m", "sex": "Girl", "wealth": "Richest", "mother_education": "Higher", "residence": "Urban",
             "mother_height": "155cm+", "birth_interval": "48+ months", "birth_size": "Average or larger",
             "water": "Improved", "toilet": "Improved", "recent_diarrhea": "No", "health_insurance": "Yes",
             "province": "Kigali"}
LEVELS = {c: [REFERENCE[c]] + sorted(v for v in feat[c].unique() if v != REFERENCE[c]) for c in feat}

X = pd.get_dummies(feat.astype(pd.CategoricalDtype()).apply(lambda s: s.cat.set_categories(LEVELS[s.name])),
                   drop_first=True).astype(float)
y, w = kr.stunted.values, kr.w.values

# Stunting gaps by characteristic (weighted, descriptive)
gaps = []
for c in feat:
    for lv in LEVELS[c]:
        m = (feat[c] == lv).values
        if m.sum() >= 30:
            gaps.append(dict(factor=c, level=lv, stunting_pct=round(100 * np.average(y[m], weights=w[m]), 1),
                             n=int(m.sum())))
pd.DataFrame(gaps).to_csv(OUT / "stunting_gaps.csv", index=False)

# Cross-validated comparison: interpretable logistic regression vs gradient boosting
cv = StratifiedKFold(5, shuffle=True, random_state=7)
auc = {"logistic": [], "gradient_boosting": []}
for tr, te in cv.split(X, y):
    lr = LogisticRegression(max_iter=2000, C=1.0).fit(X.iloc[tr], y[tr], sample_weight=w[tr])
    gb = HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, max_iter=300, random_state=7)
    gb.fit(X.iloc[tr], y[tr], sample_weight=w[tr])
    auc["logistic"].append(roc_auc_score(y[te], lr.predict_proba(X.iloc[te])[:, 1], sample_weight=w[te]))
    auc["gradient_boosting"].append(roc_auc_score(y[te], gb.predict_proba(X.iloc[te])[:, 1], sample_weight=w[te]))
auc = {k: round(float(np.mean(v)), 3) for k, v in auc.items()}
print("Cross-validated AUC:", auc)

final = LogisticRegression(max_iter=2000, C=1.0).fit(X, y, sample_weight=w)
coefs = dict(zip(X.columns, final.coef_[0].round(4)))
model = {
    "source": "NISR RDHS 2025 microdata, children's recode (RWKR91FL), living children with valid height-for-age",
    "n_children": int(len(y)),
    "weighted_stunting_pct": round(100 * np.average(y, weights=w), 1),
    "intercept": round(float(final.intercept_[0]), 4),
    "reference": REFERENCE,
    "levels": LEVELS,
    "coefficients": {c: {lv: float(coefs.get(f"{c}_{lv}", 0.0)) for lv in LEVELS[c]} for c in LEVELS},
    "cv_auc": auc,
}
(OUT / "stunting_model.json").write_text(json.dumps(model, indent=2))

top = sorted(((c, lv, v) for c, d in model["coefficients"].items() for lv, v in d.items() if v), key=lambda t: -t[2])
print("Strongest risk factors (odds ratio vs reference):")
for c, lv, v in top[:10]:
    print(f"  {c:18s} {lv:22s} OR={np.exp(v):.2f}")
