import { useId, type ReactNode } from 'react';
import { useAuth } from '../../../lib/auth';
import { useDecision } from '../../../lib/decisionStore';
import { INV_RULES, loanRateRange, type InvEntity, type SubInvesting, type UsInvesting } from '../../../data/investing';
import { FINANCIALS_ARE_SAMPLE } from '../../../data/financials';
import { num } from '../../../lib/format';
import { CellNumber, Group, Row } from './OperationsTable';

const CCY: Record<InvEntity, string> = { japan: 'JPY', germany: 'EUR', us: 'USD' };
const SYM: Record<InvEntity, string> = { japan: '¥', germany: '€', us: '$' };
const NAME: Record<InvEntity, string> = { japan: 'Japanese sub', germany: 'German sub', us: 'US Holding' };

/** S-08: FORAD 2.0 "Decision Inputs · Investing", with balances and limits calculated as you type. */
export default function InvestingTable({ entity }: { entity: InvEntity }) {
  const { session } = useAuth();
  const { draft, invLast, invDerived, invIssues, invChanged, setInv, resetInvEntity } = useDecision();
  const P = session.currentPeriod;
  const uid = useId();
  const ccy = CCY[entity];
  const sym = SYM[entity];
  const o = draft.investing[entity];
  const last = invLast[entity];
  const d = invDerived[entity];

  const issue = (k: string) => invIssues.find((i) => i.entity === entity && i.key === k)?.message;
  const changed = (k: string) => invChanged.includes(`${entity}.${k}`);
  const id = (k: string) => `${uid}-${k}`;
  const set = (k: string) => (v: number) => setInv(entity, k as never, v);

  const numRow = (k: string, label: string, value: number, lastV: number, note?: ReactNode, decimals = 0, lastText?: string) => {
    const iss = issue(k);
    return (
      <Row key={k} label={label} last={lastText ?? num(lastV, decimals)} editable changed={changed(k)} issue={iss} note={note} idBase={id(k)}>
        <CellNumber id={`${id(k)}-in`} label={label} value={value} decimals={decimals} onChange={set(k)} invalid={!!iss}
          describedBy={iss ? `${id(k)}-issue` : note ? `${id(k)}-note` : undefined} />
      </Row>
    );
  };
  const m = (v: number) => num(v);
  const usd = (v: number, dec = 0) => `$${num(v, dec)}`;

  const securities = (
    <>
      <Group title={`Marketable securities (${ccy})`} />
      <Row label="Balance at start of period" last={m(last.balance - (last.begInvest - last.begRedeem + last.midInvest - last.midRedeem))}>{m(d.opening)}</Row>
      {numRow('begInvest', `Beg period marketable securities · invest (${ccy})`, o.begInvest, last.begInvest, 'Day 0')}
      {numRow('begRedeem', `Beg period marketable securities · (redeem) (${ccy})`, o.begRedeem, last.begRedeem, 'Day 45')}
      {numRow('midInvest', `Mid marketable securities · invest (${ccy})`, o.midInvest, last.midInvest, 'Day 45')}
      {numRow('midRedeem', `Mid marketable securities · (redeem) (${ccy})`, o.midRedeem, last.midRedeem, 'Day 90')}
      <Row label="Balance at end of period" last={m(last.balance)} note="Rolls over until redeemed">{m(d.closing)}</Row>
    </>
  );

  let rows: ReactNode;
  if (entity === 'us') {
    const u = o as UsInvesting;
    const lu = invLast.us;
    const du = invDerived.us;
    rows = (
      <>
        {securities}
        <Group title="Shareholders" />
        <Row label="Shares outstanding, start of period" last={num(lu.sharesOutstanding)}>{num(lu.sharesOutstanding)}</Row>
        {numRow('repurchase', 'Repurchase shares (shares)', u.repurchase, lu.repurchase,
          u.repurchase > 0
            ? `${usd(du.repurchaseCost)} on day 45 at last period’s ${usd(lu.sharePrice, 2)}`
            : `Up to ${num(du.maxRepurchase)} shares (5%), at last period’s ${usd(lu.sharePrice, 2)}`)}
        {numRow('dividendPerShare', 'Dividends per share (USD)', u.dividendPerShare, lu.dividendPerShare,
          `${usd(du.dividendTotal)} on day 90 · ${num(du.sharesDay90)} shares`, 2)}
      </>
    );
  } else {
    const s = o as SubInvesting;
    const ls = last as SubInvesting;
    const [lo, hi] = loanRateRange(P);
    const dl = invDerived[entity];
    const interest = 'loanInterestUsd' in dl ? dl.loanInterestUsd : 0;
    rows = (
      <>
        {securities}
        <Group title="Inter-company loans to the US Holding (USD)" />
        {numRow('begLoanToUs', 'Beg period inter-company loan to US (USD)', s.begLoanToUs, ls.begLoanToUs, s.begLoanToUs > 0 ? 'Day 0, repaid day 45' : 'Day 0 · 45 days')}
        {numRow('midLoanToUs', 'Mid period inter-company loan to US (USD)', s.midLoanToUs, ls.midLoanToUs, s.midLoanToUs > 0 ? 'Day 45, repaid day 90' : 'Day 45 · 45 days')}
        {numRow('loanRate', 'Inter-company loan to US rate (% a year)', s.loanRate, ls.loanRate,
          `Allowed ${num(lo, 3)}% to ${num(hi, 3)}%`, 3, `${num(ls.loanRate, 3)}%`)}
        <Row label="Interest from the US (USD)" last="—" note={interest > 0 ? 'Both loans, 45 days each' : undefined}>{usd(interest, 2)}</Row>
      </>
    );
  }

  const anyChanged = invChanged.some((k) => k.startsWith(`${entity}.`));

  return (
    <section className="card ops" aria-labelledby={`${uid}-title`}>
      <header className="entity__head">
        <div>
          <h2 id={`${uid}-title`} className="card__title">{NAME[entity]}: investing</h2>
          <p className="card__sub">
            Amounts in {ccy === 'USD' ? 'US dollars' : `${sym} (${ccy})`} unless marked USD.
            {FINANCIALS_ARE_SAMPLE && ` Period ${P - 1} balances are a sample until your team’s results are connected.`}
          </p>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" disabled={!anyChanged} onClick={() => resetInvEntity(entity)}>
          Reset
        </button>
      </header>
      <div className="tablewrap">
        <table className="table otable">
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Item</span></th>
              <th scope="col" className="num ocell--last">Period {P - 1} actual</th>
              <th scope="col" className="num">Period {P} decision</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
      <p className="footnote">
        Securities earn the domestic deposit rate, paid in cash on days 45 and 90; the rate comes with the instructor’s market data.
        {entity !== 'us' && ' Inter-company loans to the US are in USD and use one rate for the whole period.'}
        {entity === 'us' && ` Repurchases start in Period ${INV_RULES.repurchaseFromPeriod}; the dividend is paid on the shares outstanding on day 90.`}
      </p>
    </section>
  );
}
