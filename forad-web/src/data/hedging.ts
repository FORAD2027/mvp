import { bimrFor, type Ccy } from './bimr';
import type { DecisionDraft } from './decision';
import type { Derived as OpsDerived } from './operations';
import type { InvestingDraft } from './investing';
import type { FinContext, FinancingDraft } from './financing';
import { convert } from './financing';

/**
 * S-10 Hedging (FORAD 2.0 manual §3.6), laid out like "Decision Inputs · Hedging".
 *
 * Exposures at period end, by type, from the team's own decisions (invoice currencies, credit
 * terms, production, dividends, loans). Hedges: forwards (90 days) and call/put options, notional
 * up to 200% of the unit's prior-period equity, strikes within ±20% of the forward rate.
 * Option premium: Black-Scholes for currencies (Garman-Kohlhagen), spot = beginning rate, 90 days,
 * interest differential, volatility. FX results at the forecast end-of-period rate:
 *   underlying = exposure × (end − beginning); forward = notional × (end − forward);
 *   options = notional × in-the-money amount ± premium.
 * Benchmark = total exposure × forward rate; actual = exposure × end rate + hedge results.
 * Interest-rate futures (US only): USD 1M, EUR 1M, JPY 100M contracts; price = 3-month forward LIBOR
 * from the 3- and 6-month rates; settled day 90.
 */

export type HedgeEntity = 'us' | 'japan' | 'germany';
export const HOME: Record<HedgeEntity, Ccy> = { us: 'USD', japan: 'JPY', germany: 'EUR' };
export const HEDGE_CCYS: Record<HedgeEntity, Ccy[]> = { us: ['JPY', 'EUR'], japan: ['USD', 'EUR'], germany: ['USD', 'JPY'] };
export const VOLATILITY = 0.10; // VolatilityToHomeCurrency in the FORAD 2.0 setup files
export const IMPORT_COST_USD = 44.2; // Japan imported materials, USD per unit of material (setup files)

export interface HedgeInput { forward: number; callNotional: number; callStrike: number; putNotional: number; putStrike: number }
export interface IrInput { USD: number; JPY: number; EUR: number } // contracts, buy (+) / sell (−)
export interface HedgingDraft {
  fx: Record<string, HedgeInput>; // key `${entity}.${ccy}`
  ir: IrInput;
}
export const hkey = (e: HedgeEntity, c: Ccy) => `${e}.${c}`;

/** Value of one unit of `foreign` in `home` currency, from ¥/$ and $/€. */
export function rateOf(home: Ccy, foreign: Ccy, jpyPerUsd: number, usdPerEur: number): number {
  const inUsd: Record<Ccy, number> = { USD: 1, JPY: 1 / jpyPerUsd, EUR: usdPerEur };
  return inUsd[foreign] / inUsd[home];
}

/** JPY rates are shown per ¥100 so the figures stay readable. */
export const displayScale = (foreign: Ccy) => (foreign === 'JPY' ? 100 : 1);
export const rateLabel = (home: Ccy, foreign: Ccy) => (foreign === 'JPY' ? `${home}/100 JPY` : `${home}/${foreign}`);

function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

/** Garman-Kohlhagen price per unit of foreign currency, in home currency. */
export function optionPrice(kind: 'call' | 'put', S: number, K: number, rHome: number, rForeign: number, vol: number, T = 0.25): number {
  if (!(S > 0 && K > 0)) return 0;
  const d1 = (Math.log(S / K) + (rHome - rForeign + (vol * vol) / 2) * T) / (vol * Math.sqrt(T));
  const d2 = d1 - vol * Math.sqrt(T);
  const dfH = Math.exp(-rHome * T);
  const dfF = Math.exp(-rForeign * T);
  return kind === 'call' ? S * dfF * normCdf(d1) - K * dfH * normCdf(d2) : K * dfH * normCdf(-d2) - S * dfF * normCdf(-d1);
}

export interface HedgeMarket { S0: number; F: number; ST: number; rHome: number; rForeign: number; scale: number }

export function hedgeMarket(period: number, e: HedgeEntity, c: Ccy, forecastJpyPerUsd: number, forecastUsdPerEur: number): HedgeMarket {
  const r = bimrFor(period);
  const home = HOME[e];
  const j0 = r?.spot.end.jpyPerUsd ?? 100;
  const u0 = r?.spot.end.usdPerEur ?? 1;
  const S0 = rateOf(home, c, j0, u0);
  const lib = (x: Ccy) => r?.rates[x].libor3m ?? 0;
  const F = (S0 * (1 + lib(home) * 0.25)) / (1 + lib(c) * 0.25);
  return { S0, F, ST: rateOf(home, c, forecastJpyPerUsd, forecastUsdPerEur), rHome: lib(home), rForeign: lib(c), scale: displayScale(c) };
}

