import { bimrFor, type Ccy } from './bimr';
import { finFor } from './financials';

/**
 * S-09 Financing inputs (FORAD 2.0 manual §3.5), laid out like "Decision Inputs · Financing".
 *
 * Short-term loans: 45 days, in USD, JPY or EUR, at the beginning (day 0, repaid day 45) or middle
 *   (day 45) of the period; rate = 3-month LIBOR of the loan currency + short-term credit spread
 *   (half the long-term spread); each currency limited to 200% of the unit's prior-period equity.
 * Long-term loans: local currency only, fixed (base long-term rate + spread) or floating (3-month
 *   LIBOR + spread); cash on day 45; issue cost $1M + 1% of principal; new borrowing limited to 200%
 *   of prior-period equity; repayments limited to what is outstanding.
 * Inter-company borrowing from the US (Japan, Germany): USD, 45 days, rate between 3-month USD
 *   LIBOR and LIBOR + 3%; limit 1000% of prior-period equity.
 * US only: call the zero-coupon convertible; issue up to 5% new shares at last period's price,
 *   cost $500,000 + 3%, cash on day 45.
 * Swaps (all units): pay floating up to net fixed-rate debt, pay fixed up to net floating-rate debt;
 *   unwind any amount outstanding. Debt/assets may not exceed 82% (checked once projections exist).
 */

export type FinEntity = 'us' | 'japan' | 'germany';
export const LOCAL: Record<FinEntity, Ccy> = { us: 'USD', japan: 'JPY', germany: 'EUR' };
export const CCY_ORDER: Record<FinEntity, Ccy[]> = { us: ['USD', 'JPY', 'EUR'], japan: ['JPY', 'USD', 'EUR'], germany: ['EUR', 'USD', 'JPY'] };

/** Long-term spread by credit rating (manual §3.5.1). Short-term spread is half. */
export const LT_SPREAD: Record<string, number> = { AAA: 0.25, AA: 0.5, A: 1.0, BBB: 1.5, BB: 2.5, B: 3.0, CCC: 3.5, CC: 4.0, C: 4.5 };

export interface StLoans { begUSD: number; midUSD: number; begJPY: number; midJPY: number; begEUR: number; midEUR: number }
export interface SwapDecision { payFloatNew: number; payFloatUnwind: number; payFixedNew: number; payFixedUnwind: number }
export interface SubFinancing extends StLoans, SwapDecision {
  fixedIssue: number; fixedRepay: number; floatIssue: number; floatRepay: number;
  begBorrowUs: number; midBorrowUs: number; borrowRate: number; // percent a year
}
export interface UsFinancing extends StLoans, SwapDecision {
  fixedIssue: number; fixedRepay: number; floatIssue: number; floatRepay: number;
  callConvertible: 0 | 1; equityShares: number;
}
export interface FinancingDraft { japan: SubFinancing; germany: SubFinancing; us: UsFinancing }

export const FIN_RULES = {
  stLimitOfEquity: 2, ltLimitOfEquity: 2, icLimitOfEquity: 10, icSpreadMax: 3,
  ltFixedCostUsd: 1_000_000, ltCostPct: 0.01, equityFixedCostUsd: 500_000, equityCostPct: 0.03,
  equityMaxShare: 0.05, callPremium: 0.03, conversionPrice: 83.33, conversionShares: 1_200_000, maxDebtToAssets: 0.82,
};

/** Market and company context for the period being decided. */
export interface FinContext {
  rating: string;
  ltSpread: number; // percent
  stSpread: number;
  libor: Record<Ccy, number>; // percent
  longTerm: Record<Ccy, number>; // percent, base fixed rate
  jpyPerUsd: number;
  usdPerEur: number;
  swapRate: Record<Ccy, number>; // percent, estimated
  icRange: [number, number];
  // prior-period company position, full currency units
  equity: Record<FinEntity, number>; // local
  fixedDebt: Record<FinEntity, number>;
  floatDebt: Record<FinEntity, number>;
  fixedRate: Record<FinEntity, number>; // percent, sample average rate on fixed debt
  convertible: number; // USD balance-sheet value
  sharePrice: number;
  shares: number;
}

