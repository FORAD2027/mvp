import { useId, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../../../lib/auth';
import { useDecision } from '../../../lib/decisionStore';
import { bimrFor, type Ccy } from '../../../data/bimr';
import {
  HOME, VOLATILITY, exposures, hedgeMarket, hedgeResult, hkey, rateLabel, rateOf,
  type HedgeEntity, type HedgeInput, type HedgeMarket, type ExposureLine,
} from '../../../data/hedging';
import { num } from '../../../lib/format';
import { CellNumber, Group, Row } from './OperationsTable';
import type { Position } from './structure';

const NAME: Record<HedgeEntity, string> = { japan: 'Japanese sub', germany: 'German sub', us: 'US Holding' };

const m0 = (v: number) => (Math.abs(v) < 0.5 ? '–' : v < 0 ? `(${num(-v)})` : num(v));

/** S-10: FORAD 2.0 "Decision Inputs · Hedging" for one unit and one foreign currency. */
export default function HedgingTable({ entity, ccy, onGo }: { entity: HedgeEntity; ccy: Ccy; onGo: (p: Position) => void }) {
  const { session } = useAuth();
  const { draft, derived, finCtx, hedgeIssues, hedgeChanged, setHedge, resetHedge, setPrediction, defaults, issues } = useDecision();
  const P = session.currentPeriod;
  const uid = useId();
  const [graph, setGraph] = useState(false);
  const home = HOME[entity];
  const key = hkey(entity, ccy);
  const h = draft.hedging.fx[key];
  const p = draft.predictions;
  const m = hedgeMarket(P, entity, ccy, p.jpyPerUsd, p.usdPerEur);
  const lines = exposures(entity, ccy, draft, derived, finCtx, P);
  const res = hedgeResult(lines, h, m);
  const s = m.scale;
  const label = rateLabel(home, ccy);
  const dpRate = home === 'JPY' && ccy !== 'JPY' ? 2 : 4;

  const lastRep = bimrFor(P - 1);
  const lastS0 = lastRep ? rateOf(home, ccy, lastRep.spot.end.jpyPerUsd, lastRep.spot.end.usdPerEur) * s : null;
  const lastEnd = bimrFor(P) ? rateOf(home, ccy, bimrFor(P)!.spot.end.jpyPerUsd, bimrFor(P)!.spot.end.usdPerEur) * s : null;

  const issue = (k: string) => hedgeIssues.find((i) => i.entity === entity && i.ccy === ccy && i.key === k)?.message;
  const changed = (k: string) => hedgeChanged.includes(`${entity}.${ccy}.${k}`);
  const id = (k: string) => `${uid}-${k}`;

  const inRow = (k: keyof HedgeInput, rowLabel: string, value: number, note?: ReactNode, decimals = 0) => {
    const iss = issue(k);
    return (
      <Row key={k} label={rowLabel} last="—" editable changed={changed(k)} issue={iss} note={note} idBase={id(k)}>
        <CellNumber id={`${id(k)}-in`} label={rowLabel} value={value} decimals={decimals} onChange={(v) => setHedge(key, k, v)} invalid={!!iss}
          describedBy={iss ? `${id(k)}-issue` : note ? `${id(k)}-note` : undefined} />
      </Row>
    );
  };

  // End-of-period rate: entered once for the company on the US Holding hedging tabs.
  let endRow: ReactNode;
  if (entity === 'us') {
    const pk = ccy === 'JPY' ? 'jpyPerUsd' : 'usdPerEur';
    const iss = issues.find((i) => i.key === pk && i.severity === 'error')?.message;
    const shown = ccy === 'JPY' ? p.jpyPerUsd : p.usdPerEur;
    endRow = (
      <Row label={ccy === 'JPY' ? 'End of period ¥/$ · your forecast' : 'End of period $/€ · your forecast'} last={lastEnd === null ? '—' : ccy === 'JPY' ? num(bimrFor(P)!.spot.end.jpyPerUsd, 2) : num(bimrFor(P)!.spot.end.usdPerEur, 4)}
        editable changed={Math.abs(shown - defaults[pk]) > 1e-12} issue={iss} idBase={id('end')}
        note={ccy === 'JPY' ? `= $${num((1 / p.jpyPerUsd) * 100, 4)} per ¥100 · used by every unit` : 'Used by every unit'}>
        <CellNumber id={`${id('end')}-in`} label="End of period rate forecast" value={shown} decimals={ccy === 'JPY' ? 2 : 4} onChange={(v) => setPrediction(pk, v)} invalid={!!iss} />
      </Row>
    );
  } else {
    const linkTo = ccy === 'EUR' && entity === 'japan' ? 'both forecasts' : 'your forecast';
    endRow = (
      <Row label={`End of period ${label} · ${linkTo}`} last={lastEnd === null ? '—' : num(lastEnd, dpRate)}
        note={<button type="button" className="linkbtn" onClick={() => onGo({ country: 'us', section: (ccy === 'EUR' || (entity === 'germany' && ccy === 'USD')) ? 'hedging-eur' : 'hedging-jpy' })}>Set in US Holding</button>}>
        {num(m.ST * s, dpRate)}
      </Row>
    );
  }

  const anyChanged = hedgeChanged.some((k) => k.startsWith(`${entity}.${ccy}.`));
  const score = Math.max(-4, Math.min(4, (res.variance / 0.15) * 4));

  return (
    <div className="stack">
      <section className="card ops" aria-labelledby={`${uid}-t`}>
        <header className="entity__head">
          <div>
            <h2 id={`${uid}-t`} className="card__title">{NAME[entity]}: hedging · {ccy}</h2>
            <p className="card__sub">Exposure in {ccy}; results in {home}. Rates as {label}. Projected from your decisions on the other tabs.</p>
          </div>
          <div className="fin__btns">
            <button type="button" className={`btn btn--ghost btn--sm ${graph ? 'is-on' : ''}`} aria-expanded={graph} onClick={() => setGraph((g) => !g)}>
              {graph ? 'Hide' : 'Show'} FX hedging graph
            </button>
            <button type="button" className="btn btn--ghost btn--sm" disabled={!anyChanged} onClick={() => resetHedge(key)}>Reset</button>
          </div>
        </header>

        {graph && <HedgeGraph lines={lines} h={h} m={m} home={home} ccy={ccy} label={label} />}

        <div className="tablewrap">
          <table className="table otable">
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">Item</span></th>
                <th scope="col" className="num ocell--last">Period {P - 1} actual</th>
                <th scope="col" className="num">Period {P} decision</th>
              </tr>
            </thead>
            <tbody>
              <Group title={`Exchange rates (${label})`} />
              <Row label="Beginning of period" last={lastS0 === null ? '—' : num(lastS0, dpRate)}>{num(m.S0 * s, dpRate)}</Row>
              <Row label="Forward rate, 90 days" last="—" note="From the period’s 3-month LIBOR rates">{num(m.F * s, dpRate)}</Row>
              {endRow}
              <Row label="Volatility" last="—" note="FORAD 2.0 setup files">{`${num(VOLATILITY * 100, 1)}%`}</Row>

              <Group title={`Exposure at period end (${ccy})`} />
              {lines.map((l) => <Row key={l.key} label={l.label} last="—">{m0(l.amount)}</Row>)}
              <Row label="Total exposure" last="—" tone={undefined}>{m0(res.exposureTotal)}</Row>

              <Group title="Hedges" />
              {inRow('forward', `Forward contract buy/(sell) (${ccy})`, h.forward, `At ${num(m.F * s, dpRate)} · 90 days`)}
              <Row label={`Net contractual exposure (${ccy})`} last="—">{m0(res.exposureTotal + h.forward)}</Row>
              {inRow('callNotional', `Call option notional (${ccy})`, h.callNotional, '+ buy · − sell')}
              {inRow('callStrike', `Call option strike (${label})`, h.callStrike, `Within 20% of the forward`, 4)}
              <Row label={`Call option price (${label})`} last="—">{num(res.callPrice * s, 4)}</Row>
              {inRow('putNotional', `Put option notional (${ccy})`, h.putNotional, '+ buy · − sell')}
              {inRow('putStrike', `Put option strike (${label})`, h.putStrike, `Within 20% of the forward`, 4)}
              <Row label={`Put option price (${label})`} last="—">{num(res.putPrice * s, 4)}</Row>

              <Group title={`Projected results at ${num(m.ST * s, dpRate)} (${home})`} />
              {res.gains.map((g) => <Row key={g.key} label={`Gain/(loss) on ${g.label.toLowerCase()}`} last="—">{m0(g.amount)}</Row>)}
              <Row label="Gain/(loss) on forward contract" last="—">{m0(res.forwardGain)}</Row>
              <Row label="Gain/(loss) on call option" last="—">{m0(res.callGain)}</Row>
              <Row label="Call option premium" last="—">{m0(res.callPremium)}</Row>
              <Row label="Gain/(loss) on put option" last="—">{m0(res.putGain)}</Row>
              <Row label="Put option premium" last="—">{m0(res.putPremium)}</Row>
              <Row label="Total net FX gain/(loss)" last="—">{m0(res.total)}</Row>
              <Row label="Forward benchmark outcome" last="—" note="Total exposure at the forward rate">{m0(res.benchmark)}</Row>
              <Row label="Actual outcome" last="—" note="Exposure at your end rate plus hedges">{m0(res.actual)}</Row>
              <Row label="Percentage variance to benchmark" last="—" note={`Currency hedging score ${score >= 0 ? '+' : '−'}${num(Math.abs(score), 2)} (±15% = ±4)`}>
                {`${num(res.variance * 100, 4)}%`}
              </Row>
            </tbody>
          </table>
        </div>
        <p className="footnote">
          Option prices use Black-Scholes for currencies: beginning spot, your strike, 90 days, the two currencies’ 3-month rates and {num(VOLATILITY * 100, 0)}% volatility.
          Notionals are limited to 200% of last period’s equity. Exposures leave out tender sales until S-07 and use sample balances where team results are missing.
        </p>
      </section>
    </div>
  );
}

function HedgeGraph({ lines, h, m, home, ccy, label }: { lines: ExposureLine[]; h: HedgeInput; m: HedgeMarket; home: Ccy; ccy: Ccy; label: string }) {
  const pts = useMemo(() => {
    const out: { x: number; unc: number; hed: number; bench: number }[] = [];
    for (let i = 0; i <= 40; i++) {
      const S = m.F * (0.8 + (0.4 * i) / 40);
      const r = hedgeResult(lines, h, m, S);
      out.push({ x: S * m.scale, unc: r.exposureTotal * S, hed: r.actual, bench: r.benchmark });
    }
    return out;
  }, [lines, h, m]);
  const E = pts[0] ? pts[0].bench / m.F : 0;
  if (Math.abs(E) < 0.5 && h.forward === 0 && h.callNotional === 0 && h.putNotional === 0) {
    return <p className="notice notice--quiet">No {ccy} exposure or hedges yet, so there is nothing to graph.</p>;
  }
  const ys = pts.flatMap((p) => [p.unc, p.hed, p.bench]);
  let lo = Math.min(...ys); let hi = Math.max(...ys);
  if (hi - lo < 1) { hi += 1; lo -= 1; }
  const W = 760, H = 300, L = 92, R = 40, T = 14, B = 40;
  const x = (v: number) => L + ((v - pts[0].x) / (pts[pts.length - 1].x - pts[0].x)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const path = (k: 'unc' | 'hed' | 'bench') => pts.map((p, i) => `${i ? 'L' : 'M'} ${x(p.x).toFixed(1)} ${y(p[k]).toFixed(1)}`).join(' ');
  const yt = Array.from({ length: 6 }, (_, i) => lo + ((hi - lo) * i) / 5);
  const xt = Array.from({ length: 6 }, (_, i) => pts[0].x + ((pts[pts.length - 1].x - pts[0].x) * i) / 5);
  const big = (v: number) => (Math.abs(v) >= 1e9 ? `${num(v / 1e9, 1)}bn` : Math.abs(v) >= 1e6 ? `${num(v / 1e6, 1)}M` : num(v));
  const st = m.ST * m.scale;
  return (
    <figure className="fxgraph">
      <figcaption>Outcome of the {ccy} exposure in {home} at different end-of-period rates</figcaption>
      <div className="tablewrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="chartsvg chartsvg--wide" role="img" aria-label={`FX hedge graph for ${ccy}`}>
          {yt.map((v, i) => (
            <g key={i}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="chart-grid" /><text x={L - 6} y={y(v) + 4} textAnchor="end" className="chart-tick">{big(v)}</text></g>
          ))}
          {xt.map((v, i) => <text key={i} x={x(v)} y={H - B + 18} textAnchor="middle" className="chart-tick">{num(v, m.scale > 1 || v < 10 ? 4 : 2)}</text>)}
          <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" className="chart-tick">Ending spot rate ({label})</text>
          {st >= pts[0].x && st <= pts[pts.length - 1].x && (
            <g><line x1={x(st)} x2={x(st)} y1={T} y2={H - B} className="fxgraph__now" /><text x={x(st) + 4} y={T + 10} className="chart-tick">your forecast</text></g>
          )}
          <path d={path('bench')} className="fxline fxline--bench" />
          <path d={path('unc')} className="fxline fxline--unc" />
          <path d={path('hed')} className="fxline fxline--hed" />
        </svg>
      </div>
      <div className="legend">
        <span><i className="fxsw fxsw--unc" />Uncovered exposure</span>
        <span><i className="fxsw fxsw--hed" />Uncovered + hedges</span>
        <span><i className="fxsw fxsw--bench" />100% forward benchmark</span>
      </div>
    </figure>
  );
}
