# Data

All data comes from the **Rwanda Demographic and Health Survey 2025 (RDHS 2025)**, published by the National Institute of
Statistics of Rwanda (NISR), the Ministry of Health and ICF.

## Files in this repository

| File | What it contains |
|---|---|
| `processed/gukura_district_results.csv` | **Main results for all 30 districts:** stunting rate with 95% confidence interval, severe stunting, underweight, wasting, overweight, share of Rwanda's stunted children, priority level, household context (poverty, mothers' schooling, birth spacing, toilets, insurance), projected stunting with all seven programmes, and peer districts. |
| `processed/rdhs2025_district_child_nutrition.csv` | District nutrition indicators copied from the RDHS 2025 Final Report, Appendix D, Table D.4. |
| `geo/rwanda_districts.geojson` | District boundaries (geoBoundaries, RWA ADM2, CC BY 4.0), used for the map. |
| `../hackathon/web/public/data/gukura.json` | Everything the web app displays: national, province, age and district estimates, gaps by characteristic, model coefficients and performance, and scenario results. |

## Links to the source data

- **RDHS 2025 microdata** (household-member and children's recode files):
  https://microdata.statistics.gov.rw/index.php/catalog/126
- **RDHS 2025 Final Report and Key Indicators Report:**
  https://statistics.gov.rw/data-sources/surveys/Demographic-and-Health-Survey/demographic-and-health-survey-2025
- **District boundaries:** https://www.geoboundaries.org (Rwanda, ADM2)

## Why the raw microdata is not included

The RDHS 2025 microdata is available free of charge from the NISR Microdata Catalogue, but its terms of use do not
allow it to be redistributed. The files are also large (about 285 MB). To reproduce our results:

1. Register on the NISR Microdata Catalogue, open RDHS 2025 (catalog 126) and click **Get Microdata**.
2. Unzip the files into `hackathon/microdata/`. We use `RWPR91FL.dta` and `RWKR91FL.dta`.
3. Run `python hackathon/analysis/build_outputs.py`. It rebuilds every aggregated file above, and stops with an
   error if any district estimate does not match the official Table D.4.
