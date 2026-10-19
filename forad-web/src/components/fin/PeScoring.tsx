import type { FinPeriod, Metric } from '../../data/financials';
import { fm } from './Statement';

const showMetric = (m: Metric) => {
  if (m.value === null || m.value === undefined) return '—';
  if (typeof m.value === 'string') return m.value;
  if (m.fmt === 'pct') return `${(m.value * 100).toFixed(1)}%`;
  if (m.fmt === 'x') return `${m.value.toFixed(2)}×`;
  if (m.fmt === 'usd') return `$${m.value.toFixed(2)}`;
  return String(m.value);
};

function ScoreBar({ score }: { score: number }) {
  const left = score < 0 ? 50 + (score / 4) * 50 : 50;
  const width = (Math.abs(score) / 4) * 50;
  return (
    <span className="scorebar" role="img" aria-label={`Score ${score.toFixed(2)} on a scale from −4 to +4`}>
      <span className="scorebar__mid" />
      <span className={`scorebar__fill ${score < 0 ? 'is-neg' : ''}`} style={{ left: `${left}%`, width: `${width}%` }} />
    </span>
  );
}

/** FORAD 2.0 Results › PE Scoring: six elements, weighted score, P/E, EPS and share price. */
export default function PeScoring({ fin, cols }: { fin: FinPeriod; cols: { label: string; fin: FinPeriod }[] }) {
  const pe = fin.pe;
  return (
    <div className="stack">
      <section className="card">
        <header className="stmt__head">
          <h2 className="card__title">PE scoring</h2>
          <span className="muted small">Scores run from −4 to +4</span>
        </header>
        <div className="tablewrap">
          <table className="table pe">
            <thead>
              <tr>
                <th scope="col">Element</th>
                <th scope="col">Measures</th>
                {cols.map((c) => <th key={c.label} scope="col" className="num">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {pe.elements.map((e, idx) => (
                <tr key={e.key}>
                  <th scope="row">
                    {e.label}
                    <span className="pe__w mono">{Math.round(e.weight * 100)}%</span>
                  </th>
                  <td>
                    <ul className="pe__metrics">
                      {e.metrics.map((m, k) => (
                        <li key={m.label}>
                          <span>{m.label}</span>
                          {cols.map((c) => <span key={c.label} className="mono">{showMetric(c.fin.pe.elements[idx].metrics[k])}</span>)}
                        </li>
                      ))}
                    </ul>
                  </td>
                  {cols.map((c) => {
                    const ce = c.fin.pe.elements[idx];
                    return (
                      <td key={c.label} className="num pe__score">
                        <span className="mono">{ce.score >= 0 ? '+' : '−'}{Math.abs(ce.score).toFixed(2)}</span>
                        <ScoreBar score={ce.score} />
                        {!ce.rule && <span className="pe__tag">sample</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><th scope="row" colSpan={2}>Weighted score</th>{cols.map((c) => <td key={c.label} className="num mono">{fm(c.fin.pe.weighted)}</td>)}</tr>
              <tr><th scope="row" colSpan={2}>P/E, previous period</th>{cols.map((c) => <td key={c.label} className="num mono">{fm(c.fin.pe.pePrev)}</td>)}</tr>
              <tr><th scope="row" colSpan={2}>Change in P/E</th>{cols.map((c) => <td key={c.label} className="num mono">{fm(c.fin.pe.change)}</td>)}</tr>
              <tr className="pe__strong"><th scope="row" colSpan={2}>P/E ratio</th>{cols.map((c) => <td key={c.label} className="num mono">{fm(c.fin.pe.pe)}</td>)}</tr>
              <tr><th scope="row" colSpan={2}>EPS, quarter</th>{cols.map((c) => <td key={c.label} className="num mono">{fm(c.fin.pe.eps)}</td>)}</tr>
              <tr><th scope="row" colSpan={2}>Annualized EPS <span className="muted small">4 × (50% this quarter + 25% + 15% + 10% of the three before)</span></th>{cols.map((c) => <td key={c.label} className="num mono">{fm(c.fin.pe.annualEps)}</td>)}</tr>
              <tr className="pe__strong"><th scope="row" colSpan={2}>Stock price <span className="muted small">annualized EPS × P/E</span></th>{cols.map((c) => <td key={c.label} className="num mono">${fm(c.fin.pe.price)}</td>)}</tr>
            </tfoot>
          </table>
        </div>
        <p className="footnote">
          Hedging and tax scores follow the manual’s end points (±15% FX variance; tax rate below 35% or above 62%) with a straight line between. The other
          scores and the size of the P/E change are sample values until FORAD 2.0’s exact scoring tables are confirmed (P-03).
        </p>
      </section>
    </div>
  );
}
