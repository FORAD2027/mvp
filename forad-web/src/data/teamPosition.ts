import type { Ccy } from './bimr';
import { actualsFor } from './actuals';
import type { Days } from './operations';

/**
 * The team's own position after the last closed period: the "Period N actual" column of the
 * FORAD 2.0 Operations screens.
 *
 * SAMPLE DATA. The BIMR reports publish market figures only, not each team's capacity,
 * inventory or decisions. Until team results are connected (S-16), Team 3 uses this sample,
 * built to be consistent with the real Period 5 market (sales volumes and prices from the
 * Period 6 report) and with FORAD 2.0's rules (capacity blocks, 2 Japanese units per German unit).
 */
export const POSITION_IS_SAMPLE = true;

interface SubBase {
  capacity: number;
  beginningInventory: number;
  production: number;
  salesVolume: number;
  endingInventory: number;
  salesFromCurrent: number;
  domesticUnits: number;
  exportUnits: number;
  price: number;
  exportCurrency: Ccy;
  domCollectDays: Days;
  expCollectDays: Days;
  domPayDays: Days;
  importPayDays: Days;
  dividend: number;
}

export interface JapanPosition extends SubBase {
  icUnits: number;
  oilPrice: number | null;
  oilFuturesPrice: number | null;
  oilExposure: number;
  oilFutures: number;
}

export interface GermanyPosition extends SubBase {
  icCurrency: Ccy;
  icPrice: number;
  icDays: Days;
}

export interface TeamPosition {
  period: number;
  japan: JapanPosition;
  germany: GermanyPosition;
}

// Sample decisions Team 3 made for the last closed period.
const SAMPLE = {
  japan: { capacity: 650_000, beginningInventory: 100_000, production: 600_000, dividend: 1_000_000_000, oilFutures: 2_400 },
  germany: { capacity: 120_000, beginningInventory: 40_000, production: 120_000, dividend: 0, icPrice: 585 },
};

export function lastPosition(period: number): TeamPosition {
  const a = actualsFor(period);
  if (!a) throw new Error(`No actuals for period ${period}`);

  const gSales = a.germany.domesticUnits + a.germany.exportUnits;
  const gEnd = SAMPLE.germany.beginningInventory + SAMPLE.germany.production - gSales;
  const icUnits = 2 * SAMPLE.germany.production;
  const jSales = a.japan.domesticUnits + a.japan.exportUnits + icUnits;
  const jEnd = SAMPLE.japan.beginningInventory + SAMPLE.japan.production - jSales;

  return {
    period,
    germany: {
      capacity: SAMPLE.germany.capacity,
      beginningInventory: SAMPLE.germany.beginningInventory,
      production: SAMPLE.germany.production,
      salesVolume: gSales,
      endingInventory: gEnd,
      salesFromCurrent: Math.max(0, gSales - SAMPLE.germany.beginningInventory),
      domesticUnits: a.germany.domesticUnits,
      exportUnits: a.germany.exportUnits,
      price: a.germany.price,
      exportCurrency: 'USD',
      icCurrency: 'USD',
      icPrice: SAMPLE.germany.icPrice,
      domCollectDays: 90,
      expCollectDays: 90,
      icDays: 90,
      domPayDays: 90,
      importPayDays: 90,
      dividend: SAMPLE.germany.dividend,
    },
    japan: {
      capacity: SAMPLE.japan.capacity,
      beginningInventory: SAMPLE.japan.beginningInventory,
      production: SAMPLE.japan.production,
      salesVolume: jSales,
      endingInventory: jEnd,
      salesFromCurrent: Math.max(0, jSales - SAMPLE.japan.beginningInventory),
      domesticUnits: a.japan.domesticUnits,
      exportUnits: a.japan.exportUnits,
      price: a.japan.price,
      icUnits,
      exportCurrency: 'USD',
      domCollectDays: 90,
      expCollectDays: 90,
      domPayDays: 90,
      importPayDays: 90,
      dividend: SAMPLE.japan.dividend,
      oilPrice: a.oil,
      oilFuturesPrice: null, // not published in the BIMR; the instructor's market data will supply it (T-04)
      oilExposure: -4 * SAMPLE.japan.production,
      oilFutures: SAMPLE.japan.oilFutures,
    },
  };
}
