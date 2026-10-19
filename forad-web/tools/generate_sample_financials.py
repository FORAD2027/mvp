"""Sample financial statements for Team 3, Periods 5 (actual) and 6 (forecast).
Simplified FORAD-style roll-forward so every identity holds:
BS balances, CF ending cash = BS cash, consolidated = sum of units less inter-company,
US equity (equity method) = consolidated equity. Units in millions of local currency."""
import json, math

RATES = {  # yen per USD and USD per EUR
 4: dict(jpy_end=102.0, eur_end=1.09),
 5: dict(jpy_beg=102.0, jpy_end=108.0, jpy_avg=105.0, eur_beg=1.09, eur_end=1.07, eur_avg=1.08, oil_avg=48.0, jlibor=0.0225, ulibor=0.0250, elibor=0.0225),
 6: dict(jpy_beg=108.0, jpy_end=108.0, jpy_avg=108.0, eur_beg=1.07, eur_end=1.07, eur_avg=1.07, oil_avg=50.0, jlibor=0.0225, ulibor=0.0250, elibor=0.0225),
}
HIST = dict(jpy=110.0, eur=1.20)  # rate when capital stock was issued
SHARES = 8.0  # millions

# --- operating drivers (match the web app's operations screens) ---
JP = {5: dict(dom=132000, exp=252500, ic_units=240000, price=50500, prod=600000, beg_units=100000, beg_cost=44000.0, capex_units=0, div=1000.0),
      6: dict(dom=132000, exp=252500, ic_units=240000, price=50500, prod=600000, div=1000.0, capex_units=0)}
DE = {5: dict(dom=25700, exp=92000, price=1475, prod=120000, beg_units=40000, beg_cost=1200.0, div=0.0, capex_units=0),
      6: dict(dom=25700, exp=92000, price=1475, prod=120000, div=0.0, capex_units=0)}
IC_PRICE = {5: 585.0, 6: 585.0}  # USD per unit
US = {5: dict(royalty=2.0, sga=0.6, div_ps=0.25), 6: dict(royalty=2.0, sga=0.6, div_ps=0.25)}

def tax_rate(payout, lo, hi, best):
    payout = max(0.0, min(1.0, payout))
    if payout <= best: return hi - (hi - lo) * payout / best
    return lo + (hi - lo) * (payout - best) / (1 - best)

def r2(x): return round(x, 4)

# ---------- opening balance sheets, end of Period 4 ----------
jp_bs = dict(Cash=3000.0, MarketableSecurities=0.0, IntraGroupLoan=0.0, AccountsReceivable=18500.0, IntraGroupReceivable=13700.0,
             Inventory=100000*44000/1e6, GrossFixedAssets=40000.0, Depreciation=14000.0, OtherAssets=0.0, DeferredCharges=0.0,
             AccountsPayable=11000.0, IntraGroupPayable=0.0, OtherPayables=900.0, Overdraft=0.0, IntraGroupDebt=0.0, ShortTermDebt=5000.0,
             FloatingRateDebt=10000.0, FixedRateDebt=17500.0, CapitalStock=11000.0)
de_bs = dict(Cash=10.0, MarketableSecurities=0.0, IntraGroupLoan=0.0, AccountsReceivable=170.0, IntraGroupReceivable=0.0,
             Inventory=40000*1200/1e6, GrossFixedAssets=150.0, Depreciation=50.0, OtherAssets=0.0, DeferredCharges=0.0,
             AccountsPayable=6.0, IntraGroupPayable=134.4/1.09, OtherPayables=3.0, Overdraft=0.0, IntraGroupDebt=20/1.09, ShortTermDebt=40.0,
             FloatingRateDebt=30.0, FixedRateDebt=25.0, CapitalStock=60.0)
for b in (jp_bs, de_bs):
    assets = b['Cash']+b['MarketableSecurities']+b['IntraGroupLoan']+b['AccountsReceivable']+b['IntraGroupReceivable']+b['Inventory']+b['GrossFixedAssets']-b['Depreciation']+b['OtherAssets']+b['DeferredCharges']
    liab = b['AccountsPayable']+b['IntraGroupPayable']+b['OtherPayables']+b['Overdraft']+b['IntraGroupDebt']+b['ShortTermDebt']+b['FloatingRateDebt']+b['FixedRateDebt']
    b['RetainedEarnings'] = assets - liab - b['CapitalStock']

