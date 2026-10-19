import raw from './financialsSample.json';

/**
 * Team financial statements behind the Summary screen and the Results reports
 * (FORAD 2.0 Results menu). Millions of local currency or USD.
 *
 * SAMPLE DATA until the simulation engine (P-01) and team results (S-16) exist: built from
 * Team 3's sample operations position with a simplified FORAD-style roll-forward, so every
 * statement ties (balance sheets balance, cash flow ending cash = balance sheet cash,
 * consolidated = units less inter-company, holding-company equity = consolidated equity).
 * The Period 6 forecast does not yet recalculate from the student's decisions.
 */
export const FINANCIALS_ARE_SAMPLE = true;

export type Line = Record<string, number>;
export interface SubPeriod { bs: Line; bsUsd: Line; is_: Line; isUsd: Line; cf: Line }
export interface UsPeriod { bs: Line; is_: Line; cf: Line }
export interface Metric { label: string; value: number | string | null; fmt: 'pct' | 'x' | 'usd' | 'text' }
export interface PeElement { key: string; label: string; weight: number; score: number; rule: boolean; metrics: Metric[] }
export interface PeResult { elements: PeElement[]; weighted: number; change: number; pePrev: number; pe: number; eps: number; annualEps: number; price: number; rating: string }
export interface FinPeriod {
  japan: SubPeriod;
  germany: SubPeriod;
  us: UsPeriod;
  cons: { bs: Line; is_: Line };
  eps: number;
  annualEps: number;
  divPerShare: number;
  ratios: { STDebtToWC: number; DebtToAssets: number; TotalDebtToAssets: number; TIE: number; EffTaxRate: number; EffIntRate: number; FXVarToFwd: number };
  pe: PeResult;
}

const data = raw as unknown as Record<string, FinPeriod>;

export function finFor(period: number): FinPeriod | undefined {
  return data[String(period)];
}

export type EntityId = 'us' | 'japan' | 'germany';
