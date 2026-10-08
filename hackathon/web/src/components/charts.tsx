import { useMemo, useState, type ReactNode } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { Geo } from "../lib/data";
import { binIndex, useWidth, type Bin } from "../lib/chart-utils";

/* ------------------------------------------------------------------ primitives */

const linear = (d0: number, d1: number, r0: number, r1: number) => (v: number) =>
  r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);

function niceTicks(max: number, count = 4) {
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const top = Math.ceil(max / step) * step;
  return { ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => +(i * step).toFixed(6)), top };
}

type Tip = { x: number; y: number; content: ReactNode } | null;

function Tooltip({ tip, width }: { tip: Tip; width: number }) {
  if (!tip) return null;
  const flip = tip.x > width - 170;
  return (
    <div
      className="tooltip"
      role="presentation"
      style={{ left: tip.x, top: tip.y, transform: `translate(${flip ? "calc(-100% - 12px)" : "12px"}, -50%)` }}
    >
      {tip.content}
    </div>
  );
}

/* ------------------------------------------------------------------ line chart with CI band */

export type LinePoint = { x: string; tick?: string; value: number; low?: number; high?: number; note?: string };

export function LineChart({
  points, height = 260, max, label, unit = "%", refValue, refLabel, highlightLast = true, xTitle,
}: {
  points: LinePoint[];
  height?: number;
  max?: number;
  label: string;
  unit?: string;
  refValue?: number;
  refLabel?: string;
  highlightLast?: boolean;
  xTitle?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const m = { t: 16, r: 18, b: xTitle ? 46 : 30, l: 36 };
  const top = max ?? Math.max(...points.map((p) => p.high ?? p.value));
  const { ticks, top: yTop } = niceTicks(top);
  const iw = Math.max(0, width - m.l - m.r);
  const ih = height - m.t - m.b;
  const x = (i: number) => m.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = linear(0, yTop, m.t + ih, m.t);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join("");
  const hasBand = points.every((p) => p.low !== undefined && p.high !== undefined);
  const band = hasBand
    ? points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.high!)}`).join("") +
      [...points].reverse().map((p, j) => `L${x(points.length - 1 - j)},${y(p.low!)}`).join("") + "Z"
    : "";
  const step = points.length > 1 ? iw / (points.length - 1) : iw;
  const longest = Math.max(...points.map((p) => (p.tick ?? p.x).length));
  const showEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(iw / (longest * 7 + 16)))));
  const last = points.length - 1;

  return (
    <div className="chart" ref={ref} onPointerLeave={() => setActive(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label}>
          {ticks.map((t) => (
            <g key={t} className="tick">
              <line className={t === 0 ? "baseline" : "gridline"} x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} />
              <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {t}
                {t === yTop ? unit : ""}
              </text>
            </g>
          ))}
          {refValue !== undefined && (
            <g>
              <line className="refline" x1={m.l} x2={width - m.r} y1={y(refValue)} y2={y(refValue)} />
              {refLabel && (
                <text x={width - m.r} y={y(refValue) - 6} textAnchor="end" className="label-2">
                  {refLabel}
                </text>
              )}
            </g>
          )}
          {hasBand && <path d={band} fill="var(--series-band)" />}
          <path d={line} fill="none" stroke="var(--series)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => (
            <g key={p.x}>
              {i % showEvery === 0 && (
                <text x={x(i)} y={m.t + ih + 20} textAnchor="middle">
                  {p.tick ?? p.x}
                </text>
              )}
              {(active === i || (highlightLast && i === last && active === null)) && (
                <circle cx={x(i)} cy={y(p.value)} r={5} fill="var(--series)" stroke="var(--surface)" strokeWidth={2} />
              )}
            </g>
          ))}
          {xTitle && (
            <text x={m.l + iw / 2} y={height - 6} textAnchor="middle" className="label-2">
              {xTitle}
            </text>
          )}
          {highlightLast && active === null && (
            <text x={x(last) - 10} y={y(points[last].value) - 12} textAnchor="end" className="label-strong">
              {points[last].value.toFixed(1)}
              {unit}
            </text>
          )}
          {active !== null && (
            <line className="gridline" x1={x(active)} x2={x(active)} y1={m.t} y2={m.t + ih} style={{ stroke: "var(--axis)" }} />
          )}
          {points.map((p, i) => (
            <rect
              key={`hit-${p.x}`}
              className="hit"
              x={x(i) - step / 2}
              y={m.t}
              width={step}
              height={ih}
              tabIndex={0}
              aria-label={`${p.x}: ${p.value.toFixed(1)}${unit}`}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            />
          ))}
        </svg>
      )}
      {active !== null && (
        <Tooltip
          width={width}
          tip={{
            x: x(active),
            y: y(points[active].value),
            content: (
              <>
                <div className="tooltip-value">
                  {points[active].value.toFixed(1)}
                  {unit}
                </div>
                <div>{points[active].x}</div>
                {points[active].low !== undefined && (
                  <div>
                    95% CI {points[active].low!.toFixed(1)}–{points[active].high!.toFixed(1)}
                    {unit}
                  </div>
                )}
                {points[active].note && <div>{points[active].note}</div>}
              </>
            ),
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ columns with CI whiskers */

export type BarDatum = { label: string; value: number; low: number; high: number; n: number; emphasis?: boolean };

export function ColumnChart({
  data, height = 280, label, refValue, refLabel,
}: {
  data: BarDatum[];
  height?: number;
  label: string;
  refValue?: number;
  refLabel?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const narrow = width < 520;
  const m = { t: 22, r: 8, b: narrow ? 52 : 40, l: 36 };
  const { ticks, top } = niceTicks(Math.max(...data.map((d) => d.high), refValue ?? 0));
  const iw = Math.max(0, width - m.l - m.r);
  const ih = height - m.t - m.b;
  const band = iw / data.length;
  const bw = Math.min(56, band * 0.56);
  const y = linear(0, top, m.t + ih, m.t);
  const cx = (i: number) => m.l + band * i + band / 2;

  const wrap = (s: string) => {
    if (!narrow || s.length <= 10) return [s];
    const parts = s.split(" ");
    if (parts.length === 1) return [s];
    const mid = Math.ceil(parts.length / 2);
    return [parts.slice(0, mid).join(" "), parts.slice(mid).join(" ")];
  };

  return (
    <div className="chart" ref={ref} onPointerLeave={() => setActive(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label}>
          {ticks.map((t) => (
            <g key={t} className="tick">
              <line className={t === 0 ? "baseline" : "gridline"} x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} />
              <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {t}
                {t === top ? "%" : ""}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x0 = cx(i) - bw / 2;
            const h = y(0) - y(d.value);
            const r = Math.min(4, h);
            return (
              <g key={d.label} opacity={active === null || active === i ? 1 : 0.55}>
                <path
                  d={`M${x0},${y(0)}V${y(d.value) + r}Q${x0},${y(d.value)} ${x0 + r},${y(d.value)}H${x0 + bw - r}Q${x0 + bw},${y(d.value)} ${x0 + bw},${y(d.value) + r}V${y(0)}Z`}
                  fill={d.emphasis === false ? "var(--series-muted)" : "var(--series)"}
                />
                <line x1={cx(i)} x2={cx(i)} y1={y(d.low)} y2={y(d.high)} stroke="var(--ink)" strokeWidth={1.25} />
                <line x1={cx(i) - 4} x2={cx(i) + 4} y1={y(d.low)} y2={y(d.low)} stroke="var(--ink)" strokeWidth={1.25} />
                <line x1={cx(i) - 4} x2={cx(i) + 4} y1={y(d.high)} y2={y(d.high)} stroke="var(--ink)" strokeWidth={1.25} />
                <text x={cx(i)} y={y(d.high) - 7} textAnchor="middle" className="label-strong">
                  {Math.round(d.value)}%
                </text>
                {wrap(d.label).map((line, k) => (
                  <text key={k} x={cx(i)} y={y(0) + 18 + k * 14} textAnchor="middle" className="label-2">
                    {line}
                  </text>
                ))}
                <rect
                  className="hit"
                  x={cx(i) - band / 2}
                  y={m.t}
                  width={band}
                  height={ih}
                  tabIndex={0}
                  aria-label={`${d.label}: ${d.value.toFixed(1)}%, 95% CI ${d.low.toFixed(1)} to ${d.high.toFixed(1)}`}
                  onPointerEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                />
              </g>
            );
          })}
          {refValue !== undefined && (
            <line className="refline" x1={m.l} x2={width - m.r} y1={y(refValue)} y2={y(refValue)} pointerEvents="none" />
          )}
        </svg>
      )}
      {refValue !== undefined && refLabel && (
        <div className="legend" style={{ marginTop: 4 }}>
          <span className="legend-item">
            <span className="swatch swatch-line" style={{ background: "var(--ink-3)" }} />
            {refLabel}
          </span>
          <span className="legend-item">
            <span className="swatch swatch-line" style={{ background: "var(--ink)", width: 2, height: 12 }} />
            95% confidence interval
          </span>
        </div>
      )}
      {active !== null && (
        <Tooltip
          width={width}
          tip={{
            x: cx(active),
            y: y(data[active].value),
            content: (
              <>
                <div className="tooltip-value">{data[active].value.toFixed(1)}%</div>
                <div className="tooltip-title">{data[active].label}</div>
                <div>
                  95% CI {data[active].low.toFixed(1)}–{data[active].high.toFixed(1)}%
                </div>
                <div>{data[active].n.toLocaleString()} children</div>
              </>
            ),
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ forest plot (odds ratios) */

export type ForestRow = { group: string; level: string; or: number; low: number; high: number; reference: boolean };

export function ForestPlot({ rows, label }: { rows: ForestRow[]; label: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const narrow = width < 560;
  const rowH = 30;
  const groupH = 34;
  const labelW = narrow ? Math.min(150, width * 0.42) : 230;
  const valueW = narrow ? 0 : 118;
  const m = { t: 8, r: 16 + valueW, b: 36, l: labelW };
  const lo = 0.5;
  const hi = 8;
  const iw = Math.max(0, width - m.l - m.r);
  const x = (v: number) => m.l + ((Math.log(Math.min(hi, Math.max(lo, v))) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * iw;

  const layout = useMemo(() => {
    let yy = m.t;
    const out: { type: "group" | "row"; y: number; row?: ForestRow; idx?: number; group?: string }[] = [];
    let last = "";
    rows.forEach((r, i) => {
      if (r.group !== last) {
        out.push({ type: "group", y: yy + groupH - 10, group: r.group });
        yy += groupH;
        last = r.group;
      }
      out.push({ type: "row", y: yy + rowH / 2, row: r, idx: i });
      yy += rowH;
    });
    return { out, h: yy };
  }, [rows, m.t]);

  const height = layout.h + m.b;
  const ticks = [0.5, 1, 2, 4, 8];
  const tone = (r: ForestRow) =>
    r.reference ? "var(--ink-3)" : r.low > 1 ? "var(--risk)" : r.high < 1 ? "var(--protect)" : "var(--series-muted)";

  return (
    <div className="chart" ref={ref} onPointerLeave={() => setActive(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label}>
          {ticks.map((t) => (
            <g key={t} className="tick">
              <line className={t === 1 ? "baseline" : "gridline"} x1={x(t)} x2={x(t)} y1={m.t} y2={layout.h}
                style={t === 1 ? { stroke: "var(--ink-3)" } : undefined} />
              <text x={x(t)} y={layout.h + 18} textAnchor="middle">
                {t === 1 ? "1 (same)" : `${t}×`}
              </text>
            </g>
          ))}
          {!narrow && (
            <text x={width - 8} y={m.t + 10} textAnchor="end" className="label-2">
              Odds ratio (95% CI)
            </text>
          )}
          {layout.out.map((o, k) =>
            o.type === "group" ? (
              <text key={`g${k}`} x={0} y={o.y} className="label-strong">
                {o.group}
              </text>
            ) : (
              <g key={`r${k}`} opacity={active === null || active === o.idx ? 1 : 0.6}>
                {active === o.idx && <rect x={0} y={o.y - rowH / 2} width={width} height={rowH} fill="var(--surface-2)" rx={4} />}
                <text x={10} y={o.y} dy="0.32em" className="label-2">
                  {narrow && o.row!.level.length > 18 ? `${o.row!.level.slice(0, 17)}…` : o.row!.level}
                  {o.row!.reference ? " (reference)" : ""}
                </text>
                {!o.row!.reference && (
                  <line x1={x(o.row!.low)} x2={x(o.row!.high)} y1={o.y} y2={o.y} stroke={tone(o.row!)} strokeWidth={2} strokeLinecap="round" />
                )}
                <circle cx={x(o.row!.or)} cy={o.y} r={o.row!.reference ? 3.5 : 5} fill={o.row!.reference ? "var(--surface)" : tone(o.row!)}
                  stroke={o.row!.reference ? "var(--ink-3)" : "var(--surface)"} strokeWidth={o.row!.reference ? 1.5 : 2} />
                {!narrow && (
                  <text x={width - 8} y={o.y} dy="0.32em" textAnchor="end" className="num">
                    {o.row!.reference ? "—" : `${o.row!.or.toFixed(2)} (${o.row!.low.toFixed(2)}–${o.row!.high.toFixed(2)})`}
                  </text>
                )}
                <rect
                  className="hit"
                  x={0}
                  y={o.y - rowH / 2}
                  width={width}
                  height={rowH}
                  tabIndex={o.row!.reference ? -1 : 0}
                  aria-label={o.row!.reference ? undefined : `${o.row!.group}, ${o.row!.level}: odds ratio ${o.row!.or.toFixed(2)}, 95% CI ${o.row!.low.toFixed(2)} to ${o.row!.high.toFixed(2)}`}
                  onPointerEnter={() => !o.row!.reference && setActive(o.idx!)}
                  onFocus={() => setActive(o.idx!)}
                  onBlur={() => setActive(null)}
                />
              </g>
            ),
          )}
        </svg>
      )}
      {active !== null && (() => {
        const o = layout.out.find((e) => e.idx === active)!;
        const r = o.row!;
        const verdict = r.low > 1 ? "Higher odds of stunting" : r.high < 1 ? "Lower odds of stunting" : "No clear difference";
        return (
          <Tooltip
            width={width}
            tip={{
              x: Math.min(x(r.high) + 4, width - 20),
              y: o.y,
              content: (
                <>
                  <div className="tooltip-value">{r.or.toFixed(2)}×</div>
                  <div className="tooltip-title">
                    {r.group}: {r.level}
                  </div>
                  <div>
                    95% CI {r.low.toFixed(2)}–{r.high.toFixed(2)}
                  </div>
                  <div>{verdict}</div>
                </>
              ),
            }}
          />
        );
      })()}
    </div>
  );
}

/* ------------------------------------------------------------------ choropleth */


export function Choropleth({
  geo, values, bins, selected, onSelect, dimmed, label, tooltip,
}: {
  geo: Geo;
  values: Record<string, number>;
  bins: Bin[];
  selected?: string;
  onSelect: (name: string) => void;
  dimmed?: Set<string>;
  label: string;
  tooltip: (name: string) => ReactNode;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);
  const height = Math.round(Math.min(width * 0.86, 520));
  const path = useMemo(() => {
    if (!width) return null;
    const proj = geoMercator().fitExtent([[4, 4], [width - 4, height - 4]], geo);
    return geoPath(proj);
  }, [geo, width, height]);

  const sel = geo.features.find((f) => f.properties.name === selected);

  return (
    <div className="chart" ref={ref} onPointerLeave={() => setHover(null)}>
      {path && (
        <svg width={width} height={height} role="img" aria-label={label}>
          {geo.features.map((f) => {
            const name = f.properties.name;
            const v = values[name];
            const fill = v === undefined ? "var(--seq-none)" : `var(--seq-${binIndex(bins, v) + 1})`;
            return (
              <path
                key={name}
                d={path(f) ?? ""}
                className={`map-path${dimmed?.has(name) ? " is-dim" : ""}`}
                fill={fill}
                onClick={() => onSelect(name)}
                onPointerMove={(e) => {
                  const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setHover({ name, x: e.clientX - box.left, y: e.clientY - box.top });
                }}
              />
            );
          })}
          {sel && (
            <>
              <path d={path(sel) ?? ""} className="map-outline-halo" />
              <path d={path(sel) ?? ""} className="map-outline" />
            </>
          )}
        </svg>
      )}
      {hover && <Tooltip width={width} tip={{ x: hover.x, y: hover.y, content: tooltip(hover.name) }} />}
    </div>
  );
}

export function ScaleLegend({ bins, title }: { bins: Bin[]; title: string }) {
  return (
    <div className="scale-legend">
      <span className="field-label">{title}</span>
      <div className="scale-legend-bar" aria-hidden>
        {bins.map((_, i) => (
          <span key={i} style={{ background: `var(--seq-${i + 1})` }} />
        ))}
      </div>
      <div className="scale-legend-ticks">
        {bins.map((b) => (
          <span key={b.label}>{b.label}</span>
        ))}
      </div>
    </div>
  );
}