def sub_period(name, p, bs0, d, r, beg_units, beg_cost):
    jp = name == 'japan'
    end = r['jpy_end'] if jp else 1/r['eur_end']        # local per USD at period end
    avg = r['jpy_avg'] if jp else 1/r['eur_avg']
    # unit cost (local currency)
    if jp:
        unit = 2*1800 + 2*44.2*avg + 4*r['oil_avg']*avg + 5*2450
        ic_rev = d['ic_units']*IC_PRICE[p]*avg/1e6           # Japan sells to Germany (USD invoiced)
        ic_cost_units = 0
    else:
        unit = 2*62 + 2*IC_PRICE[p]*avg + 2*27
        ic_rev = 0.0
    sold = d['dom'] + d['exp'] + (d['ic_units'] if jp else 0)
    prod = d['prod']
    end_units = beg_units + prod - sold
    avg_cost = (beg_units*beg_cost + prod*unit) / (beg_units + prod)
    excess_units = max(0, sold - beg_units)
    cogs = (sold*avg_cost + excess_units*unit*0.075)/1e6
    dom_rev = d['dom']*d['price']/1e6
    exp_rev = d['exp']*d['price']/1e6
    total_rev = dom_rev + exp_rev + ic_rev
    sga = total_rev*(0.07 if jp else 0.065)
    capex = d['capex_units']*(100000 if jp else 2000)/1e6
    gross_fa = bs0['GrossFixedAssets'] + capex
    dep = gross_fa/80
    op_inc = total_rev - cogs - sga - dep
    # FX on USD-denominated balances revalued from booking (avg) to end rate
    beg_rate = r['jpy_beg'] if jp else 1/r['eur_beg']
    usd_rec = (exp_rev + ic_rev)/avg                     # USD receivable (export + IC)
    if jp:
        usd_pay = (prod*2*44.2)/1e6                      # imported materials payable in USD
        fx_debt_usd = 0.0
    else:
        usd_pay = (prod*2*IC_PRICE[p])/1e6               # IC parts payable to Japan in USD
        fx_debt_usd = 20.0                               # IC debt from the US in USD, carried from last period
    fx = (usd_rec - usd_pay)*(end - avg) - fx_debt_usd*(end - beg_rate)
    oil_gain = 0.0
    ebit = op_inc + fx + oil_gain
    libor = r['jlibor'] if jp else r['elibor']
    int_exp = (bs0['ShortTermDebt']*(libor+0.01) + bs0['FloatingRateDebt']*(libor+0.015) + bs0['FixedRateDebt']*0.045)/4
    ic_int_usd = 0.0 if jp else 20.0*(r['ulibor']+0.005)/4
    int_exp += ic_int_usd*avg
    int_inc = 0.0
    ebt = ebit + int_inc - int_exp
    div = d['div']
    if jp: rate = tax_rate(div/ebt if ebt > 0 else 0, 0.25, 0.35, 0.65)
    else:  rate = tax_rate(div/ebt if ebt > 0 else 0, 0.45, 0.56, 0.56)
    inc_tax = max(0.0, ebt*rate)
    wht = 0.05*div + 0.05*ic_int_usd*avg
    ni = ebt - inc_tax - wht
    IS = dict(DomesticRevenues=dom_rev, ExportRevenues=exp_rev, InterCompanyRevenues=ic_rev, TotalRevenues=total_rev, COGS=cogs, SGA=sga,
              DepreciationExpense=dep, OperatingIncome=op_inc, FXGain=fx, OilGain=oil_gain, OtherNet=0.0, EBIT=ebit, InterestIncome=int_inc,
              InterestExpense=int_exp, EBT=ebt, IncomeTaxes=inc_tax, WithholdingTaxes=wht, NetIncome=ni, DividendsPaid=div,
              ICPurchases=(0.0 if jp else usd_pay*avg), ICUnits=(d['ic_units'] if jp else prod*2)/1e6)
    # closing balance sheet
    bs = dict(bs0)
    bs['AccountsReceivable'] = dom_rev + exp_rev/avg*end
    bs['IntraGroupReceivable'] = ic_rev/avg*end
    bs['Inventory'] = end_units*avg_cost/1e6
    bs['GrossFixedAssets'] = gross_fa
    bs['Depreciation'] = bs0['Depreciation'] + dep
    if jp:
        bs['AccountsPayable'] = prod*2*1800/1e6 + usd_pay*end
        bs['IntraGroupPayable'] = 0.0
    else:
        bs['AccountsPayable'] = prod*2*62/1e6
        bs['IntraGroupPayable'] = usd_pay*end
        bs['IntraGroupDebt'] = 20.0*end
    bs['OtherPayables'] = inc_tax                          # taxes paid on day 0 next period
    bs['RetainedEarnings'] = bs0['RetainedEarnings'] + ni - div
    # cash is the balancing item; overdraft if negative
    bs['Cash'] = 0.0; bs['Overdraft'] = 0.0
    assets = sum(bs[k] for k in ('MarketableSecurities','IntraGroupLoan','AccountsReceivable','IntraGroupReceivable','Inventory','GrossFixedAssets','OtherAssets','DeferredCharges')) - bs['Depreciation']
    liab_eq = sum(bs[k] for k in ('AccountsPayable','IntraGroupPayable','OtherPayables','IntraGroupDebt','ShortTermDebt','FloatingRateDebt','FixedRateDebt','CapitalStock','RetainedEarnings'))
    cash = liab_eq - assets
    if cash >= 0: bs['Cash'] = cash
    else: bs['Overdraft'] = -cash
    ops = dict(units_sold=sold, end_units=end_units, unit_cost=unit, avg_cost=avg_cost, excess_units=excess_units)
    return IS, bs, ops, avg_cost

