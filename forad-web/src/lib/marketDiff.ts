import type { BimrReport, Ccy } from '../data/bimr';
import { num, ppChange, signed } from './format';

export interface ReportChange {
  label: string;
  before: string;
  after: string;
  change: string;
  direction: 'up' | 'down';
}

const CCYS: { c: Ccy; sym: string }[] = [
  { c: 'USD', sym: '$' },
  { c: 'EUR', sym: '€' },
  { c: 'JPY', sym: '¥' },
];
const pct3 = (x: number) => `${num(x * 100, 3)}%`;

/** What moved between two consecutive BIMR reports: rates, closing spot rates and oil. */
export function diffReports(prev: BimrReport, curr: BimrReport): ReportChange[] {
  const out: ReportChange[] = [];
  const add = (label: string, a: number | null, b: number | null, fmt: (x: number) => string, chg: (d: number) => string) => {
    if (a === null || b === null || Math.abs(b - a) < 1e-9) return;
    out.push({ label, before: fmt(a), after: fmt(b), change: chg(b - a), direction: b > a ? 'up' : 'down' });
  };
  for (const { c, sym } of CCYS) {
    add(`${sym} 3-month LIBOR`, prev.rates[c].libor3m, curr.rates[c].libor3m, pct3, ppChange);
    add(`${sym} 6-month LIBOR`, prev.rates[c].libor6m, curr.rates[c].libor6m, pct3, ppChange);
    add(`${sym} long-term rate`, prev.rates[c].longTerm, curr.rates[c].longTerm, pct3, ppChange);
  }
  add('$/€ at period end', prev.spot.end.usdPerEur, curr.spot.end.usdPerEur, (x) => num(x, 2), (d) => signed(d, 2));
  add('¥/$ at period end', prev.spot.end.jpyPerUsd, curr.spot.end.jpyPerUsd, (x) => num(x, 2), (d) => signed(d, 2));
  add('Oil, $ per barrel', prev.oil.endPrice, curr.oil.endPrice, (x) => `$${num(x, 0)}`, (d) => signed(d, 0, '$'));
  return out;
}
