import type { Ccy } from './bimr';
import type { Predictions } from './decision';
import { lastPosition, type TeamPosition } from './teamPosition';

/**
 * S-06 Operations inputs for Japan and Germany, laid out as in FORAD 2.0's
 * "Decision Inputs · Operations" screens (FORAD 2.0 manual §3.3).
 */

export type Days = 0 | 30 | 60 | 90;
export const DAY_OPTIONS: Days[] = [0, 30, 60, 90];
/** Price (or cost) adjustment for settling before the standard 90 days. */
export const DAY_ADJUSTMENT: Record<Days, number> = { 0: -0.03, 30: -0.02, 60: -0.01, 90: 0 };
export const CCY_OPTIONS: Ccy[] = ['USD', 'JPY', 'EUR'];

export const RULES = {
  japan: { block: 50_000, capacityCost: 100_000, ccy: 'JPY' as Ccy, sym: '¥' },
  germany: { block: 10_000, capacityCost: 2_000, ccy: 'EUR' as Ccy, sym: '€' },
  maxCapacity: 10_000_000,
  icBand: 0.05, // transfer price within ±5% of last period
  unitsFromJapanPerGermanUnit: 2,
  oilBarrelsPerUnit: 4,
  oilContractBarrels: 1_000,
  excessProductionCost: 0.075,
  offPreferredCurrency: -0.01,
};

export interface JapanOps {
  capacity: number;
  production: number;
  exportCurrency: Ccy;
  domCollectDays: Days;
  expCollectDays: Days;
  domPayDays: Days;
  importPayDays: Days;
  dividend: number; // JPY
  oilFutures: number; // contracts of 1,000 barrels, buy (+) / sell (−)
}

export interface GermanyOps {
  capacity: number;
  production: number;
  exportCurrency: Ccy;
  icCurrency: Ccy;
  icPrice: number; // USD per unit, as on the FORAD 2.0 screen
  domCollectDays: Days;
  expCollectDays: Days;
  icDays: Days; // Inter-Company Collection Days (Japan collects, Germany pays)
  domPayDays: Days;
  importPayDays: Days;
  dividend: number; // EUR
}

export interface OperationsDraft {
  japan: JapanOps;
  germany: GermanyOps;
}

export type OpsEntity = keyof OperationsDraft;
export type OpsKey<E extends OpsEntity> = keyof OperationsDraft[E] & string;

/** Defaults: last period's decisions, as in FORAD 2.0. Oil futures start at 0 (contracts last one period). */
export function defaultOperations(period: number): OperationsDraft {
  const p = lastPosition(period - 1);
  const j = p.japan;
  const g = p.germany;
  return {
    japan: {
      capacity: j.capacity, production: j.production, exportCurrency: j.exportCurrency,
      domCollectDays: j.domCollectDays, expCollectDays: j.expCollectDays, domPayDays: j.domPayDays, importPayDays: j.importPayDays,
      dividend: j.dividend, oilFutures: 0,
    },
    germany: {
      capacity: g.capacity, production: g.production, exportCurrency: g.exportCurrency,
      icCurrency: g.icCurrency, icPrice: g.icPrice,
      domCollectDays: g.domCollectDays, expCollectDays: g.expCollectDays, icDays: g.icDays, domPayDays: g.domPayDays, importPayDays: g.importPayDays,
      dividend: g.dividend,
    },
  };
}

/** The calculated rows of each screen. */
export interface InventoryLine {
  capacityAdded: number;
  capacityCost: number; // local currency, paid day 0
  beginningInventory: number;
  salesVolume: number;
  endingInventory: number;
  salesFromCurrent: number;
}

export interface Derived {
  japan: InventoryLine & { icUnits: number; oilExposure: number };
  germany: InventoryLine;
}

