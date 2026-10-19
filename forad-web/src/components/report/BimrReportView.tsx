import { bimrFor, type BimrReport, type Ccy, type MarketFigures, type MarketRange, type SubsidiaryPair, type TwoYearChart, type TwoYearTable } from '../../data/bimr';
import { num } from '../../lib/format';

/* ============================================================ shared bits */

export const CCY_COLS: { c: Ccy; label: string }[] = [
  { c: 'USD', label: '$ interest rates' },
  { c: 'EUR', label: '€ interest rates' },
  { c: 'JPY', label: '¥ interest rates' },
];
export const r3 = (x: number) => `${num(x * 100, 3)}%`;
export const bp = (d: number) => (Math.abs(d) < 1e-9 ? '' : `${d > 0 ? '+' : '−'}${Math.round(Math.abs(d) * 10000)} bp`);
export const pctMove = (a: number, b: number) => `${b >= a ? '+' : '−'}${num(Math.abs(b / a - 1) * 100, 1)}%`;
export const sym = { USD: '$', EUR: '€', JPY: '¥' } as const;

export function Delta({ text }: { text: string }) {
  if (!text) return null;
  return <span className={`delta ${text.startsWith('+') ? 'delta--up' : 'delta--down'}`}>{text}</span>;
}

export function Prose({ paras }: { paras: string[] }) {
  if (!paras.length) return null;
  return (
    <div className="prose">
      {paras.map((p, i) => <p key={i}>{p}</p>)}
    </div>
  );
}

const fmtUnits = (x: number) => num(x);
const fmtRange = (r: [number, number], prefix = '') => `${prefix}${num(r[0])}–${num(r[1])}`;

