# Team NavySec: NISR 2026 Competitions

ISHIMWE Marie Pauline (team leader) · CYUZUZO Pacifique. UR CST, Computer Engineering.

| Competition | Deadline | Our target |
|---|---|---|
| Big Data Hackathon (Track 3: Open Innovation, health) | 30 Oct 2026, 11:59 PM | Submit 29 Oct |
| Infographic Competition (RDHS 2025) | 31 Oct 2026 | Submit 30 Oct |

## Theme: child stunting in Rwanda (RDHS 2025)

Key facts (sources: RDHS 2025 Key Indicators, Table 13; Final Report, Table D.4):

- National stunting is **27%**, down from 51% (2005) and 33% (2019–20).
- By district it ranges from **8.7% (Nyarugenge)** to **38.8% (Gicumbi)**, about 4.5x. 11 of 30 districts are at 30% or higher.
- By wealth: **40%** in the poorest quintile vs **9%** in the richest.
- By mother's education: **38%** with no education vs **6%** with more than secondary.
- Stunting peaks at **33% for ages 12–23 months**, so the first 1,000 days matter most.
- Rural 30% vs urban 19%. North and West provinces are about 33%.

## Folders

- `data/rdhs2025/` holds the original NISR PDFs, plus text versions extracted from them.
- `data/processed/rdhs2025_district_child_nutrition.csv` has stunting, wasting, underweight and overweight for all 30 districts (from Table D.4).
- `infographic/` holds the static and dynamic infographic.
- `hackathon/` holds the Gukura web app and analysis (live at https://pacyuzu16.github.io/NISR/). See `hackathon/README.md`.

## To-do

- [x] Request RDHS 2025 microdata (done 8 Oct)
- [ ] Both of us read the Key Indicators booklet, sections 3.8 (maternal care) and 3.11 (nutrition).
- [ ] Confirm the infographic story angle.
- [ ] Look up NST2's stunting target and cite it.
- [x] District boundary file (geoBoundaries)
- [ ] Keep `AI_USE_LOG.md` up to date. Disclosure is required for the hackathon.