export function deriveOperations(ops: OperationsDraft, pred: Predictions, last: TeamPosition): Derived {
  const line = (e: OpsEntity, sales: number): InventoryLine => {
    const o = ops[e];
    const beg = last[e].endingInventory;
    const added = o.capacity - last[e].capacity;
    return {
      capacityAdded: added,
      capacityCost: Math.max(0, added) * RULES[e].capacityCost,
      beginningInventory: beg,
      salesVolume: sales,
      endingInventory: beg + o.production - sales,
      salesFromCurrent: Math.max(0, sales - beg),
    };
  };
  const icUnits = RULES.unitsFromJapanPerGermanUnit * ops.germany.production;
  // FORAD 2.0's Germany screen counts domestic + export only; tender units (S-07) are not in Sales Volume.
  const germany = line('germany', pred.deDomesticUnits + pred.deExportUnits);
  const japan = line('japan', pred.jpDomesticUnits + pred.jpExportUnits + icUnits);
  return {
    germany,
    japan: { ...japan, icUnits, oilExposure: -RULES.oilBarrelsPerUnit * ops.japan.production },
  };
}

export interface OpsIssue {
  entity: OpsEntity;
  key: string;
  message: string;
}

const fmt = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);

/** Hard limits from FORAD 2.0. Inputs are never reset; the problem is shown on the field instead. */
export function validateOperations(ops: OperationsDraft, d: Derived, last: TeamPosition): OpsIssue[] {
  const out: OpsIssue[] = [];
  const add = (entity: OpsEntity, key: string, message: string) => out.push({ entity, key, message });

  (['germany', 'japan'] as OpsEntity[]).forEach((e) => {
    const o = ops[e];
    const lastCap = last[e].capacity;
    const block = RULES[e].block;
    if (!Number.isInteger(o.capacity)) add(e, 'capacity', 'Enter a whole number of units.');
    else if (o.capacity < lastCap) add(e, 'capacity', `Capacity cannot be reduced below ${fmt(lastCap)}.`);
    else if ((o.capacity - lastCap) % block !== 0) add(e, 'capacity', `Add capacity in blocks of ${fmt(block)}: ${fmt(lastCap)}, ${fmt(lastCap + block)}, ${fmt(lastCap + 2 * block)}…`);
    else if (o.capacity > RULES.maxCapacity) add(e, 'capacity', `Capacity cannot exceed ${fmt(RULES.maxCapacity)}.`);

    if (!Number.isInteger(o.production) || o.production < 1) add(e, 'production', 'Enter a whole number of units, at least 1.');
    else if (o.production > o.capacity) add(e, 'production', `Production cannot exceed capacity (${fmt(o.capacity)}).`);
    else if (d[e].endingInventory < 0) {
      const need = o.production - d[e].endingInventory;
      add(e, 'production', `Ending inventory would be ${fmt(d[e].endingInventory)}. Produce at least ${fmt(need)}${e === 'japan' ? ', or produce less in Germany' : ''}.`);
    }

    if (!(o.dividend >= 0)) add(e, 'dividend', 'The dividend cannot be negative.');
  });

  const g = ops.germany;
  const lo = last.germany.icPrice * (1 - RULES.icBand);
  const hi = last.germany.icPrice * (1 + RULES.icBand);
  if (!(g.icPrice > 0)) add('germany', 'icPrice', 'The transfer price must be greater than zero.');
  else if (g.icPrice < lo - 1e-9 || g.icPrice > hi + 1e-9) add('germany', 'icPrice', `Must be within ±5% of last period’s ${fmt(last.germany.icPrice)}: ${fmt(lo)} to ${fmt(hi)}.`);

  if (!Number.isInteger(ops.japan.oilFutures)) add('japan', 'oilFutures', 'Enter a whole number of contracts.');
  return out;
}

/** Keys that differ from the defaults, as "entity.key". */
export function changedOperations(ops: OperationsDraft, defaults: OperationsDraft): string[] {
  const out: string[] = [];
  (Object.keys(defaults) as OpsEntity[]).forEach((e) => {
    Object.keys(defaults[e]).forEach((k) => {
      const a = (ops[e] as unknown as Record<string, unknown>)[k];
      const b = (defaults[e] as unknown as Record<string, unknown>)[k];
      if (a !== b) out.push(`${e}.${k}`);
    });
  });
  return out;
}
