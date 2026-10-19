import type { PredictionKey } from './decision';
import type { FieldHelp } from '../components/NumberField';

/** Display metadata for each prediction. No hints or guidance: students form their own view. */
export interface PredictionField {
  key: PredictionKey;
  label: string;
  short: string; // used in summaries
  unit: string;
  decimals: number;
  step: number;
  help: FieldHelp;
}

export const PREDICTION_FIELDS: Record<PredictionKey, PredictionField> = {
  jpyPerUsd: {
    key: 'jpyPerUsd', label: 'End-of-period ¥/$ (JPY per USD)', short: '¥/$, end of period', unit: '¥ per $', decimals: 2, step: 0.25,
    help: {
      what: 'How many yen one dollar buys at the end of the quarter. A higher number means a weaker yen.',
      limits: 'None. Used for every yen–dollar item in your projection; the actual rate replaces it when the period runs.',
      affects: ['FX gains and losses', 'Planning skills', 'Currency hedging'],
    },
  },
  usdPerEur: {
    key: 'usdPerEur', label: 'End-of-period $/€ (USD per EUR)', short: '$/€, end of period', unit: '$ per €', decimals: 4, step: 0.005,
    help: {
      what: 'How many dollars one euro buys at the end of the quarter. A higher number means a stronger euro.',
      limits: 'None. Used for every euro–dollar item in your projection; the actual rate replaces it when the period runs.',
      affects: ['FX gains and losses', 'Translation of Germany’s results', 'Planning skills'],
    },
  },
  oil: {
    key: 'oil', label: 'End-of-period oil price', short: 'Oil, end of period', unit: '$ per bbl', decimals: 2, step: 0.5,
    help: {
      what: 'The oil price Japan pays this quarter. Japan uses 4 barrels for every unit it produces.',
      limits: 'None. Oil is 25–50% of Japan’s unit cost.',
      affects: ['Japan’s costs', 'Planning skills'],
    },
  },
  jpDomesticUnits: {
    key: 'jpDomesticUnits', label: 'Domestic sales', short: 'Japan domestic sales', unit: 'units', decimals: 0, step: 1000,
    help: {
      what: 'Units Japan’s home market will buy from you this quarter. The cartel sets it, so it is the same for every team.',
      limits: 'A forecast, not a decision. If actual sales exceed what you produce, the model forces costly extra production.',
      affects: ['Revenue', 'Inventory', 'Planning skills'],
    },
  },
  jpExportUnits: {
    key: 'jpExportUnits', label: 'Export sales', short: 'Japan export sales', unit: 'units', decimals: 0, step: 1000,
    help: {
      what: 'Units Japan will sell abroad, invoiced in the period’s preferred export currency.',
      limits: 'A forecast, not a decision.',
      affects: ['Revenue', 'Foreign-currency exposure', 'Planning skills'],
    },
  },
  jpPrice: {
    key: 'jpPrice', label: 'Domestic sales price (end of period)', short: 'Japan domestic price', unit: '¥ per unit', decimals: 0, step: 250,
    help: {
      what: 'The domestic price per unit at the end of the period, for standard 90-day terms. Export prices are converted into the invoice currency at the beginning-of-period exchange rate.',
      limits: 'A forecast, not a decision. Faster customer terms (0, 30 or 60 days) lower the price you receive by 3%, 2% or 1%.',
      affects: ['Revenue', 'Planning skills'],
    },
  },
  deDomesticUnits: {
    key: 'deDomesticUnits', label: 'Domestic sales', short: 'Germany domestic sales', unit: 'units', decimals: 0, step: 500,
    help: {
      what: 'Units Germany’s home market will buy from you this quarter. The cartel sets it, so it is the same for every team.',
      limits: 'A forecast, not a decision.',
      affects: ['Revenue', 'Inventory', 'Planning skills'],
    },
  },
  deExportUnits: {
    key: 'deExportUnits', label: 'Export sales', short: 'Germany export sales', unit: 'units', decimals: 0, step: 500,
    help: {
      what: 'Units Germany will export, invoiced in the period’s preferred export currency. Tender sales are separate.',
      limits: 'A forecast, not a decision.',
      affects: ['Revenue', 'Foreign-currency exposure', 'Planning skills'],
    },
  },
  dePrice: {
    key: 'dePrice', label: 'Domestic sales price (end of period)', short: 'Germany domestic price', unit: '€ per unit', decimals: 0, step: 5,
    help: {
      what: 'The domestic price per unit at the end of the period, for standard 90-day terms. Export prices are converted into the invoice currency at the beginning-of-period exchange rate.',
      limits: 'A forecast, not a decision.',
      affects: ['Revenue', 'Planning skills'],
    },
  },
  eps: {
    key: 'eps', label: 'Forecast EPS for the quarter', short: 'Forecast EPS', unit: '$ per share', decimals: 2, step: 0.01,
    help: {
      what: 'The consolidated earnings per share you expect this quarter. When you submit, it becomes the benchmark for your Planning score.',
      limits: 'Any number, including negative. Within 4% of actual EPS earns the full +4 Planning score.',
      affects: ['Planning skills (10% of P/E)'],
    },
  },
};
