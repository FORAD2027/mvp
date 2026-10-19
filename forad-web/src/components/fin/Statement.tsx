import type { Line } from '../../data/financials';
import type { Row } from './rows';

export const fm = (v: number | undefined | null, d = 2) => {
  if (v === undefined || v === null || !Number.isFinite(v)) return '—';
  const r = Math.abs(v) < 0.5 * 10 ** -d ? 0 : v;
  const s = new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }).format(Math.abs(r));
  return r < 0 ? `(${s})` : r === 0 ? '–' : s;
};

interface Col {
  label: string;
  data: Line;
}

/** One financial statement, FORAD 2.0 style: rows down, periods across, millions, negatives in brackets. */
export default function Statement({ title, unit, rows, cols }: { title: string; unit: string; rows: Row[]; cols: Col[] }) {
  return (
    <section className="card stmt" aria-label={title}>
      <header className="stmt__head">
        <h2 className="card__title">{title}</h2>
        <span className="muted small">{unit}</span>
      </header>
      <div className="tablewrap">
        <table className="table stmt__table">
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Line</span></th>
              {cols.map((c) => <th key={c.label} scope="col" className="num">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              if (r.kind === 'gap') return <tr key={idx} className="stmt__gap" aria-hidden="true"><td colSpan={cols.length + 1} /></tr>;
              if (r.kind === 'h') return <tr key={idx} className="stmt__h"><th scope="rowgroup" colSpan={cols.length + 1}>{r.label}</th></tr>;
              return (
                <tr key={idx} className={`stmt__${r.kind}`}>
                  <th scope="row" className={r.indent ? 'stmt__indent' : undefined}>{r.label}</th>
                  {cols.map((c) => {
                    const v = r.key ? c.data[r.key] : undefined;
                    const shown = v === undefined ? undefined : r.neg ? -v : v;
                    return <td key={c.label} className="num mono">{fm(shown)}</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
