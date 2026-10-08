"""Child stunting explorer — Team NavySec, NISR Big Data Hackathon 2026 (Track 3).

Data: district indicators from the RDHS 2025 Final Report (Table D.4), plus aggregated outputs
built from RDHS 2025 microdata by analysis/build_outputs.py (no respondent-level data ships with the app).
"""
import json
import math
from pathlib import Path

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

DATA = Path(__file__).parent / "data"
NATIONAL = {"stunting_pct": 26.8, "severe_stunting_pct": 6.4, "wasting_pct": 0.9,
            "underweight_pct": 6.1, "overweight_pct": 5.1}
INDICATORS = {
    "stunting_pct": "Stunting (height-for-age < -2 SD), %",
    "severe_stunting_pct": "Severe stunting (< -3 SD), %",
    "underweight_pct": "Underweight, %",
    "wasting_pct": "Wasting, %",
    "overweight_pct": "Overweight, %",
}
FACTOR_LABELS = {
    "age": "Child's age", "sex": "Child's sex", "wealth": "Household wealth", "mother_education": "Mother's education",
    "residence": "Residence", "mother_height": "Mother's height", "birth_interval": "Time since previous birth",
    "birth_size": "Size at birth (mother's report)", "water": "Drinking water source", "toilet": "Toilet facility",
    "recent_diarrhea": "Diarrhoea in last 2 weeks", "health_insurance": "Mother has health insurance",
    "province": "Province",
}
LEVEL_ORDER = {
    "age": ["0-5m", "6-11m", "12-23m", "24-35m", "36-47m", "48-59m"],
    "wealth": ["Poorest", "Poorer", "Middle", "Richer", "Richest"],
    "mother_education": ["None", "Primary", "Secondary", "Higher"],
    "mother_height": ["<145cm", "145-150cm", "150-155cm", "155cm+", "Not measured"],
    "birth_interval": ["First birth", "<24 months", "24-47 months", "48+ months"],
    "province": ["Kigali", "South", "West", "North", "East"],
}
# Factors a programme or family can change, used in the "what if" view
MODIFIABLE = ["birth_interval", "water", "toilet", "recent_diarrhea", "health_insurance"]


@st.cache_data
def load():
    df = pd.read_csv(DATA / "rdhs2025_district_child_nutrition.csv")
    ci = pd.read_csv(DATA / "district_stunting_microdata.csv")[["district", "ci_low", "ci_high"]]
    df = df.merge(ci, on="district")
    geo = json.loads((DATA / "rwanda_districts.geojson").read_text())
    model = json.loads((DATA / "stunting_model.json").read_text())
    gaps = pd.read_csv(DATA / "stunting_gaps.csv")
    return df, geo, model, gaps


def priority(row):
    if row.stunting_pct >= 30 or row.severe_stunting_pct >= 9:
        return "High"
    if row.stunting_pct >= NATIONAL["stunting_pct"]:
        return "Medium"
    return "Lower"


def risk(model, profile):
    z = model["intercept"] + sum(model["coefficients"][f][lv] for f, lv in profile.items())
    return 1 / (1 + math.exp(-z))


st.set_page_config(page_title="Stunting Explorer", layout="wide")
df, geo, model, gaps = load()
df["priority"] = df.apply(priority, axis=1)

st.title("Where are Rwanda's children falling behind?")
st.caption("Child stunting in Rwanda · Source: NISR, Rwanda Demographic and Health Survey (RDHS) 2025")

tab_map, tab_drivers, tab_risk, tab_about = st.tabs(["🗺️ District map", "📊 What drives stunting", "🧮 Risk check", "ℹ️ About"])

