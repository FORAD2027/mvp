import type { PredictionKey } from '../../../data/decision';

/**
 * Workspace layout: one tab per country, and under each the FORAD 2.0 categories
 * Operations, Investing, Financing and Hedging (one per foreign currency).
 * Forecasts sit where FORAD 2.0 kept them: oil, sales and price in the subsidiaries'
 * Operations; end-of-period FX rates in the US Hedging sections; EPS with the US.
 */

export type CountryId = 'us' | 'japan' | 'germany';
export type SectionKind = 'operations' | 'investing' | 'financing' | 'hedging';

export interface PlannedDecision {
  name: string;
  note: string;
}

export interface SectionDef {
  id: string; // unique within a country, e.g. 'hedging-usd'
  kind: SectionKind;
  label: string;
  lead: string;
  forecasts: PredictionKey[];
  /** A forecast entered elsewhere, shown read-only here for reference. */
  linkedForecast?: { key: PredictionKey; country: CountryId; section: string };
  planned: PlannedDecision[];
  backlog: string;
  touches: string[];
}

export interface CountryDef {
  id: CountryId;
  name: string;
  currency: 'USD' | 'JPY' | 'EUR';
  role: string;
  sections: SectionDef[];
}

const fxPlanned = (ccy: string, cover: string): PlannedDecision[] => [
  { name: `${ccy} forward contracts`, note: `Buy (+) or sell (−) ${ccy} for day 90 at the forward rate. ${cover}` },
  { name: `${ccy} call options`, note: 'Notional bought or sold, and a strike within ±20% of the forward rate' },
  { name: `${ccy} put options`, note: 'Notional bought or sold, and a strike within ±20% of the forward rate' },
];

