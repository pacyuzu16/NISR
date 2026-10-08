import { useWidth } from "../lib/chart-utils";
import { DataTable, Disclosure, GitHubMark } from "../components/ui";
import type { Dataset } from "../lib/data";

const REPO = "https://github.com/pacyuzu16/NISR";

export function Methods({ data }: { data: Dataset }) {
  const m = data.model;
  return (
    <>
      <header className="page-head">
        <span className="eyebrow">Methods</span>
        <h1>How the numbers were made</h1>
        <p className="lede">
          Everything here comes from the 2025 Rwanda Demographic and Health Survey. This page explains what we did
          with it, how well the model performs and where its limits are.
        </p>
      </header>

      <div className="methods">
        <nav className="toc" aria-label="On this page">
          <a href="#m-data">Data</a>
          <a href="#m-estimates">District estimates</a>
          <a href="#m-model">The model</a>
          <a href="#m-performance">Model performance</a>
          <a href="#m-limits">Limitations</a>
          <a href="#m-privacy">Privacy</a>
          <a href="#m-team">Team and AI use</a>
        </nav>

        <div className="prose" style={{ maxWidth: "none" }}>
          <section id="m-data">
            <h2>Data</h2>
            <p>
              The 2025 RDHS was carried out by the National Institute of Statistics of Rwanda (NISR) with the
              Ministry of Health and ICF. It measured the height of {data.meta.children_measured.toLocaleString()} children
              under five in a sample designed to be representative of every district.
            </p>
            <ul>
              <li>
                <strong>Published tables:</strong> RDHS 2025 Final Report, Appendix D, Table D.4 (severe stunting,
                wasting, underweight and overweight by district).
              </li>
              <li>
                <strong>Microdata:</strong> household-member (PR) and children's (KR) recode files, obtained through
                the NISR Microdata Catalogue under its public-use terms.
              </li>
              <li>
                <strong>Earlier surveys:</strong> trend values for 2005–2019/20 are from the published RDHS reports.
              </li>
              <li>
                <strong>Target:</strong> the second National Strategy for Transformation (NST2, 2024–2029) aims to bring
                stunting below 15% by 2029.
              </li>
              <li>
                <strong>District boundaries:</strong> geoBoundaries, Rwanda ADM2 (CC BY 4.0).
              </li>
            </ul>
            <p style={{ marginTop: 12 }}>
              A child is <strong>stunted</strong> when their height-for-age is more than two standard deviations below the
              WHO Child Growth Standards median.
            </p>
          </section>

          <section id="m-estimates">
            <h2>District estimates</h2>
            <p>
              Rates are weighted with the survey's sampling weights and use all children who slept in the household the
              night before the interview, as in the official report. Our district figures reproduce Table D.4 of the
              Final Report exactly, which is a check that the processing is correct.
            </p>
            <p>
              Confidence intervals use Taylor linearisation over the survey's two-stage cluster design. Each district
              has about 170–550 measured children, so its 95% interval is often ±7 points or more. Two districts whose
              intervals overlap may not truly differ.
            </p>
            <p>
              <strong>Share of stunted children</strong> is the weighted number of stunted children in a district divided
              by the national total. It shows where the largest numbers of affected children live, which a rate alone hides.
            </p>
            <p>
              <strong>Priority levels</strong> are a simple, transparent rule. <em>High</em>: stunting of 30% or more, or severe
              stunting of 9% or more. <em>Above national</em>: at or above {data.national.stunting.value}%.
              <em> Below national</em>: everything else.
            </p>
          </section>

          <section id="m-model">
            <h2>The model</h2>
            <p>
              A survey-weighted logistic regression of stunting on 13 characteristics of the child, mother, household and
              location, fitted to {m.n.toLocaleString()} living children with a valid height measurement. Standard errors
              are clustered on the survey's sampling units. Missing mother's height (not measured in half of households)
              and size at birth (asked only for recent births) are kept as their own groups, so no child is dropped.
            </p>
            <p>
              We compared it with gradient-boosted trees. The trees were no more accurate (AUC {m.cv_auc.gradient_boosting} vs{" "}
              {m.cv_auc.logistic}), so we kept the logistic model: anyone can check its odds ratios, and the risk check
              shows exactly how each answer moves the estimate.
            </p>
          </section>

          <section id="m-performance">
            <h2>Model performance</h2>
            <div className="kv">
              <div className="metric">
                <div className="metric-label">Cross-validated AUC</div>
                <div className="metric-value">{m.cv_auc.logistic}</div>
                <div className="metric-foot">5-fold, weighted</div>
              </div>
              <div className="metric">
                <div className="metric-label">Children in the model</div>
                <div className="metric-value">{m.n.toLocaleString()}</div>
                <div className="metric-foot">RDHS 2025 children's file</div>
              </div>
              <div className="metric">
                <div className="metric-label">Predictors</div>
                <div className="metric-value">13</div>
                <div className="metric-foot">child, mother, household, place</div>
              </div>
            </div>
            <p style={{ marginTop: 16 }}>
              An AUC of {m.cv_auc.logistic} means that for a random stunted and a random non-stunted child, the model gives
              the stunted child the higher risk about {Math.round(m.cv_auc.logistic * 100)}% of the time. That is typical for
              household survey predictors and good enough to rank groups, but not to screen individual children.
            </p>
            <div className="card" style={{ marginTop: 16 }}>
              <h3 className="card-title">Calibration: predicted vs observed</h3>
              <p className="card-sub">Children grouped into tenths by predicted risk (out-of-fold). Points on the diagonal mean the risk estimates are honest.</p>
              <Calibration points={m.calibration} />
              <Disclosure summary="View as table">
                <DataTable
                  caption="Calibration by decile"
                  rows={m.calibration}
                  columns={[
                    { key: "d", label: "Tenth", value: (r) => r.decile, numeric: true },
                    { key: "p", label: "Predicted", value: (r) => r.predicted, render: (r) => `${r.predicted}%`, numeric: true },
                    { key: "o", label: "Observed", value: (r) => r.observed, render: (r) => `${r.observed}%`, numeric: true },
                  ]}
                />
              </Disclosure>
            </div>
          </section>

          <section id="m-limits">
            <h2>Limitations</h2>
            <ul>
              <li>The survey is a snapshot taken at one time, so the model shows associations, not causes.</li>
              <li>District estimates rest on small samples. Read the confidence intervals, not just the ranking.</li>
              <li>Some factors that matter (diet, feeding practices, illness history) aren't in the model yet.</li>
              <li>Size at birth is the mother's recall, and is missing for children born more than three years before the survey.</li>
            </ul>
          </section>

          <section id="m-privacy">
            <h2>Privacy</h2>
            <p>
              No survey record leaves our computers. This site contains only aggregated estimates and model coefficients.
              The raw microdata is excluded from the code repository, in line with NISR's terms of use.
            </p>
          </section>

          <section id="m-team">
            <h2>Team and AI use</h2>
            <p>
              Built by <strong>Team NavySec</strong>: ISHIMWE Marie Pauline and CYUZUZO Pacifique, Computer Engineering,
              University of Rwanda College of Science and Technology, for the NISR Big Data Hackathon 2026 (Track 3: Open Innovation).
            </p>
            <p>
              We used an AI coding assistant (Claude) for parts of the data processing, analysis code and interface. Every
              use is recorded in the AI use log in our repository, as the competition rules require. The analysis choices,
              review and interpretation are ours.
            </p>
            <p style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a className="btn" href={REPO} target="_blank" rel="noreferrer">
                <GitHubMark /> Source code
              </a>
              <a className="btn" href={`${REPO}/blob/main/AI_USE_LOG.md`} target="_blank" rel="noreferrer">
                AI use log
              </a>
            </p>
            <p className="note">
              Suggested citation: NavySec (2026). Gukura: child stunting in Rwanda, district by district. Data: NISR, MOH and
              ICF, Rwanda Demographic and Health Survey 2025.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}

function Calibration({ points }: { points: { decile: number; predicted: number; observed: number }[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const size = Math.min(width, 420);
  const ml = 52;
  const mb = 44;
  const top = 70;
  const s = (v: number) => ml + (v / top) * (size - ml - 12);
  const ys = (v: number) => size - mb - (v / top) * (size - mb - 12);
  const ticks = [0, 20, 40, 60];
  return (
    <div ref={ref} className="chart" style={{ marginTop: 12 }}>
      {width > 0 && (
        <svg width={size} height={size} role="img" aria-label="Calibration plot: observed stunting closely follows predicted risk across all ten groups">
          {ticks.map((t) => (
            <g key={t} className="tick">
              <line className={t === 0 ? "baseline" : "gridline"} x1={ml} x2={size - 12} y1={ys(t)} y2={ys(t)} />
              <text x={ml - 8} y={ys(t)} dy="0.32em" textAnchor="end">{t}%</text>
              <text x={s(t)} y={size - mb + 18} textAnchor="middle">{t}%</text>
            </g>
          ))}
          <line x1={s(0)} y1={ys(0)} x2={s(top)} y2={ys(top)} stroke="var(--axis)" strokeWidth={1.25} />
          <polyline fill="none" stroke="var(--series)" strokeWidth={2} points={points.map((p) => `${s(p.predicted)},${ys(p.observed)}`).join(" ")} />
          {points.map((p) => (
            <circle key={p.decile} cx={s(p.predicted)} cy={ys(p.observed)} r={4.5} fill="var(--series)" stroke="var(--surface)" strokeWidth={2}>
              <title>{`Tenth ${p.decile}: predicted ${p.predicted}%, observed ${p.observed}%`}</title>
            </circle>
          ))}
          <text x={(size + ml) / 2} y={size - 4} textAnchor="middle" className="label-2">Predicted risk</text>
          <text transform={`translate(12, ${(size - mb) / 2}) rotate(-90)`} textAnchor="middle" className="label-2">Observed</text>
        </svg>
      )}
    </div>
  );
}