# ---------------------------------------------------------------- District map
with tab_map:
    col_a, col_b = st.columns(2)
    ind = col_a.selectbox("Indicator", list(INDICATORS), format_func=INDICATORS.get)
    provinces = col_b.multiselect("Province", sorted(df.province.unique()), default=sorted(df.province.unique()))
    view = df[df.province.isin(provinces)]

    k1, k2, k3, k4 = st.columns(4)
    k1.metric("National stunting", f"{NATIONAL['stunting_pct']}%", "-6 pts vs 2019–20", delta_color="inverse")
    k2.metric("Highest district", df.loc[df.stunting_pct.idxmax(), "district"], f"{df.stunting_pct.max()}%", delta_color="off")
    k3.metric("Lowest district", df.loc[df.stunting_pct.idxmin(), "district"], f"{df.stunting_pct.min()}%", delta_color="off")
    k4.metric("High-priority districts", int((df.priority == "High").sum()), "of 30", delta_color="off")

    left, right = st.columns([3, 2])
    with left:
        fig = px.choropleth_map(
            view, geojson=geo, locations="district", featureidkey="properties.shapeName",
            color=ind, color_continuous_scale="OrRd", hover_name="district",
            hover_data={"province": True, ind: ":.1f", "n_children": True, "district": False},
            labels={ind: INDICATORS[ind].split(",")[0]},
            map_style="carto-positron", center={"lat": -1.95, "lon": 29.9}, zoom=7.2, opacity=0.85,
        )
        fig.update_layout(margin=dict(l=0, r=0, t=0, b=0), height=520)
        st.plotly_chart(fig, use_container_width=True)
    with right:
        ranked = view.sort_values(ind)
        bar = px.bar(ranked, x=ind, y="district", orientation="h", color="province",
                     labels={ind: INDICATORS[ind].split(",")[0], "district": ""},
                     category_orders={"district": ranked.district.tolist()[::-1]})
        bar.add_vline(x=NATIONAL[ind], line_dash="dash", annotation_text="National")
        bar.update_layout(height=520, margin=dict(l=0, r=0, t=0, b=0), legend_title_text="")
        st.plotly_chart(bar, use_container_width=True)

    st.subheader("District profile")
    d = st.selectbox("Choose a district", sorted(df.district))
    r = df.set_index("district").loc[d]
    c = st.columns(len(INDICATORS) + 1)
    for i, (k, label) in enumerate(INDICATORS.items()):
        c[i].metric(label.split(" (")[0].split(",")[0], f"{r[k]:.1f}%", f"{r[k] - NATIONAL[k]:+.1f} vs national",
                    delta_color="inverse")
    c[-1].metric("Priority", r.priority)
    st.caption(f"Stunting in {d}: {r.stunting_pct:.1f}% (95% confidence interval {r.ci_low:.1f}–{r.ci_high:.1f}%), "
               f"based on {int(r.n_children)} measured children. Districts whose intervals overlap may not truly differ.")

# ---------------------------------------------------------------- Drivers
with tab_drivers:
    st.markdown("#### Stunting rate by household and child characteristics")
    factor = st.selectbox("Compare by", [f for f in FACTOR_LABELS if f in gaps.factor.unique()],
                          format_func=FACTOR_LABELS.get, index=2)
    g = gaps[gaps.factor == factor]
    order = LEVEL_ORDER.get(factor, sorted(g.level))
    fig = px.bar(g, x="level", y="stunting_pct", text="stunting_pct", category_orders={"level": order},
                 labels={"level": "", "stunting_pct": "Children stunted, %"})
    fig.update_traces(texttemplate="%{text:.0f}%", marker_color="#c0392b")
    fig.add_hline(y=NATIONAL["stunting_pct"], line_dash="dash", annotation_text="National 26.8%")
    fig.update_layout(height=380, margin=dict(l=0, r=0, t=10, b=0))
    st.plotly_chart(fig, use_container_width=True)
    st.caption("Weighted percentages from RDHS 2025 microdata. These are raw differences, not controlled for other factors.")

    st.markdown("#### Which factors matter once everything else is held equal?")
    rows = [dict(factor=FACTOR_LABELS[f], level=lv, odds_ratio=math.exp(v))
            for f, d_ in model["coefficients"].items() for lv, v in d_.items() if lv != model["reference"][f]]
    orr = pd.DataFrame(rows).sort_values("odds_ratio")
    orr["label"] = orr.factor + ": " + orr.level
    show = orr[(orr.odds_ratio >= 1.25) | (orr.odds_ratio <= 0.8)]
    fig = go.Figure(go.Bar(x=show.odds_ratio, y=show.label, orientation="h",
                           marker_color=["#c0392b" if v > 1 else "#2e86c1" for v in show.odds_ratio]))
    fig.add_vline(x=1, line_dash="dash")
    fig.update_layout(height=520, margin=dict(l=0, r=0, t=10, b=0), xaxis_title="Odds ratio vs reference group (log scale)",
                      xaxis_type="log")
    st.plotly_chart(fig, use_container_width=True)
    st.caption(f"Logistic regression on {model['n_children']:,} children, weighted. An odds ratio of 2 means the odds of "
               "stunting are twice those of the reference group (e.g. richest households, mothers 155cm+), holding the "
               "other factors fixed. Shows associations, not proof of cause.")