export function finContext(period: number): FinContext {
  const r = bimrFor(period);
  const last = finFor(period - 1);
  const rating = last?.pe.rating ?? 'BB';
  const lt = LT_SPREAD[rating] ?? 2.5;
  const pct = (x: number) => x * 100;
  const libor = { USD: pct(r?.rates.USD.libor3m ?? 0), JPY: pct(r?.rates.JPY.libor3m ?? 0), EUR: pct(r?.rates.EUR.libor3m ?? 0) };
  const longTerm = { USD: pct(r?.rates.USD.longTerm ?? 0), JPY: pct(r?.rates.JPY.longTerm ?? 0), EUR: pct(r?.rates.EUR.longTerm ?? 0) };
  // Swap rate: FORAD derives it from the yield curve between 3-month LIBOR and the long-term rate.
  // Estimated here at 80% of the way along that curve until the instructor's market data supplies it.
  const swap = (c: Ccy) => libor[c] + 0.8 * (longTerm[c] - libor[c]);
  const m = 1e6;
  return {
    rating, ltSpread: lt, stSpread: lt / 2, libor, longTerm,
    jpyPerUsd: r?.spot.end.jpyPerUsd ?? 100, usdPerEur: r?.spot.end.usdPerEur ?? 1,
    swapRate: { USD: swap('USD'), JPY: swap('JPY'), EUR: swap('EUR') },
    icRange: [libor.USD, libor.USD + FIN_RULES.icSpreadMax],
    equity: { us: (last?.us.bs.Equity ?? 0) * m, japan: (last?.japan.bs.Equity ?? 0) * m, germany: (last?.germany.bs.Equity ?? 0) * m },
    fixedDebt: { us: (last?.us.bs.FixedRateDebt ?? 0) * m, japan: (last?.japan.bs.FixedRateDebt ?? 0) * m, germany: (last?.germany.bs.FixedRateDebt ?? 0) * m },
    floatDebt: { us: (last?.us.bs.FloatingRateDebt ?? 0) * m, japan: (last?.japan.bs.FloatingRateDebt ?? 0) * m, germany: (last?.germany.bs.FloatingRateDebt ?? 0) * m },
    fixedRate: { us: 5.0, japan: 4.5, germany: 4.5 },
    convertible: (last?.us.bs.ZeroCoupon ?? 0) * m,
    sharePrice: Math.round((last?.pe.price ?? 0) * 100) / 100,
    shares: 8_000_000,
  };
}

/** Convert an amount between currencies at the current spot rates. */
export function convert(amount: number, from: Ccy, to: Ccy, ctx: FinContext): number {
  const toUsd = from === 'USD' ? amount : from === 'JPY' ? amount / ctx.jpyPerUsd : amount * ctx.usdPerEur;
  return to === 'USD' ? toUsd : to === 'JPY' ? toUsd * ctx.jpyPerUsd : toUsd / ctx.usdPerEur;
}

const noSwap: SwapDecision = { payFloatNew: 0, payFloatUnwind: 0, payFixedNew: 0, payFixedUnwind: 0 };

/** Last closed period's financing decisions ("Period N actual"). SAMPLE until team results exist. */
export function lastFinancing(period: number): FinancingDraft {
  const f = finFor(period);
  const m = 1e6;
  const st = (local: Ccy, amt: number): StLoans => ({
    begUSD: local === 'USD' ? amt : 0, midUSD: local === 'USD' ? amt : 0,
    begJPY: local === 'JPY' ? amt : 0, midJPY: local === 'JPY' ? amt : 0,
    begEUR: local === 'EUR' ? amt : 0, midEUR: local === 'EUR' ? amt : 0,
  });
  const lt = { fixedIssue: 0, fixedRepay: 0, floatIssue: 0, floatRepay: 0 };
  return {
    japan: { ...st('JPY', (f?.japan.bs.ShortTermDebt ?? 0) * m), ...lt, ...noSwap, begBorrowUs: 0, midBorrowUs: (f?.japan.bsUsd.IntraGroupDebt ?? 0) * m, borrowRate: 3.0 },
    germany: { ...st('EUR', (f?.germany.bs.ShortTermDebt ?? 0) * m), ...lt, ...noSwap, begBorrowUs: 0, midBorrowUs: (f?.germany.bsUsd.IntraGroupDebt ?? 0) * m, borrowRate: 3.0 },
    us: { ...st('USD', (f?.us.bs.ShortTermDebt ?? 0) * m), ...lt, ...noSwap, callConvertible: 0, equityShares: 0 },
  };
}

