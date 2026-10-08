import { useId, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, CircleAlert, CircleCheck, Table2, TriangleAlert } from "lucide-react";
import type { Priority } from "../lib/data";
import { PRIORITY_LABEL } from "../lib/data";

export function Segmented<T extends string>({
  label, value, options, onChange, scroll = false,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  scroll?: boolean;
}) {
  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = options[(i + (e.key === "ArrowRight" ? 1 : options.length - 1)) % options.length];
    onChange(next.value);
    const group = (e.currentTarget as HTMLElement).parentElement;
    requestAnimationFrame(() => (group?.querySelector('[aria-checked="true"]') as HTMLElement | null)?.focus());
  };
  const control = (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
  return scroll ? <div className="segmented-scroll">{control}</div> : control;
}

export function Select({
  label, value, options, onChange, placeholder, invalid, hint, id: idProp,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  hint?: string;
  id?: string;
}) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="select-wrap">
        <select
          id={id}
          className="select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} aria-hidden />
      </div>
      {hint && (
        <span id={`${id}-hint`} className="field-hint">
          {hint}
        </span>
      )}
    </div>
  );
}

const PRIORITY_ICON = { high: TriangleAlert, elevated: CircleAlert, lower: CircleCheck };

export function PriorityBadge({ priority }: { priority: Priority }) {
  const Icon = PRIORITY_ICON[priority];
  return (
    <span className={`badge badge-${priority}`}>
      <Icon size={14} aria-hidden strokeWidth={2.25} />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function Disclosure({ summary, children, icon = true }: { summary: string; children: ReactNode; icon?: boolean }) {
  return (
    <details className="disclosure">
      <summary>
        {icon && <Table2 size={15} aria-hidden />}
        {summary}
        <ChevronDown size={15} className="chev" aria-hidden />
      </summary>
      <div>{children}</div>
    </details>
  );
}

export type Column<T> = {
  key: string;
  label: string;
  value: (row: T) => string | number;
  render?: (row: T) => ReactNode;
  numeric?: boolean;
};

export function DataTable<T>({
  rows, columns, caption, initialSort,
}: {
  rows: T[];
  columns: Column<T>[];
  caption: string;
  initialSort?: { key: string; dir: "asc" | "desc" };
}) {
  const [sort, setSort] = useState(initialSort);
  const col = columns.find((c) => c.key === sort?.key);
  const sorted = col
    ? [...rows].sort((a, b) => {
        const x = col.value(a);
        const y = col.value(b);
        const r = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
        return sort!.dir === "asc" ? r : -r;
      })
    : rows;
  return (
    <div className="table-wrap">
      <table className="table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  className={c.numeric ? "r" : undefined}
                  aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none"}
                  scope="col"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSort({ key: c.key, dir: active && sort!.dir === "desc" ? "asc" : c.numeric ? "desc" : "asc" })
                    }
                  >
                    {c.label}
                    {active && (sort!.dir === "asc" ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />)}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key} className={c.numeric ? "r" : undefined}>
                  {c.render ? c.render(r) : c.value(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty" role="status">
      <div className="empty-icon" aria-hidden>
        {icon}
      </div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}

export function BrandMark({ className }: { className?: string }) {
  // A growth chart in miniature: three rising height marks against a baseline.
  return (
    <svg className={className} viewBox="0 0 26 26" fill="none" aria-hidden>
      <rect x="0.75" y="0.75" width="24.5" height="24.5" rx="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 19V14.5M13 19V10.5M19 19V7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function GitHubMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