export const COUNTRIES: CountryDef[] = [
  {
    id: 'us', name: 'US Holding', currency: 'USD',
    role: 'Owns both subsidiaries. Earns royalties, raises equity and pays shareholders.',
    sections: [
      {
        id: 'ir-hedging', kind: 'hedging', label: 'IR hedging',
        lead: 'Interest-rate futures in USD, JPY and EUR, held by the holding company.',
        forecasts: [], backlog: 'S-10', touches: ['Quality of earnings', 'Creditworthiness'],
        planned: [],
      },
      {
        id: 'investing', kind: 'investing', label: 'Investing',
        lead: 'Park spare dollars, buy back shares and set the dividend shareholders receive.',
        forecasts: [], backlog: 'S-08', touches: ['Dividend management', 'Quality of earnings'],
        planned: [
          { name: 'Marketable securities', note: 'Invest or redeem at the beginning or middle of the period' },
          { name: 'Share repurchase', note: 'From Period 2, up to 5% of shares, at last period’s price' },
          { name: 'Dividend per share', note: 'Paid on day 90; shareholders punish cuts' },
        ],
      },
      {
        id: 'financing', kind: 'financing', label: 'Financing',
        lead: 'Raise dollars for the holding company and fund the subsidiaries through inter-company loans.',
        forecasts: [], backlog: 'S-09', touches: ['Creditworthiness', 'Quality of earnings'],
        planned: [
          { name: 'Short-term loans', note: 'USD, JPY or EUR, beginning or middle of the period, 45 days' },
          { name: 'Inter-company loans to Japan and Germany', note: 'USD, 45 days, at a rate you set within limits' },
          { name: 'Long-term fixed and floating debt', note: 'Dollars only; issue cost $1M + 1%' },
          { name: 'Interest-rate swaps', note: 'Pay fixed or pay floating; unwind any time' },
          { name: 'Call the zero-coupon convertible', note: '103% cash if out of the money; 1.2M new shares if in the money' },
          { name: 'Issue new shares', note: 'Up to 5% of shares; cost $500k + 3%' },
          { name: 'Interest-rate futures', note: 'USD 1M, EUR 1M or JPY 100M contracts, 90 days' },
        ],
      },
      {
        id: 'hedging-jpy', kind: 'hedging', label: 'Hedging · JPY',
        lead: 'Your yen view for the whole company, and any yen hedges held by the holding company.',
        forecasts: ['jpyPerUsd'], backlog: 'S-10', touches: ['Currency hedging', 'Planning skills'],
        planned: fxPlanned('JPY', 'Covers dividends and interest due from Japan.'),
      },
      {
        id: 'hedging-eur', kind: 'hedging', label: 'Hedging · EUR',
        lead: 'Your euro view for the whole company, and any euro hedges held by the holding company.',
        forecasts: ['usdPerEur'], backlog: 'S-10', touches: ['Currency hedging', 'Planning skills'],
        planned: fxPlanned('EUR', 'Covers dividends and interest due from Germany.'),
      },
    ],
  },
  {
    id: 'japan', name: 'Japan', currency: 'JPY',
    role: 'Makes parts for Germany and sells finished units at home and abroad.',
    sections: [
      {
        id: 'operations', kind: 'operations', label: 'Operations',
        lead: 'Forecast the quarter’s market, then set capacity, production, terms and the dividend to the holding company.',
        forecasts: ['oil', 'jpDomesticUnits', 'jpExportUnits', 'jpPrice'], backlog: 'S-06', touches: ['Planning skills', 'Tax management', 'Quality of earnings'],
        planned: [
          { name: 'Capacity increase', note: 'Blocks of 50,000 units at ¥100,000 per unit; paid day 0, usable at once, never reduced' },
          { name: 'Production', note: 'Up to capacity. Sales = domestic + export + 2 × Germany’s production' },
          { name: 'Inventory check', note: 'Beginning + production − sales; units sold from this period’s production cost 7.5% more' },
          { name: 'Customer terms', note: 'Domestic and export, set separately: 0, 30, 60 or 90 days (−3%, −2%, −1%, none)' },
          { name: 'Export invoice currency', note: 'The period’s preferred currency, or another at −1%' },
          { name: 'Supplier terms', note: 'Domestic materials (¥) and imported materials ($): 0, 30, 60 or 90 days' },
          { name: 'Inter-company sales', note: 'Price, currency and terms are set in Germany; shown here read-only' },
          { name: 'Dividend to holding company', note: 'Paid on day 90; Japan’s tax rate is lowest (25%) at a 65% payout' },
          { name: 'Oil futures', note: 'Buy or sell contracts of 1,000 barrels against 4 barrels per unit produced' },
        ],
      },
      {
        id: 'investing', kind: 'investing', label: 'Investing',
        lead: 'Put spare yen to work or lend it to the holding company.',
        forecasts: [], backlog: 'S-08', touches: ['Creditworthiness', 'Tax management'],
        planned: [
          { name: 'Marketable securities', note: 'Invest or redeem at the beginning or middle of the period' },
          { name: 'Inter-company loan to US', note: 'USD, 45 days, LIBOR to LIBOR + 3%' },
        ],
      },
      {
        id: 'financing', kind: 'financing', label: 'Financing',
        lead: 'Cover Japan’s cash needs on days 0, 45 and 90.',
        forecasts: [], backlog: 'S-09', touches: ['Creditworthiness', 'Quality of earnings'],
        planned: [
          { name: 'Short-term loans', note: 'USD, JPY or EUR, beginning or middle of the period, 45 days' },
          { name: 'Inter-company borrowing from US', note: 'USD, at a rate you set within limits' },
          { name: 'Long-term fixed and floating debt', note: 'Yen only; issue cost $1M + 1%' },
          { name: 'Interest-rate swaps', note: 'Pay fixed or pay floating; unwind any time' },
        ],
      },
      {
        id: 'hedging-usd', kind: 'hedging', label: 'Hedging · USD',
        lead: 'Japan’s dollar exposure: export and inter-company receivables, imported materials payable.',
        forecasts: [], linkedForecast: { key: 'jpyPerUsd', country: 'us', section: 'hedging-jpy' },
        backlog: 'S-10', touches: ['Currency hedging', 'Quality of earnings'],
        planned: fxPlanned('USD', 'Up to 200% of Japan’s equity.'),
      },
      {
        id: 'hedging-eur', kind: 'hedging', label: 'Hedging · EUR',
        lead: 'Any euro exposure Japan holds, for example from euro loans or invoicing.',
        forecasts: [], linkedForecast: { key: 'usdPerEur', country: 'us', section: 'hedging-eur' },
        backlog: 'S-10', touches: ['Currency hedging', 'Quality of earnings'],
        planned: fxPlanned('EUR', 'Up to 200% of Japan’s equity.'),
      },
    ],
  },
  {
    id: 'germany', name: 'Germany', currency: 'EUR',
    role: 'Assembles with Japanese parts, sells at home and abroad, and can bid for tender sales.',
    sections: [
      {
        id: 'operations', kind: 'operations', label: 'Operations',
        lead: 'Forecast the quarter’s market, then set capacity, production, terms, the transfer price, the dividend and any tender bid.',
        forecasts: ['deDomesticUnits', 'deExportUnits', 'dePrice'], backlog: 'S-06, S-07', touches: ['Planning skills', 'Tax management', 'Quality of earnings'],
        planned: [
          { name: 'Capacity increase', note: 'Blocks of 10,000 units at €2,000 per unit; paid day 0, usable at once, never reduced' },
          { name: 'Production', note: 'Up to capacity. Each unit uses 2 units from Japan, so decide Germany first' },
          { name: 'Inventory check', note: 'Beginning + production − sales; units sold from this period’s production cost 7.5% more' },
          { name: 'Customer terms', note: 'Domestic and export, set separately: 0, 30, 60 or 90 days (−3%, −2%, −1%, none)' },
          { name: 'Export invoice currency', note: 'The period’s preferred currency, or another at −1%' },
          { name: 'Supplier terms', note: 'Domestic materials (€): 0, 30, 60 or 90 days' },
          { name: 'Inter-company price, currency and pay days', note: 'Transfer price within ±5% of last period; no discount for currency or terms' },
          { name: 'Dividend to holding company', note: 'Paid on day 90; Germany’s tax rate is lowest (45%) at a 56% payout' },
          { name: 'Tender bid', note: 'Price and units, when the tender market is open (S-07)' },
        ],
      },
      {
        id: 'investing', kind: 'investing', label: 'Investing',
        lead: 'Put spare euros to work or lend to the holding company.',
        forecasts: [], backlog: 'S-08', touches: ['Creditworthiness', 'Tax management'],
        planned: [
          { name: 'Marketable securities', note: 'Invest or redeem at the beginning or middle of the period' },
          { name: 'Inter-company loan to US', note: 'USD, 45 days, LIBOR to LIBOR + 3%' },
        ],
      },
      {
        id: 'financing', kind: 'financing', label: 'Financing',
        lead: 'Cover Germany’s cash needs on days 0, 45 and 90.',
        forecasts: [], backlog: 'S-09', touches: ['Creditworthiness', 'Quality of earnings'],
        planned: [
          { name: 'Short-term loans', note: 'USD, JPY or EUR, beginning or middle of the period, 45 days' },
          { name: 'Inter-company borrowing from US', note: 'USD, at a rate you set within limits' },
          { name: 'Long-term fixed and floating debt', note: 'Euro only; issue cost $1M + 1%' },
          { name: 'Interest-rate swaps', note: 'Pay fixed or pay floating; unwind any time' },
        ],
      },
      {
        id: 'hedging-usd', kind: 'hedging', label: 'Hedging · USD',
        lead: 'Germany’s dollar exposure: export and tender receivables, parts payable to Japan.',
        forecasts: [], linkedForecast: { key: 'usdPerEur', country: 'us', section: 'hedging-eur' },
        backlog: 'S-10', touches: ['Currency hedging', 'Quality of earnings'],
        planned: fxPlanned('USD', 'Up to 200% of Germany’s equity.'),
      },
      {
        id: 'hedging-jpy', kind: 'hedging', label: 'Hedging · JPY',
        lead: 'Any yen exposure Germany holds, for example if parts are invoiced in yen.',
        forecasts: [], linkedForecast: { key: 'jpyPerUsd', country: 'us', section: 'hedging-jpy' },
        backlog: 'S-10', touches: ['Currency hedging', 'Quality of earnings'],
        planned: fxPlanned('JPY', 'Up to 200% of Germany’s equity.'),
      },
    ],
  },
];

export interface Position {
  country: CountryId;
  section: string;
}

/** Every country/section in order, for previous/next navigation. */
export const SEQUENCE: Position[] = COUNTRIES.flatMap((c) => c.sections.map((s) => ({ country: c.id, section: s.id })));

export function findCountry(id: string | undefined): CountryDef {
  return COUNTRIES.find((c) => c.id === id) ?? COUNTRIES[0];
}

export function findSection(country: CountryDef, id: string | undefined): SectionDef {
  return country.sections.find((s) => s.id === id) ?? country.sections[0];
}

/** Where each forecast lives, for links from Review. */
export function locateForecast(key: PredictionKey): Position {
  for (const c of COUNTRIES) for (const s of c.sections) if (s.forecasts.includes(key)) return { country: c.id, section: s.id };
  return { country: 'us', section: 'operations' };
}
