# Stunting District Explorer (Team NavySec)

NISR Big Data Hackathon 2026, Track 3 (Open Innovation: Health). An interactive tool showing where child stunting is highest in Rwanda, to help planners prioritise districts.

**Status:** v0 uses district indicators from the RDHS 2025 Final Report (Table D.4). Next comes a household-level risk model built on RDHS 2025 microdata.

## Run locally
```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/streamlit run app.py
```

## Data
- NISR, MOH and ICF (2026). *Rwanda Demographic and Health Survey 2025 Final Report*, Appendix D, Table D.4.
- District boundaries: geoBoundaries, RWA ADM2 (CC BY 4.0).
- RDHS microdata is **not** included in this repo (NISR access terms).

## AI use disclosure
See `../AI_USE_LOG.md`.
