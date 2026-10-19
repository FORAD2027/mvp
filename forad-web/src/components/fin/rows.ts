/**
 * Statement layouts, line by line, as in FORAD 2.0's statement definition files
 * (BSGLAssumptions, ISGLAssumptions, CFStatement, BSUSHoldingGLAssumptions, ISUSHoldingGLAssumptions,
 * USCFStatement, BSConsGLAssumptions, ISConsGLAssumptions).
 */
export type RowKind = 'h' | 'i' | 's' | 't' | 'gap';
export interface Row {
  kind: RowKind;
  label: string;
  key?: string;
  /** Show the value with the opposite sign (e.g. accumulated depreciation, expenses shown as deductions). */
  neg?: boolean;
  indent?: boolean;
}

const h = (label: string): Row => ({ kind: 'h', label });
const i = (label: string, key: string, neg = false, indent = false): Row => ({ kind: 'i', label, key, neg, indent });
const s = (label: string, key: string): Row => ({ kind: 's', label, key });
const t = (label: string, key: string): Row => ({ kind: 't', label, key });
const gap: Row = { kind: 'gap', label: '' };

export const SUB_BS: Row[] = [
  h('Assets'),
  i('Cash', 'Cash'), i('Marketable securities', 'MarketableSecurities'), i('Inter-company loan', 'IntraGroupLoan'),
  i('Accounts receivable', 'AccountsReceivable'), i('Inter-company receivable', 'IntraGroupReceivable'), i('Inventory', 'Inventory'),
  s('Current assets', 'CurrentAssets'),
  i('Gross fixed assets', 'GrossFixedAssets'), i('Accumulated depreciation', 'Depreciation', true), s('Net fixed assets', 'NetFixedAssets'),
  i('Other assets', 'OtherAssets'), i('Deferred charges', 'DeferredCharges'),
  t('Total assets', 'TotalAssets'),
  gap,
  h('Liabilities'),
  i('Accounts payable', 'AccountsPayable'), i('Inter-company payable', 'IntraGroupPayable'), i('Other payables', 'OtherPayables'),
  i('Overdraft', 'Overdraft'), i('Inter-company debt', 'IntraGroupDebt'), i('Short-term debt', 'ShortTermDebt'),
  s('Current liabilities', 'CurrentLiabilities'),
  i('Long-term floating-rate debt', 'FloatingRateDebt'), i('Long-term fixed-rate debt', 'FixedRateDebt'),
  s('Long-term liabilities', 'LongTermLiabilities'),
  t('Total liabilities', 'TotalLiabilities'),
  gap,
  h("Shareholders' equity"),
  i('Capital stock', 'CapitalStock'), i('Cumulative translation adjustment', 'CTA'), i('Retained earnings', 'RetainedEarnings'),
  s("Total shareholders' equity", 'Equity'),
  t("Liabilities and shareholders' equity", 'LiabilitiesAndEquity'),
];

export const SUB_IS: Row[] = [
  i('Domestic revenues', 'DomesticRevenues'), i('Export revenues', 'ExportRevenues'), i('Inter-company revenues', 'InterCompanyRevenues'),
  s('Total revenues', 'TotalRevenues'),
  i('Cost of goods sold', 'COGS', true), i('Selling, general and administrative', 'SGA', true), i('Depreciation expense', 'DepreciationExpense', true),
  s('Operating income', 'OperatingIncome'),
  i('FX gain/(loss)', 'FXGain'), i('Oil gain/(loss)', 'OilGain'), i('Other, net', 'OtherNet'),
  s('Earnings before interest and taxes', 'EBIT'),
  i('Interest income', 'InterestIncome'), i('Interest expense', 'InterestExpense', true),
  s('Earnings before taxes', 'EBT'),
  i('Income taxes', 'IncomeTaxes', true), i('Withholding taxes', 'WithholdingTaxes', true),
  t('Net income', 'NetIncome'),
  gap,
  i('Dividends paid to the holding company', 'DividendsPaid'),
];

