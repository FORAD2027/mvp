import { bimrFor } from './bimr';
import { finFor } from './financials';

/**
 * S-08 Investing inputs (FORAD 2.0 manual §3.4 and §3.5.3), laid out like the
 * "Decision Inputs · Investing" screens.
 *
 * Marketable securities (all three units, local currency): invest on day 0 ("beginning") and
 * day 45 ("mid"); redeem on day 45 ("beginning") and day 90 ("mid"). Balances roll over.
 * Inter-company loans to the US (Japan, Germany): USD, 45 days, beginning (day 0) or mid (day 45),
 * one rate for the period between 3-month USD LIBOR and LIBOR + 3%.
 * US Holding: share repurchase (from Period 2, up to 5% of last period's shares, at last period's
 * share price, paid day 45) and dividend per share (paid day 90 on shares outstanding then).
 */

export interface SubInvesting {
  begInvest: number;
  begRedeem: number;
  midInvest: number;
  midRedeem: number;
  begLoanToUs: number; // USD
  midLoanToUs: number; // USD
  loanRate: number; // percent per year, e.g. 2.5
}

export interface UsInvesting {
  begInvest: number;
  begRedeem: number;
  midInvest: number;
  midRedeem: number;
  repurchase: number; // shares
  dividendPerShare: number; // USD
}

export interface InvestingDraft {
  japan: SubInvesting;
  germany: SubInvesting;
  us: UsInvesting;
}

export type InvEntity = keyof InvestingDraft;

export const INV_RULES = {
  loanSpreadMax: 3, // percentage points over 3-month USD LIBOR
  loanDays: 45,
  repurchaseFromPeriod: 2,
  repurchaseMaxShare: 0.05,
  repurchaseLegacyMax: 1_000_000, // FORAD 2.0 screen limit
  dividendLegacyMax: 5, // FORAD 2.0 screen limit, USD per share
};

/** Last closed period, as the "Period N actual" column. SAMPLE until team results exist (S-16). */
export interface InvestingPosition {
  japan: SubInvesting & { balance: number };
  germany: SubInvesting & { balance: number };
  us: UsInvesting & { balance: number; sharesOutstanding: number; sharePrice: number };
}

export function lastInvesting(period: number): InvestingPosition {
  const fin = finFor(period);
  const rep = bimrFor(period);
  const rate = rep ? rep.rates.USD.libor3m * 100 : 0;
  const zero = { begInvest: 0, begRedeem: 0, midInvest: 0, midRedeem: 0 };
  return {
    japan: { ...zero, begLoanToUs: 0, midLoanToUs: 0, loanRate: rate, balance: (fin?.japan.bs.MarketableSecurities ?? 0) * 1e6 },
    germany: { ...zero, begLoanToUs: 0, midLoanToUs: 0, loanRate: rate, balance: (fin?.germany.bs.MarketableSecurities ?? 0) * 1e6 },
    us: {
      ...zero, repurchase: 0, dividendPerShare: fin?.divPerShare ?? 0.25,
      balance: (fin?.us.bs.MarketableSecurities ?? 0) * 1e6,
      sharesOutstanding: 8_000_000,
      sharePrice: Math.round((fin?.pe.price ?? 0) * 100) / 100,
    },
  };
}

export function loanRateRange(period: number): [number, number] {
  const r = bimrFor(period);
  const lo = r ? r.rates.USD.libor3m * 100 : 0;
  return [lo, lo + INV_RULES.loanSpreadMax];
}

export function defaultInvesting(period: number): InvestingDraft {
  const last = lastInvesting(period - 1);
  const [lo, hi] = loanRateRange(period);
  const clampRate = (r: number) => Math.min(hi, Math.max(lo, r));
  const sub = (s: SubInvesting): SubInvesting => ({ begInvest: 0, begRedeem: 0, midInvest: 0, midRedeem: 0, begLoanToUs: 0, midLoanToUs: 0, loanRate: clampRate(s.loanRate) });
  return {
    japan: sub(last.japan),
    germany: sub(last.germany),
    us: { begInvest: 0, begRedeem: 0, midInvest: 0, midRedeem: 0, repurchase: 0, dividendPerShare: last.us.dividendPerShare },
  };
}

export interface SecuritiesLine { opening: number; afterDay45: number; closing: number }
export interface InvestingDerived {
  japan: SecuritiesLine & { loanInterestUsd: number };
  germany: SecuritiesLine & { loanInterestUsd: number };
  us: SecuritiesLine & { maxRepurchase: number; repurchaseCost: number; sharesDay90: number; dividendTotal: number };
}

