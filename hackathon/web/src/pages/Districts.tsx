import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, MapPinned, Search, SearchX, X } from "lucide-react";
import { Choropleth, ScaleLegend } from "../components/charts";
import type { Bin } from "../lib/chart-utils";
import { DataTable, Disclosure, Empty, PriorityBadge, Segmented, Select } from "../components/ui";
import { priorityOf, PRIORITY_LABEL, type Context, type Dataset, type District, type Geo } from "../lib/data";
import { href, replaceParam } from "../lib/router";

type Indicator = "stunting" | "share" | "severe" | "underweight";

const INDICATORS: Record<Indicator, { label: string; short: string; get: (d: District) => number; bins: Bin[]; help: string }> = {
  stunting: {
    label: "Stunting rate", short: "Stunted", get: (d) => d.stunting.value,
    bins: [
      { min: 0, max: 15, label: "<15%" }, { min: 15, max: 20, label: "15–20" }, { min: 20, max: 25, label: "20–25" },
      { min: 25, max: 30, label: "25–30" }, { min: 30, max: 100, label: "30%+" },
    ],
    help: "Share of children under 5 in the district who are stunted.",
  },
  share: {
    label: "Share of stunted children", short: "Share", get: (d) => d.share_of_stunted,
    bins: [
      { min: 0, max: 2, label: "<2%" }, { min: 2, max: 3, label: "2–3" }, { min: 3, max: 4, label: "3–4" },
      { min: 4, max: 5, label: "4–5" }, { min: 5, max: 100, label: "5%+" },
    ],
    help: "Of all stunted children in Rwanda, the share who live in this district. Large districts can carry a big burden at a moderate rate.",
  },
  severe: {
    label: "Severe stunting", short: "Severe", get: (d) => d.severe,
    bins: [
      { min: 0, max: 3, label: "<3%" }, { min: 3, max: 5, label: "3–5" }, { min: 5, max: 7, label: "5–7" },
      { min: 7, max: 9, label: "7–9" }, { min: 9, max: 100, label: "9%+" },
    ],
    help: "Children more than 3 standard deviations below the WHO height-for-age median.",
  },
  underweight: {
    label: "Underweight", short: "Underweight", get: (d) => d.underweight,
    bins: [
      { min: 0, max: 4, label: "<4%" }, { min: 4, max: 6, label: "4–6" }, { min: 6, max: 8, label: "6–8" },
      { min: 8, max: 10, label: "8–10" }, { min: 10, max: 100, label: "10%+" },
    ],
    help: "Children whose weight is low for their age.",
  },
};

const CONTEXT: { key: keyof Context; label: string; good: "high" | "low" }[] = [
  { key: "poorest_two_quintiles", label: "Children in the poorest 40% of households", good: "low" },
  { key: "mother_secondary_plus", label: "Mothers with secondary schooling or more", good: "high" },
  { key: "short_birth_interval", label: "Born less than 2 years after a sibling", good: "low" },
  { key: "improved_toilet", label: "Households with an improved toilet", good: "high" },
  { key: "insured", label: "Mothers with health insurance", good: "high" },
];

