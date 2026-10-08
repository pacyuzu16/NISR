# Gukura: Child Stunting in Rwanda, District by District

**NISR Big Data Hackathon 2026 · Track 3: Open Innovation (Health)**

**Team NavySec:** ISHIMWE Marie Pauline (team leader) and CYUZUZO Pacifique, Computer Engineering, University of Rwanda, College of Science and Technology

- **Live app:** https://pacyuzu16.github.io/NISR/
- **Source code:** https://github.com/pacyuzu16/NISR
- **Data:** Rwanda Demographic and Health Survey 2025 (NISR, MOH, ICF): Final Report and microdata

---

## 1. The problem

Stunting means a child is too short for their age. It is the clearest sign of long-term undernutrition and poor
care in early life, and its effects on health, learning and earnings last into adulthood.

- In 2025, **26.8%** of Rwandan children under five were stunted (95% CI 25.4–28.1%), down from 51% in 2005.
- The second **National Strategy for Transformation (NST2, 2024–2029)** makes reducing stunting a headline
  priority, with a target of **below 15% by 2029**. That leaves almost 12 percentage points to cut in four years.
- The national average hides large gaps. District stunting ranges from **8.7% (Nyarugenge) to 38.8% (Gicumbi)**,
  and it is **40%** among children in the poorest households against **9%** in the richest.

District planners, the National Child Development Agency (NCDA) and partners need to know **where** to act first,
**which** household conditions matter most, and **how much** improvement to expect. The published report answers
these questions in hundreds of pages of tables. Gukura turns them into a tool.

## 2. The solution

Gukura ("to grow" in Kinyarwanda) is a web app with five pages.

| Page | What it answers | Main features |
|---|---|---|
| **Overview** | How big is the problem, and how close is the NST2 target? | Headline estimate with confidence interval, trend since 2005 against the 2029 target, stunting by age in months |
| **Districts** | Where is stunting highest, and where do most stunted children live? | Map of all 30 districts, four indicators, ranked list with 95% CIs, search and province filter, district profiles, priority level |
| **Drivers** | Which factors go with stunting once everything is weighed together? | Raw gaps by 13 characteristics with CIs; chart of adjusted odds ratios with plain-language interpretation |
| **Risk check** | For a given child, what is the estimated risk, and what would lower it? | Profile form with validation and examples; estimated risk against the national rate; effect of each modifiable improvement |
| **Methods** | Can the numbers be trusted? | Data sources, methods, AUC and calibration chart, limitations, privacy, AI-use disclosure |

### What makes it useful

1. **Rate *and* burden.** The *share of stunted children* view shows that **Rubavu (6.0%) and Nyagatare (5.9%)**
   hold the largest numbers of stunted children in Rwanda, even though neither has the highest rate. Planning on
   rates alone would miss them.
2. **Uncertainty shown everywhere.** Every district estimate has a 95% confidence interval. The district profile
   says whether a district is *clearly* above or below the national figure, or not clearly different.