export const SUB_CF: Row[] = [
  h('Operating activities'),
  i('Net income', 'NetIncome'),
  i('Depreciation', 'Depreciation', false, true), i('Deferred charges', 'DeferredCharges', false, true),
  i('Accounts receivable', 'AccountsReceivable', false, true), i('Inter-company receivable', 'IntraGroupReceivable', false, true),
  i('Inventory', 'Inventory', false, true), i('Accounts payable', 'AccountsPayable', false, true),
  i('Inter-company payable', 'IntraGroupPayable', false, true), i('Other payables', 'OtherPayables', false, true),
  s('Net cash from operations', 'CashFromOperations'),
  h('Investing activities'),
  i('Acquisition of fixed assets', 'AcquisitionOfFixedAssets'), i('Proceeds from/(purchases of) marketable securities', 'MarketableSecurities'),
  i('Inter-company loan to/(repayment from) parent', 'IntraGroupLoan'),
  s('Net cash from investing', 'CashFromInvesting'),
  h('Financing activities'),
  i('Overdraft', 'Overdraft'), i('Short-term debt borrowing/(repayment)', 'ShortTermDebt'), i('Inter-company debt borrowing/(repayment)', 'IntraGroupDebt'),
  i('Fixed-rate debt borrowing/(repayment)', 'FixedRateDebt'), i('Floating-rate debt borrowing/(repayment)', 'FloatingRateDebt'),
  i('Dividends paid, net', 'DividendsPaid'),
  s('Net cash from financing', 'CashFromFinancing'),
  gap,
  s('Net change in cash', 'ChangeInCash'), i('Cash, beginning of period', 'BeginningCash'), t('Cash, end of period', 'EndingCash'),
];

export const US_BS: Row[] = [
  h('Assets'),
  i('Cash', 'Cash'), i('Marketable securities', 'MarketableSecurities'), i('Inter-company loans', 'IntraGroupLoan'),
  s('Current assets', 'CurrentAssets'),
  i('Other assets', 'OtherAssets'), i('Deferred charges', 'DeferredCharges'), i('Investments in foreign subs', 'InvestmentsInSubs'),
  s('Long-term assets', 'LongTermAssets'),
  t('Total assets', 'TotalAssets'),
  gap,
  h('Liabilities'),
  i('Other payables', 'OtherPayables'), i('Overdraft', 'Overdraft'), i('Inter-company debt', 'IntraGroupDebt'), i('Short-term debt', 'ShortTermDebt'),
  s('Current liabilities', 'CurrentLiabilities'),
  i('Long-term floating-rate debt', 'FloatingRateDebt'), i('Long-term fixed-rate debt', 'FixedRateDebt'), i('Zero-coupon convertible bond', 'ZeroCoupon'),
  s('Long-term liabilities', 'LongTermLiabilities'),
  t('Total liabilities', 'TotalLiabilities'),
  gap,
  h("Shareholders' equity"),
  i('Capital stock', 'CapitalStock'), i('Additional paid-in capital', 'APIC'), i('Treasury stock', 'TreasuryStock'),
  i('Other comprehensive income', 'OCI'), i('Retained earnings', 'RetainedEarnings'),
  s("Total shareholders' equity", 'Equity'),
  t("Liabilities and shareholders' equity", 'LiabilitiesAndEquity'),
];

export const US_IS: Row[] = [
  i('Third-party royalties', 'Royalties'), i('Foreign-source income', 'ForeignSourceIncome'),
  i('Inter-company dividends', 'ICDividends', false, true), i('Inter-company interest', 'ICInterest', false, true),
  s('Total revenues', 'TotalRevenues'),
  i('Selling, general and administrative', 'SGA', true),
  s('Operating income', 'OperatingIncome'),
  i('FX gain/(loss)', 'FXGain'), i('Other income/(expense)', 'OtherIncome'),
  s('Earnings before interest and taxes', 'EBIT'),
  i('Interest income', 'InterestIncome'), i('Interest expense', 'InterestExpense', true),
  s('Earnings before taxes', 'EBT'),
  i('Taxes', 'Taxes', true),
  s('Net income before earnings in subs', 'NetIncomeBeforeSubs'),
  i('Equity in earnings of subs', 'EquityInEarningsOfSubs'),
  t('Net income', 'NetIncome'),
  gap,
  i('Dividends paid to shareholders', 'DividendsPaid'),
];

