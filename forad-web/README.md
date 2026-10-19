# FORAD 2.0 — web app (MVP)

Browser version of the FORAD multinational finance simulation. It replaces the Windows-only VB6 program (FORAD 2.0 / v2.1, Tower46, 2013).

## Run it

Requires Node 18+.

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # production build in dist/
npm run build:preview  # single self-contained HTML in dist-preview/ (for sharing a preview)
```

## What's built (backlog IDs from `FORAD Feature Backlog.xlsx`)

| ID | Feature | Status |
|---|---|---|
| S-01 | Sign in, team, period and deadline in the header | Sign-in is a placeholder: "Sign in" goes straight to the dashboard. The real login flow comes later. |
| S-02 | Main (hamburger) menu: Market Reports & Results, Company execution | Done |
| S-03 | Period market report, archived by period | Done, with real Period 1–4 data from the FORAD 2.0 `Assumptions.txt` |
| S-04 | Decision workspace: country tabs (US Holding, Japan, Germany), each with Operations, Investing, Financing and Hedging per foreign currency, plus Review & submit | Done. Each section lists the decisions it will hold; their inputs arrive with S-06 to S-10. |
| S-05 | Forecasts: FX, oil, volumes, prices, forecast EPS, defaulting to last period's actuals | Done. Placed where FORAD 2.0 kept them: oil/sales/price in Japan and Germany Operations, end-of-period FX in US Hedging (shown read-only in the subsidiaries' Hedging), EPS in US Operations. No guidance or hints by design; only impossible values are flagged. |
| — | Student dashboard (period checklist, market at a glance, what changed) | Done |
| — | Instructor console | Placeholder page |

Results (S-16), submit (S-15) and the stress test lab are placeholders for now.
The decision draft is saved in the browser on this device (`localStorage`); team-wide server autosave is S-14.
The BIMR reports publish no EPS, so Forecast EPS has no default until team results are connected.

## Where things live

```
src/
  data/operations.ts      S-06 operations model: defaults, live inventory line, FORAD 2.0 limits
  data/teamPosition.ts    Team's last-period position (SAMPLE until team results are connected, S-16)
  data/bimr.ts            The six real BIMR period reports (Spring 2026), transcribed from the PDFs
  data/session.ts         Demo course/team/period/deadline used until real sign-in exists
  data/actuals.ts         Actual outcomes of closed periods (defaults for the next period's predictions)
  data/decision.ts        Forecast model, defaults and validation rules
  data/predictionFields.ts Labels, units and help text for each forecast
  lib/decisionStore.tsx   Team decision draft (saved on this device for now)
  components/NumberField  Numeric input with help, reset and inline errors (quick-fill supported, unused for now)
  pages/student/workspace structure.ts (countries and sections), Workspace (tabs), SectionView, ReviewStep
  lib/router.tsx          Tiny hash router (#/student/reports?tab=market&p=3)
  lib/auth.tsx            Placeholder sign-in (role kept in sessionStorage)
  lib/marketDiff.ts       "What changed since last period"
  lib/format.ts           Number, %, currency, date and countdown formatting
  components/             App header (S-01) and main menu (S-02)
  pages/SignIn.tsx
  pages/student/          Dashboard, Market reports & results, Company execution
  pages/instructor/       Instructor console (placeholder)
  styles.css              Design tokens (light + dark) and all styles
```

## Notes

- Market reports show forward-looking market information only. Results (actual sales vs forecast, tender awards, stock prices) sit in the Results tab and appear only for periods up to `resultsReleasedThrough` in `src/data/session.ts`, which the instructor console will control. The open period is always listed as pending.
- The top bar's "Period N market report" button opens the current report as a pop-up from any page.
- All market data comes from `bimr.ts`. A period's actuals are what the next report published, so nothing unpublished is shipped to students.
- Source quirks kept as published: P1 has no oil price figure; the P3 report gives ¥110 at the start of Period 2 while P2 gives ¥112 at the end of Period 1. Typos ("Decision #3" in P4–P6, "Tuseday") are corrected. Two-year chart values in P1 are read off the bar chart (nearest 500 units).
- Legacy file-download instructions and the instructor email in the reports are omitted.
- FX is shown the way students quote it: JPY per USD and USD per EUR. The legacy file stores EUR per USD.
- The demo is set in Period 6 with the clock pinned to 3 Apr 2026 (`demoNow` in `src/data/session.ts`) so the P6 deadline shows as open.
- Market commentary is placeholder text until the instructor console can author it.

## Operations (S-06)

Japan and Germany Operations follow the FORAD 2.0 screens: one table per subsidiary with last period's actual next to this period's decision, rows in the original order. Calculated rows (beginning/ending inventory, sales volume, sales from current production, inter-company units, oil exposure) update as you type. Limits are shown on the field and inputs are never reset. Last-period team figures in `teamPosition.ts` are a consistent sample built on the real Period 5 market until team results exist. Open rule questions are listed on the 'S-06 Operations spec' sheet of the feature backlog.

## Dashboard (Summary and Results reports)

The Dashboard is FORAD 2.0's Summary screen: US Holding, Consolidated, Japanese and German boxes with the inter-company flows between them, for the Period N forecast or the Period N−1 actual. Tabs open the Results reports: consolidated balance sheet and income statement, PE scoring, and per unit the balance sheet (local and USD), income statement (local and USD) and cash flow (local). Line items follow the program's statement definition files.

The figures in `src/data/financialsSample.json` are SAMPLE data, generated by a simplified roll-forward (`tools/generate_sample_financials.py`) so every statement ties: balance sheets balance, cash flow ending cash equals balance-sheet cash, consolidated equals the units less inter-company items, and holding-company equity equals consolidated equity. They do not yet recalculate from decisions; that needs the engine (P-01). PE scores marked 'sample' are placeholders until the scoring tables are confirmed (P-03).