3. **From evidence to action.** The district profile compares its households with the national average (poverty,
   mothers' schooling, birth spacing, toilets, insurance) and links straight to the risk check for that province.
4. **Honest about the model.** Effects that aren't statistically clear are shown in grey and flagged in the risk check.

## 3. Data

| Source | Use |
|---|---|
| RDHS 2025 microdata: household-member recode (PR) and children's recode (KR), from the NISR Microdata Catalogue (public-use terms) | All stunting estimates, confidence intervals, the model and district context |
| RDHS 2025 Final Report, Table D.4 | Severe stunting, wasting, underweight and overweight by district |
| Earlier RDHS reports (2005–2019/20) | National trend |
| NST2 (2024–2029) | Target of below 15% stunting by 2029 |
| geoBoundaries, Rwanda ADM2 (CC BY 4.0) | District boundaries for the map |

**Definition:** a child is stunted when their height-for-age z-score is below −2 SD of the WHO Child Growth Standards median.

## 4. Methodology

### 4.1 Estimates
- **Population:** de facto children under five with a valid height-for-age measurement (n = 7,261), as in the official report.
- **Weighting:** the survey's household sampling weights.
- **Uncertainty:** 95% confidence intervals by Taylor linearisation over the two-stage cluster design (sampling units within strata).
- **Validation:** our national (26.8%) and all 30 district estimates reproduce Table D.4 of the Final Report exactly. The build script fails if any district differs.
- **Share of stunted children:** the weighted number of stunted children in a district divided by the national weighted total.

### 4.2 Model
- **Outcome:** stunted (yes/no) for 6,715 living children of interviewed mothers (children's recode).
- **Predictors (13):** child's age, sex and size at birth; recent diarrhoea; mother's education, height, health insurance, and the time since her previous birth; household wealth, drinking-water source and toilet type; province; urban or rural residence.
- **Missing data:** mother's height (measured in a subsample) and size at birth (asked only for recent births) are kept as separate groups, so no child is dropped.
- **Estimation:** survey-weighted logistic regression with cluster-robust standard errors (statsmodels).
- **Model choice:** we compared it with gradient-boosted trees using 5-fold stratified cross-validation. The logistic model was at least as accurate and is far easier to interpret, so we kept it.

| Model | Cross-validated AUC |
|---|---|
| **Weighted logistic regression (chosen)** | **0.708** |
| Gradient-boosted trees | 0.693 |

Calibration is good: across tenths of predicted risk, observed stunting closely tracks the prediction (chart on the Methods page).

### 4.3 Main findings (adjusted odds ratios, 95% CI)

| Factor | Group vs reference | Odds ratio |
|---|---|---|
| Household wealth | Poorest vs richest | **4.64** (3.39–6.35) |
| Mother's height | 145–149 cm vs 155 cm or more | **2.96** (2.19–4.00) |
| Size at birth | Smaller than average vs average or larger | **2.23** (1.86–2.69) |
| Mother's education | No schooling vs higher | **2.43** (1.36–4.36) |
| Child's age | 12–23 months vs 0–5 months | **2.38** (1.83–3.08), the peak risk window |
| Birth interval | Under 2 years vs 4 years or more | **1.41** (1.09–1.83) |
| Toilet type | Unimproved vs improved | 0.99 (0.84–1.16), no independent effect |

**What this means:**
1. Poverty is the biggest single factor.
2. Stunting passes between generations, through the mother's height and the baby's size at birth.
3. **Birth spacing is the strongest factor families can change.**
4. Sanitation alone doesn't separate stunted from non-stunted children once wealth is accounted for. That doesn't make it unimportant.

## 5. Technology

| Layer | Choice | Why |
|---|---|---|
| Analysis | Python: pandas, statsmodels, scikit-learn | Survey-weighted estimation and model comparison |
| Output | One aggregated JSON file (about 30 KB) | No respondent-level data ever reaches the app |
| Front end | React + TypeScript + Vite | Fast and typed, with no server to maintain |
| Charts and map | Custom SVG components, d3-geo | Full control of accessibility, theming and confidence intervals |
| Hosting | GitHub Pages via GitHub Actions | Free, and deploys automatically on every push |

**Usability and design:**
- Works on phones (bottom tab bar, pinned risk result), tablets and desktops.
- Light and dark themes, using colour palettes checked for colour-blind readers.
- Full keyboard navigation with visible focus, a table view for every chart, and screen-reader labels.
- Loading, empty, error-with-retry and form-validation states.
- Links can be shared, e.g. `#/districts/Gicumbi`.

## 6. Impact

- **District planners and Joint Action Development Forums:** see where their district stands, how sure the estimate is, and which household factors it is behind on.
- **NCDA and the Ministry of Health:** target programmes by burden (number of children) as well as by rate.
- **Community health workers and partners:** use the risk check in planning conversations to show how birth spacing, insurance and illness prevention change a child's chances.
- **Accountability:** progress against the NST2 target is visible at a glance, and the tool can be updated when the next RDHS round is released by re-running one script.

## 7. Limitations

- The survey is a snapshot at one point in time, so the model shows associations, not causes.
- District samples are small (about 170–550 children each), which is why every district estimate shows a confidence interval.
- Diet and feeding practices aren't in the model yet. They are a natural next step.
- The risk check is for planning conversations, not for screening individual children.

## 8. Privacy and data ethics

The RDHS microdata was obtained under NISR's public-use terms and is never published. It is excluded from the code repository, and the app contains only aggregated estimates and model coefficients. No attempt is made to identify respondents.

## 9. How to run

```bash
# Rebuild the data (requires the RDHS 2025 microdata in hackathon/microdata/)
cd hackathon
python3 -m venv .venv && .venv/bin/pip install -r analysis/requirements.txt
.venv/bin/python analysis/build_outputs.py

# Run the web app
cd web && npm install && npm run dev
```

## 10. AI use disclosure

As the competition rules require, we disclose that we used an AI coding assistant (Claude, by Anthropic) for parts
of the data processing, analysis code, interface code and drafting of this documentation. Every use is recorded in
`AI_USE_LOG.md` in the repository. The team reviewed the outputs and is responsible for the analysis choices and
interpretation.

## 11. References

- National Institute of Statistics of Rwanda (NISR), Ministry of Health (MOH) and ICF (2026). *Rwanda Demographic and Health Survey 2025: Final Report.* Kigali and Rockville, MD.
- NISR, MOH and ICF (2025). *Rwanda Demographic and Health Survey 2025: Key Indicators Report.*
- Government of Rwanda (2024). *Second National Strategy for Transformation (NST2), 2024–2029.*
- WHO Multicentre Growth Reference Study Group (2006). *WHO Child Growth Standards.*
- Runfola, D. et al. (2020). geoBoundaries: A global database of political administrative boundaries. *PLoS ONE* 15(4).