export function MarketsTable({ title, markets, compare }: { title: string; markets: SubsidiaryPair<MarketFigures>; compare?: SubsidiaryPair<MarketFigures> }) {
  const rows: { label: string; key: keyof MarketFigures; price?: boolean }[] = [
    { label: 'Domestic sales (units)', key: 'domesticUnits' },
    { label: 'Export sales (units)', key: 'exportUnits' },
    { label: 'Domestic sales price (end of period)', key: 'domesticPrice', price: true },
  ];
  const cell = (sub: 'germany' | 'japan', key: keyof MarketFigures, price?: boolean) => {
    const v = markets[sub][key] as number;
    const text = price ? `${sub === 'germany' ? '€' : '¥'}${num(v)}` : fmtUnits(v);
    const f = compare?.[sub][key] as number | undefined;
    const d = f ? (v / f - 1) * 100 : 0;
    return (
      <td className="num">
        <span className="mono">{text}</span>
        {f !== undefined && Math.abs(d) > 1e-9 && <span className={`delta ${d > 0 ? 'delta--up' : 'delta--down'}`}>{`${d > 0 ? '+' : '−'}${num(Math.abs(d), 1)}% vs forecast`}</span>}
        {f !== undefined && Math.abs(d) <= 1e-9 && <span className="delta delta--flat">as forecast</span>}
      </td>
    );
  };
  return (
    <div className="tablewrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">{title}</th>
            <th scope="col" className="num">German subsidiary</th>
            <th scope="col" className="num">Japanese subsidiary</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row">{r.label}</th>
              {cell('germany', r.key, r.price)}
              {cell('japan', r.key, r.price)}
            </tr>
          ))}
          <tr>
            <th scope="row">Preferred currency of invoice</th>
            <td className="num mono">{sym[markets.germany.invoiceCurrency]}</td>
            <td className="num mono">{sym[markets.japan.invoiceCurrency]}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function RangeTable({ title, markets }: { title: string; markets: SubsidiaryPair<MarketRange> }) {
  return (
    <div className="tablewrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">{title}</th>
            <th scope="col" className="num">German subsidiary</th>
            <th scope="col" className="num">Japanese subsidiary</th>
          </tr>
        </thead>
        <tbody>
          <tr><th scope="row">Domestic sales (units)</th><td className="num mono">{fmtRange(markets.germany.domesticUnits)}</td><td className="num mono">{fmtRange(markets.japan.domesticUnits)}</td></tr>
          <tr><th scope="row">Export sales (units)</th><td className="num mono">{fmtRange(markets.germany.exportUnits)}</td><td className="num mono">{fmtRange(markets.japan.exportUnits)}</td></tr>
          <tr><th scope="row">Domestic sales price (end of period)</th><td className="num mono">{fmtRange(markets.germany.domesticPrice, '€')}</td><td className="num mono">{fmtRange(markets.japan.domesticPrice, '¥')}</td></tr>
          <tr><th scope="row">Preferred currency of invoice</th><td className="num mono">{sym[markets.germany.invoiceCurrency]}</td><td className="num mono">{sym[markets.japan.invoiceCurrency]}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

export const EXPORT_NOTE = 'Export prices should be converted into the appropriate currency of invoice at the beginning of period exchange rate.';

/* ============================================================ market report */

/**
 * The market report for one period: forward-looking market information only.
 * Results (actual sales, tender awards, stock prices) live in the Results tab and
 * appear only once the instructor releases them.
 */
export function BimrView({ report: r, isCurrent, onStartDecision }: { report: BimrReport; isCurrent: boolean; onStartDecision?: () => void }) {
  const prev = bimrFor(r.period - 1);
  const due = new Date(r.deadline).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' });

  return (
    <div className="stack">
      <section className="masthead">
        <div>
          <p className="masthead__kicker">Business International Money Report (BIMR)</p>
          <h2 className="masthead__title">Period {r.period}</h2>
          <p className="masthead__sub">A quarterly financial report for senior management</p>
        </div>
        <div className="masthead__due">
          <span className="muted small">Decision #{r.period} due</span>
          <strong>{due}</strong>
          <span className="muted small">Arizona time{isCurrent ? '' : ' · closed'}</span>
        </div>
      </section>

      {r.currentState && (
        <section className="card" aria-labelledby="state">
          <h2 id="state" className="card__title">Current state</h2>
          <Prose paras={r.currentState} />
        </section>
      )}

      <h2 className="section-title">Financial markets</h2>
      <div className="grid2">
        <section className="card" aria-labelledby={`oil-${r.period}`}>
          <div className="card__headrow">
            <h3 id={`oil-${r.period}`} className="card__title">Oil prices</h3>
            {r.oil.endPrice !== null && prev?.oil.endPrice != null && <Delta text={`${r.oil.endPrice >= prev.oil.endPrice ? '+' : '−'}$${num(Math.abs(r.oil.endPrice - prev.oil.endPrice), 0)} vs last report`} />}
          </div>
          {r.oil.endPrice !== null ? (
            <p className="bignum mono">${num(r.oil.endPrice, 0)} <span className="bignum__unit">per barrel at the end of Period {r.period - 1}</span></p>
          ) : (
            <p className="muted small">No price figure in this report.</p>
          )}
          <Prose paras={r.oil.commentary} />
        </section>

        <section className="card" aria-labelledby={`fx-${r.period}`}>
          <h3 id={`fx-${r.period}`} className="card__title">Currencies</h3>
          <div className="tablewrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Spot rate</th>
                  <th scope="col" className="num">$/€</th>
                  <th scope="col" className="num">¥/$</th>
                </tr>
              </thead>
              <tbody>
                <tr><th scope="row">Start of Period {r.spot.startPeriod}</th><td className="num mono">{num(r.spot.start.usdPerEur, r.spot.start.usdPerEur * 100 % 1 ? 4 : 2)}</td><td className="num mono">{num(r.spot.start.jpyPerUsd, 2)}</td></tr>
                <tr><th scope="row">End of Period {r.spot.startPeriod}</th><td className="num mono">{num(r.spot.end.usdPerEur, r.spot.end.usdPerEur * 100 % 1 ? 4 : 2)}</td><td className="num mono">{num(r.spot.end.jpyPerUsd, 2)}</td></tr>
                <tr className="row-quiet"><th scope="row">Move over the period</th><td className="num mono">{pctMove(r.spot.start.usdPerEur, r.spot.end.usdPerEur)}</td><td className="num mono">{pctMove(r.spot.start.jpyPerUsd, r.spot.end.jpyPerUsd)}</td></tr>
              </tbody>
            </table>
          </div>
          <Prose paras={r.fxCommentary} />
        </section>
      </div>

      <section className="card" aria-labelledby={`rates-${r.period}`}>
        <h3 id={`rates-${r.period}`} className="card__title">Interest rates</h3>
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Maturity</th>
                {CCY_COLS.map((c) => <th key={c.c} scope="col" className="num">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {([['3-Month LIBOR', 'libor3m'], ['6-Month LIBOR', 'libor6m'], ['Long-Term', 'longTerm']] as const).map(([label, k]) => (
                <tr key={k}>
                  <th scope="row">{label}</th>
                  {CCY_COLS.map((c) => (
                    <td key={c.c} className="num">
                      <span className="mono">{r3(r.rates[c.c][k])}</span>
                      {prev && <Delta text={bp(r.rates[c.c][k] - prev.rates[c.c][k])} />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {prev && <p className="footnote">Small figures: change since the Period {prev.period} report, in basis points.</p>}
        <Prose paras={r.ratesCommentary} />
      </section>

      <h2 className="section-title">Outlook</h2>
      <section className="card" aria-labelledby={`fc-${r.period}`}>
        <h3 id={`fc-${r.period}`} className="card__title">Marketing Board forecast</h3>
        <Prose paras={r.outlookCommentary} />
        <div className="grid2">
          <MarketsTable title={`Period ${r.forecast.period} (forecast)`} markets={r.forecast.markets} />
          <RangeTable title={`Period ${r.range.period} (forecast)`} markets={r.range.markets} />
        </div>
        <p className="footnote">{EXPORT_NOTE}</p>
        {r.tenderOutlook && (
          <div className="callout callout--accent">
            <strong>Tender market</strong>
            <span>{r.tenderOutlook}</span>
          </div>
        )}
      </section>

      {r.twoYear?.map((t, i) => (t.kind === 'chart' ? <TwoYearChartView key={i} t={t} current={r.period} /> : <TwoYearTableView key={i} t={t} />))}

      {isCurrent && onStartDecision && (
        <section className="cta">
          <div>
            <h2>Turn this report into your forecasts</h2>
            <p>Form your own view from this report, then set your forecasts and decisions in the workspace.</p>
          </div>
          <button type="button" className="btn btn--light btn--lg" onClick={onStartDecision}>
            Start Period {r.period} decision
          </button>
        </section>
      )}
    </div>
  );
}

export function Board({ board }: { board: NonNullable<BimrReport['leaderboard']> }) {
  return (
    <div className="tablewrap">
      <table className="table table--board">
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Team</th>
            <th scope="col" className="num">Stock price</th>
          </tr>
        </thead>
        <tbody>
          {board.rows.map((row) => (
            <tr key={row.team}>
              <td className="mono">{row.rank}</td>
              <th scope="row">{row.team}</th>
              <td className="num mono">${num(row.stockPrice, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Two-year forecast: grouped bars, past vs future split at the current period. */
export function TwoYearChartView({ t, current }: { t: TwoYearChart; current: number }) {
  const panel = (name: string, data: { domestic: number[]; exportSales: number[] }) => {
    const max = Math.max(...data.exportSales, ...data.domestic);
    const step = max > 150000 ? 50000 : 20000;
    const top = Math.ceil(max / step) * step;
    const W = 720, H = 260, L = 64, B = 34, T = 12;
    const cw = (W - L - 8) / t.periods.length;
    const y = (v: number) => T + (H - T - B) * (1 - v / top);
    const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
    const split = t.periods.indexOf(current);
    return (
      <figure className="chartfig">
        <figcaption className="chartfig__cap">{name}</figcaption>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${name}: domestic and export sales by period`} className="chartsvg">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={L} x2={W - 8} y1={y(v)} y2={y(v)} className="chart-grid" />
              <text x={L - 8} y={y(v) + 4} textAnchor="end" className="chart-tick">{v === 0 ? '0' : `${v / 1000}k`}</text>
            </g>
          ))}
          {split > 0 && <line x1={L + split * cw - 2} x2={L + split * cw - 2} y1={T} y2={H - B} className="chart-split" />}
          {t.periods.map((p, i) => {
            const x0 = L + i * cw + cw * 0.15;
            const bw = cw * 0.33;
            return (
              <g key={p}>
                <rect x={x0} y={y(data.domestic[i])} width={bw} height={y(0) - y(data.domestic[i])} className="bar bar--dom">
                  <title>{`Period ${p} domestic: ${num(data.domestic[i])}`}</title>
                </rect>
                <rect x={x0 + bw + 2} y={y(data.exportSales[i])} width={bw} height={y(0) - y(data.exportSales[i])} className="bar bar--exp">
                  <title>{`Period ${p} export: ${num(data.exportSales[i])}`}</title>
                </rect>
                <text x={L + i * cw + cw / 2} y={H - B + 18} textAnchor="middle" className={`chart-tick ${p === current ? 'chart-tick--strong' : ''}`}>P{p}</text>
              </g>
            );
          })}
          <line x1={L} x2={W - 8} y1={y(0)} y2={y(0)} className="chart-axis" />
        </svg>
      </figure>
    );
  };
  return (
    <section className="card" aria-labelledby="twoyear">
      <h3 id="twoyear" className="card__title">{t.title}</h3>
      <Prose paras={t.commentary.slice(0, 1)} />
      <div className="legend">
        <span><i className="sw sw--dom" />Domestic sales</span>
        <span><i className="sw sw--exp" />Export sales</span>
        <span className="muted small">Dashed line: you are making decisions for Period {current}. Left: history. Right: forecast.</span>
      </div>
      <div className="grid2">
        {panel('German production volume', t.germany)}
        {panel('Japan production volume', t.japan)}
      </div>
      <p className="footnote">{t.note}</p>
      <Prose paras={t.commentary.slice(1)} />
    </section>
  );
}

export function TwoYearTableView({ t }: { t: TwoYearTable }) {
  return (
    <section className="card" aria-labelledby="twoyear-t">
      <h3 id="twoyear-t" className="card__title">{t.title}</h3>
      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Period (000 units)</th>
              {t.periods.map((p) => <th key={p} scope="col" className="num">{p}</th>)}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {row.values.map((v, i) => <td key={i} className="num mono">{num(v, 1)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="footnote">{t.note}</p>
      <Prose paras={t.commentary} />
    </section>
  );
}

