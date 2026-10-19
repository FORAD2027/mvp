import { useEffect, useRef, useState } from 'react';
import { BIMR } from '../../data/bimr';
import { num } from '../../lib/format';

interface Props {
  /** Last period whose results the instructor has released. Fixes the axes. */
  releasedThrough: number;
  /** The period being viewed: the chart grows to this point. */
  throughPeriod: number;
}

const STEP_MS = 650;
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Stock price by team, drawn period by period. The axes cover every released period so the
 * scale never jumps; lines grow up to the period being viewed, one period at a time.
 */
export default function StockChart({ releasedThrough, throughPeriod }: Props) {
  const boards = BIMR.filter((r) => r.leaderboard && r.leaderboard.afterPeriod <= releasedThrough)
    .map((r) => r.leaderboard!)
    .sort((a, b) => a.afterPeriod - b.afterPeriod);
  const periods = boards.map((b) => b.afterPeriod);
  const first = periods[0];
  const last = periods[periods.length - 1];
  const target = Math.max(first ?? 0, Math.min(throughPeriod, last ?? 0));

  const [upto, setUpto] = useState(first ?? 0); // grow from the first period on arrival
  const [goal, setGoal] = useState(target);
  const timer = useRef<number | null>(null);

  // A new period selected elsewhere on the page: grow (or shrink) the chart to it.
  useEffect(() => setGoal(target), [target]);

  useEffect(() => {
    if (upto === goal) return;
    if (reducedMotion()) { setUpto(goal); return; }
    timer.current = window.setTimeout(() => setUpto((u) => u + Math.sign(goal - u)), upto === first && goal > upto ? 120 : STEP_MS);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [upto, goal, first]);

  if (!boards.length) return null;

  const replay = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setUpto(first);
    setGoal(target);
  };

  const teams = boards[boards.length - 1].rows.map((r) => r.team); // colour order fixed by the latest board
  const series = teams.map((team) => ({ team, values: boards.map((b) => b.rows.find((r) => r.team === team)?.stockPrice ?? null) }));
  const max = Math.ceil(Math.max(...series.flatMap((s) => s.values.filter((v): v is number => v !== null))) / 25) * 25;
  const W = 900, H = 290, L = 56, R = 200, T = 16, B = 36;
  const n = Math.max(periods.length - 1, 1);
  const x = (i: number) => L + (i * (W - L - R)) / n;
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const ticks = Array.from({ length: max / 25 + 1 }, (_, i) => i * 25);
  const shownIdx = periods.indexOf(upto);

  // End labels sit at each team's latest shown point, nudged apart so they never overlap.
  const ends = series
    .map((s, i) => ({ i, v: s.values[shownIdx], y: y(s.values[shownIdx] ?? 0) }))
    .sort((a, b) => a.y - b.y);
  for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 17) ends[k].y = ends[k - 1].y + 17;
  const end = (i: number) => ends.find((e) => e.i === i)!;

  const rank = boards[shownIdx]?.rows ?? [];
  const playing = upto !== goal;

  return (
    <section className="card" aria-labelledby="stock">
      <div className="card__headrow">
        <div>
          <h2 id="stock" className="card__title">Stock price by team</h2>
          <p className="card__sub">After Period {upto} · from the leaderboard your instructor releases each period.</p>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={replay} disabled={periods.length < 2 || playing}>
          {playing ? 'Playing…' : '▶ Replay from Period ' + first}
        </button>
      </div>

      <div className="tablewrap">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Stock price by team, Periods ${first} to ${upto}`} className="chartsvg chartsvg--wide">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={L} x2={x(n) + 8} y1={y(v)} y2={y(v)} className="chart-grid" />
              <text x={L - 8} y={y(v) + 4} textAnchor="end" className="chart-tick">${v}</text>
            </g>
          ))}
          {periods.map((p, i) => (
            <text key={p} x={x(i)} y={H - B + 20} textAnchor="middle" className={`chart-tick ${i <= shownIdx ? '' : 'chart-tick--future'} ${p === upto ? 'chart-tick--strong' : ''}`}>
              After P{p}
            </text>
          ))}
          <line x1={x(shownIdx)} x2={x(shownIdx)} y1={T} y2={H - B} className="chart-now" />

          {series.map((s, si) => (
            <g key={s.team} className={`line line--${si + 1}`}>
              {s.values.map((v, i) => {
                const pv = s.values[i - 1];
                if (i === 0 || v === null || pv == null) return null;
                return <line key={`s${i}`} x1={x(i - 1)} y1={y(pv)} x2={x(i)} y2={y(v)} pathLength={1} className={`seg ${i <= shownIdx ? 'is-on' : ''}`} />;
              })}
              {s.values.map((v, i) => v !== null && (
                <circle key={`c${i}`} cx={x(i)} cy={y(v)} r={i === shownIdx ? 5 : 3.5} className={`pt ${i <= shownIdx ? 'is-on' : ''}`}>
                  <title>{`${s.team}, after Period ${periods[i]}: $${num(v, 2)}`}</title>
                </circle>
              ))}
              {end(si).v != null && (
                <g className="endlabel" style={{ transform: `translate(${x(shownIdx) + 12}px, ${end(si).y + 4}px)` }}>
                  <text className="chart-label">{s.team} ${num(end(si).v!, 2)}</text>
                </g>
              )}
            </g>
          ))}
        </svg>
      </div>

      <div className="scrub">
        <label htmlFor="stock-scrub" className="small muted">Show through</label>
        <input
          id="stock-scrub"
          type="range"
          min={first}
          max={last}
          step={1}
          value={upto}
          disabled={periods.length < 2}
          onChange={(e) => { const v = Number(e.target.value); setUpto(v); setGoal(v); }}
        />
        <span className="mono small">After P{upto}</span>
      </div>

      <ol className="rankrow" aria-label={`Ranking after Period ${upto}`}>
        {rank.map((r) => (
          <li key={r.team}>
            <span className="mono muted">{r.rank}</span>
            <i className={`sw sw--s${teams.indexOf(r.team) + 1}`} aria-hidden="true" />
            <span>{r.team}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
