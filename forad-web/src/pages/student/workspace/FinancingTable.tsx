import { useId, useState, type ReactNode } from 'react';
import { useAuth } from '../../../lib/auth';
import { useDecision } from '../../../lib/decisionStore';
import type { Ccy } from '../../../data/bimr';
import {
  CCY_ORDER, FIN_RULES, LOCAL, deriveFinancing,
  type FinEntity, type StLoans, type SubFinancing, type UsFinancing,
} from '../../../data/financing';
import { FINANCIALS_ARE_SAMPLE } from '../../../data/financials';
import { num } from '../../../lib/format';
import { CellNumber, CellSelect, Group, Row } from './OperationsTable';

const NAME: Record<FinEntity, string> = { japan: 'Japanese sub', germany: 'German sub', us: 'US Holding' };
const SYM: Record<Ccy, string> = { USD: '$', JPY: '¥', EUR: '€' };
const pct = (x: number) => `${num(x, 3)}%`;

type SwapView = 'payFloat' | 'payFixed' | null;

/** S-09: FORAD 2.0 "Decision Inputs · Financing", with the two swap windows. */
export default function FinancingTable({ entity }: { entity: FinEntity }) {
  const { session } = useAuth();
  const { draft, finCtx: ctx, finLast, finIssues, finChanged, setFin, resetFinEntity } = useDecision();
  const P = session.currentPeriod;
  const uid = useId();
  const [swap, setSwap] = useState<SwapView>(null);
  const local = LOCAL[entity];
  const o = draft.financing[entity];
  const last = finLast[entity];
  const d = deriveFinancing(entity, draft.financing, ctx);

  const issue = (k: string) => finIssues.find((i) => i.entity === entity && i.key === k)?.message;
  const changed = (k: string) => finChanged.includes(`${entity}.${k}`);
  const id = (k: string) => `${uid}-${k}`;
  const set = (k: string) => (v: number) => setFin(entity, k as never, v);
  const money = (v: number, c: Ccy = local, dp = 0) => `${v < 0 ? '−' : ''}${SYM[c]}${num(Math.abs(v), dp)}`;

  const numRow = (k: string, label: string, value: number, lastV: number, note?: ReactNode, decimals = 0, lastText?: string) => {
    const iss = issue(k);
    return (
      <Row key={k} label={label} last={lastText ?? num(lastV, decimals)} editable changed={changed(k)} issue={iss} note={note} idBase={id(k)}>
        <CellNumber id={`${id(k)}-in`} label={label} value={value} decimals={decimals} onChange={set(k)} invalid={!!iss}
          describedBy={iss ? `${id(k)}-issue` : note ? `${id(k)}-note` : undefined} />
      </Row>
    );
  };

  const stRows = CCY_ORDER[entity].flatMap((c) => {
    const bk = `beg${c}` as keyof StLoans;
    const mk = `mid${c}` as keyof StLoans;
    return [
      numRow(bk, `Beg period short-term debt (${c})`, o[bk], last[bk], `Day 0 → day 45 · ${pct(d.stRate[c])}`),
      numRow(mk, `Mid period short-term debt (${c})`, o[mk], last[mk], `Day 45 → day 90 · ${pct(d.stRate[c])}`),
    ];
  });

  let special: ReactNode = null;
  if (entity === 'us') {
    const u = o as UsFinancing;
    const lu = last as UsFinancing;
    special = (
      <>
        <Group title="Convertible bond and new shares" />
        <Row label="Call convertible" last={lu.callConvertible ? 'Yes' : 'No'} editable changed={changed('callConvertible')} idBase={id('callConvertible')}
          note={u.callConvertible
            ? d.inTheMoney ? `In the money: converts into ${num(FIN_RULES.conversionShares)} new shares, no cash` : `Out of the money: pays ${money(d.callCash)} (103%) on day 45`
            : `Bond ${money(ctx.convertible)} · conversion price $${num(FIN_RULES.conversionPrice, 2)} vs share price $${num(ctx.sharePrice, 2)}`}>
          <CellSelect id={`${id('callConvertible')}-in`} label="Call convertible" value={u.callConvertible} options={[0, 1] as (0 | 1)[]} render={(x) => (x ? 'Yes, call it' : 'No')} onChange={(v) => setFin('us', 'callConvertible', v)} />
        </Row>
        {numRow('equityShares', 'Equity issuance (# shares)', u.equityShares, lu.equityShares,
          u.equityShares > 0
            ? `${money(d.equityGross)} at $${num(ctx.sharePrice, 2)} less ${money(d.equityCost)} costs, day 45`
            : `Up to ${num(d.maxEquityShares)} shares (5%) · cost $500,000 + 3%`)}
      </>
    );
  } else {
    const s = o as SubFinancing;
    const ls = last as SubFinancing;
    const [lo, hi] = ctx.icRange;
    special = (
      <>
        <Group title="Inter-company borrowing from the US Holding (USD)" />
        {numRow('begBorrowUs', 'Beg period inter-company borrow from US (USD)', s.begBorrowUs, ls.begBorrowUs, 'Day 0 → day 45')}
        {numRow('midBorrowUs', 'Mid period inter-company borrow from US (USD)', s.midBorrowUs, ls.midBorrowUs, 'Day 45 → day 90')}
        {numRow('borrowRate', 'Inter-company borrow rate (% a year)', s.borrowRate, ls.borrowRate, `Allowed ${num(lo, 3)}% to ${num(hi, 3)}%`, 3, pct(ls.borrowRate))}
        <Row label="Interest to the US (USD)" last="—" note={d.icInterestUsd > 0 ? '5% withholding tax applies in the subsidiary' : undefined}>{money(d.icInterestUsd, 'USD', 2)}</Row>
      </>
    );
  }

  const anyChanged = finChanged.some((k) => k.startsWith(`${entity}.`));

  return (
    <div className="stack">
      <section className="card ops" aria-labelledby={`${uid}-title`}>
        <header className="entity__head">
          <div>
            <h2 id={`${uid}-title`} className="card__title">{NAME[entity]}: financing</h2>
            <p className="card__sub">
              Credit rating {ctx.rating}{FINANCIALS_ARE_SAMPLE ? ' (sample)' : ''}: long-term spread {pct(ctx.ltSpread)}, short-term {pct(ctx.stSpread)}.
              Amounts in full currency units.
            </p>
          </div>
          <div className="fin__btns">
            <button type="button" className={`btn btn--ghost btn--sm ${swap === 'payFloat' ? 'is-on' : ''}`} aria-expanded={swap === 'payFloat'} onClick={() => setSwap(swap === 'payFloat' ? null : 'payFloat')}>Swap: pay floating</button>
            <button type="button" className={`btn btn--ghost btn--sm ${swap === 'payFixed' ? 'is-on' : ''}`} aria-expanded={swap === 'payFixed'} onClick={() => setSwap(swap === 'payFixed' ? null : 'payFixed')}>Swap: pay fixed</button>
            <button type="button" className="btn btn--ghost btn--sm" disabled={!anyChanged} onClick={() => resetFinEntity(entity)}>Reset</button>
          </div>
        </header>

        {swap && <SwapPanel entity={entity} kind={swap} onClose={() => setSwap(null)} />}

        <div className="tablewrap">
          <table className="table otable">
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">Item</span></th>
                <th scope="col" className="num ocell--last">Period {P - 1} actual</th>
                <th scope="col" className="num">Period {P} decision</th>
              </tr>
            </thead>
            <tbody>
              <Group title="Short-term loans · 45 days, repaid automatically" />
              {stRows}
              <Group title={`Long-term debt (${local}) · cash on day 45`} />
              {numRow('fixedIssue', `Long-term fixed-rate issuance (${local})`, o.fixedIssue, last.fixedIssue, `${pct(d.fixedNewRate)} fixed · 5 years`)}
              {numRow('fixedRepay', `Long-term fixed-rate repayment (${local})`, o.fixedRepay, last.fixedRepay, `Outstanding ${money(ctx.fixedDebt[entity])}`)}
              {numRow('floatIssue', `Long-term floating-rate issuance (${local})`, o.floatIssue, last.floatIssue, `3-month LIBOR + ${pct(ctx.ltSpread)} (now ${pct(d.floatNewRate)})`)}
              {numRow('floatRepay', `Long-term floating-rate repayment (${local})`, o.floatRepay, last.floatRepay, `Outstanding ${money(ctx.floatDebt[entity])}`)}
              <Row label="Issue cost, paid day 45" last="—" note={d.ltIssueCost > 0 ? '$1M + 1% per loan, amortized over 20 periods' : undefined}>{money(d.ltIssueCost)}</Row>
              {special}
              <Group title={`Cash from these financing decisions (${local})`} />
              <Row label="Day 0" last="—">{money(d.cash.day0)}</Row>
              <Row label="Day 45" last="—">{money(d.cash.day45)}</Row>
              <Row label="Day 90" last="—" note="Interest on mid-period loans; principal is repaid on day 0 next period">{money(d.cash.day90)}</Row>
            </tbody>
          </table>
        </div>
        <p className="footnote">
          Intra-period cash balances on days 0, 30, 45, 60 and 90 also need sales, costs and taxes, so they appear once the simulation engine is
          connected. Debt to assets may not exceed {Math.round(FIN_RULES.maxDebtToAssets * 100)}% when you submit.
        </p>
      </section>
    </div>
  );
}