export function Districts({ data, geo, selected }: { data: Dataset; geo: Geo; selected?: string }) {
  const [indicator, setIndicator] = useState<Indicator>("stunting");
  const [province, setProvince] = useState("all");
  const [query, setQuery] = useState("");
  const ind = INDICATORS[indicator];
  const national = data.national.stunting.value;
  const current = data.districts.find((d) => d.name === selected);
  const detailRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (current && window.matchMedia("(max-width: 960px)").matches) {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [current]);

  const values = useMemo(() => Object.fromEntries(data.districts.map((d) => [d.name, ind.get(d)])), [data, ind]);
  const ranked = useMemo(() => [...data.districts].sort((a, b) => ind.get(b) - ind.get(a)), [data, ind]);
  const rankOf = (name: string) => [...data.districts].sort((a, b) => b.stunting.value - a.stunting.value).findIndex((d) => d.name === name) + 1;
  const visible = ranked.filter(
    (d) => (province === "all" || d.province === province) && d.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const dimmed = new Set(data.districts.filter((d) => province !== "all" && d.province !== province).map((d) => d.name));
  const max = Math.max(...data.districts.map((d) => (indicator === "stunting" ? d.stunting.high : ind.get(d))));
  const select = (name: string) => replaceParam("districts", name === selected ? undefined : name);
  const nationalRef = indicator === "stunting" ? national : indicator === "severe" ? data.national.severe : indicator === "underweight" ? data.national.underweight : 100 / 30;

  return (
    <>
      <header className="page-head">
        <span className="eyebrow">Districts</span>
        <h1>Where Rwanda's stunted children live</h1>
        <p className="lede">
          Stunting ranges from {Math.min(...data.districts.map((d) => d.stunting.value))}% to{" "}
          {Math.max(...data.districts.map((d) => d.stunting.value))}% across the 30 districts. Select a district for its
          profile, or switch to <em>share of stunted children</em> to see where the largest numbers are.
        </p>
      </header>

      <div className="toolbar">
        <div className="field" style={{ maxWidth: "100%" }}>
          <span className="field-label" id="ind-label">
            Show
          </span>
          <Segmented
            label="Indicator"
            scroll
            value={indicator}
            onChange={setIndicator}
            options={(Object.keys(INDICATORS) as Indicator[]).map((k) => ({ value: k, label: INDICATORS[k].label }))}
          />
        </div>
        <div style={{ width: 200 }}>
          <Select
            label="Province"
            value={province}
            onChange={setProvince}
            options={[{ value: "all", label: "All provinces" }, ...["Kigali", "North", "South", "East", "West"].map((p) => ({ value: p, label: p }))]}
          />
        </div>
      </div>

      <div className="districts-layout">
        <div className="card map-card">
          <div className="map-head">
            <div>
              <h2 className="card-title">{ind.label}</h2>
              <p className="card-sub">{ind.help}</p>
            </div>
          </div>
          <Choropleth
            geo={geo}
            values={values}
            bins={ind.bins}
            selected={selected}
            onSelect={select}
            dimmed={dimmed}
            label={`Map of ${ind.label.toLowerCase()} by district. Highest: ${ranked[0].name} at ${ind.get(ranked[0]).toFixed(1)}%. Use the district list for keyboard access.`}
            tooltip={(name) => {
              const d = data.districts.find((x) => x.name === name)!;
              return (
                <>
                  <div className="tooltip-value">{ind.get(d).toFixed(1)}%</div>
                  <div className="tooltip-title">{d.name}</div>
                  <div>{d.province} Province</div>
                  {indicator === "stunting" && (
                    <div>
                      95% CI {d.stunting.low}–{d.stunting.high}%
                    </div>
                  )}
                </>
              );
            }}
          />
          <ScaleLegend bins={ind.bins} title={ind.label} />
        </div>

        <div className="card rank-card">
          <div className="rank-head">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <h2 className="card-title">Ranked</h2>
              <span className="card-sub" aria-live="polite">
                {visible.length} of 30 districts
              </span>
            </div>
            <div className="input-wrap">
              <Search size={16} aria-hidden />
              <input
                className="input"
                type="search"
                placeholder="Find a district"
                aria-label="Find a district"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button type="button" className="input-clear" aria-label="Clear search" onClick={() => setQuery("")}>
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
          {visible.length === 0 ? (
            <Empty icon={<SearchX size={20} />} title="No district matches">
              Check the spelling, or set the province filter to All provinces.
            </Empty>
          ) : (
            <ol className="rank-list" aria-label={`Districts ranked by ${ind.label.toLowerCase()}`}>
              {visible.map((d) => {
                const v = ind.get(d);
                const rank = ranked.indexOf(d) + 1;
                return (
                  <li key={d.name} className="rank-item">
                    <button type="button" aria-pressed={d.name === selected} onClick={() => select(d.name)}
                      aria-label={`${rank}. ${d.name}, ${v.toFixed(1)}%`}>
                      <span className="rank-n">{rank}</span>
                      <span className="rank-name">{d.name}</span>
                      <span className="rank-bar" aria-hidden>
                        <svg width="100%" height="16" preserveAspectRatio="none">
                          <rect x="0" y="5" width={`${(v / max) * 100}%`} height="6" rx="3"
                            fill="var(--series)" />
                          {indicator === "stunting" && (
                            <line x1={`${(d.stunting.low / max) * 100}%`} x2={`${(d.stunting.high / max) * 100}%`} y1="8" y2="8"
                              stroke="var(--ink-3)" strokeWidth="1" />
                          )}
                          <line x1={`${(nationalRef / max) * 100}%`} x2={`${(nationalRef / max) * 100}%`} y1="1" y2="15" stroke="var(--ink)" strokeWidth="1.5" />
                        </svg>
                      </span>
                      <span className="rank-value">{v.toFixed(1)}%</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="note" style={{ margin: "0 16px 14px" }}>
            Black tick: {indicator === "share" ? "equal share (1 in 30)" : `national ${nationalRef.toFixed(1)}%`}.
            {indicator === "stunting" && " Thin grey line: 95% confidence interval."}
          </p>
        </div>
      </div>

      <div ref={detailRef} className="detail" style={{ scrollMarginTop: 80 }}>
        {current ? (
          <DistrictDetail d={current} data={data} rank={rankOf(current.name)} onClose={() => select(current.name)} />
        ) : (
          <div className="card">
            <Empty icon={<MapPinned size={20} />} title="Select a district">
              Click a district on the map or in the ranked list to see its stunting rate, how its households compare
              with the rest of Rwanda, and its priority level.
            </Empty>
          </div>
        )}
      </div>

      <Disclosure summary="View all 30 districts as a table">
        <DataTable<District>
          caption="All districts"
          rows={data.districts}
          initialSort={{ key: "stunting", dir: "desc" }}
          columns={[
            { key: "name", label: "District", value: (r) => r.name, render: (r) => <a href={href("districts", r.name)}>{r.name}</a> },
            { key: "province", label: "Province", value: (r) => r.province },
            { key: "stunting", label: "Stunted", value: (r) => r.stunting.value, render: (r) => `${r.stunting.value.toFixed(1)}%`, numeric: true },
            { key: "ci", label: "95% CI", value: (r) => r.stunting.low, render: (r) => `${r.stunting.low}–${r.stunting.high}`, numeric: true },
            { key: "severe", label: "Severe", value: (r) => r.severe, render: (r) => `${r.severe.toFixed(1)}%`, numeric: true },
            { key: "share", label: "Share of stunted", value: (r) => r.share_of_stunted, render: (r) => `${r.share_of_stunted.toFixed(1)}%`, numeric: true },
            { key: "n", label: "Children", value: (r) => r.stunting.n, numeric: true },
            { key: "priority", label: "Priority", value: (r) => ["lower", "elevated", "high"].indexOf(priorityOf(r, national)), render: (r) => PRIORITY_LABEL[priorityOf(r, national)] },
          ]}
        />
      </Disclosure>
    </>
  );
}

function DistrictDetail({ d, data, rank, onClose }: { d: District; data: Dataset; rank: number; onClose: () => void }) {
  const national = data.national.stunting.value;
  const priority = priorityOf(d, national);
  const diff = d.stunting.value - national;
  const nutrition = [
    { label: "Severe stunting", v: d.severe, n: data.national.severe },
    { label: "Underweight", v: d.underweight, n: data.national.underweight },
    { label: "Wasting", v: d.wasting, n: data.national.wasting },
    { label: "Overweight", v: d.overweight, n: data.national.overweight },
  ];
  const significant = d.stunting.low > national || d.stunting.high < national;

  return (
    <section className="card fade-in" aria-labelledby="detail-title" key={d.name}>
      <div className="detail-head">
        <div>
          <h2 id="detail-title">{d.name}</h2>
          <p className="crumb">
            {d.province} Province · ranked {rank} of 30 for stunting
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <PriorityBadge priority={priority} />
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label={`Close ${d.name} profile`}>
            <X size={16} aria-hidden />
          </button>
        </div>
      </div>

      <div className="detail-metrics">
        <div className="metric">
          <div className="metric-label">Children stunted</div>
          <div className="metric-value">{d.stunting.value.toFixed(1)}%</div>
          <div className="metric-foot">
            95% CI {d.stunting.low}–{d.stunting.high}% · {d.stunting.n} children
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Compared with Rwanda</div>
          <div className="metric-value">{diff > 0 ? "+" : "−"}{Math.abs(diff).toFixed(1)} pts</div>
          <div className="metric-foot">
            {significant ? (diff > 0 ? "Clearly above" : "Clearly below") : "Not clearly different from"} the national {national.toFixed(1)}%
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Share of Rwanda's stunted children</div>
          <div className="metric-value">{d.share_of_stunted.toFixed(1)}%</div>
          <div className="metric-foot">
            {d.share_of_stunted > 100 / 30 ? "More" : "Less"} than an equal share (3.3%)
          </div>
        </div>
      </div>

      <div className="detail-cols">
        <div>
          <h3>Households, compared with Rwanda</h3>
          <div className="compare-list">
            {CONTEXT.map((c) => {
              const v = d.context[c.key];
              const n = data.national.context[c.key];
              return (
                <div className="compare-row" key={c.key}>
                  <span>{c.label}</span>
                  <span className="compare-value">{Math.round(v)}%</span>
                  <div className="bar-track" role="img" aria-label={`${Math.round(v)}% in ${d.name}, ${Math.round(n)}% nationally`}>
                    <div className="bar-fill" style={{ width: `${v}%` }} />
                    <div className="bar-mark" style={{ left: `${n}%` }} title={`Rwanda: ${Math.round(n)}%`} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="note">Black tick: national average. Based on children of interviewed mothers.</p>
        </div>
        <div>
          <h3>Other nutrition measures</h3>
          <div className="compare-list">
            {nutrition.map((r) => (
              <div className="compare-row" key={r.label}>
                <span>{r.label}</span>
                <span className="compare-value">{r.v.toFixed(1)}%</span>
                <div className="bar-track" role="img" aria-label={`${r.v}% in ${d.name}, ${r.n}% nationally`}>
                  <div className="bar-fill" style={{ width: `${(r.v / 15) * 100}%` }} />
                  <div className="bar-mark" style={{ left: `${(r.n / 15) * 100}%` }} title={`Rwanda: ${r.n}%`} />
                </div>
              </div>
            ))}
          </div>
          <p className="note">Scale 0–15%. Source: RDHS 2025 Final Report, Table D.4.</p>
          <a className="btn" href={href("risk", d.province)} style={{ marginTop: 16 }}>
            Check risk for a child in {d.province} <ArrowRight size={16} aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
}
