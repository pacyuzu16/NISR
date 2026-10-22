import { useMemo, useState } from "react";
import { Info, RotateCcw, Target } from "lucide-react";
import { DataTable, Disclosure, Select } from "../components/ui";
import type { Dataset } from "../lib/data";
import { href } from "../lib/router";
import { contributions, projected } from "../lib/scenarios";

const TARGET = 15;

/** Lever order in the data: spacing, insurance, diarrhoea, water, toilet, wealth, education. */
const GROUPS = [
  { title: "Health services", keys: ["spacing", "insurance", "diarrhoea"] },
  { title: "Water and sanitation", keys: ["water", "toilet"] },
  { title: "Long-term", keys: ["wealth", "education"] },
];

const PRESETS: { id: string; label: string; values: Record<string, number> }[] = [
  { id: "health", label: "Health services push", values: { spacing: 50, insurance: 100, diarrhoea: 50 } },
  { id: "wash", label: "Water & sanitation", values: { water: 100, toilet: 100 } },
  { id: "all", label: "Everything at full coverage", values: { spacing: 100, insurance: 100, diarrhoea: 100, water: 100, toilet: 100, wealth: 100, education: 100 } },
];

export function Scenarios({ data }: { data: Dataset }) {
  const levers = data.scenarios.levers;
  const [values, setValues] = useState<Record<string, number>>(PRESETS[0].values);
  const [scope, setScope] = useState("Rwanda");
  const p = useMemo(() => levers.map((l) => (values[l.key] ?? 0) / 100), [levers, values]);
  const active = p.some((v) => v > 0);

  const result = projected(data, scope, p);
  const contrib = contributions(data, scope, p);
  const national = projected(data, "Rwanda", p);
  const gap = national.official - TARGET;
  const closed = national.official - national.value;

  const districts = useMemo(
    () =>
      data.districts
        .map((d) => ({ name: d.name, province: d.province, ...projected(data, d.name, p) }))
        .sort((a, b) => b.value - a.value),
    [data, p],
  );
  const below = districts.filter((d) => d.value < TARGET).length;
  const belowNow = data.districts.filter((d) => d.stunting.value < TARGET).length;
  const max = 42;

  return (
    <>
      <header className="page-head">
        <span className="eyebrow">Scenarios</span>
        <h1>What would it take to reach the NST2 target?</h1>
        <p className="lede">
          NST2 aims to bring stunting below {TARGET}% by 2029. Choose how far each programme reaches, and the model
          estimates the stunting rate that would follow, for Rwanda or any district.
        </p>
      </header>

      <div className="risk-layout">
        <section className="card" aria-labelledby="levers-title">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <h2 id="levers-title" className="card-title">Programme coverage</h2>
            <button type="button" className="btn btn-ghost btn-sm" disabled={!active} onClick={() => setValues({})}>
              <RotateCcw size={15} aria-hidden /> Reset
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {PRESETS.map((pr) => {
              const on = levers.every((l) => (values[l.key] ?? 0) === (pr.values[l.key] ?? 0));
              return (
                <button key={pr.id} type="button" className="btn btn-sm" aria-pressed={on}
                  style={on ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : undefined}
                  onClick={() => setValues(pr.values)}>
                  {pr.label}
                </button>
              );
            })}
          </div>
          <p className="card-sub" style={{ marginBottom: 4 }}>
            Coverage is the share of children not yet reached who would be reached. 100% means every child.
          </p>

          {GROUPS.map((g) => (
            <fieldset className="fieldset" key={g.title}>
              <legend>{g.title}</legend>
              <div className="sliders">
                {g.keys.map((key) => {
                  const i = levers.findIndex((l) => l.key === key);
                  const l = levers[i];
                  const v = values[key] ?? 0;
                  const id = `lever-${key}`;
                  return (
                    <div className="slider" key={key}>
                      <div className="slider-head">
                        <label htmlFor={id} className="field-label">{l.label}</label>
                        <output htmlFor={id} className="slider-value">{v}%</output>
                      </div>
                      <input
                        id={id}
                        type="range"
                        min={0}
                        max={100}
                        step={10}
                        value={v}
                        style={{ ["--fill" as string]: `${v}%` }}
                        aria-describedby={`${id}-d`}
                        onChange={(e) => setValues((s) => ({ ...s, [key]: Number(e.target.value) }))}
                      />
                      <span className="field-hint" id={`${id}-d`}>
                        {l.detail}
                        {contrib[i] > 0.05 && <> · <strong className="num">−{contrib[i].toFixed(1)} pts</strong></>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </section>

        <aside className="risk-result" aria-live="polite">
          <div className="card">
            <div style={{ maxWidth: 260 }}>
              <Select
                label="Show results for"
                value={scope}
                onChange={setScope}
                options={[{ value: "Rwanda", label: "Rwanda (national)" }, ...[...data.districts].sort((a, b) => a.name.localeCompare(b.name)).map((d) => ({ value: d.name, label: d.name }))]}
              />
            </div>
            <div className="field-label" style={{ marginTop: 18 }}>Projected stunting</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
              <span className="risk-number">{result.value.toFixed(1)}%</span>
              <span className="card-sub" style={{ fontSize: 15 }}>
                from {result.official.toFixed(1)}% today
                {active && <> · <strong className="num" style={{ color: "var(--good-ink)" }}>−{(result.official - result.value).toFixed(1)} pts</strong></>}
              </span>
            </div>
            <TargetMeter now={result.official} next={result.value} />
            <p className="card-sub" style={{ marginTop: 14, fontSize: 14.5 }}>
              {result.value < TARGET
                ? <>This scenario brings {scope === "Rwanda" ? "Rwanda" : scope} below the NST2 target.</>
                : <>Still {(result.value - TARGET).toFixed(1)} points above the NST2 target of {TARGET}%.</>}
            </p>
          </div>

          <div className="card">
            <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Target size={17} aria-hidden /> Progress towards the national target
            </h2>
            <div className="metric" style={{ marginTop: 12 }}>
              <div className="metric-label">Share of the gap to {TARGET}% closed</div>
              <div className="metric-value">{Math.round((closed / gap) * 100)}%</div>
              <div className="metric-foot">
                {closed.toFixed(1)} of {gap.toFixed(1)} points · {below} of 30 districts below {TARGET}% (today {belowNow})
              </div>
            </div>
            <p className="card-sub" style={{ marginTop: 12 }}>
              Even at full coverage of all seven programmes the model closes about half the gap. The rest depends on
              factors it does not measure, such as children's diets and feeding, which is where nutrition programmes come in.
            </p>
          </div>
          <div className="callout">
            <Info size={16} aria-hidden />
            <span>
              Model-based estimate: each child's risk is predicted with the change applied, then averaged with survey
              weights. It assumes the associations in the model hold if conditions change. See <a href={href("methods")}>Methods</a>.
            </span>
          </div>
        </aside>
      </div>

      <section className="section card" aria-labelledby="districts-scen-title">
        <div className="section-head" style={{ marginBottom: 12 }}>
          <div>
            <h2 id="districts-scen-title" className="card-title" style={{ fontSize: 17 }}>Every district under this scenario</h2>
            <p className="card-sub">Grey dot: today. Blue dot: projected. Line: NST2 target of {TARGET}%.</p>
          </div>
        </div>
        <ol className="dumbbells" aria-label="Projected stunting by district">
          {districts.map((d) => (
            <li key={d.name}>
              <a href={href("districts", d.name)} className="dumbbell">
                <span className="rank-name">{d.name}</span>
                <span className="dumbbell-track" aria-hidden>
                  <span className="dumbbell-target" style={{ left: `${(TARGET / max) * 100}%` }} />
                  <span className="dumbbell-bar" style={{ left: `${(d.value / max) * 100}%`, width: `${((d.official - d.value) / max) * 100}%` }} />
                  <span className="dumbbell-dot is-now" style={{ left: `${(d.official / max) * 100}%` }} />
                  <span className="dumbbell-dot is-next" style={{ left: `${(d.value / max) * 100}%` }} />
                </span>
                <span className="rank-value">{d.value.toFixed(1)}%</span>
              </a>
            </li>
          ))}
        </ol>
        <Disclosure summary="View as table">
          <DataTable
            caption="Projected stunting by district"
            rows={districts}
            initialSort={{ key: "next", dir: "desc" }}
            columns={[
              { key: "name", label: "District", value: (r) => r.name },
              { key: "province", label: "Province", value: (r) => r.province },
              { key: "now", label: "Today", value: (r) => r.official, render: (r) => `${r.official.toFixed(1)}%`, numeric: true },
              { key: "next", label: "Projected", value: (r) => r.value, render: (r) => `${r.value.toFixed(1)}%`, numeric: true },
              { key: "change", label: "Change", value: (r) => r.value - r.official, render: (r) => `${(r.value - r.official).toFixed(1)} pts`, numeric: true },
            ]}
          />
        </Disclosure>
      </section>
    </>
  );
}

function TargetMeter({ now, next }: { now: number; next: number }) {
  const max = 40;
  const pos = (v: number) => `${(Math.min(v, max) / max) * 100}%`;
  return (
    <div>
      <div className="meter" role="img" aria-label={`Projected ${next.toFixed(1)}% against ${now.toFixed(1)}% today and a target of ${TARGET}%`}>
        <div className="meter-fill" style={{ width: pos(next) }} />
        <div className="meter-ghost" style={{ left: pos(next), width: `calc(${pos(now)} - ${pos(next)})` }} />
        <div className="meter-mark" style={{ left: pos(TARGET) }}>
          <span className="meter-mark-label">Target {TARGET}%</span>
        </div>
      </div>
      <div className="meter-scale">
        <span>0%</span>
        <span>20%</span>
        <span>40%</span>
      </div>
    </div>
  );
}