def bs_totals(b):
    ca = b['Cash']+b['MarketableSecurities']+b['IntraGroupLoan']+b['AccountsReceivable']+b['IntraGroupReceivable']+b['Inventory']
    nfa = b['GrossFixedAssets']-b['Depreciation']
    ta = ca+nfa+b['OtherAssets']+b['DeferredCharges']
    cl = b['AccountsPayable']+b['IntraGroupPayable']+b['OtherPayables']+b['Overdraft']+b['IntraGroupDebt']+b['ShortTermDebt']
    ltl = b['FloatingRateDebt']+b['FixedRateDebt']
    eq = b['CapitalStock']+b.get('OCI',0)+b.get('CTA',0)+b['RetainedEarnings']
    return dict(CurrentAssets=ca, NetFixedAssets=nfa, TotalAssets=ta, CurrentLiabilities=cl, LongTermLiabilities=ltl, TotalLiabilities=cl+ltl, Equity=eq, LiabilitiesAndEquity=cl+ltl+eq)

def cash_flow(bs0, bs1, IS):
    d = lambda k: bs1[k]-bs0[k]
    cfo = IS['NetIncome'] + IS['DepreciationExpense'] + 0 - d('AccountsReceivable') - d('IntraGroupReceivable') - d('Inventory') + d('AccountsPayable') + d('IntraGroupPayable') + d('OtherPayables')
    capex = -d('GrossFixedAssets')
    cfi = capex - d('MarketableSecurities') - d('IntraGroupLoan')
    cff = d('Overdraft') + d('ShortTermDebt') + d('IntraGroupDebt') + d('FixedRateDebt') + d('FloatingRateDebt') - IS['DividendsPaid']
    return dict(NetIncome=IS['NetIncome'], Depreciation=IS['DepreciationExpense'], DeferredCharges=0.0,
                AccountsReceivable=-d('AccountsReceivable'), IntraGroupReceivable=-d('IntraGroupReceivable'), Inventory=-d('Inventory'),
                AccountsPayable=d('AccountsPayable'), IntraGroupPayable=d('IntraGroupPayable'), OtherPayables=d('OtherPayables'), CashFromOperations=cfo,
                AcquisitionOfFixedAssets=capex, MarketableSecurities=-d('MarketableSecurities'), IntraGroupLoan=-d('IntraGroupLoan'), CashFromInvesting=cfi,
                Overdraft=d('Overdraft'), ShortTermDebt=d('ShortTermDebt'), IntraGroupDebt=d('IntraGroupDebt'), FixedRateDebt=d('FixedRateDebt'),
                FloatingRateDebt=d('FloatingRateDebt'), DividendsPaid=-IS['DividendsPaid'], CashFromFinancing=cff,
                ChangeInCash=cfo+cfi+cff, BeginningCash=bs0['Cash'], EndingCash=bs1['Cash'])