/** Defaults: short-term and inter-company loans rolled over as last period; one-off decisions at zero. */
export function defaultFinancing(period: number): FinancingDraft {
  const last = lastFinancing(period - 1);
  const ctx = finContext(period);
  const [lo, hi] = ctx.icRange;
  const clamp = (x: number) => Math.min(hi, Math.max(lo, x));
  const keepSt = (s: StLoans): StLoans => ({ begUSD: s.begUSD, midUSD: s.midUSD, begJPY: s.begJPY, midJPY: s.midJPY, begEUR: s.begEUR, midEUR: s.midEUR });
  const lt = { fixedIssue: 0, fixedRepay: 0, floatIssue: 0, floatRepay: 0 };
  return {
    japan: { ...keepSt(last.japan), ...lt, ...noSwap, begBorrowUs: last.japan.begBorrowUs, midBorrowUs: last.japan.midBorrowUs, borrowRate: clamp(last.japan.borrowRate) },
    germany: { ...keepSt(last.germany), ...lt, ...noSwap, begBorrowUs: last.germany.begBorrowUs, midBorrowUs: last.germany.midBorrowUs, borrowRate: clamp(last.germany.borrowRate) },
    us: { ...keepSt(last.us), ...lt, ...noSwap, callConvertible: 0, equityShares: 0 },
  };
}

export interface FinDerived {
  stRate: Record<Ccy, number>;
  fixedNewRate: number;
  floatNewRate: number;
  ltIssueCost: number; // local
  limits: { st: Record<Ccy, number>; ltNew: number; ic: number }; // in the loan's currency
  icInterestUsd: number;
  cash: { day0: number; day45: number; day90: number }; // local, from these financing decisions only
  // US
  inTheMoney: boolean;
  callCash: number;
  equityGross: number;
  equityCost: number;
  maxEquityShares: number;
  // swaps
  netFixed: number;
  netFloat: number;
}

export function deriveFinancing(entity: FinEntity, d: FinancingDraft, ctx: FinContext): FinDerived {
  const o = d[entity];
  const local = LOCAL[entity];
  const stRate = { USD: ctx.libor.USD + ctx.stSpread, JPY: ctx.libor.JPY + ctx.stSpread, EUR: ctx.libor.EUR + ctx.stSpread };
  const eqLocal = ctx.equity[entity];
  const stLimit = (c: Ccy) => convert(eqLocal * FIN_RULES.stLimitOfEquity, local, c, ctx);
  const ltIssue = o.fixedIssue + o.floatIssue;
  const ltIssueCost = ltIssue > 0 ? convert(FIN_RULES.ltFixedCostUsd, 'USD', local, ctx) * (o.fixedIssue > 0 && o.floatIssue > 0 ? 2 : 1) + FIN_RULES.ltCostPct * ltIssue : 0;
  const q = (amt: number, ratePct: number) => amt * (ratePct / 100) * (45 / 360);

  let day0 = 0, day45 = 0, day90 = 0;
  (['USD', 'JPY', 'EUR'] as Ccy[]).forEach((c) => {
    const beg = convert(o[`beg${c}` as keyof StLoans], c, local, ctx);
    const mid = convert(o[`mid${c}` as keyof StLoans], c, local, ctx);
    day0 += beg;
    day45 += -beg - q(beg, stRate[c]) + mid;
    day90 += -q(mid, stRate[c]);
  });
  let icInterestUsd = 0;
  if (entity !== 'us') {
    const s = o as SubFinancing;
    const beg = convert(s.begBorrowUs, 'USD', local, ctx);
    const mid = convert(s.midBorrowUs, 'USD', local, ctx);
    day0 += beg;
    day45 += -beg - q(beg, s.borrowRate) + mid;
    day90 += -q(mid, s.borrowRate);
    icInterestUsd = q(s.begBorrowUs + s.midBorrowUs, s.borrowRate);
  }
  day45 += ltIssue - ltIssueCost - o.fixedRepay - o.floatRepay;

  let callCash = 0, equityGross = 0, equityCost = 0;
  const inTheMoney = ctx.sharePrice > FIN_RULES.conversionPrice;
  if (entity === 'us') {
    const u = o as UsFinancing;
    if (u.callConvertible === 1 && !inTheMoney) callCash = ctx.convertible * (1 + FIN_RULES.callPremium);
    equityGross = u.equityShares * ctx.sharePrice;
    equityCost = u.equityShares > 0 ? FIN_RULES.equityFixedCostUsd + FIN_RULES.equityCostPct * equityGross : 0;
    day45 += equityGross - equityCost - callCash;
  }
  return {
    stRate,
    fixedNewRate: ctx.longTerm[local] + ctx.ltSpread,
    floatNewRate: ctx.libor[local] + ctx.ltSpread,
    ltIssueCost,
    limits: {
      st: { USD: stLimit('USD'), JPY: stLimit('JPY'), EUR: stLimit('EUR') },
      ltNew: eqLocal * FIN_RULES.ltLimitOfEquity,
      ic: convert(eqLocal * FIN_RULES.icLimitOfEquity, local, 'USD', ctx),
    },
    icInterestUsd,
    cash: { day0, day45, day90 },
    inTheMoney, callCash, equityGross, equityCost,
    maxEquityShares: Math.floor(ctx.shares * FIN_RULES.equityMaxShare),
    netFixed: ctx.fixedDebt[entity] + o.fixedIssue - o.fixedRepay,
    netFloat: ctx.floatDebt[entity] + o.floatIssue - o.floatRepay,
  };
}

