import { ArrowRight, Calculator, ChartColumn, Map as MapIcon } from "lucide-react";
import { LineChart } from "../components/charts";
import { DataTable, Disclosure } from "../components/ui";
import type { Dataset } from "../lib/data";
import { href } from "../lib/router";

export function Overview({ data }: { data: Dataset }) {
  const n = data.national.stunting;
  const sorted = [...data.districts].sort((a, b) => a.stunting.value - b.stunting.value);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  const over30 = data.districts.filter((d) => d.stunting.value >= 30).length;
  const wealth = data.gaps.wealth;
  const poorest = wealth.find((g) => g.level === "Poorest")!;
  const richest = wealth.find((g) => g.level === "Richest")!;
  const first = data.trend[0];
  const topShare = [...data.districts].sort((a, b) => b.share_of_stunted - a.share_of_stunted).slice(0, 2);

  return (
    <>
      <section className="hero" aria-labelledby="overview-title">
        <div>
          <span className="eyebrow">Rwanda Demographic and Health Survey 2025 · children under five</span>
          <h1 id="overview-title">One in four children in Rwanda is too short for their age.</h1>
          <p className="lede">
            Stunting is the clearest sign that a child has gone without enough nutrition and care for a long time.
            Rwanda has cut it by almost half since 2005, but progress is uneven. This tool shows planners where
            stunting is concentrated, which household conditions go with it, and how much risk falls when those
            conditions improve.
          </p>
        </div>
        <div className="card hero-figure">
          <span className="hero-caption">Children under 5 who are stunted</span>
          <span className="hero-value">
            {n.value.toFixed(1)}
            <small>%</small>
          </span>
          <span className="hero-ci">
            95% confidence interval {n.low}–{n.high}% · {n.n.toLocaleString()} children measured
          </span>
        </div>
      </section>

      <section className="section" aria-label="Key figures">
        <div className="stats">
          <div className="stat">
            <div className="stat-label">Since {first.label}</div>
            <div className="stat-value">−{Math.round(first.value - n.value)} points</div>
            <div className="stat-foot">
              from {first.value}% to {n.value.toFixed(1)}%
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">To reach the NST2 target</div>
            <div className="stat-value">−{(n.value - 15).toFixed(1)} points</div>
            <div className="stat-foot">below 15% by 2029; {data.districts.filter((d) => d.stunting.value < 15).length} of 30 districts are there</div>
          </div>
          <div className="stat">
            <div className="stat-label">Gap between districts</div>
            <div className="stat-value">
              {low.stunting.value}–{high.stunting.value}%
            </div>
            <div className="stat-foot">
              {low.name} to {high.name}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Poorest vs richest homes</div>
            <div className="stat-value">
              {Math.round(poorest.value)}% vs {Math.round(richest.value)}%
            </div>
            <div className="stat-foot">a {(poorest.value / richest.value).toFixed(1)}× difference</div>
          </div>
        </div>
      </section>

      <section className="section grid-2" aria-label="Trends">
        <div className="card">
          <h2 className="card-title">Stunting has fallen with every survey, but the 2029 target is still far off</h2>
          <p className="card-sub">Children under 5 who are stunted, Rwanda DHS rounds</p>
          <div style={{ marginTop: 16 }}>
            <LineChart
              points={data.trend.map((t) => ({ x: t.label, value: t.value }))}
              max={60}
              refValue={15}
              refLabel="NST2 target for 2029: below 15%"
              label={`Stunting trend: ${data.trend.map((t) => `${t.label} ${t.value}%`).join(", ")}`}
            />
          </div>
          <Disclosure summary="View as table">
            <DataTable
              caption="Stunting by survey round"
              rows={data.trend}
              columns={[
                { key: "label", label: "Survey", value: (r) => r.label },
                { key: "value", label: "Stunted", value: (r) => r.value, render: (r) => `${r.value.toFixed(1)}%`, numeric: true },
              ]}
            />
          </Disclosure>
        </div>
        <div className="card">
          <h2 className="card-title">The damage builds up before age two</h2>
          <p className="card-sub">Children stunted by age, 2025, with 95% confidence band</p>
          <div style={{ marginTop: 16 }}>
            <LineChart
              xTitle="Age in months"
              points={data.age_curve.map((a) => ({ x: `${a.from}–${a.to + 1} months`, tick: String(a.from), value: a.value, low: a.low, high: a.high, note: `${a.n} children` }))}
              max={40}
              highlightLast={false}
              refValue={n.value}
              refLabel={`All ages ${n.value.toFixed(1)}%`}
              label="Stunting by age in months: rises from about 15% at birth to a peak in the second year, then levels off"
            />
          </div>
          <Disclosure summary="View as table">
            <DataTable
              caption="Stunting by age"
              rows={data.age_curve}
              columns={[
                { key: "age", label: "Age (months)", value: (r) => r.from, render: (r) => `${r.from}–${r.to + 1}` },
                { key: "v", label: "Stunted", value: (r) => r.value, render: (r) => `${r.value.toFixed(1)}%`, numeric: true },
                { key: "ci", label: "95% CI", value: (r) => r.low, render: (r) => `${r.low}–${r.high}%`, numeric: true },
                { key: "n", label: "Children", value: (r) => r.n, numeric: true },
              ]}
            />
          </Disclosure>
        </div>
      </section>

      <section className="section" aria-labelledby="explore-title">
        <div className="section-head">
          <div>
            <h2 id="explore-title">Explore the evidence</h2>
            <p>Three questions a district planner needs answered.</p>
          </div>
        </div>
        <div className="next-steps">
          <a className="card next" href={href("districts")}>
            <span className="next-icon" aria-hidden>
              <MapIcon size={19} />
            </span>
            <h3>Where is it worst?</h3>
            <p>
              {over30} of 30 districts are at 30% or more. {topShare[0].name} and {topShare[1].name} alone are home to{" "}
              {Math.round(topShare[0].share_of_stunted + topShare[1].share_of_stunted)}% of Rwanda's stunted children.
            </p>
            <span className="next-cta">
              Open the district map <ArrowRight size={16} aria-hidden />
            </span>
          </a>
          <a className="card next" href={href("drivers")}>
            <span className="next-icon" aria-hidden>
              <ChartColumn size={19} />
            </span>
            <h3>What goes with it?</h3>
            <p>Household wealth, the mother's height and schooling, size at birth and birth spacing, tested together.</p>
            <span className="next-cta">
              See the drivers <ArrowRight size={16} aria-hidden />
            </span>
          </a>
          <a className="card next" href={href("risk")}>
            <span className="next-icon" aria-hidden>
              <Calculator size={19} />
            </span>
            <h3>What would change it?</h3>
            <p>Describe a child's situation and see how much the estimated risk falls if conditions improve.</p>
            <span className="next-cta">
              Try the risk check <ArrowRight size={16} aria-hidden />
            </span>
          </a>
        </div>
      </section>
    </>
  );
}