def translate(bs, IS, end, avg, hist, re_usd_prev, ni_usd_prev=None, div_end=None):
    """Current-rate method. end/avg/hist are local per USD."""
    u = {k: v/end for k, v in bs.items() if k not in ('CapitalStock','RetainedEarnings')}
    u['CapitalStock'] = bs['CapitalStock']/hist
    u['RetainedEarnings'] = re_usd_prev
    tot = bs_totals(dict(u, CapitalStock=u['CapitalStock'], RetainedEarnings=0))
    u['CTA'] = tot['TotalAssets'] - tot['TotalLiabilities'] - u['CapitalStock'] - u['RetainedEarnings']
    return u

periods = {}
jp_prev, de_prev = jp_bs, de_bs
jp_beg = (100000, 44000.0); de_beg = (40000, 1200.0)
# USD retained earnings at end of P4 (translated history)
jp_re_usd = jp_bs['RetainedEarnings']/105.0
de_re_usd = de_bs['RetainedEarnings']/0.92
jp_usd_bs4 = translate(jp_bs, None, RATES[4]['jpy_end'], None, HIST['jpy'], jp_re_usd)
de_usd_bs4 = translate(de_bs, None, 1/RATES[4]['eur_end'], None, 1/HIST['eur'], de_re_usd)

us_bs = dict(Cash=15.0, MarketableSecurities=0.0, IntraGroupLoan=20.0, OtherAssets=0.0, DeferredCharges=1.0,
             InvestmentsInSubs=bs_totals(jp_usd_bs4)['Equity'] + bs_totals(de_usd_bs4)['Equity'],
             OtherPayables=0.8, Overdraft=0.0, IntraGroupDebt=0.0, ShortTermDebt=30.0, FloatingRateDebt=0.0, FixedRateDebt=60.0,
             ZeroCoupon=40.0, CapitalStock=8.0, APIC=92.0, TreasuryStock=0.0, OCI=jp_usd_bs4['CTA'] + de_usd_bs4['CTA'])
def us_tot(b):
    ca = b['Cash']+b['MarketableSecurities']+b['IntraGroupLoan']
    lta = b['OtherAssets']+b['DeferredCharges']+b['InvestmentsInSubs']
    cl = b['OtherPayables']+b['Overdraft']+b['IntraGroupDebt']+b['ShortTermDebt']
    ltl = b['FloatingRateDebt']+b['FixedRateDebt']+b['ZeroCoupon']
    eq = b['CapitalStock']+b['APIC']+b['TreasuryStock']+b['OCI']+b['RetainedEarnings']
    return dict(CurrentAssets=ca, LongTermAssets=lta, TotalAssets=ca+lta, CurrentLiabilities=cl, LongTermLiabilities=ltl, TotalLiabilities=cl+ltl, Equity=eq, LiabilitiesAndEquity=cl+ltl+eq)
t = us_tot(dict(us_bs, RetainedEarnings=0))
us_bs['RetainedEarnings'] = t['TotalAssets'] - t['TotalLiabilities'] - (us_bs['CapitalStock']+us_bs['APIC']+us_bs['TreasuryStock']+us_bs['OCI'])

