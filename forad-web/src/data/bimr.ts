/**
 * Business International Money Report (BIMR), Periods 1–6, Spring 2026.
 * Transcribed from the instructor's period reports (BIMR_Period_1 … BIMR_Period_6 PDFs).
 *
 * Conventions, as in the reports:
 * - Rates are as published in each period's report (fractions: 0.0225 = 2.250%).
 * - Spot rates are USD per EUR ($/€) and JPY per USD (¥/$), start and end of the previous period.
 * - "actual" = the previous period's realized market; "forecast" = this period's Marketing Board
 *   forecast; "range" = the next period's forecast range.
 * - Legacy file-handling announcements (Canvas folders, Tower46, DecisionsT#P#.txt by email)
 *   are left out: the web app replaces that workflow.
 */

export type Ccy = 'USD' | 'EUR' | 'JPY';

export interface RateRow {
  libor3m: number;
  libor6m: number;
  longTerm: number;
}

export interface Spot {
  usdPerEur: number;
  jpyPerUsd: number;
}

export interface MarketFigures {
  domesticUnits: number;
  exportUnits: number;
  domesticPrice: number; // end of period, local currency
  invoiceCurrency: Ccy;
}

export interface MarketRange {
  domesticUnits: [number, number];
  exportUnits: [number, number];
  domesticPrice: [number, number];
  invoiceCurrency: Ccy;
}

export interface SubsidiaryPair<T> {
  germany: T;
  japan: T;
}

export interface Leaderboard {
  afterPeriod: number;
  headline: string;
  rows: { rank: number; team: string; stockPrice: number }[];
}

export interface TenderResult {
  period: number;
  unitsAvailable: number;
  bidders: number | null; // null when the report does not say
  winner: string | null; // null when the report does not name the company
  unitsAwarded: number;
  price: number; // USD per unit
  text: string;
}

export interface TwoYearChart {
  kind: 'chart';
  title: string;
  note: string;
  periods: number[];
  germany: { domestic: number[]; exportSales: number[] };
  japan: { domestic: number[]; exportSales: number[] };
  commentary: string[];
}

export interface TwoYearTable {
  kind: 'table';
  title: string;
  note: string;
  periods: number[];
  rows: { label: string; values: number[] }[]; // thousand units
  commentary: string[];
}

export interface BimrReport {
  period: number;
  deadline: string; // ISO, Arizona time
  leaderboard?: Leaderboard;
  currentState?: string[];
  oil: { endPrice: number | null; commentary: string[] }; // end of previous period
  rates: Record<Ccy, RateRow>;
  ratesCommentary: string[];
  spot: { startPeriod: number; start: Spot; end: Spot };
  fxCommentary: string[];
  actual: { period: number; markets: SubsidiaryPair<MarketFigures>; commentary: string[] };
  tenderResult?: TenderResult;
  outlookCommentary: string[];
  forecast: { period: number; markets: SubsidiaryPair<MarketFigures> };
  range: { period: number; markets: SubsidiaryPair<MarketRange> };
  tenderOutlook?: string;
  twoYear?: (TwoYearChart | TwoYearTable)[];
}

const USD: Ccy = 'USD';
const fig = (domesticUnits: number, exportUnits: number, domesticPrice: number): MarketFigures => ({ domesticUnits, exportUnits, domesticPrice, invoiceCurrency: USD });
const rng = (d: [number, number], e: [number, number], p: [number, number]): MarketRange => ({ domesticUnits: d, exportUnits: e, domesticPrice: p, invoiceCurrency: USD });
const TEAMS = { reveil: 'Réveil International', serious: 'Serious Business', redwood: 'Redwood', granite: 'Granite Apparel', reiches: 'Reiches Inc.' };