function SwapPanel({ entity, kind, onClose }: { entity: FinEntity; kind: 'payFloat' | 'payFixed'; onClose: () => void }) {
  const { session } = useAuth();
  const { draft, finCtx: ctx, finIssues, setFin } = useDecision();
  const uid = useId();
  const local = LOCAL[entity];
  const o = draft.financing[entity];
  const d = deriveFinancing(entity, draft.financing, ctx);
  const P = session.currentPeriod;
  const swapRate = ctx.swapRate[local];
  const libor = ctx.libor[local];
  const newKey = kind === 'payFloat' ? 'payFloatNew' : 'payFixedNew';
  const unwindKey = kind === 'payFloat' ? 'payFloatUnwind' : 'payFixedUnwind';
  const notional = o[newKey];
  const issue = (k: string) => finIssues.find((i) => i.entity === entity && i.key === k)?.message;
  const q = (amt: number, r: number) => (amt * r) / 100 / 4;
  const m = (v: number) => (Math.abs(v) < 0.5 ? '–' : v < 0 ? `(${num(-v)})` : num(v));

  const debt = kind === 'payFloat' ? Math.max(0, d.netFixed) : Math.max(0, d.netFloat);
  const debtRate = kind === 'payFloat' ? ctx.fixedRate[entity] : libor + 1.5;
  const debtInt = q(debt, debtRate);
  const legs = kind === 'payFloat'
    ? [{ label: 'Pay floating', rate: libor, amt: q(notional, libor) }, { label: 'Receive fixed', rate: swapRate, amt: -q(notional, swapRate) }]
    : [{ label: 'Pay fixed', rate: swapRate, amt: q(notional, swapRate) }, { label: 'Receive floating', rate: libor, amt: -q(notional, libor) }];
  const total = debtInt + legs[0].amt + legs[1].amt;
  const eff = debt > 0 ? (total * 4 * 100) / debt : 0;
  const title = kind === 'payFloat' ? `${local} fixed to floating swaps` : `${local} floating to fixed swaps`;

  return (
    <section className="swap" aria-labelledby={`${uid}-t`}>
      <header className="swap__head">
        <div>
          <h3 id={`${uid}-t`}>{title}</h3>
          <p className="muted small">Current period swap fixed rate <strong className="mono">{num(swapRate, 3)}%</strong> (estimated from the yield curve) · 3-month LIBOR {num(libor, 3)}%</p>
        </div>
        <button type="button" className="iconbtn iconbtn--plain" aria-label="Close swaps" onClick={onClose}><span aria-hidden="true">✕</span></button>
      </header>
      <div className="swap__inputs">
        <label htmlFor={`${uid}-new`}>Period {P} {kind === 'payFloat' ? 'fixed-to-floating' : 'floating-to-fixed'} swap notional ({local})</label>
        <CellNumber id={`${uid}-new`} label="New swap notional" value={notional} onChange={(v) => setFin(entity, newKey as never, v)} invalid={!!issue(newKey)} />
        <label htmlFor={`${uid}-un`}>Unwind outstanding swaps ({local})</label>
        <CellNumber id={`${uid}-un`} label="Unwind swap notional" value={o[unwindKey]} onChange={(v) => setFin(entity, unwindKey as never, v)} invalid={!!issue(unwindKey)} />
      </div>
      {(issue(newKey) || issue(unwindKey)) && <p className="ocell__issue swap__issue" role="alert">{issue(newKey) ?? issue(unwindKey)}</p>}
      <div className="tablewrap">
        <table className="table swap__table">
          <thead>
            <tr><th scope="col">Instrument</th><th scope="col" className="num">Rate</th><th scope="col" className="num">Principal / notional</th><th scope="col" className="num">Interest per quarter</th></tr>
          </thead>
          <tbody>
            <tr><th scope="row">{kind === 'payFloat' ? 'Fixed-rate debt' : 'Floating-rate debt'}</th><td className="num mono">{num(debtRate, 3)}%</td><td className="num mono">{m(debt)}</td><td className="num mono">{m(debtInt)}</td></tr>
            <tr className="swap__sub"><th scope="row" colSpan={4}>Swap entered Period {P}</th></tr>
            {legs.map((l, i) => (
              <tr key={l.label}><th scope="row" className="stmt__indent">{l.label}</th><td className="num mono">{num(l.rate, 3)}%</td><td className="num mono">{i === 0 ? m(notional) : ''}</td><td className="num mono">{m(l.amt)}</td></tr>
            ))}
            <tr className="stmt__s"><th scope="row">Total</th><td /><td /><td className="num mono">{m(total)}</td></tr>
            <tr className="stmt__t"><th scope="row">{kind === 'payFloat' ? 'Fixed' : 'Floating'} debt · effective interest rate</th><td /><td className="num mono">{m(debt)}</td><td className="num mono">{num(eff, 3)}%</td></tr>
          </tbody>
        </table>
      </div>
      <p className="footnote">
        Limit: {kind === 'payFloat' ? 'net fixed-rate' : 'net floating-rate'} debt of {local === 'USD' ? '$' : local === 'JPY' ? '¥' : '€'}{num(debt)}. Swaps run 5 years; cash
        settles on day 45; market value changes go to other comprehensive income until you unwind. No swaps are outstanding in the sample position.
        {' '}Interest on {kind === 'payFloat' ? 'fixed' : 'floating'} debt uses the sample rate of {num(debtRate, 2)}%.
      </p>
    </section>
  );
}