out = {'4': {'japan': {'bs': jp_bs, 'bsUsd': jp_usd_bs4}, 'germany': {'bs': de_bs, 'bsUsd': de_usd_bs4}, 'us': {'bs': us_bs}}}
us_prev = us_bs
eps_hist = {2: 0.95, 3: 1.40, 4: 1.85}
for p in (5, 6):
    r = RATES[p]
    jIS, jBS, jOps, jcost = sub_period('japan', p, jp_prev, JP[p], r, *jp_beg)
    dIS, dBS, dOps, dcost = sub_period('germany', p, de_prev, DE[p], r, *de_beg)
    jCF = cash_flow(jp_prev, jBS, jIS); dCF = cash_flow(de_prev, dBS, dIS)
    # USD translation
    j_div_usd = JP[p]['div']/r['jpy_end']; d_div_usd = DE[p]['div']*r['eur_end']
    j_ni_usd = jIS['NetIncome']/r['jpy_avg']; d_ni_usd = dIS['NetIncome']*r['eur_avg']
    jp_re_usd = jp_re_usd + j_ni_usd - j_div_usd
    de_re_usd = de_re_usd + d_ni_usd - d_div_usd
    jUSD = translate(jBS, jIS, r['jpy_end'], r['jpy_avg'], HIST['jpy'], jp_re_usd)
    dUSD = translate(dBS, dIS, 1/r['eur_end'], 1/r['eur_avg'], 1/HIST['eur'], de_re_usd)
    jISu = {k: v/r['jpy_avg'] for k, v in jIS.items()}; jISu['DividendsPaid'] = j_div_usd; jISu['NetIncome'] = j_ni_usd
    dISu = {k: v*r['eur_avg'] for k, v in dIS.items()}; dISu['DividendsPaid'] = d_div_usd; dISu['NetIncome'] = d_ni_usd
    # US Holding
    u = US[p]
    ic_int = 20.0*(r['ulibor']+0.005)/4
    div_inc = j_div_usd + d_div_usd
    int_exp = (us_prev['ShortTermDebt']*(r['ulibor']+0.01) + us_prev['FixedRateDebt']*0.05)/4
    accretion = 0.0
    ebit = u['royalty'] + div_inc + ic_int - u['sga']
    ebt = ebit - int_exp
    us_tax = max(0.0, (u['royalty'] - u['sga'] + ic_int - int_exp)*0.35)
    ni_before = ebt - us_tax
    eq_in_subs = (j_ni_usd - j_div_usd) + (d_ni_usd - d_div_usd)
    us_ni = ni_before + eq_in_subs
    sh_div = u['div_ps']*SHARES
    uIS = dict(Royalties=u['royalty'], ForeignSourceIncome=div_inc+ic_int, ICDividends=div_inc, ICInterest=ic_int, TotalRevenues=u['royalty']+div_inc+ic_int,
               SGA=u['sga'], OperatingIncome=u['royalty']+div_inc+ic_int-u['sga'], FXGain=0.0, OtherIncome=0.0, EBIT=ebit, InterestIncome=0.0, InterestExpense=int_exp,
               EBT=ebt, Taxes=us_tax, NetIncomeBeforeSubs=ni_before, EquityInEarningsOfSubs=eq_in_subs, NetIncome=us_ni, DividendsPaid=sh_div)
    ub = dict(us_prev)
    ub['InvestmentsInSubs'] = bs_totals(jUSD)['Equity'] + bs_totals(dUSD)['Equity']
    ub['OCI'] = jUSD['CTA'] + dUSD['CTA']
    ub['RetainedEarnings'] = us_prev['RetainedEarnings'] + us_ni - sh_div
    ub['OtherPayables'] = us_tax
    ub['Cash'] = 0.0; ub['Overdraft'] = 0.0
    tt = us_tot(ub)
    cash = tt['TotalLiabilities'] + tt['Equity'] - tt['TotalAssets']
    if cash >= 0: ub['Cash'] = cash
    else: ub['Overdraft'] = -cash
    dd = lambda k: ub[k]-us_prev[k]
    uCFO = us_ni - eq_in_subs + accretion + dd('OtherPayables') - dd('DeferredCharges')
    uCFI = -dd('MarketableSecurities') - dd('IntraGroupLoan')
    uCFF = dd('Overdraft') + dd('ShortTermDebt') + dd('IntraGroupDebt') + dd('FixedRateDebt') + dd('FloatingRateDebt') + dd('ZeroCoupon') + dd('CapitalStock')+dd('APIC') + dd('TreasuryStock') - sh_div
    uCF = dict(NetIncome=us_ni, EquityInSubs=-eq_in_subs, Depreciation=0.0, ZeroCouponAccretion=accretion, DeferredCharges=-dd('DeferredCharges'), OtherPayables=dd('OtherPayables'),
               CashFromOperations=uCFO, MarketableSecurities=-dd('MarketableSecurities'), IntraGroupLoan=-dd('IntraGroupLoan'), CashFromInvesting=uCFI,
               Overdraft=dd('Overdraft'), ShortTermDebt=dd('ShortTermDebt'), IntraGroupDebt=dd('IntraGroupDebt'), FixedRateDebt=dd('FixedRateDebt'), FloatingRateDebt=dd('FloatingRateDebt'),
               ZeroCoupon=dd('ZeroCoupon'), CommonStock=dd('CapitalStock')+dd('APIC'), Repurchase=dd('TreasuryStock'), DividendsPaid=-sh_div, CashFromFinancing=uCFF,
               ChangeInCash=uCFO+uCFI+uCFF, BeginningCash=us_prev['Cash'], EndingCash=ub['Cash'])
    # Consolidated (USD)
    ic_rev_usd = jISu['InterCompanyRevenues']
    cIS = dict(DomesticRevenues=jISu['DomesticRevenues']+dISu['DomesticRevenues'], ExportRevenues=jISu['ExportRevenues']+dISu['ExportRevenues'], OtherRevenues=u['royalty'])
    cIS['TotalRevenues'] = cIS['DomesticRevenues']+cIS['ExportRevenues']+cIS['OtherRevenues']
    cIS['COGS'] = jISu['COGS'] + dISu['COGS'] - ic_rev_usd
    cIS['SGA'] = jISu['SGA'] + dISu['SGA'] + u['sga']
    cIS['DepreciationExpense'] = jISu['DepreciationExpense'] + dISu['DepreciationExpense']
    cIS['OperatingIncome'] = cIS['TotalRevenues'] - cIS['COGS'] - cIS['SGA'] - cIS['DepreciationExpense']
    cIS['FXGain'] = jISu['FXGain'] + dISu['FXGain']; cIS['OilGain'] = 0.0; cIS['OtherNet'] = 0.0
    cIS['EBIT'] = cIS['OperatingIncome'] + cIS['FXGain'] + cIS['OilGain']
    cIS['InterestIncome'] = 0.0
    de_ic_int_usd = 20.0*(r['ulibor']+0.005)/4
    cIS['InterestExpense'] = jISu['InterestExpense'] + dISu['InterestExpense'] - de_ic_int_usd + int_exp
    cIS['EBT'] = cIS['EBIT'] - cIS['InterestExpense']
    cIS['IncomeTaxes'] = jISu['IncomeTaxes'] + dISu['IncomeTaxes'] + us_tax
    cIS['WithholdingTaxes'] = jISu['WithholdingTaxes'] + dISu['WithholdingTaxes']
    cIS['NetIncome'] = cIS['EBT'] - cIS['IncomeTaxes'] - cIS['WithholdingTaxes']
    cIS['EBITDA'] = cIS['EBIT'] + cIS['DepreciationExpense']
    assert abs(cIS['NetIncome'] - us_ni) < 1e-6, (cIS['NetIncome'], us_ni)
    cBS = {}
    for k in ('Cash','MarketableSecurities','AccountsReceivable','Inventory','GrossFixedAssets','Depreciation','OtherAssets','DeferredCharges','AccountsPayable','OtherPayables','Overdraft','ShortTermDebt','FloatingRateDebt','FixedRateDebt'):
        cBS[k] = jUSD.get(k,0) + dUSD.get(k,0) + ub.get(k,0)
    cBS['ZeroCoupon'] = ub['ZeroCoupon']; cBS['CapitalStock'] = ub['CapitalStock']; cBS['APIC'] = ub['APIC']; cBS['TreasuryStock'] = ub['TreasuryStock']
    cBS['RetainedEarnings'] = ub['RetainedEarnings']; cBS['CTA'] = ub['OCI']; cBS['OCI'] = 0.0
    ca = cBS['Cash']+cBS['MarketableSecurities']+cBS['AccountsReceivable']+cBS['Inventory']
    nfa = cBS['GrossFixedAssets']-cBS['Depreciation']
    ta = ca+nfa+cBS['OtherAssets']+cBS['DeferredCharges']
    cl = cBS['AccountsPayable']+cBS['OtherPayables']+cBS['Overdraft']+cBS['ShortTermDebt']
    ltl = cBS['FloatingRateDebt']+cBS['FixedRateDebt']+cBS['ZeroCoupon']
    eq = cBS['CapitalStock']+cBS['APIC']+cBS['TreasuryStock']+cBS['OCI']+cBS['RetainedEarnings']+cBS['CTA']
    cBS.update(CurrentAssets=ca, NetFixedAssets=nfa, TotalAssets=ta, CurrentLiabilities=cl, LongTermLiabilities=ltl, TotalLiabilities=cl+ltl, Equity=eq, LiabilitiesAndEquity=cl+ltl+eq)
    assert abs(ta - (cl+ltl+eq)) < 1e-6, ('cons bs', ta, cl+ltl+eq)
    assert abs(eq - us_tot(ub)['Equity']) < 1e-6
    # checks on units
    for name, b in (('jp', jBS), ('de', dBS)):
        t = bs_totals(b); assert abs(t['TotalAssets'] - t['LiabilitiesAndEquity']) < 1e-6, name
    for name, b in (('jpU', jUSD), ('deU', dUSD)):
        t = bs_totals(b); assert abs(t['TotalAssets'] - t['LiabilitiesAndEquity']) < 1e-6, name
    assert abs(jCF['EndingCash'] - (jCF['BeginningCash']+jCF['ChangeInCash'])) < 1e-6
    assert abs(dCF['EndingCash'] - (dCF['BeginningCash']+dCF['ChangeInCash'])) < 1e-6
    assert abs(uCF['EndingCash'] - (uCF['BeginningCash']+uCF['ChangeInCash'])) < 1e-6, (uCF['EndingCash'], uCF['BeginningCash']+uCF['ChangeInCash'])
    # ratios and P/E
    eps = cIS['NetIncome']/SHARES
    eps_hist[p] = eps
    ann = 4*(0.5*eps + 0.25*eps_hist[p-1] + 0.15*eps_hist[p-2] + 0.10*eps_hist[p-3])
    total_debt = cBS['ShortTermDebt']+cBS['Overdraft']+cBS['FloatingRateDebt']+cBS['FixedRateDebt']+cBS['ZeroCoupon']
    wc = cBS['CurrentAssets'] - (cBS['CurrentLiabilities'] - cBS['ShortTermDebt'] - cBS['Overdraft'])
    eff_tax = (cIS['IncomeTaxes']+cIS['WithholdingTaxes'])/cIS['EBT']
    eff_int = cIS['InterestExpense']*4/total_debt
    ratios = dict(STDebtToWC=(cBS['ShortTermDebt']+cBS['Overdraft'])/wc, DebtToAssets=(cBS['TotalLiabilities'])/cBS['TotalAssets'],
                  TotalDebtToAssets=total_debt/cBS['TotalAssets'], TIE=cIS['EBIT']/cIS['InterestExpense'], EffTaxRate=eff_tax, EffIntRate=eff_int,
                  FXVarToFwd=(0.021 if p == 5 else 0.0))
    periods[str(p)] = dict(japan=dict(bs=jBS, bsUsd=jUSD, is_=jIS, isUsd=jISu, cf=jCF, ops=jOps),
                           germany=dict(bs=dBS, bsUsd=dUSD, is_=dIS, isUsd=dISu, cf=dCF, ops=dOps),
                           us=dict(bs=ub, is_=uIS, cf=uCF), cons=dict(bs=cBS, is_=cIS),
                           eps=eps, annualEps=ann, ratios=ratios, divPerShare=US[p]['div_ps'])
    jp_prev, de_prev, us_prev = jBS, dBS, ub
    jp_beg = (jOps['end_units'], jcost); de_beg = (dOps['end_units'], dcost)