export interface ExposureLine { key: string; label: string; amount: number }

/** Projected exposures in foreign currency `c` at period end, from the team's decisions. */
export function exposures(e: HedgeEntity, c: Ccy, d: DecisionDraft, ops: OpsDerived, ctx: FinContext, period: number): ExposureLine[] {
  const r = bimrFor(period);
  const j0 = r?.spot.end.jpyPerUsd ?? 100;
  const u0 = r?.spot.end.usdPerEur ?? 1;
  const p = d.predictions;
  const fin: FinancingDraft = d.financing;
  const inv: InvestingDraft = d.investing;
  const toX = (amount: number, from: Ccy) => convert(amount, from, c, ctx);
  const dayAdj = (days: number) => ({ 0: -0.03, 30: -0.02, 60: -0.01, 90: 0 } as Record<number, number>)[days] ?? 0;
  const lines: ExposureLine[] = [];
  const push = (key: string, label: string, amount: number) => lines.push({ key, label, amount });
  void j0; void u0;

  if (e === 'japan' || e === 'germany') {
    const o = d.operations[e];
    const g = d.operations.germany;
    const home: Ccy = e === 'japan' ? 'JPY' : 'EUR';
    const expUnits = e === 'japan' ? p.jpExportUnits : p.deExportUnits;
    const price = e === 'japan' ? p.jpPrice : p.dePrice;
    const preferred = r?.forecast.markets[e].invoiceCurrency ?? 'USD';
    const adj = 1 + dayAdj(o.expCollectDays) + (o.exportCurrency !== preferred ? -0.01 : 0);
    const exportX = o.exportCurrency === c ? toX(expUnits * price * adj, home) * (o.expCollectDays / 90) : 0;
    push('export', 'Export sales', exportX);
    const icUnits = 2 * g.production;
    const icUsd = icUnits * g.icPrice * (g.icDays / 90);
    let ic = 0;
    if (g.icCurrency === c) ic = e === 'japan' ? toX(icUsd, 'USD') : -toX(icUsd, 'USD');
    push('ic', 'Inter-company', ic);
    const imported = e === 'japan' && c === 'USD' ? -(d.operations.japan.production * 2 * IMPORT_COST_USD) * (d.operations.japan.importPayDays / 90) : 0;
    push('imported', 'Imported materials', imported);
    push('dividend', 'Dividend', 0);
    push('tender', 'Tender sales', 0); // arrives with S-07
    const f = fin[e];
    const midSt = c === 'USD' ? f.midUSD : c === 'JPY' ? f.midJPY : f.midEUR;
    const icBorrow = c === 'USD' ? f.midBorrowUs : 0;
    push('loans', 'Financial loans', -(midSt + icBorrow));
    const loanToUs = c === 'USD' ? inv[e].midLoanToUs : 0;
    push('investments', 'Financial investments', loanToUs);
  } else {
    push('export', 'Export sales', 0);
    push('ic', 'Inter-company', 0);
    push('imported', 'Imported materials', 0);
    const div = c === 'JPY' ? d.operations.japan.dividend : c === 'EUR' ? d.operations.germany.dividend : 0;
    push('dividend', 'Dividend from subsidiary', div);
    push('tender', 'Tender sales', 0);
    const f = fin.us;
    push('loans', 'Financial loans', -(c === 'JPY' ? f.midJPY : c === 'EUR' ? f.midEUR : 0));
    push('investments', 'Financial investments', 0);
  }
  void ops;
  return lines;
}

export interface HedgeResult {
  exposureTotal: number;
  callPrice: number; putPrice: number;
  callPremium: number; putPremium: number; // home, negative = paid
  gains: { key: string; label: string; amount: number }[]; // home currency at ST
  forwardGain: number; callGain: number; putGain: number;
  total: number; benchmark: number; actual: number; variance: number;
}