export interface FinIssue { entity: FinEntity; key: string; message: string }
const fmt = (n: number, dp = 0) => new Intl.NumberFormat('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }).format(n);

export function validateFinancing(d: FinancingDraft, ctx: FinContext): FinIssue[] {
  const out: FinIssue[] = [];
  (['japan', 'germany', 'us'] as FinEntity[]).forEach((e) => {
    const o = d[e];
    const dv = deriveFinancing(e, d, ctx);
    const add = (key: string, message: string) => out.push({ entity: e, key, message });
    (['USD', 'JPY', 'EUR'] as Ccy[]).forEach((c) => {
      (['beg', 'mid'] as const).forEach((w) => {
        const k = `${w}${c}` as keyof StLoans;
        if (!(o[k] >= 0)) add(k, 'Enter zero or more.');
        else if (o[k] > dv.limits.st[c] + 0.5) add(k, `Limit is 200% of last period’s equity: ${fmt(dv.limits.st[c])} ${c}.`);
      });
    });
    (['fixedIssue', 'fixedRepay', 'floatIssue', 'floatRepay'] as const).forEach((k) => { if (!(o[k] >= 0)) add(k, 'Enter zero or more.'); });
    if (o.fixedIssue + o.floatIssue > dv.limits.ltNew + 0.5) add(o.fixedIssue > 0 ? 'fixedIssue' : 'floatIssue', `New long-term borrowing is limited to 200% of last period’s equity: ${fmt(dv.limits.ltNew)} ${LOCAL[e]}.`);
    if (o.fixedRepay > ctx.fixedDebt[e] + 0.5) add('fixedRepay', `Only ${fmt(ctx.fixedDebt[e])} of fixed-rate debt is outstanding.`);
    if (o.floatRepay > ctx.floatDebt[e] + 0.5) add('floatRepay', `Only ${fmt(ctx.floatDebt[e])} of floating-rate debt is outstanding.`);
    (['payFloatNew', 'payFloatUnwind', 'payFixedNew', 'payFixedUnwind'] as const).forEach((k) => { if (!(o[k] >= 0)) add(k, 'Enter zero or more.'); });
    if (o.payFloatNew > Math.max(0, dv.netFixed) + 0.5) add('payFloatNew', `Pay-floating swaps are limited to net fixed-rate debt: ${fmt(Math.max(0, dv.netFixed))}.`);
    if (o.payFixedNew > Math.max(0, dv.netFloat) + 0.5) add('payFixedNew', `Pay-fixed swaps are limited to net floating-rate debt: ${fmt(Math.max(0, dv.netFloat))}.`);
    if (o.payFloatUnwind > 0.5) add('payFloatUnwind', 'No pay-floating swaps are outstanding.');
    if (o.payFixedUnwind > 0.5) add('payFixedUnwind', 'No pay-fixed swaps are outstanding.');
    if (e !== 'us') {
      const s = o as SubFinancing;
      const [lo, hi] = ctx.icRange;
      (['begBorrowUs', 'midBorrowUs'] as const).forEach((k) => {
        if (!(s[k] >= 0)) add(k, 'Enter zero or more.');
        else if (s[k] > dv.limits.ic + 0.5) add(k, `Limit is 1000% of last period’s equity: $${fmt(dv.limits.ic)}.`);
      });
      if (!(s.borrowRate >= lo - 1e-9 && s.borrowRate <= hi + 1e-9)) add('borrowRate', `Must be between ${fmt(lo, 3)}% and ${fmt(hi, 3)}% (3-month USD LIBOR to LIBOR + 3%).`);
    } else {
      const u = o as UsFinancing;
      if (!Number.isInteger(u.equityShares) || u.equityShares < 0) add('equityShares', 'Enter a whole number of shares, zero or more.');
      else if (u.equityShares > dv.maxEquityShares) add('equityShares', `At most 5% of last period’s shares: ${fmt(dv.maxEquityShares)}.`);
    }
  });
  return out;
}

export function changedFinancing(d: FinancingDraft, defaults: FinancingDraft): string[] {
  const out: string[] = [];
  (Object.keys(defaults) as FinEntity[]).forEach((e) => {
    Object.keys(defaults[e]).forEach((k) => {
      if ((d[e] as unknown as Record<string, number>)[k] !== (defaults[e] as unknown as Record<string, number>)[k]) out.push(`${e}.${k}`);
    });
  });
  return out;
}
