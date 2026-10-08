# Gukura: child stunting in Rwanda, district by district

**Team NavySec** · NISR Big Data Hackathon 2026 · Track 3: Open Innovation (Health)

**Live app:** https://pacyuzu16.github.io/NISR/ · **Documentation:** [DOCUMENTATION.md](DOCUMENTATION.md) ([PDF](DOCUMENTATION.pdf))

About one in four Rwandan children under five is stunted (26.8%, RDHS 2025). NST2 targets below 15% by 2029, but the national average hides large gaps between districts and households. Gukura gives
district planners three answers:

| Page | Question it answers |
|---|---|
| **Districts** | Where is stunting highest, and where do the most stunted children live? Map, ranking with confidence intervals, and a profile for each district. |
| **Drivers** | Which child, mother and household factors go with stunting once everything is weighed together? |
| **Risk check** | For a given child profile, what is the estimated risk, and how much would it fall if modifiable conditions improved? |
| **Methods** | Data, methods, model performance (AUC, calibration), limitations, privacy and AI-use disclosure. |

## Key findings

- District stunting ranges from **8.7% (Nyarugenge) to 38.8% (Gicumbi)**. 11 of 30 districts are at 30% or higher.
- **Rubavu and Nyagatare hold the most stunted children** (about 6% of the national total each), even though neither has the highest rate.
- Poverty is the strongest factor: the poorest homes have **4.6×** the odds of stunting of the richest, all else equal.
- Mother's height (about 3× below 150 cm) and small size at birth (2.2×) point to stunting passing between generations.
- **Birth spacing** is the strongest factor families can change (1.4× for births less than 2 years apart). Toilet type shows no independent effect once wealth is accounted for.

## How it's built

```
analysis/build_outputs.py   Python: microdata → aggregated JSON (survey-weighted, design-based CIs, model)
web/                        React + TypeScript + Vite static app (custom SVG charts, d3-geo map)
data/                       Published RDHS 2025 Table D.4 (district nutrition indicators)
microdata/                  RDHS 2025 recode files. Git-ignored; never published (NISR terms)
```

- **Estimates** are weighted with the survey's sampling weights, and their 95% confidence intervals use Taylor linearisation over the cluster design. District estimates reproduce the official Table D.4 exactly (the build script checks this).
- **Model**: weighted logistic regression with cluster-robust standard errors, on 6,715 children and 13 predictors. 5-fold cross-validated AUC is 0.708, against 0.693 for gradient boosting, and the model is well calibrated.
- **App**: static site, with no server and no respondent-level data. It works on phones, tablets and desktops, and has light and dark themes, keyboard navigation and a table view for every chart.

## Run it

```bash
# 1. Rebuild the data (needs the RDHS 2025 microdata in microdata/)
python3 -m venv .venv && .venv/bin/pip install -r analysis/requirements.txt
.venv/bin/python analysis/build_outputs.py

# 2. Run the web app
cd web && npm install && npm run dev
```

Pushing to `main` deploys the app to GitHub Pages (`.github/workflows/pages.yml`).

## Data sources

- NISR, MOH and ICF (2026). *Rwanda Demographic and Health Survey 2025*: Final Report and microdata (NISR Microdata Catalogue, public-use terms).
- Trend values for 2005–2019/20: earlier published RDHS reports.
- District boundaries: geoBoundaries, RWA ADM2 (CC BY 4.0).

## AI use disclosure

We used an AI coding assistant. Every use is logged in [`../AI_USE_LOG.md`](../AI_USE_LOG.md).