# ---------------------------------------------------------------- Risk check
with tab_risk:
    st.markdown("#### Estimated stunting risk for a child profile")
    st.caption("Pick a profile, then change the modifiable factors to see how much risk could fall.")
    cols = st.columns(3)
    profile = {}
    defaults = {"age": "12-23m", "sex": "Boy", "wealth": "Poorest", "mother_education": "Primary", "residence": "Rural",
                "mother_height": "150-155cm", "birth_interval": "<24 months", "birth_size": "Average or larger",
                "water": "Unimproved", "toilet": "Unimproved", "recent_diarrhea": "Yes", "health_insurance": "No",
                "province": "North"}
    for i, f in enumerate(FACTOR_LABELS):
        opts = [lv for lv in model["levels"][f] if lv not in ("Not measured", "Unknown")]
        profile[f] = cols[i % 3].selectbox(FACTOR_LABELS[f], opts, index=opts.index(defaults[f]), key=f"p_{f}")

    p_now = risk(model, profile)
    better = dict(profile, birth_interval="48+ months" if profile["birth_interval"] != "First birth" else "First birth",
                  water="Improved", toilet="Improved", recent_diarrhea="No", health_insurance="Yes")
    p_better = risk(model, better)

    m1, m2, m3 = st.columns(3)
    m1.metric("Estimated risk for this profile", f"{100 * p_now:.0f}%")
    m2.metric("If modifiable factors improve", f"{100 * p_better:.0f}%", f"{100 * (p_better - p_now):+.0f} pts",
              delta_color="inverse")
    m3.metric("National average", f"{NATIONAL['stunting_pct']}%")
    st.caption("Modifiable factors: birth spacing (48+ months), improved water and toilet, no recent diarrhoea, "
               "health insurance. Estimates come from a population model and are not a diagnosis for an individual child. "
               f"Model accuracy (cross-validated AUC): {model['cv_auc']['logistic']}.")

# ---------------------------------------------------------------- About
with tab_about:
    st.markdown(f"""
**Problem.** About 1 in 4 Rwandan children under five are stunted (26.8%, RDHS 2025). Reducing stunting is a
national priority under NST2. The national average hides large gaps: stunting is 8.7% in Nyarugenge but 38.8% in
Gicumbi, and 40% among the poorest households against 9% among the richest.

**What this tool does.** It shows planners *where* stunting is concentrated (district map, with confidence
intervals) and *which household factors* are most strongly linked to it. It also estimates how much risk
could fall when modifiable conditions improve.

**Data and methods.**
- NISR, MOH and ICF, *Rwanda Demographic and Health Survey 2025*: Final Report (Table D.4) and microdata
  (household-member and children's recode files), used under NISR's public-use terms. No microdata is included in this app.
- District estimates: weighted, de facto children under 5, with 95% confidence intervals that account for
  cluster sampling. They reproduce the official Table D.4 exactly.
- Model: weighted logistic regression on {model['n_children']:,} living children with valid height-for-age.
  Cross-validated AUC is {model['cv_auc']['logistic']} (logistic) vs {model['cv_auc']['gradient_boosting']} (gradient
  boosting). We chose the logistic model because it is equally accurate and easier to interpret.
- District boundaries: geoBoundaries (CC BY 4.0).

**Limitations.** The data is cross-sectional, so the model shows associations, not proof of cause. District sample sizes are small (about 170–550 children each).

*Team NavySec: ISHIMWE Marie Pauline & CYUZUZO Pacifique, University of Rwanda (CST). AI-assisted; see the AI use disclosure in the repository.*
""")