export function deriveInvesting(inv: InvestingDraft, last: InvestingPosition): InvestingDerived {
  const sec = (e: InvEntity): SecuritiesLine => {
    const o = inv[e];
    const opening = last[e].balance;
    const afterDay45 = opening + o.begInvest - o.begRedeem + o.midInvest;
    return { opening, afterDay45, closing: afterDay45 - o.midRedeem };
  };
  const loanInt = (s: SubInvesting) => (s.begLoanToUs + s.midLoanToUs) * (s.loanRate / 100) * (INV_RULES.loanDays / 360);
  const maxRepurchase = Math.floor(last.us.sharesOutstanding * INV_RULES.repurchaseMaxShare);
  const sharesDay90 = last.us.sharesOutstanding - inv.us.repurchase;
  return {
    japan: { ...sec('japan'), loanInterestUsd: loanInt(inv.japan) },
    germany: { ...sec('germany'), loanInterestUsd: loanInt(inv.germany) },
    us: {
      ...sec('us'), maxRepurchase,
      repurchaseCost: inv.us.repurchase * last.us.sharePrice,
      sharesDay90,
      dividendTotal: inv.us.dividendPerShare * sharesDay90,
    },
  };
}

export interface InvIssue { entity: InvEntity; key: string; message: string }
const fmt = (n: number, d = 0) => new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

export function validateInvesting(inv: InvestingDraft, d: InvestingDerived, last: InvestingPosition, period: number): InvIssue[] {
  const out: InvIssue[] = [];
  const add = (entity: InvEntity, key: string, message: string) => out.push({ entity, key, message });
  (['japan', 'germany', 'us'] as InvEntity[]).forEach((e) => {
    const o = inv[e];
    (['begInvest', 'begRedeem', 'midInvest', 'midRedeem'] as const).forEach((k) => {
      if (!(o[k] >= 0)) add(e, k, 'Enter zero or more.');
    });
    const availBeg = d[e].opening + o.begInvest;
    if (o.begRedeem > availBeg + 1e-6) add(e, 'begRedeem', `Only ${fmt(availBeg)} is invested on day 45.`);
    if (o.midRedeem > d[e].afterDay45 + 1e-6) add(e, 'midRedeem', `Only ${fmt(Math.max(0, d[e].afterDay45))} is invested on day 90.`);
  });
  const [lo, hi] = loanRateRange(period);
  (['japan', 'germany'] as const).forEach((e) => {
    const o = inv[e];
    if (!(o.begLoanToUs >= 0)) add(e, 'begLoanToUs', 'Enter zero or more.');
    if (!(o.midLoanToUs >= 0)) add(e, 'midLoanToUs', 'Enter zero or more.');
    if (!(o.loanRate >= lo - 1e-9 && o.loanRate <= hi + 1e-9)) add(e, 'loanRate', `Must be between ${fmt(lo, 3)}% and ${fmt(hi, 3)}% (3-month USD LIBOR to LIBOR + 3%).`);
  });
  const u = inv.us;
  if (!Number.isInteger(u.repurchase) || u.repurchase < 0) add('us', 'repurchase', 'Enter a whole number of shares, zero or more.');
  else if (u.repurchase > 0 && period < INV_RULES.repurchaseFromPeriod) add('us', 'repurchase', `Share repurchases start in Period ${INV_RULES.repurchaseFromPeriod}.`);
  else if (u.repurchase > d.us.maxRepurchase) add('us', 'repurchase', `At most 5% of last period's shares: ${fmt(d.us.maxRepurchase)}.`);
  if (!(u.dividendPerShare >= 0)) add('us', 'dividendPerShare', 'The dividend cannot be negative.');
  else if (u.dividendPerShare > INV_RULES.dividendLegacyMax) add('us', 'dividendPerShare', `At most $${fmt(INV_RULES.dividendLegacyMax, 2)} per share.`);
  void last;
  return out;
}

export function changedInvesting(inv: InvestingDraft, defaults: InvestingDraft): string[] {
  const out: string[] = [];
  (Object.keys(defaults) as InvEntity[]).forEach((e) => {
    Object.keys(defaults[e]).forEach((k) => {
      if ((inv[e] as unknown as Record<string, number>)[k] !== (defaults[e] as unknown as Record<string, number>)[k]) out.push(`${e}.${k}`);
    });
  });
  return out;
}
