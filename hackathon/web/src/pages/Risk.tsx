import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CircleAlert, ClipboardList, Info, RotateCcw } from "lucide-react";
import { Empty, Select } from "../components/ui";
import { FACTOR_LABELS, type Dataset, type Factor } from "../lib/data";
import { ALL_FACTORS, GROUPS, missing, options, PRESETS, whatIf, type Profile } from "../lib/model";

const HINTS: Partial<Record<Factor, string>> = {
  birth_interval: "Time between this child's birth and the previous one.",
  birth_size: "As reported by the mother.",
  mother_height: "Measured height of the child's mother.",
  wealth: "Household wealth group (fifths of the population).",
};

export function Risk({ data, province }: { data: Dataset; province?: string }) {
  const [profile, setProfile] = useState<Profile>(() =>
    province ? { ...PRESETS[0].profile, province, residence: province === "Kigali" ? "Urban" : "Rural" } : PRESETS[0].profile,
  );
  const [preset, setPreset] = useState<string | null>(province ? null : PRESETS[0].id);
  const [showErrors, setShowErrors] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const [resultInView, setResultInView] = useState(false);
  useEffect(() => {
    const el = resultRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setResultInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const result = useMemo(() => whatIf(data, profile), [data, profile]);
  const todo = missing(profile);
  const national = data.national.stunting.value;

  const set = (f: Factor, v: string) => {
    setProfile((p) => ({ ...p, [f]: v }));
    setPreset(null);
  };
  const focusFirstMissing = () => {
    setShowErrors(true);
    const first = todo[0];
    requestAnimationFrame(() => (formRef.current?.querySelector(`[data-factor="${first}"] select, [data-factor="${first}"] input`) as HTMLElement | null)?.focus());
  };

  return (
    <>
      <header className="page-head">
        <span className="eyebrow">Risk check</span>
        <h1>How likely is this child to be stunted?</h1>
        <p className="lede">
          Describe a child's situation to get an estimate from the RDHS 2025 model, then see how much the risk falls
          if the conditions a family or programme can change improve. It's for planning conversations, not for
          diagnosing an individual child.
        </p>
      </header>

      <div className="risk-layout">
        <form ref={formRef} className="card risk-form" onSubmit={(e) => e.preventDefault()} noValidate aria-label="Child profile">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <span className="field-label">Start from</span>
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="btn btn-sm"
                  aria-pressed={preset === p.id}
                  style={preset === p.id ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : undefined}
                  onClick={() => {
                    setProfile(p.profile);
                    setPreset(p.id);
                    setShowErrors(false);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={todo.length === ALL_FACTORS.length}
              onClick={() => {
                setProfile({});
                setPreset(null);
                setShowErrors(false);
              }}
            >
              <RotateCcw size={15} aria-hidden /> Clear all
            </button>
          </div>

          {GROUPS.map((g) => (
            <fieldset className="fieldset" key={g.title}>
              <legend>{g.title}</legend>
              <div className="fieldset-grid">
              {g.factors.map((f) => (
                <FactorInput
                  key={f}
                  factor={f}
                  options={options(data, f)}
                  value={profile[f] ?? ""}
                  invalid={showErrors && !profile[f]}
                  onChange={(v) => set(f, v)}
                />
              ))}
              </div>
            </fieldset>
          ))}
        </form>

        <aside className="risk-result" aria-live="polite" ref={resultRef} id="risk-result">
          {result ? (
            <>
              <div className="card">
                <div className="field-label">Estimated risk of stunting</div>
                <div className="risk-number" style={{ marginTop: 8 }}>
                  {Math.round(result.base * 100)}%
                </div>
                <p className="card-sub" style={{ marginTop: 8, fontSize: 14.5 }}>
                  {describe(result.base * 100, national)}
                </p>
                <Meter value={result.base * 100} national={national} />
              </div>

              <div className="card">
                <h2 className="card-title">If conditions improve</h2>
                {result.changes.length ? (
                  <>
                    <p className="card-sub" style={{ marginBottom: 12 }}>Change in estimated risk from each step on its own</p>
                    <ul className="change-list">
                      {result.changes.map((c) => {
                        const pts = Math.round(c.delta * 1000) / 10;
                        const coef = data.model.coefficients[c.factor][profile[c.factor]!];
                        const clear = coef.low > 1 || coef.high < 1;
                        return (
                          <li key={c.factor}>
                            <span>
                              {c.action}
                              {!clear && pts <= -0.5 && <span className="sub">Effect not statistically clear</span>}
                            </span>
                            <span className={`delta${pts > -0.5 ? " none" : ""}`}>
                              {pts > -0.5 ? "little change" : `${pts.toFixed(1)} pts`}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="metric" style={{ marginTop: 14 }}>
                      <div className="metric-label">All of these together</div>
                      <div className="metric-value">
                        {Math.round(result.base * 100)}% → {Math.round(result.combined * 100)}%
                      </div>
                      <div className="metric-foot">
                        {Math.round((result.base - result.combined) * 100)} points lower
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="card-sub" style={{ marginTop: 6 }}>
                    This child already has the better level of every factor a family or programme can change. The
                    remaining risk comes from wealth, age and the mother's height and schooling.
                  </p>
                )}
              </div>
              <div className="callout">
                <Info size={16} aria-hidden />
                <span>
                  Estimates come from a population model (cross-validated AUC {data.model.cv_auc.logistic}) and show
                  associations, not certainties. Measure the child's height to know their actual status.
                </span>
              </div>
            </>
          ) : (
            <div className="card">
              <Empty icon={<ClipboardList size={20} />} title={`${todo.length} question${todo.length === 1 ? "" : "s"} left`}>
                Answer every question to see the estimate. Each one changes the result.
              </Empty>
              <div className="progress" style={{ textAlign: "center", marginBottom: 12 }}>
                {ALL_FACTORS.length - todo.length} of {ALL_FACTORS.length} answered
              </div>
              <div style={{ display: "flex", justifyContent: "center", paddingBottom: 8 }}>
                <button type="button" className="btn btn-primary" onClick={focusFirstMissing}>
                  Go to the next question
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      <div className={`risk-dock${resultInView ? " is-hidden" : ""}`} aria-hidden="true">
        <span>
          {result ? (
            <>
              Estimated risk <strong>{Math.round(result.base * 100)}%</strong>
              {result.changes.length > 0 && <> · {Math.round(result.combined * 100)}% if conditions improve</>}
            </>
          ) : (
            <>{todo.length} question{todo.length === 1 ? "" : "s"} left</>
          )}
        </span>
        <button type="button" className="btn btn-sm btn-primary" tabIndex={-1}
          onClick={() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
          View
        </button>
      </div>
    </>
  );
}

function describe(r: number, national: number) {
  const x = r / national;
  if (x >= 1.15) return `About ${x.toFixed(1)}× the national rate of ${national.toFixed(1)}%.`;
  if (x <= 0.85) return `About ${Math.round((1 - x) * 100)}% below the national rate of ${national.toFixed(1)}%.`;
  return `Close to the national rate of ${national.toFixed(1)}%.`;
}

function Meter({ value, national }: { value: number; national: number }) {
  return (
    <div>
      <div className="meter" role="img" aria-label={`Risk ${Math.round(value)}% against a national rate of ${national.toFixed(1)}%`}>
        <div className="meter-fill" style={{ width: `${value}%` }} />
        <div className="meter-mark" style={{ left: `${national}%` }}>
          <span className="meter-mark-label">Rwanda {Math.round(national)}%</span>
        </div>
      </div>
      <div className="meter-scale">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

function FactorInput({
  factor, options, value, invalid, onChange,
}: {
  factor: Factor;
  options: string[];
  value: string;
  invalid: boolean;
  onChange: (v: string) => void;
}) {
  const id = useId();
  const label = FACTOR_LABELS[factor];
  const hint = HINTS[factor];
  const wide = factor === "age" || options.join("").length > 28;
  const error = invalid ? (
    <span className="field-error" id={`${id}-err`}>
      <CircleAlert size={13} aria-hidden /> Choose an option
    </span>
  ) : null;

  if (options.length <= 3) {
    return (
      <div className={`field${wide ? " wide" : ""}`} data-factor={factor} role="radiogroup" aria-labelledby={`${id}-l`}
        aria-describedby={[hint && `${id}-h`, invalid && `${id}-err`].filter(Boolean).join(" ") || undefined}>
        <span className="field-label" id={`${id}-l`}>
          {label}
        </span>
        <div className="choice" aria-invalid={invalid || undefined}>
          {options.map((o) => (
            <label key={o}>
              <input type="radio" name={`${id}-r`} value={o} checked={value === o} onChange={() => onChange(o)} />
              <span>{o}</span>
            </label>
          ))}
        </div>
        {hint && <span className="field-hint" id={`${id}-h`}>{hint}</span>}
        {error}
      </div>
    );
  }
  return (
    <div className={wide ? "wide" : undefined} data-factor={factor}>
      <Select
        label={label}
        value={value}
        placeholder="Choose…"
        invalid={invalid}
        hint={hint}
        options={options.map((o) => ({ value: o, label: o }))}
        onChange={onChange}
      />
      {error}
    </div>
  );
}
