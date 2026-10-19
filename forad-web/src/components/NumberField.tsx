import { useEffect, useId, useState, type ReactNode } from 'react';

export interface FieldHelp {
  what: string;
  limits: string;
  affects: string[];
  tip?: string;
}

export interface QuickValue {
  label: string;
  value: number;
}

interface Props {
  label: string;
  value: number;
  defaultValue: number;
  decimals: number;
  unit: string;
  step?: number;
  onChange: (v: number) => void;
  onReset: () => void;
  quick?: QuickValue[];
  context?: ReactNode; // one line under the input, e.g. "0.8% weaker than spot"
  issue?: { severity: 'error' | 'warning'; message: string };
  help: FieldHelp;
  defaultLabel?: string;
}

const group = (v: number, d: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);

/** Numeric input with formatted display, quick-fill chips, reset to default and inline help. */
export default function NumberField({
  label, value, defaultValue, decimals, unit, step, onChange, onReset, quick = [], context, issue, help, defaultLabel = 'Last actual',
}: Props) {
  const id = useId();
  // The box always shows `text`; it is never swapped on focus (that broke select-and-type).
  // Commas are allowed while typing and stripped when the value is read.
  const [text, setText] = useState(() => group(value, decimals));
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const changed = Math.abs(value - defaultValue) > 1e-12;

  // Keep the box in sync when the value changes from outside (quick-fill, reset, arrow keys).
  useEffect(() => {
    if (!focused) setText(group(value, decimals));
  }, [value, decimals, focused]);

  const commit = (raw: string) => {
    const cleaned = raw.replace(/[,\s]/g, '');
    if (cleaned === '' || cleaned === '-' || cleaned === '.') return;
    const n = Number(cleaned);
    if (Number.isFinite(n)) onChange(n);
  };

  const describedBy = [`${id}-ctx`, issue ? `${id}-issue` : '', open ? `${id}-help` : ''].filter(Boolean).join(' ');

  return (
    <div className={`field ${issue ? `field--${issue.severity}` : ''}`}>
      <div className="field__top">
        <label htmlFor={id} className="field__label">{label}</label>
        <div className="field__meta">
          {changed ? (
            <button type="button" className="chip chip--accent chip--btn" onClick={onReset} title={`Reset to ${defaultLabel.toLowerCase()}`}>
              Changed · reset
            </button>
          ) : (
            <span className="chip chip--muted">{defaultLabel}</span>
          )}
          <button
            type="button"
            className={`helpbtn ${open ? 'is-open' : ''}`}
            aria-expanded={open}
            aria-controls={`${id}-help`}
            aria-label={`About ${label}`}
            onClick={() => setOpen((v) => !v)}
          >
            ?
          </button>
        </div>
      </div>

      <div className="field__box">
        <input
          id={id}
          className="field__input mono"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          aria-invalid={issue?.severity === 'error' || undefined}
          aria-describedby={describedBy}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commit(text);
            setText(group(value, decimals));
          }}
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value);
          }}
          onKeyDown={(e) => {
            if (!step || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
            e.preventDefault();
            const next = Number((value + (e.key === 'ArrowUp' ? step : -step)).toFixed(decimals));
            onChange(next);
            setText(group(next, decimals));
          }}
        />
        <span className="field__unit">{unit}</span>
      </div>

      {quick.length > 0 && (
        <div className="field__quick" role="group" aria-label={`Quick fill ${label}`}>
          {quick.map((q) => {
            const on = Math.abs(q.value - value) < 1e-9;
            return (
              <button key={q.label} type="button" className={`quick ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => onChange(q.value)}>
                {q.label} <span className="mono">{group(q.value, decimals)}</span>
              </button>
            );
          })}
        </div>
      )}

      <div id={`${id}-ctx`} className="field__ctx">{context}</div>
      {issue && (
        <div id={`${id}-issue`} className={`field__issue field__issue--${issue.severity}`} role={issue.severity === 'error' ? 'alert' : undefined}>
          {issue.message}
        </div>
      )}

      {open && (
        <div id={`${id}-help`} className="help" role="note">
          <p><strong>What it is.</strong> {help.what}</p>
          <p><strong>Limits.</strong> {help.limits}</p>
          <div className="help__affects">
            <strong>Affects</strong>
            {help.affects.map((a) => <span key={a} className="chip chip--outline">{a}</span>)}
          </div>
          {help.tip && <p className="help__tip"><strong>Think about it.</strong> {help.tip}</p>}
        </div>
      )}
    </div>
  );
}