export function hedgeResult(lines: ExposureLine[], h: HedgeInput, m: HedgeMarket, ST = m.ST): HedgeResult {
  const E = lines.reduce((s, l) => s + l.amount, 0);
  const Kc = h.callStrike / m.scale;
  const Kp = h.putStrike / m.scale;
  const callPrice = optionPrice('call', m.S0, Kc, m.rHome, m.rForeign, VOLATILITY);
  const putPrice = optionPrice('put', m.S0, Kp, m.rHome, m.rForeign, VOLATILITY);
  const callPremium = -h.callNotional * callPrice;
  const putPremium = -h.putNotional * putPrice;
  const gains = lines.map((l) => ({ key: l.key, label: l.label, amount: l.amount * (ST - m.S0) }));
  const forwardGain = h.forward * (ST - m.F);
  const callGain = h.callNotional * Math.max(ST - Kc, 0);
  const putGain = h.putNotional * Math.max(Kp - ST, 0);
  const hedges = forwardGain + callGain + putGain + callPremium + putPremium;
  const total = gains.reduce((s, g) => s + g.amount, 0) + hedges;
  const benchmark = E * m.F;
  const actual = E * ST + hedges;
  const variance = benchmark !== 0 ? (actual - benchmark) / Math.abs(benchmark) : 0;
  return { exposureTotal: E, callPrice, putPrice, callPremium, putPremium, gains, forwardGain, callGain, putGain, total, benchmark, actual, variance };
}

export const IR_CONTRACT: Record<Ccy, number> = { USD: 1_000_000, EUR: 1_000_000, JPY: 100_000_000 };

/** 3-month forward LIBOR three months out, from the 3- and 6-month rates (percent). */
export function irFuturesRate(period: number, c: Ccy): { futures: number; libor: number } {
  const r = bimrFor(period);
  const r3 = r?.rates[c].libor3m ?? 0;
  const r6 = r?.rates[c].libor6m ?? 0;
  const f = ((1 + r6 * 0.5) / (1 + r3 * 0.25) - 1) / 0.25;
  return { futures: f * 100, libor: r3 * 100 };
}

export function defaultHedging(period: number, jpu: number, upe: number): HedgingDraft {
  const fx: Record<string, HedgeInput> = {};
  (Object.keys(HEDGE_CCYS) as HedgeEntity[]).forEach((e) =>
    HEDGE_CCYS[e].forEach((c) => {
      const m = hedgeMarket(period, e, c, jpu, upe);
      const k = Math.round(m.F * m.scale * 10000) / 10000;
      fx[hkey(e, c)] = { forward: 0, callNotional: 0, callStrike: k, putNotional: 0, putStrike: k };
    }),
  );
  return { fx, ir: { USD: 0, JPY: 0, EUR: 0 } };
}

export interface HedgeIssue { entity: HedgeEntity; ccy: Ccy | 'IR'; key: string; message: string }
const fmt = (n: number, dp = 0) => new Intl.NumberFormat('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }).format(n);

export function validateHedging(h: HedgingDraft, period: number, ctx: FinContext, jpu: number, upe: number): HedgeIssue[] {
  const out: HedgeIssue[] = [];
  (Object.keys(HEDGE_CCYS) as HedgeEntity[]).forEach((e) =>
    HEDGE_CCYS[e].forEach((c) => {
      const x = h.fx[hkey(e, c)];
      if (!x) return;
      const m = hedgeMarket(period, e, c, jpu, upe);
      const limit = convert(ctx.equity[e] * 2, HOME[e], c, ctx);
      const add = (key: string, message: string) => out.push({ entity: e, ccy: c, key, message });
      (['forward', 'callNotional', 'putNotional'] as const).forEach((k) => {
        if (!Number.isFinite(x[k])) add(k, 'Enter a number.');
        else if (Math.abs(x[k]) > limit + 0.5) add(k, `Limit is 200% of last period’s equity: ${fmt(limit)} ${c}.`);
      });
      const lo = m.F * 0.8 * m.scale;
      const hi = m.F * 1.2 * m.scale;
      (['callStrike', 'putStrike'] as const).forEach((k) => {
        const used = k === 'callStrike' ? x.callNotional : x.putNotional;
        if (used !== 0 && !(x[k] >= lo - 1e-9 && x[k] <= hi + 1e-9)) add(k, `Strike must be within 20% of the forward rate: ${fmt(lo, 4)} to ${fmt(hi, 4)}.`);
      });
    }),
  );
  (['USD', 'JPY', 'EUR'] as Ccy[]).forEach((c) => {
    if (!Number.isInteger(h.ir[c])) out.push({ entity: 'us', ccy: 'IR', key: c, message: 'Enter a whole number of contracts.' });
  });
  return out;
}

export function changedHedging(h: HedgingDraft, defaults: HedgingDraft): string[] {
  const out: string[] = [];
  Object.keys(defaults.fx).forEach((k) => {
    (Object.keys(defaults.fx[k]) as (keyof HedgeInput)[]).forEach((f) => {
      if (h.fx[k]?.[f] !== defaults.fx[k][f]) out.push(`${k.split('.')[0]}.${k.split('.')[1]}.${f}`);
    });
  });
  (['USD', 'JPY', 'EUR'] as Ccy[]).forEach((c) => { if (h.ir[c] !== defaults.ir[c]) out.push(`us.IR.${c}`); });
  return out;
}