export const BIMR: BimrReport[] = [
  /* ------------------------------------------------------------ Period 1 */
  {
    period: 1,
    deadline: '2026-02-24T11:59:00-07:00',
    currentState: [
      'FORAD companies have faced challenging economic conditions for several consecutive quarters. In the markets served by both the German and Japanese subsidiaries, sales volumes and prices have steadily declined since the last cyclical peak. However, the industry Marketing Board (MB) believes that this economic downturn has – hopefully – reached its lowest point. Recent economic indicators are seen as encouraging signals of a potential strong recovery ahead.',
      'Due to prolonged economic weakness, companies across the industry have experienced low profitability and strained liquidity, and they now face financial distress. To sustain sales volume, trade credit terms were extended, which in turn caused working capital requirements to surge. The negative impact on liquidity was partially offset by low inventory levels. To alleviate their liquidity problems, several companies sold off property, plant and equipment (PP&E), and some manufacturing capacity was lost.',
      'Companies in the industry are burdened now by historically high debt levels, much of it short-term. Credit ratings fell, and the cost of borrowing rose and is currently elevated – not due to high interest rates, which are near historic low across all three currencies, but due to high credit spreads.',
      'One encouraging development is that in the past two years, your company has started exploring international export opportunities – these efforts are now looking increasingly promising. However, if sales volume were to rise sharply, the combination of reduced capacity and depleted inventories could result in significant shortages and rising costs.',
      'Share prices have fallen to record lows too. Shareholder dissatisfaction has grown markedly, reflecting concerns over companies’ financial performance and their ability to stay in business.',
      'The previous management team was recently dismissed, and you have been appointed to lead the company. Expectations from the board of directors and financial markets are high, and you are likely to have no more than 12 to 18 months to deliver results.',
    ],
    oil: {
      endPrice: null,
      commentary: ['Oil prices are currently low, reflecting the global economic weakness that has suppressed demand. As economic activity recovers, oil prices are expected to rise accordingly.'],
    },
    rates: {
      USD: { libor3m: 0.0225, libor6m: 0.02325, longTerm: 0.03825 },
      EUR: { libor3m: 0.035, libor6m: 0.0355, longTerm: 0.0525 },
      JPY: { libor3m: 0.0325, libor6m: 0.0335, longTerm: 0.0515 },
    },
    ratesCommentary: [
      'Amid the economic downturn, central banks have been actively stimulating global economies. Over the past 18 months, both the U.S. Federal Reserve (Fed) and the European Central Bank (ECB) have adopted aggressive expansionary monetary policies. These policies have driven interest rates lower in both the dollar and euro money and capital markets. The Bank of Japan has been less aggressive.',
      'Central banks are unlikely to increase interest rates until economic recovery is well established, particularly as inflation is currently not a concern.',
    ],
    spot: { startPeriod: 0, start: { usdPerEur: 1.258, jpyPerUsd: 112.4 }, end: { usdPerEur: 1.2, jpyPerUsd: 110.0 } },
    fxCommentary: [
      'The dollar has been on a downward trajectory for nearly two years against the euro and for over 16 months against the yen.',
      'Although forecasting short-term exchange rates remains notoriously difficult, many currency forecasters expect interest rates to continue declining, given expansionary monetary policies that are unlikely to be reversed in the near term.',
    ],
    actual: {
      period: 0,
      markets: { germany: fig(18000, 70000, 1450), japan: fig(90000, 190000, 45750) },
      commentary: ['The recent global economic weakness significantly reduced both sales volumes and prices. While MB expects market conditions to improve materially in Periods 1 and 2, it has chosen to adopt a conservative approach in its forecasts.'],
    },
    outlookCommentary: [],
    forecast: { period: 1, markets: { germany: fig(20000, 78000, 1452), japan: fig(105000, 205000, 47500) } },
    range: { period: 2, markets: { germany: rng([22000, 24000], [82000, 88000], [1450, 1460]), japan: rng([110000, 114000], [210000, 220000], [45750, 49000]) } },
    twoYear: [
      {
        kind: 'chart',
        title: 'Production volume: two-year forecast',
        note: 'Values read from the bar charts in the Period 1 report, to the nearest 500 units; approximate.',
        periods: [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8],
        germany: {
          domestic: [17000, 18800, 18500, 18000, 18000, 20500, 23000, 26800, 29000, 31000, 33000, 36000, 38000],
          exportSales: [74000, 76000, 78700, 74000, 70000, 78000, 84000, 87000, 89000, 91000, 93000, 95000, 97000],
        },
        japan: {
          domestic: [85000, 88500, 98000, 94000, 90000, 102000, 115000, 120000, 123000, 125000, 126000, 128000, 130000],
          exportSales: [176000, 184000, 196000, 202000, 190000, 208000, 212000, 222000, 232000, 234000, 235000, 237000, 239000],
        },
        commentary: [
          'Like most market analysts, your company’s Marketing & Sales (M&S) division believes that the market has reached its lowest point and will start recovering soon. It has developed a two-year forecast, which guides product development and capital investment decisions. However, M&S has consistently emphasized that, like all long-term forecasts, this two-year forecast is tentative and comes with no guarantees.',
          'The two-year forecast reflects an industry that has experienced severe decline during the recent global economic downturn but now shows signs of recovery. Sales volume forecasts for both the German and Japanese subsidiaries indicate a strong rebound. Prices are expected to remain flat in Germany, but the outlook is better in Japan.',
          'M&S expects strong growth in export markets for both foreign subsidiaries over the coming year. However, growth is projected to slow down in the longer term due to concerns about possible industry overcapacity – if many companies expand at once – or if global economic growth slows down again.',
          'The next two-year forecast will be issued in one year from now.',
        ],
      },
    ],
  },

  /* ------------------------------------------------------------ Period 2 */
  {
    period: 2,
    deadline: '2026-03-05T11:59:00-07:00',
    leaderboard: {
      afterPeriod: 1,
      headline: 'After Period 1, Réveil International is leading with a stock price of $50.36.',
      rows: [
        { rank: 1, team: TEAMS.reveil, stockPrice: 50.36 },
        { rank: 2, team: TEAMS.serious, stockPrice: 42.58 },
        { rank: 3, team: TEAMS.redwood, stockPrice: 41.55 },
        { rank: 4, team: TEAMS.granite, stockPrice: 39.73 },
        { rank: 5, team: TEAMS.reiches, stockPrice: 30.85 },
      ],
    },
    oil: {
      endPrice: 36,
      commentary: ['Oil prices rose modestly, ending the quarter at $36 per barrel. This rise provided some relief to oil-producing countries, but was less welcome for corporate consumers, as higher energy costs put pressure on operating margins. Although continued industrial growth in China is expected to support higher oil prices later in the year, the consensus is that oil prices are unlikely to increase significantly over the next one or two quarters.'],
    },
    rates: {
      USD: { libor3m: 0.023, libor6m: 0.02325, longTerm: 0.0392 },
      EUR: { libor3m: 0.0325, libor6m: 0.033, longTerm: 0.0495 },
      JPY: { libor3m: 0.0275, libor6m: 0.0282, longTerm: 0.05 },
    },
    ratesCommentary: [
      'The 3-month dollar LIBOR and long-term loan rates rose slightly to 2.300% and 3.920%, respectively. Economists noted that the Fed’s expansionary monetary policy appears to have run its course, and that the Fed may already be tightening monetary policy to curb inflationary pressures as the economy shows signs of recovery.',
      'In contrast to the Fed, the ECB has not yet begun to tighten monetary policy. The 3-month euro LIBOR declined slightly, from 3.500% to 3.250%. Longer-term loan rates also eased, closing below 5.000% at 4.950% – welcome news for many European corporate borrowers. The ECB is not expected to announce any significant monetary policy changes over the next two quarters, suggesting there may still be some room for both short- and long-term rates to decline further. However, the prevailing view is that euro rates will remain relatively stable.',
      'Japanese yen rates declined, much like euro rates. The 3-month yen LIBOR fell sharply from 3.250% to 2.750%. The Bank of Japan’s continued monetary stimulus appears to be having a clear impact on money markets – there is no sign of a liquidity trap – but its effect on the long end of the yield curve remains limited. Long-term loan rates decreased only slightly, closing at 5.000%. Because short-term rates have fallen more significantly than long-term rates, some market participants expect that continued declines at the short end may eventually exert downward pressure on long-term rates as well.',
    ],
    spot: { startPeriod: 1, start: { usdPerEur: 1.2, jpyPerUsd: 110.0 }, end: { usdPerEur: 1.25, jpyPerUsd: 112.0 } },
    fxCommentary: [
      'Foreign exchange markets were relatively calm during the quarter. The euro strengthened slightly against the dollar, closing at $1.25/€. The Japanese yen weakened slightly against the dollar, closing at ¥112.00/$. As a result, the yen-euro cross rate shifted significantly, reflecting a net weakening of the yen – from ¥132/€ to ¥140/€.',
      'The dollar’s depreciation against the euro appears to reflect growing concerns about rising core U.S. inflation, which could exceed 2.0% over the coming year.',
    ],
    actual: {
      period: 1,
      markets: { germany: fig(21000, 82000, 1455), japan: fig(105000, 210000, 48100) },
      commentary: [
        'Period 1 brought a mix of positive and negative developments. Production volumes in both Germany and Japan exceeded forecasts, and prices in Japan were stronger than expected. However, prices in Germany were a significant disappointment, with actual prices coming in below forecasts. As a result, the German subsidiary’s profitability is under pressure.',
        'Cost conditions remain relatively stable. There were few noticeable increases in material or overhead costs in either Japan or Europe. However, inflationary pressures are expected to build and may eventually spill over into commodity and labor markets, regardless of central bank reassurances. At the same time, manufacturers could see improving operating margins as rising utilization rates reflect the strengthening economic recovery.',
      ],
    },
    outlookCommentary: ['Looking ahead, production volume forecasts remain unchanged. The industry Marketing Board (MB) continues to view the Japanese economy as being on a moderately strong recovery path. Its outlook for Germany is more cautious following the latest EU Consumer Sentiment Survey, which indicates declining optimism. If consumer spending levels off prematurely, it could place additional pressure on the German subsidiary’s profitability.'],
    forecast: { period: 2, markets: { germany: fig(23200, 88000, 1455), japan: fig(115500, 212000, 48500) } },
    range: { period: 3, markets: { germany: rng([24000, 27000], [90000, 94000], [1455, 1465]), japan: rng([116000, 130000], [220000, 235000], [48000, 50000]) } },
    tenderOutlook: 'Tender markets are now open. The market is expected to be looking for anywhere between 12,000 and 20,000 units tendered in Period 2, depending on how attractive bid rates are.',
  },

  /* ------------------------------------------------------------ Period 3 */
  {
    period: 3,
    deadline: '2026-03-17T11:59:00-07:00',
    leaderboard: {
      afterPeriod: 2,
      headline: 'After Period 2, Redwood is leading with a stock price of $98.40.',
      rows: [
        { rank: 1, team: TEAMS.redwood, stockPrice: 98.4 },
        { rank: 2, team: TEAMS.granite, stockPrice: 87.82 },
        { rank: 3, team: TEAMS.serious, stockPrice: 78.34 },
        { rank: 4, team: TEAMS.reiches, stockPrice: 71.35 },
        { rank: 5, team: TEAMS.reveil, stockPrice: 70.58 },
      ],
    },
    oil: {
      endPrice: 38,
      commentary: [
        'Oil prices continued to edge upward, with the spot price reaching $38 per barrel by the end of the quarter.',
        'The outlook remains mixed: demand is expected to increase slightly, but it is unclear whether OPEC will adjust its production in response to increased demand.',
      ],
    },
    rates: {
      USD: { libor3m: 0.0225, libor6m: 0.023, longTerm: 0.0382 },
      EUR: { libor3m: 0.03, libor6m: 0.0315, longTerm: 0.0485 },
      JPY: { libor3m: 0.025, libor6m: 0.0262, longTerm: 0.0455 },
    },
    ratesCommentary: [
      'Dollar interest rates declined slightly in Period 2. The Fed indicated that it is waiting for additional data on industrial production, sales volumes, and producer prices before potentially revising its outlook for dollar interest rates.',
      'In contrast, yen interest rates moved more noticeably, with long-term loan rates dropping 45 basis points to 4.550%. One senior market analyst noted that “the yen carry trade could see something of a rebirth in the coming year if the recent trend continues.” If yen interest rates fall further, some corporate borrowers may increasingly shift toward floating-rate debt in the expectation that interest rates have not yet reached their bottom.',
      'Euro-denominated interest rates declined – more significantly than dollar interest rates but less significantly than yen interest rates. Many market observers are waiting for renewed signs of stimulus from the ECB. Although the recent recession has passed, there are concerns that the recovery could stall without continued support. If the ECB moves to stimulate economic growth, euro-denominated interest rates could decline over the next six to 12 months.',
    ],
    spot: { startPeriod: 2, start: { usdPerEur: 1.25, jpyPerUsd: 110.0 }, end: { usdPerEur: 1.22, jpyPerUsd: 108.0 } },
    fxCommentary: [
      'The yen strengthened slightly against the dollar in Period 2, closing at ¥108/$. This appreciation has helped ease some of the political tensions between the U.S. and Japan as new trade negotiations begin. Although uncertainty remains regarding the new Japanese government’s priorities, analysts generally do expect significant policy changes that would materially affect the Japanese economy. A stronger yen is expected to reduce the cost of imported raw materials and goods, supporting the profitability of Japanese manufacturers that rely heavily on imported inputs.',
      'The dollar-euro exchange rate closed Period 2 at $1.22/€, a “reversion-to-the-mean” relative to the previous quarter. Currency traders are divided, with roughly half expecting the euro to strengthen and the other half expecting it to weaken, largely depending on their outlook for future interest rates.',
    ],
    actual: {
      period: 2,
      markets: { germany: fig(23500, 88000, 1460), japan: fig(115000, 215000, 48500) },
      commentary: [
        'In Germany, export sales volume was in line with the forecast, while domestic sales volumes and the domestic sales price were slightly higher than expected. In Japan, the domestic sales price was also in line with the forecast. Export sales volumes were stronger than expected, whereas domestic sales were slightly weaker than expected.',
        'The annual Economic Competition Report was recently released, highlighting the possibility of rising global manufacturing costs. There is growing concern that material costs could face upward pressure as economic conditions improve and outlooks strengthen in both the European and Japanese markets. In contrast, labor costs are not currently viewed as a major concern.',
      ],
    },
    tenderResult: {
      period: 2, unitsAvailable: 17000, bidders: 1, winner: null, unitsAwarded: 16000, price: 1350,
      text: 'In the tender market, 17,000 units were available. However, only one company submitted a bid for 16,000 units. The bid was accepted at a price of $1,350.',
    },
    outlookCommentary: ['The industry Marketing Board expects sales volume to continue growing but is more cautious about the outlook for prices, particularly in Germany.'],
    forecast: { period: 3, markets: { germany: fig(25800, 91000, 1460), japan: fig(122000, 225000, 49500) } },
    range: { period: 4, markets: { germany: rng([26000, 29000], [92000, 95000], [1460, 1480]), japan: rng([124000, 128000], [235000, 250000], [49500, 50000]) } },
  },

  /* ------------------------------------------------------------ Period 4 */
  {
    period: 4,
    deadline: '2026-03-24T11:59:00-07:00',
    leaderboard: {
      afterPeriod: 3,
      headline: 'After Period 3, the leaderboard remains unchanged, with Redwood still leading. However, the gap between teams has widened.',
      rows: [
        { rank: 1, team: TEAMS.redwood, stockPrice: 135.4 },
        { rank: 2, team: TEAMS.granite, stockPrice: 113.45 },
        { rank: 3, team: TEAMS.serious, stockPrice: 109.76 },
        { rank: 4, team: TEAMS.reiches, stockPrice: 74.69 },
        { rank: 5, team: TEAMS.reveil, stockPrice: 31.67 },
      ],
    },
    oil: {
      endPrice: 42,
      commentary: ['Oil prices increased by more than 10% to $42 per barrel in Period 3, driven by escalating tensions in the Middle East. With little expectation of a near-term easing of these tensions, oil prices are likely to remain elevated and continue to put pressure on margins over the next two quarters.'],
    },
    rates: {
      USD: { libor3m: 0.0225, libor6m: 0.023, longTerm: 0.0379 },
      EUR: { libor3m: 0.0275, libor6m: 0.029, longTerm: 0.0465 },
      JPY: { libor3m: 0.02, libor6m: 0.023, longTerm: 0.042 },
    },
    ratesCommentary: [
      'The direction of U.S. monetary policy came into sharper focus in Period 3, as the Fed chose to keep the federal funds rate unchanged. As a result, 3-month and 6-month dollar interest rates remained stable during the quarter. Long-term loan rates declined slightly from 3.820% to 3.790%.',
      'The Fed’s decision to maintain a cautious, wait-and-see approach reflects the desire to avoid actions that could undermine the ongoing economic recovery. Some economists even suggest that the Fed may lower interest rates further if signs of a slowdown emerge. In this context, many corporate borrowers are avoiding new fixed-rate debt in anticipation of potential declines in interest rates.',
      'In the eurozone, interest rate movements during Period 3 broadly mirrored those in the U.S., with a gradual decline across the yield curve of 20 to 25 basis points. The 3-month and 6-month euro-denominated LIBOR rates fell below 3%, closing at 2.750% and 2.900%, respectively – the lowest levels in over three years. Long-term loan rates declined to 4.650%. There are growing signs that corporate demand in Europe may be softening, with slowing industrial production. While some analysts interpret these developments as indicative of a period of slower growth, others are concerned about the risk of a more pronounced downturn. Nevertheless, low interest rates continue to support expectations that the economic recovery will persist.',
      'In Japan, interest rates declined more sharply than in the eurozone during Period 3, amid speculation that the Bank of Japan has been actively pushing interest rates lower – with considerable success. The 3-month yen-denominated LIBOR rates fell by 50 basis points to 2.000%, and the 6-month and long-term loan rates dropped by more than 30 basis points to 2.300% and 4.200%, respectively. With long-term loan rates reaching a two-year low, corporate borrowers have moved quickly to lock in favorable interest rates ahead of a potential rebound. However, most analysts believe the Bank of Japan is unlikely to support significantly lower interest rates in the current environment.',
    ],
    spot: { startPeriod: 3, start: { usdPerEur: 1.22, jpyPerUsd: 108.0 }, end: { usdPerEur: 1.12, jpyPerUsd: 100.0 } },
    fxCommentary: [
      'Exchange rate movements were significant in Period 3, with the dollar weakening against both the euro and the yen.',
      'The euro appreciated by 8.2%, closing the quarter at $1.12/€. This brought it back within its medium-term trading range, a development viewed by technical analysts as stabilizing.',
      'The yen appreciated by 7.4%, closing the quarter at ¥100/$. This appreciation was unwelcome from the Bank of Japan’s perspective, as Japanese manufacturers were already facing margin pressure from rising oil prices. A stronger yen is unlikely to support exports in the near term, and some currency analysts are questioning whether the Bank of Japan may intervene to weaken it.',
    ],
    actual: {
      period: 3,
      markets: { germany: fig(26000, 90000, 1465), japan: fig(120000, 225000, 49000) },
      commentary: [
        'Market volumes and prices in Period 3 were largely in line with expectations. However, sales volume growth slowed during the second-half of the quarter, leading to downward revisions in forecasts.',
        'The annual Economic Competition Report was recently released, pointing to the potential for rising global manufacturing costs, particularly if oil prices continue to increase. In contrast, labor costs are not currently seen as a significant concern.',
      ],
    },
    tenderResult: {
      period: 3, unitsAvailable: 15000, bidders: 3, winner: TEAMS.reiches, unitsAwarded: 15000, price: 1300,
      text: 'The tender market was more active in Period 3, with three FORAD companies submitting bids. Reiches Inc. was awarded all 15,000 available units at $1,300 per unit.',
    },
    outlookCommentary: ['The FORAD Marketing Board is currently preparing its next two-year forecast, which will be released after Period 4. While volume growth had previously been expected to accelerate, the slowdown in Period 3 has moderated expectations, and the outlook has become somewhat more bearish.'],
    forecast: { period: 4, markets: { germany: fig(27000, 91000, 1470), japan: fig(125000, 240000, 49500) } },
    range: { period: 5, markets: { germany: rng([28000, 31000], [92000, 95000], [1470, 1480]), japan: rng([130000, 134000], [245000, 255000], [50000, 52000]) } },
    tenderOutlook: 'The demand in the tender market is expected to remain unchanged in Period 4.',
  },

  /* ------------------------------------------------------------ Period 5 */
  {
    period: 5,
    deadline: '2026-03-31T11:59:00-07:00',
    leaderboard: {
      afterPeriod: 4,
      headline: 'After Period 4, the leaderboard remains unchanged, with Redwood still leading, with a stock price of $137.46.',
      rows: [
        { rank: 1, team: TEAMS.redwood, stockPrice: 137.46 },
        { rank: 2, team: TEAMS.granite, stockPrice: 119.21 },
        { rank: 3, team: TEAMS.serious, stockPrice: 98.39 },
        { rank: 4, team: TEAMS.reiches, stockPrice: 75.9 },
        { rank: 5, team: TEAMS.reveil, stockPrice: 45.89 },
      ],
    },
    oil: {
      endPrice: 46,
      commentary: ['Oil prices rose 9.5% in Period 4, driven by continued tensions in the Middle East. Brent crude closed the quarter at $46 per barrel. While recent progress in political negotiations offers some hope of easing tensions, markets remain cautious.'],
    },
    rates: {
      USD: { libor3m: 0.0225, libor6m: 0.02325, longTerm: 0.0385 },
      EUR: { libor3m: 0.0225, libor6m: 0.023, longTerm: 0.0405 },
      JPY: { libor3m: 0.02, libor6m: 0.021, longTerm: 0.04 },
    },
    ratesCommentary: [
      'U.S. dollar rates were stable to slightly higher in Period 4. The 3-month LIBOR held at 2.250%, while the 6-month LIBOR edged up to 2.325%. The long-term loan rate increased more noticeably to 3.850%. With oil prices rising, markets are increasingly pricing in the possibility of a pre-emptive tightening of monetary policy by the Fed, reinforcing expectations of upward pressure on interest rates.',
      'Euro rates declined sharply across the curve in Period 4. The 3-month and 6-month LIBOR fell to 2.250% and 2.300%, respectively, while the long-term loan rate dropped to 4.050%. The ECB remains under pressure, as corporates argue that borrowing costs are constraining economic recovery. Further interest rate cuts are expected if business activity does not strengthen.',
      'Yen rates showed a mixed but downward-leaning pattern in Period 4. The 3-month rate held at 2.000%, while the 6-month and long-term loan rate declined to 2.100% and 4.000%, respectively. While some expect the Bank of Japan to resume easing – leading to lower interest rates – others anticipate the status quo, citing inflationary pressures linked to higher oil prices.',
    ],
    spot: { startPeriod: 4, start: { usdPerEur: 1.12, jpyPerUsd: 100.0 }, end: { usdPerEur: 1.09, jpyPerUsd: 102.0 } },
    fxCommentary: ['Foreign exchange markets reflected the widening interest rate differentials in Period 4. The dollar strengthened against both the euro and the yen.'],
    actual: {
      period: 4,
      markets: { germany: fig(25100, 90000, 1460), japan: fig(125000, 240000, 49500) },
      commentary: [
        'Business activity was stronger in Japan than in Germany in Period 4.',
        'Most notably – and somewhat concerning – the German subsidiary experienced declines in both domestic sales price and volumes, and both subsidiaries saw a deterioration in operating profit margins during the quarter.',
      ],
    },
    tenderResult: {
      period: 4, unitsAvailable: 20000, bidders: 2, winner: TEAMS.serious, unitsAwarded: 20000, price: 1280,
      text: 'Two companies submitted bids in Period 4. Serious Business was awarded all 20,000 available units at $1,280 per unit.',
    },
    outlookCommentary: [
      'The FORAD Marketing Board has released its updated two-year market outlook, surprising many with a more bearish stance. It indicated that sales volumes, prices, and margins are likely to remain under pressure in the short run.',
    ],
    forecast: { period: 5, markets: { germany: fig(25100, 90000, 1460), japan: fig(130000, 245000, 49500) } },
    range: { period: 6, markets: { germany: rng([25000, 26000], [90000, 92000], [1460, 1480]), japan: rng([135000, 145000], [250000, 265000], [50000, 52000]) } },
    twoYear: [
      {
        kind: 'table',
        title: 'Updated two-year market outlook',
        note: 'Thousand units, as published in the Period 5 report.',
        periods: [7, 8, 9, 10, 11, 12],
        rows: [
          { label: 'German domestic sales', values: [26.0, 26.5, 27.0, 28.0, 29.0, 30.0] },
          { label: 'German export sales', values: [92.0, 93.0, 94.5, 95.5, 96.5, 98.0] },
          { label: 'Japanese domestic sales', values: [135.0, 137.5, 140.0, 142.0, 146.0, 150.0] },
          { label: 'Japanese export sales', values: [250.0, 255.0, 260.0, 280.0, 310.0, 350.0] },
        ],
        commentary: ['The longer-run outlook is somewhat more constructive, though a divergence in growth momentum is expected. Japan is likely to be the primary driver of sales volume expansion, particularly through exports, while Germany is expected to remain on a more moderate growth trajectory.'],
      },
    ],
  },

  /* ------------------------------------------------------------ Period 6 */
  {
    period: 6,
    deadline: '2026-04-07T11:59:00-07:00',
    leaderboard: {
      afterPeriod: 5,
      headline: 'After Period 5, the leaderboard remains unchanged, with Redwood maintaining its lead with a stock price of $126.06. All companies saw a decline in stock prices, reflecting challenging economic conditions amid rising oil prices.',
      rows: [
        { rank: 1, team: TEAMS.redwood, stockPrice: 126.06 },
        { rank: 2, team: TEAMS.granite, stockPrice: 105.78 },
        { rank: 3, team: TEAMS.serious, stockPrice: 83.62 },
        { rank: 4, team: TEAMS.reiches, stockPrice: 54.5 },
        { rank: 5, team: TEAMS.reveil, stockPrice: 25.97 },
      ],
    },
    oil: {
      endPrice: 50,
      commentary: ['With political negotiations in the Middle East showing limited progress, oil prices continued their upward trajectory in Period 5, reaching $50 per barrel by the end of the quarter. Market participants now broadly expect oil prices to remain above this level over the next two quarters, reflecting persistent supply-side uncertainty. This sustained elevation in oil prices is likely to exert continued pressure on input costs, particularly for energy-intensive operations, and may weigh on margins.'],
    },
    rates: {
      USD: { libor3m: 0.025, libor6m: 0.02625, longTerm: 0.0395 },
      EUR: { libor3m: 0.0225, libor6m: 0.02325, longTerm: 0.04 },
      JPY: { libor3m: 0.0225, libor6m: 0.0235, longTerm: 0.041 },
    },
    ratesCommentary: [
      'U.S. dollar interest rates edged up across the curve in Period 5, with short-term LIBOR rates reaching 2.500%–2.625% and long-term loan rates approaching 4.000%. This upward shift reflects tightening financial conditions amid persistent inflationary pressures, partly driven by rising oil prices. Higher energy prices are feeding into higher price levels, reinforcing expectations that monetary policy will remain relatively restrictive. The resulting increase in financing costs may weigh on investment decisions, particularly for capital-intensive activities, while also strengthening the dollar’s appeal from a yield perspective.',
      'Euro interest rates moved less than U.S. interest rates in Period 5, reflecting the presence of opposing forces. While the ECB, like the Fed, is seeing inflationary pressures, economic activity in the Eurozone remains comparatively subdued. As a result, the ECB chose to keep its benchmark rate unchanged. Notably, the long-term loan rate declined by 5 basis points to 4.000%, suggesting increased market caution regarding the medium-term growth outlook and reinforcing expectations of a more measured monetary policy path than in the U.S.',
      'Yen interest rates increased modestly in Period 5 but remain the highest at the long end of the curve, with the long-term loan rate exceeding 4.000%. As Japan is highly dependent on energy imports, sustained elevated oil prices are likely to exert more pronounced pressure on both the trade balance and input costs. The rise in long-term rates may start affecting financing conditions, particularly for longer-duration investments that may become more expensive to fund.',
    ],
    spot: { startPeriod: 5, start: { usdPerEur: 1.09, jpyPerUsd: 102.0 }, end: { usdPerEur: 1.07, jpyPerUsd: 108.0 } },
    fxCommentary: [
      'The dollar appreciated modestly against the euro in Period 5, with the spot rate moving from $1.09 per euro to $1.07 per euro. This mainly reflects the relatively stronger economic momentum in the U.S. relative to the Eurozone. Looking ahead, the dollar may retain a slight upward bias, though any stabilization in oil prices or improvement in European economic activity could limit further euro weakness.',
      'The dollar appreciated more significantly against the yen in Period 5, with the spot rate moving from ¥102 per dollar to ¥108 per dollar. This mainly reflects Japan’s vulnerability to elevated oil prices and lower short-term interest rates relative to the U.S. The weaker yen should support export competitiveness and sales volumes. Looking ahead, the yen may remain under pressure, although any monetary policy tightening or improvement in trade balance could moderate this trend.',
    ],
    actual: {
      period: 5,
      markets: { germany: fig(25700, 92000, 1475), japan: fig(132000, 252500, 50500) },
      commentary: [
        'Japanese operations showed strong momentum in Period 5, with increases in both domestic sales volume and price. Exports also increased, supported by the depreciation of the yen. Looking ahead, the weaker yen should continue to support exports, although higher oil prices and rising interest rates may put pressure on margins.',
        'German operations experienced more modest growth, reflecting weaker demand in the Eurozone and pressure from elevated oil prices. The modest depreciation of the euro provided limited support to exports. Looking ahead, growth is likely to remain subdued.',
      ],
    },
    tenderResult: {
      period: 5, unitsAvailable: 18000, bidders: null, winner: TEAMS.reveil, unitsAwarded: 18000, price: 1200,
      text: 'Regarding the tender sales, Réveil International was awarded all 18,000 available units at $1,200 per unit.',
    },
    outlookCommentary: [],
    forecast: { period: 6, markets: { germany: fig(26200, 93000, 1480), japan: fig(136500, 262000, 51200) } },
    range: { period: 7, markets: { germany: rng([26500, 27500], [93500, 96000], [1480, 1495]), japan: rng([138000, 142000], [265000, 275000], [51500, 53000]) } },
    tenderOutlook: 'Looking ahead, the volume of units available is expected to be between 18,000 and 22,000 units.',
  },
];

export function bimrFor(period: number): BimrReport | undefined {
  return BIMR.find((r) => r.period === period);
}

/** Reports published up to the current period, newest first. */
export function publishedBimr(currentPeriod: number): BimrReport[] {
  return BIMR.filter((r) => r.period <= currentPeriod).sort((a, b) => b.period - a.period);
}

/** Closed periods whose actual market results have been published, newest first. */
export function closedPeriods(currentPeriod: number): number[] {
  return publishedBimr(currentPeriod).map((r) => r.actual.period);
}

/** The report that published a given period's actual results (the next period's BIMR). */
export function reportWithActualsFor(period: number): BimrReport | undefined {
  return BIMR.find((r) => r.actual.period === period);
}
