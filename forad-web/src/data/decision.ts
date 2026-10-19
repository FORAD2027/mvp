import { actualsFor } from './actuals';
import type { OperationsDraft } from './operations';
import type { InvestingDraft } from './investing';
import type { FinancingDraft } from './financing';
import type { HedgingDraft } from './hedging';

/** S-05 predictions. Field names follow FORAD 2.0's decision file where one exists. */
export interface Predictions {
  jpyPerUsd: number; // end-of-period, entered on the US Hedging JPY tab in FORAD 2.0
  usdPerEur: number; // end-of-period, entered on the US Hedging EUR tab in FORAD 2.0
  oil: number; // Ending Oil Price Per Barrel (USD), Japan operations
  jpDomesticUnits: number;
  jpExportUnits: number;
  jpPrice: number; // Price Forecast (JPY)
  deDomesticUnits: number;
  deExportUnits: number;
  dePrice: number; // Price Forecast (EUR)
  eps: number; // EPSForecast (USDecisionInfo)
}

export type PredictionKey = keyof Predictions;

export interface DecisionDraft {
  team: number;
  period: number;
  predictions: Predictions;
  operations: OperationsDraft;
  investing: InvestingDraft;
  financing: FinancingDraft;
  hedging: HedgingDraft;
  updatedAt: string | null;
}

/**
 * Defaults = last period's actuals from the BIMR (FORAD 2.0 manual §3.2).
 * EPS has no published actual (it comes from the team's own results), so it starts at 0.
 */
export function defaultPredictions(period: number): Predictions {
  const a = actualsFor(period - 1);
  if (!a) throw new Error(`No actuals for period ${period - 1}`);
  return {
    jpyPerUsd: a.jpyPerUsd,
    usdPerEur: a.usdPerEur,
    oil: a.oil ?? 0,
    jpDomesticUnits: a.japan.domesticUnits,
    jpExportUnits: a.japan.exportUnits,
    jpPrice: a.japan.price,
    deDomesticUnits: a.germany.domesticUnits,
    deExportUnits: a.germany.exportUnits,
    dePrice: a.germany.price,
    eps: 0,
  };
}

export type Severity = 'error' | 'warning';
export interface Issue {
  key: PredictionKey;
  severity: Severity;
  message: string;
}

/**
 * Only impossible values are flagged. No guidance-based warnings for now:
 * students form their own view of the market (guidance may return later).
 */
export function validatePredictions(p: Predictions): Issue[] {
  const out: Issue[] = [];
  const positive = (k: PredictionKey, label: string) => {
    if (!(p[k] > 0)) out.push({ key: k, severity: 'error', message: `${label} must be greater than zero.` });
  };
  const wholeNonNeg = (k: PredictionKey) => {
    if (!(p[k] >= 0) || !Number.isInteger(p[k])) out.push({ key: k, severity: 'error', message: 'Enter a whole number of units, zero or more.' });
  };

  positive('jpyPerUsd', 'The exchange rate');
  positive('usdPerEur', 'The exchange rate');
  positive('oil', 'The oil price');
  (['jpDomesticUnits', 'jpExportUnits', 'deDomesticUnits', 'deExportUnits'] as PredictionKey[]).forEach(wholeNonNeg);
  positive('jpPrice', 'The price');
  positive('dePrice', 'The price');
  if (!Number.isFinite(p.eps)) out.push({ key: 'eps', severity: 'error', message: 'Enter a number (it can be negative).' });
  return out;
}
