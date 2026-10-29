# Gukura: child stunting in Rwanda, district by district

**Team NavySec** · NISR Big Data Hackathon 2026 · Track 3: Open Innovation (Health)
ISHIMWE Marie Pauline (Team Leader) & CYUZUZO Pacifique · University of Rwanda, College of Science and Technology, Computer Engineering

| | |
|---|---|
| **Live app** | https://pacyuzu16.github.io/NISR/ (public, no login needed) |
| **Demo video** | [`demo/demo.webm`](demo/demo.webm) (under 3 minutes) |
| **Documentation** | [`hackathon/DOCUMENTATION.md`](hackathon/DOCUMENTATION.md) · [PDF](hackathon/DOCUMENTATION.pdf) |
| **Data** | [`data/`](data/) · see [`data/README.md`](data/README.md) for files and links |
| **Eligibility** | [`student_cards/student_cards.pdf`](student_cards/student_cards.pdf) |

---

## What data the app uses

- **RDHS 2025 microdata** from the NISR Microdata Catalogue
  ([catalog 126](https://microdata.statistics.gov.rw/index.php/catalog/126)): the household-member and children's
  files, covering 7,261 measured children under five.
- **RDHS 2025 Final Report**, Table D.4: district nutrition indicators.
- **NST2 (2024–2029)** target: stunting below 15% by 2029.
- **District boundaries** from geoBoundaries (CC BY 4.0).

The raw microdata cannot be redistributed under NISR's terms, so the repository contains only aggregated results.
[`data/README.md`](data/README.md) explains every file and how to download the source data.

## What it is trying to communicate

About **one in four Rwandan children under five is stunted (26.8%)**, and NST2 aims for **below 15% by 2029**.
The national average hides large gaps, so Gukura answers the questions a district planner needs:

- **Where?** District stunting ranges from **8.7% (Nyarugenge) to 38.8% (Gicumbi)**. **Rubavu and Nyagatare** hold the
  most stunted children (about 6% of the national total each), even though neither has the highest rate.
- **Why?** Poverty is the strongest factor: the poorest homes have **4.6×** the odds of the richest. The mother's
  height and small size at birth show stunting passing between generations. **Birth spacing** is the strongest
  factor families can change.
- **What would it take?** Even seven programmes at full coverage would cut stunting only to about **20%**, closing
  about **55% of the gap** to the target. Child feeding and nutrition programmes are needed too.

## How to use it

| Page | What you can do |
|---|---|
| **Overview** | See the national rate, the trend since 2005 against the NST2 target, and how stunting builds up before age two. |
| **Districts** | Switch the map between stunting rate, share of stunted children, severe stunting and underweight. Filter by province or search. Click a district for its profile: confidence interval, priority level, where it is behind Rwanda, and similar districts doing better. **Print brief** gives a one-page summary; **Download data (CSV)** exports the table. The *rate vs number* chart shows which districts need action first. |
| **Drivers** | Compare stunting across 13 characteristics, then see what still matters when all are weighed together (odds ratios with 95% confidence intervals). |
| **Scenarios** | Move the coverage sliders for seven programmes, or pick a preset, to see the projected rate for Rwanda or any district and how much of the gap to 15% is closed. |
| **Risk check** | Describe a child, or start from an example, to get an estimated risk and see how much it falls when conditions improve. |
| **Methods** | Data sources, methods, model accuracy (AUC 0.71) and calibration, limitations and privacy. |

The app works on phones, tablets and desktops, in light and dark themes. Every chart has a table view, and it can
be used with the keyboard alone.

## How it's built

| Part | Tools |
|---|---|
| Analysis | Python: pandas, statsmodels, scikit-learn. Survey-weighted estimates with design-based 95% confidence intervals; weighted logistic regression with cluster-robust standard errors, compared with gradient boosting; scenario simulation by g-computation; nearest-neighbour peer districts |
| Web app | React + TypeScript + Vite, custom SVG charts, d3-geo map |
| Hosting | GitHub Pages, deployed automatically by GitHub Actions |

## Repository structure

```
README.md                     this file
requirements.txt              Python packages for the analysis
data/                         aggregated results, district table, map boundaries (+ README with source links)
demo/demo.webm                demo video (under 3 minutes)
student_cards/                student cards of both team members
hackathon/
  analysis/build_outputs.py   microdata → aggregated results (checks against the official report)
  web/                        the web app (src/ code, public/data/ results it displays)
  DOCUMENTATION.md / .pdf     full documentation
```

## Run it on any machine

```bash
# Web app (needs Node.js 20+)
cd hackathon/web
npm install
npm run dev            # opens http://localhost:5173

# Optional: rebuild the results from the microdata (see data/README.md to download it)
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python hackathon/analysis/build_outputs.py
```