out.update(periods)
out['epsHistory'] = eps_hist
for p in ('4','5','6'):
    for ent in ('japan','germany'):
        for k in ('bs','bsUsd'):
            out[p][ent][k].update(bs_totals(out[p][ent][k]))
    out[p]['us']['bs'].update(us_tot(out[p]['us']['bs']))
json.dump(out, open('/home/claude/forad/fin/fin.json','w'), indent=1)
for p in ('5','6'):
    P = out[p]
    print('P'+p, 'EPS %.2f ann %.2f' % (P['eps'], P['annualEps']))
    print(' JP rev %.0f ni %.0f cash %.0f od %.0f' % (P['japan']['is_']['TotalRevenues'], P['japan']['is_']['NetIncome'], P['japan']['bs']['Cash'], P['japan']['bs']['Overdraft']))
    print(' DE rev %.1f ni %.1f cash %.1f od %.1f' % (P['germany']['is_']['TotalRevenues'], P['germany']['is_']['NetIncome'], P['germany']['bs']['Cash'], P['germany']['bs']['Overdraft']))
    print(' US ni %.2f cash %.2f od %.2f' % (P['us']['is_']['NetIncome'], P['us']['bs']['Cash'], P['us']['bs']['Overdraft']))
    print(' cons rev %.1f ebit %.1f ni %.2f TA %.1f eq %.1f' % (P['cons']['is_']['TotalRevenues'], P['cons']['is_']['EBIT'], P['cons']['is_']['NetIncome'], P['cons']['bs']['TotalAssets'], P['cons']['bs']['Equity']))
    print(' ratios', {k: round(v,3) for k,v in P['ratios'].items()})

