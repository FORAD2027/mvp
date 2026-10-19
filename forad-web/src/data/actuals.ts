import { reportWithActualsFor } from './bimr';

/**
 * Actual market outcomes of CLOSED periods, as published in the following period's BIMR.
 * They are the defaults for the next period's forecasts ("defaults to last period's actual").
 */
export interface PeriodActuals {
  period: number;
  jpyPerUsd: number; // end of period
  usdPerEur: number; // end of period
  oil: number | null; // end of period, USD/bbl (null when the report gives no figure)
  japan: { domesticUnits: number; exportUnits: number; price: number };
  germany: { domesticUnits: number; exportUnits: number; price: number };
}

export function actualsFor(period: number): PeriodActuals | undefined {
  const r = reportWithActualsFor(period);
  if (!r) return undefined;
  const { germany, japan } = r.actual.markets;
  return {
    period,
    jpyPerUsd: r.spot.end.jpyPerUsd,
    usdPerEur: r.spot.end.usdPerEur,
    oil: r.oil.endPrice,
    japan: { domesticUnits: japan.domesticUnits, exportUnits: japan.exportUnits, price: japan.domesticPrice },
    germany: { domesticUnits: germany.domesticUnits, exportUnits: germany.exportUnits, price: germany.domesticPrice },
  };
}
