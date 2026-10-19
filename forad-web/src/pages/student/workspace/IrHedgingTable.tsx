import { useId, useState } from 'react';
import { useAuth } from '../../../lib/auth';
import { useDecision } from '../../../lib/decisionStore';
import type { Ccy } from '../../../data/bimr';
import { IR_CONTRACT, irFuturesRate } from '../../../data/hedging';
import { LOCAL, convert, type FinEntity } from '../../../data/financing';
import { num } from '../../../lib/format';
import { CellNumber, Group, Row } from './OperationsTable';

const SYM: Record<Ccy, string> = { USD: '$', JPY: '¥', EUR: '€' };
const CCYS: Ccy[] = ['USD', 'JPY', 'EUR'];
const UNITS: FinEntity[] = ['us', 'japan', 'germany'];

const money = (v: number, c: Ccy) => `${v < 0 ? '−' : ''}${SYM[c]}${num(Math.abs(v))}`;

/**
 * US Holding "IR Hedging" (FORAD 2.0 manual §3.6.8): 90-day interest-rate futures in USD, JPY and EUR.
 * Contract: USD 1M, EUR 1M, JPY 100M. Price = 3-month forward LIBOR from the 3- and 6-month rates.
 * Long (buy) loses when next period's 3-month LIBOR is above the futures rate; short (sell) gains.
 * Result = contracts × contract size × (futures rate − next LIBOR) / 4, paid day 90 in USD;
 * long results are interest income, short results interest expense, at the holding company.
 */
export default function IrHedgingTable() {
  const { session } = useAuth();
  const { draft, finCtx, invDerived, hedgeIssues, hedgeChanged, setIr, resetHedge } = useDecision();
  const P = session.currentPeriod;
  const uid = useId();
  const [nextRate, setNextRate] = useState<Record<Ccy, number | null>>({ USD: null, JPY: null, EUR: null });
  const anyChanged = hedgeChanged.some((k) => k.startsWith('us.IR.'));
  const fin = draft.financing;

  // Company-wide amounts in each currency whose interest resets with 3-month LIBOR next period.
  const exposure = (c: Ccy) => {
    let floating = 0;
    let shortTerm = 0;
    let swaps = 0;
    let assets = 0;
    UNITS.forEach((e) => {
      const f = fin[e];
      shortTerm += c === 'USD' ? f.midUSD : c === 'JPY' ? f.midJPY : f.midEUR;
      if (LOCAL[e] === c) {
        floating += finCtx.floatDebt[e] + f.floatIssue - f.floatRepay;
        swaps += f.payFloatNew - f.payFixedNew;
        assets += Math.max(0, invDerived[e].closing);
      }
    });
    return { floating, shortTerm, swaps, assets, net: floating + shortTerm + swaps - assets };
  };

  return (
    <section className="card ops" aria-labelledby={`${uid}-t`}>
      <header className="entity__head">
        <div>
          <h2 id={`${uid}-t`} className="card__title">US Holding: interest-rate hedging</h2>
          <p className="card__sub">
            90-day interest-rate futures, held only by the holding company. Buy (+) or sell (−) contracts; results are paid in USD on day 90.
            To protect floating-rate borrowing against rising rates, sell futures.
          </p>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" disabled={!anyChanged} onClick={() => resetHedge('IR')}>Reset</button>
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
          <tbody>
            {CCYS.map((c) => {
              const now = irFuturesRate(P, c);
              const last = irFuturesRate(P - 1, c);
              const size = IR_CONTRACT[c];
              const n = draft.hedging.ir[c];
              const iss = hedgeIssues.find((i) => i.ccy === 'IR' && i.key === c)?.message;
              const k = `${uid}-${c}`;
              const ex = exposure(c);
              const cover = Math.round(ex.net / size);
              const L = nextRate[c] ?? now.futures;
              const move = (L - now.futures) / 100 / 4; // quarterly
              const futuresResult = -n * size * move; // in currency c
              const extraInterest = ex.net * move;
              const net = futuresResult - extraInterest;
              const usd = (v: number) => convert(v, c, 'USD', finCtx);
              const covered = ex.net > 0 && n < 0 ? Math.min(999, Math.round((-n * size) / ex.net * 100)) : 0;
              return [
                <Group key={`${c}-g`} title={`${c} · one contract = ${SYM[c]}${num(size)}`} />,
                <Row key={`${c}-n`} label={`Current period ${c} IR futures contracts`} last="0" editable changed={hedgeChanged.includes(`us.IR.${c}`)} issue={iss} idBase={k}
                  note={n === 0 ? `Selling ${num(Math.max(0, cover))} would cover the floating exposure below` : `${n > 0 ? 'Long' : 'Short'} ${SYM[c]}${num(Math.abs(n) * size)}${covered ? ` · covers ${covered}% of the exposure` : ''}`}>
                  <CellNumber id={`${k}-in`} label={`Current period ${c} IR futures contracts`} value={n} onChange={(v) => setIr(c, v)} invalid={!!iss} />
                </Row>,
                <Row key={`${c}-f`} label={`${c} 3-month LIBOR futures rate`} last={`${num(last.futures, 4)}%`} note="3-month forward rate from the 3- and 6-month LIBOR">{`${num(now.futures, 4)}%`}</Row>,
                <Row key={`${c}-l`} label={`${c} 3-month LIBOR`} last={`${num(last.libor, 4)}%`}>{`${num(now.libor, 4)}%`}</Row>,
                <Row key={`${c}-p`} label={`Previous period ${c} IR futures gain/(loss) (USD)`} last="0" note="From team results once connected">0</Row>,
                <Row key={`${c}-e`} label={`Floating-rate exposure resetting next period (${c})`} last="—"
                  note={`Long-term floating ${money(ex.floating, c)} · mid-period short-term ${money(ex.shortTerm, c)}${ex.swaps ? ` · swaps ${money(ex.swaps, c)}` : ''}${ex.assets ? ` · less securities ${money(ex.assets, c)}` : ''}`}>
                  {money(ex.net, c)}
                </Row>,
                <Row key={`${c}-s`} label={`What if next period’s ${c} 3-month LIBOR is…`} last="—" editable idBase={`${k}-s`}
                  note={Math.abs(L - now.futures) < 1e-9 ? 'Starts at the futures rate: no gain or loss' : `${L > now.futures ? '+' : '−'}${num(Math.abs(L - now.futures) * 100, 0)} bp vs the futures rate`}>
                  <CellNumber id={`${k}-s-in`} label={`Scenario: next-period ${c} 3-month LIBOR (%)`} value={L} decimals={4} onChange={(v) => setNextRate((r) => ({ ...r, [c]: v }))} />
                </Row>,
                <Row key={`${c}-r`} label={`Futures gain/(loss) in that case`} last="—" note={`${money(usd(futuresResult), 'USD')} · booked in ${n >= 0 ? 'interest income (long)' : 'interest expense (short)'} at the US Holding`}>{money(futuresResult, c)}</Row>,
                <Row key={`${c}-x`} label="Extra interest on the floating exposure" last="—" note="Compared with borrowing at the futures rate, one quarter">{money(-extraInterest, c)}</Row>,
                <Row key={`${c}-t`} label="Net effect" last="—" tone={net < -0.5 ? 'bad' : undefined}>{money(net, c)}</Row>,
              ];
            })}
          </tbody>
        </table>
      </div>
      <p className="footnote">
        Futures cover the current period only and reset to the next period’s forward rate. Exposure is company-wide in each currency, from your
        Financing and Investing tabs and the sample debt balances. The “what if” rate is for testing only and is not part of your decision.
      </p>
    </section>
  );
}
