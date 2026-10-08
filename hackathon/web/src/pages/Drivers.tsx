import { useState } from "react";
import { ColumnChart, ForestPlot, type ForestRow } from "../components/charts";
import { DataTable, Disclosure, Select } from "../components/ui";
import { FACTOR_LABELS, type Dataset, type Factor } from "../lib/data";

const GAP_FACTORS: Factor[] = [
  "wealth", "mother_education", "mother_height", "age", "birth_size", "birth_interval", "residence", "province",
  "sex", "insurance", "water", "toilet", "diarrhoea",
];

/** Order of the adjusted-effects plot: biggest, most actionable story first. */
const FOREST_FACTORS: Factor[] = [
  "wealth", "mother_height", "mother_education", "birth_size", "age", "birth_interval", "sex", "insurance",
  "diarrhoea", "water", "toilet", "residence", "province",
];

export function Drivers({ data }: { data: Dataset }) {
  const [factor, setFactor] = useState<Factor>("wealth");
  const national = data.national.stunting.value;
  const hiddenLevels = new Set(["Not measured", "Not reported"]);
  const gaps = data.gaps[factor].filter((g) => !hiddenLevels.has(g.level));
  const c = data.model.coefficients;

  const rows: ForestRow[] = FOREST_FACTORS.flatMap((f) =>
    data.model.order[f]
      .filter((lv) => c[f][lv] && !hiddenLevels.has(lv))
      .map((lv) => ({ group: FACTOR_LABELS[f], level: lv, ...c[f][lv] })),
  );
  const ors = (f: Factor, lv: string) => c[f][lv];
  const poorest = ors("wealth", "Poorest");
  const shortMother = ors("mother_height", "145–149 cm");
  const small = ors("birth_size", "Smaller than average");
  const spacing = ors("birth_interval", "Under 2 years");
  const toilet = ors("toilet", "Unimproved or none");

  return (
    <>
      <header className="page-head">
        <span className="eyebrow">Drivers</span>
        <h1>What goes with stunting, and what matters most</h1>
        <p className="lede">
          A child's chances depend on many things at once. First, see the raw gaps between groups. Then see what
          remains once every factor is weighed together, so a factor doesn't get credit that really belongs to
          another one, like wealth.
        </p>
      </header>

      <section className="card" aria-labelledby="gaps-title">
        <div className="section-head" style={{ marginBottom: 8 }}>
          <div>
            <h2 id="gaps-title" className="card-title" style={{ fontSize: 17 }}>
              Raw differences between groups
            </h2>
            <p className="card-sub">Children under 5 stunted, by {FACTOR_LABELS[factor].toLowerCase()} · bars show 95% confidence intervals</p>
          </div>
          <div style={{ width: 260, maxWidth: "100%" }}>
            <Select
              label="Compare by"
              value={factor}
              onChange={(v) => setFactor(v as Factor)}
              options={GAP_FACTORS.map((f) => ({ value: f, label: FACTOR_LABELS[f] }))}
            />
          </div>
        </div>
        <ColumnChart
          data={gaps.map((g) => ({ label: g.level, value: g.value, low: g.low, high: g.high, n: g.n }))}
          refValue={national}
          refLabel={`National ${national.toFixed(1)}%`}
          label={`Stunting by ${FACTOR_LABELS[factor]}: ${gaps.map((g) => `${g.level} ${g.value}%`).join(", ")}`}
        />
        <Disclosure summary="View as table">
          <DataTable
            caption={`Stunting by ${FACTOR_LABELS[factor]}`}
            rows={gaps}
            columns={[
              { key: "level", label: FACTOR_LABELS[factor], value: (r) => r.level },
              { key: "v", label: "Stunted", value: (r) => r.value, render: (r) => `${r.value.toFixed(1)}%`, numeric: true },
              { key: "ci", label: "95% CI", value: (r) => r.low, render: (r) => `${r.low}–${r.high}%`, numeric: true },
              { key: "n", label: "Children", value: (r) => r.n, numeric: true },
            ]}
          />
        </Disclosure>
      </section>

      <section className="section" aria-labelledby="forest-title">
        <div className="section-head">
          <div>
            <h2 id="forest-title">Weighed together</h2>
            <p>
              Each row compares a group with the reference group in the same factor, holding the other factors
              equal. Right of the line means higher odds of stunting. Lines that cross it show no clear difference.
            </p>
          </div>
        </div>
        <div className="grid-2" style={{ gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)", alignItems: "start" }}>
          <div className="card">
            <div className="legend" style={{ marginBottom: 12 }}>
              <span className="legend-item"><span className="swatch" style={{ background: "var(--risk)", borderRadius: "50%" }} /> Higher odds</span>
              <span className="legend-item"><span className="swatch" style={{ background: "var(--protect)", borderRadius: "50%" }} /> Lower odds</span>
              <span className="legend-item"><span className="swatch" style={{ background: "var(--series-muted)", borderRadius: "50%" }} /> No clear difference</span>
            </div>
            <ForestPlot rows={rows} label="Adjusted odds ratios for stunting with 95% confidence intervals, by factor" />
          </div>
          <aside className="card prose" aria-label="Reading the results" style={{ fontSize: 15 }}>
            <h3 className="card-title" style={{ marginBottom: 10 }}>What this says</h3>
            <p>
              <strong>Poverty is the biggest single factor.</strong> Children in the poorest homes have {poorest.or.toFixed(1)}×
              the odds of stunting of children in the richest, even with the mother's schooling and the other factors equal.
            </p>
            <p>
              <strong>It carries across generations.</strong> Children of mothers 145–149 cm tall have {shortMother.or.toFixed(1)}× the
              odds of children of mothers 155 cm or taller, and babies born small have {small.or.toFixed(1)}×.
            </p>
            <p>
              <strong>Birth spacing is the strongest factor families can change.</strong> A birth less than two years after a sibling
              raises the odds {spacing.or.toFixed(1)}×.
            </p>
            <p>
              <strong>Some expected factors fade.</strong> Once wealth is accounted for, toilet type shows no independent effect
              (odds ratio {toilet.or.toFixed(2)}). That doesn't mean sanitation doesn't matter, only that it isn't what
              separates stunted from non-stunted children here.
            </p>
            <p className="note">
              Weighted logistic regression on {data.model.n.toLocaleString()} children, with confidence intervals adjusted for the
              survey's cluster design. These are associations, not proof of cause.
            </p>
          </aside>
        </div>
        <Disclosure summary="View all odds ratios as a table">
          <DataTable
            caption="Adjusted odds ratios"
            rows={rows}
            columns={[
              { key: "group", label: "Factor", value: (r) => r.group },
              { key: "level", label: "Group", value: (r) => r.level, render: (r) => (r.reference ? `${r.level} (reference)` : r.level) },
              { key: "or", label: "Odds ratio", value: (r) => r.or, render: (r) => (r.reference ? "1" : r.or.toFixed(2)), numeric: true },
              { key: "ci", label: "95% CI", value: (r) => r.low, render: (r) => (r.reference ? "—" : `${r.low.toFixed(2)}–${r.high.toFixed(2)}`), numeric: true },
            ]}
          />
        </Disclosure>
      </section>
    </>
  );
}