# ---------------- P/E scoring (sample; exact FORAD 2.0 tables are open question P-03) ----------------
clamp = lambda x: max(-4.0, min(4.0, x))
pe_prev = 9.0
SAMPLE = {5: dict(credit=1.0, rating_prev='BB', rating='BB', eps_forecast=1.60, planning=2.0, dividend=1.0, quality=-1.0),
          6: dict(credit=0.0, rating_prev='BB', rating='BB', eps_forecast=None, planning=4.0, dividend=-1.0, quality=2.0)}
for p in (5, 6):
    P = out[str(p)]; s = SAMPLE[p]; ra = P['ratios']
    hedging = clamp(ra['FXVarToFwd']/0.15*4)
    tax = clamp(4 - 8*(ra['EffTaxRate']-0.35)/0.27)
    ebt = P['cons']['is_']['EBT']; fx = P['cons']['is_']['FXGain']
    eps = P['eps']; div_ps = P['divPerShare']
    elems = [
      dict(key='credit', label='Creditworthiness', weight=0.30, score=s['credit'], rule=False, metrics=[
        ('Total debt to total assets', ra['TotalDebtToAssets'], 'pct'), ('Times interest earned', ra['TIE'], 'x'),
        ('Short-term debt to working capital', ra['STDebtToWC'], 'pct'), ('Previous credit rating', s['rating_prev'], 'text'), ('New credit rating', s['rating'], 'text')]),
      dict(key='hedging', label='Currency hedging', weight=0.20, score=hedging, rule=True, metrics=[('FX result vs 100% forward benchmark', ra['FXVarToFwd'], 'pct')]),
      dict(key='planning', label='Planning skills', weight=0.10, score=s['planning'], rule=False, metrics=[
        ('EPS forecast in decision', s['eps_forecast'], 'usd'), ('EPS actual, or projected for the forecast', eps, 'usd'),
        ('Difference', (eps/s['eps_forecast']-1) if s['eps_forecast'] else None, 'pct')]),
      dict(key='tax', label='Tax management', weight=0.20, score=tax, rule=True, metrics=[('Consolidated effective tax rate', ra['EffTaxRate'], 'pct')]),
      dict(key='dividend', label='Dividend management', weight=0.10, score=s['dividend'], rule=False, metrics=[
        ('Dividend per share', div_ps, 'usd'), ('Payout of EPS', div_ps/eps if eps > 0 else None, 'pct')]),
      dict(key='quality', label='Quality of earnings', weight=0.10, score=s['quality'], rule=False, metrics=[
        ('Non-core gains (FX, interest, oil) as % of EBT', fx/ebt if ebt else None, 'pct'), ('New shares issued', 0.0, 'pct')]),
    ]
    for e in elems: e['metrics'] = [dict(label=a, value=b, fmt=c) for a, b, c in e['metrics']]
    weighted = sum(e['weight']*e['score'] for e in elems)
    change = weighted*0.25
    pe = pe_prev + change
    P['pe'] = dict(elements=elems, weighted=weighted, change=change, pePrev=pe_prev, pe=pe, eps=eps, annualEps=P['annualEps'], price=P['annualEps']*pe,
                   rating=s['rating'])
    pe_prev = pe
    print('P%d weighted %.2f PE %.2f price %.2f' % (p, weighted, pe, P['pe']['price']))
json.dump(out, open('/home/claude/forad/fin/fin.json','w'), indent=1)