export const US_CF: Row[] = [
  h('Operating activities'),
  i('Net income', 'NetIncome'),
  i('Undistributed earnings of subs', 'EquityInSubs', false, true), i('Zero-coupon bond accretion', 'ZeroCouponAccretion', false, true),
  i('Deferred charges', 'DeferredCharges', false, true), i('Other payables', 'OtherPayables', false, true),
  s('Net cash from operations', 'CashFromOperations'),
  h('Investing activities'),
  i('Proceeds from/(purchases of) marketable securities', 'MarketableSecurities'),
  i('Inter-company loan to/(repayment from) subsidiaries', 'IntraGroupLoan'),
  s('Net cash from investing', 'CashFromInvesting'),
  h('Financing activities'),
  i('Overdraft', 'Overdraft'), i('Short-term debt borrowing/(repayment)', 'ShortTermDebt'), i('Inter-company debt borrowing/(repayment)', 'IntraGroupDebt'),
  i('Fixed-rate debt borrowing/(repayment)', 'FixedRateDebt'), i('Floating-rate debt borrowing/(repayment)', 'FloatingRateDebt'),
  i('Zero-coupon convertible issue/(repayment)', 'ZeroCoupon'), i('Common stock', 'CommonStock'), i('Repurchase of common stock', 'Repurchase'),
  i('Dividends paid, net', 'DividendsPaid'),
  s('Net cash from financing', 'CashFromFinancing'),
  gap,
  s('Net change in cash', 'ChangeInCash'), i('Cash, beginning of period', 'BeginningCash'), t('Cash, end of period', 'EndingCash'),
];

export const CONS_BS: Row[] = [
  h('Assets'),
  i('Cash', 'Cash'), i('Marketable securities', 'MarketableSecurities'), i('Accounts receivable', 'AccountsReceivable'), i('Inventory', 'Inventory'),
  s('Current assets', 'CurrentAssets'),
  i('Gross fixed assets', 'GrossFixedAssets'), i('Accumulated depreciation', 'Depreciation', true), s('Net fixed assets', 'NetFixedAssets'),
  i('Other assets', 'OtherAssets'), i('Deferred charges', 'DeferredCharges'),
  t('Total assets', 'TotalAssets'),
  gap,
  h('Liabilities'),
  i('Accounts payable', 'AccountsPayable'), i('Other payables', 'OtherPayables'), i('Overdraft', 'Overdraft'), i('Short-term debt', 'ShortTermDebt'),
  s('Current liabilities', 'CurrentLiabilities'),
  i('Long-term floating-rate debt', 'FloatingRateDebt'), i('Long-term fixed-rate debt', 'FixedRateDebt'), i('Zero-coupon convertible bond', 'ZeroCoupon'),
  s('Long-term liabilities', 'LongTermLiabilities'),
  t('Total liabilities', 'TotalLiabilities'),
  gap,
  h("Shareholders' equity"),
  i('Capital stock', 'CapitalStock'), i('Additional paid-in capital', 'APIC'), i('Treasury stock', 'TreasuryStock'),
  i('Retained earnings', 'RetainedEarnings'), i('Cumulative translation adjustment', 'CTA'),
  s("Total shareholders' equity", 'Equity'),
  t("Liabilities and shareholders' equity", 'LiabilitiesAndEquity'),
];

export const CONS_IS: Row[] = [
  i('Domestic revenues', 'DomesticRevenues'), i('Export revenues', 'ExportRevenues'), i('Royalties', 'OtherRevenues'),
  s('Total revenues', 'TotalRevenues'),
  i('Cost of goods sold', 'COGS', true), i('Selling, general and administrative', 'SGA', true), i('Depreciation expense', 'DepreciationExpense', true),
  s('Operating income', 'OperatingIncome'),
  i('FX gain/(loss)', 'FXGain'), i('Oil gain/(loss)', 'OilGain'), i('Other, net', 'OtherNet'),
  s('Earnings before interest and taxes', 'EBIT'),
  i('Interest income', 'InterestIncome'), i('Interest expense', 'InterestExpense', true),
  s('Earnings before taxes', 'EBT'),
  i('Income taxes', 'IncomeTaxes', true), i('Withholding taxes', 'WithholdingTaxes', true),
  t('Net income', 'NetIncome'),
];
