import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { FinPeriod } from '../../data/financials';
import { fm } from './Statement';

interface Props {
  fin: FinPeriod;
  title: string;
  onOpen: (report: string, sub?: string) => void;
}

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

function Mini({ rows, head }: { rows: [string, ReactNode, ReactNode?][]; head: string[] }) {
  return (
    <table className="mini">
      <thead><tr><th scope="col"><span className="sr-only">Item</span></th>{head.map((h) => <th key={h} scope="col" className="num">{h}</th>)}</tr></thead>
      <tbody>
        {rows.map(([l, a, b]) => (
          <tr key={l}><th scope="row">{l}</th><td className="num mono">{a}</td>{b !== undefined && <td className="num mono">{b}</td>}</tr>
        ))}
      </tbody>
    </table>
  );
}

function Box({ id, title, sub, children, tone, onClick, action }: { id: string; title: string; sub: string; children: ReactNode; tone: 'unit' | 'cons'; onClick: () => void; action: string }) {
  return (
    <section className={`sbox sbox--${tone}`} id={id} aria-labelledby={`${id}-t`}>
      <header className="sbox__head">
        <h3 id={`${id}-t`}>{title}</h3>
        <p className="sbox__kicker">Financial summary</p>
        <p className="sbox__unit">{sub}</p>
      </header>
      <div className="sbox__body">{children}</div>
      <button type="button" className="sbox__link" onClick={onClick}>{action} →</button>
    </section>
  );
}

/** FORAD 2.0 "Summary" screen: three units around the consolidated company, with inter-company flows. */
export default function SummaryDiagram({ fin, title, onOpen }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const { japan: jp, germany: de, us, cons } = fin;

  const jpDivM = jp.is_.DividendsPaid;
  const deDivM = de.is_.DividendsPaid;
  const icSalesJpy = jp.is_.InterCompanyRevenues;
  const icBuysEur = de.is_.ICPurchases;
  const deBorrow = de.bsUsd.IntraGroupDebt - (de.bsUsd.IntraGroupLoan ?? 0);
  const jpNet = (jp.bsUsd.IntraGroupDebt ?? 0) - (jp.bsUsd.IntraGroupLoan ?? 0);

  const flowJp = [
    jpDivM > 0 ? `¥${fm(jpDivM, 0)} inter-company dividend from Japan` : 'No inter-company dividend from Japan',
    Math.abs(jpNet) < 0.005 ? 'Zero net inter-company balance' : `Japan net USD ${fm(Math.abs(jpNet))} inter-company ${jpNet > 0 ? 'borrowing from' : 'lending to'} US`,
  ];
  const flowDe = [
    deDivM > 0 ? `€${fm(deDivM)} inter-company dividend from Germany` : 'No inter-company dividend from Germany',
    Math.abs(deBorrow) < 0.005 ? 'Zero net inter-company balance' : `Germany net USD ${fm(Math.abs(deBorrow))} inter-company ${deBorrow > 0 ? 'borrowing from' : 'lending to'} US`,
  ];
  const flowMid = [`Japan sells ¥${fm(icSalesJpy)} inter-company to Germany`, `Germany buys €${fm(icBuysEur)} inter-company from Japan`];

  // Connector lines (desktop): measured from the boxes and the flow labels.
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const draw = () => {
      if (window.matchMedia('(max-width: 900px)').matches) { setPaths([]); return; }
      const base = el.getBoundingClientRect();
      const r = (q: string) => { const n = el.querySelector(q); return n ? n.getBoundingClientRect() : null; };
      const usB = r('#sb-us'); const jpB = r('#sb-jp'); const deB = r('#sb-de'); const consB = r('#sb-cons');
      if (!usB || !jpB || !deB || !consB) return;
      const out: string[] = [];
      const x = (v: number) => v - base.left;
      const y = (v: number) => v - base.top;
      [0, 1].forEach((k) => {
        const lab = r(`#fl-l${k}`); const labR = r(`#fl-r${k}`); const mid = r(`#fl-m${k}`);
        if (lab) {
          const yy = y(lab.bottom + 3);
          const xx = x(jpB.left) + 26 + k * 40;
          out.push(`M ${x(usB.left)} ${yy} H ${xx} V ${y(jpB.top)}`);
        }
        if (labR) {
          const yy = y(labR.bottom + 3);
          const xx = x(deB.right) - 26 - k * 40;
          out.push(`M ${x(usB.right)} ${yy} H ${xx} V ${y(deB.top)}`);
        }
        if (mid) {
          const yy = y(mid.bottom + 3);
          out.push(`M ${x(jpB.right)} ${yy} H ${x(deB.left)}`);
        }
      });
      setPaths(out);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    if (document.fonts?.ready) document.fonts.ready.then(draw);
    return () => ro.disconnect();
  }, [fin]);

  const r = fin.ratios;

  return (
    <div className="sumdiag" ref={wrap}>
      <svg className="sumdiag__lines" aria-hidden="true">
        {paths.map((d, i) => <path key={i} d={d} />)}
      </svg>
      <p className="sumdiag__title">{title}</p>
      <p className="sumdiag__note">Inter-company amounts in millions</p>

      <div className="sumdiag__flows sumdiag__flows--l">
        {flowJp.map((t, k) => <p key={k} id={`fl-l${k}`}>{t}</p>)}
      </div>
      <div className="sumdiag__us">
        <Box id="sb-us" title="US Holding Company" sub="Millions of USD" tone="unit" onClick={() => onOpen('us', 'bs')} action="US Holding statements">
          <div className="sbox__pair">
            <Mini head={['USD']} rows={[
              ['Revenue', fm(us.is_.Royalties)], ['Inter-co revenue', fm(us.is_.ForeignSourceIncome)], ['EBIT', fm(us.is_.EBIT)], ['EBT', fm(us.is_.EBT)], ['Net income', fm(us.is_.NetIncome)],
            ]} />
            <Mini head={['USD']} rows={[
              ['Current assets', fm(us.bs.CurrentAssets)], ['Investments in subs', fm(us.bs.InvestmentsInSubs)], ['Current liabilities', fm(us.bs.CurrentLiabilities)],
              ['LT liabilities', fm(us.bs.LongTermLiabilities)], ['Equity', fm(us.bs.Equity)],
            ]} />
          </div>
        </Box>
      </div>
      <div className="sumdiag__flows sumdiag__flows--r">
        {flowDe.map((t, k) => <p key={k} id={`fl-r${k}`}>{t}</p>)}
      </div>

      <div className="sumdiag__cons">
        <Box id="sb-cons" title="Consolidated" sub="Millions of USD, except ratios and share price" tone="cons" onClick={() => onOpen('cis')} action="Consolidated statements">
          <div className="sbox__quad">
            <Mini head={['USD']} rows={[['Total revenue', fm(cons.is_.TotalRevenues)], ['EBITDA', fm(cons.is_.EBITDA)], ['EBIT', fm(cons.is_.EBIT)], ['EBT', fm(cons.is_.EBT)], ['Net income', fm(cons.is_.NetIncome)]]} />
            <Mini head={['USD']} rows={[['Current assets', fm(cons.bs.CurrentAssets)], ['Net fixed assets', fm(cons.bs.NetFixedAssets)], ['Current liabilities', fm(cons.bs.CurrentLiabilities)], ['LT liabilities', fm(cons.bs.LongTermLiabilities)], ['Equity', fm(cons.bs.Equity)]]} />
            <Mini head={['Ratio']} rows={[['ST debt / WC', pct(r.STDebtToWC)], ['Debt / assets', pct(r.DebtToAssets)], ['Eff. tax rate', pct(r.EffTaxRate)], ['Eff. int. rate', pct(r.EffIntRate)], ['% FX var to fwd', pct(r.FXVarToFwd)]]} />
            <Mini head={['USD']} rows={[['Quarter EPS', fm(fin.eps)], ['Annual EPS', fm(fin.annualEps)], ['Stock price', fm(fin.pe.price)], ['P/E ratio', fm(fin.pe.pe)], ['Credit rating', fin.pe.rating]]} />
          </div>
        </Box>
      </div>

      <div className="sumdiag__jp">
        <Box id="sb-jp" title="Japanese Sub" sub="Millions of JPY and translated USD" tone="unit" onClick={() => onOpen('japan', 'bs')} action="Japan statements">
          <Mini head={['JPY', 'USD']} rows={[
            ['Revenues', fm(jp.is_.DomesticRevenues + jp.is_.ExportRevenues), fm(jp.isUsd.DomesticRevenues + jp.isUsd.ExportRevenues)],
            ['Inter-co rev/(exp)', fm(jp.is_.InterCompanyRevenues), fm(jp.isUsd.InterCompanyRevenues)],
            ['EBIT', fm(jp.is_.EBIT), fm(jp.isUsd.EBIT)], ['EBT', fm(jp.is_.EBT), fm(jp.isUsd.EBT)], ['Net income', fm(jp.is_.NetIncome), fm(jp.isUsd.NetIncome)],
            ['Current assets', fm(jp.bs.CurrentAssets), fm(jp.bsUsd.CurrentAssets)], ['Net fixed assets', fm(jp.bs.NetFixedAssets), fm(jp.bsUsd.NetFixedAssets)],
            ['Current liabilities', fm(jp.bs.CurrentLiabilities), fm(jp.bsUsd.CurrentLiabilities)], ['LT liabilities', fm(jp.bs.LongTermLiabilities), fm(jp.bsUsd.LongTermLiabilities)],
            ['Equity', fm(jp.bs.Equity), fm(jp.bsUsd.Equity)],
          ]} />
        </Box>
      </div>
      <div className="sumdiag__flows sumdiag__flows--m">
        {flowMid.map((t, k) => <p key={k} id={`fl-m${k}`}>{t}</p>)}
      </div>
      <div className="sumdiag__de">
        <Box id="sb-de" title="German Sub" sub="Millions of EUR and translated USD" tone="unit" onClick={() => onOpen('germany', 'bs')} action="Germany statements">
          <Mini head={['EUR', 'USD']} rows={[
            ['Revenues', fm(de.is_.DomesticRevenues + de.is_.ExportRevenues), fm(de.isUsd.DomesticRevenues + de.isUsd.ExportRevenues)],
            ['Inter-co rev/(exp)', fm(-de.is_.ICPurchases), fm(-de.isUsd.ICPurchases)],
            ['EBIT', fm(de.is_.EBIT), fm(de.isUsd.EBIT)], ['EBT', fm(de.is_.EBT), fm(de.isUsd.EBT)], ['Net income', fm(de.is_.NetIncome), fm(de.isUsd.NetIncome)],
            ['Current assets', fm(de.bs.CurrentAssets), fm(de.bsUsd.CurrentAssets)], ['Net fixed assets', fm(de.bs.NetFixedAssets), fm(de.bsUsd.NetFixedAssets)],
            ['Current liabilities', fm(de.bs.CurrentLiabilities), fm(de.bsUsd.CurrentLiabilities)], ['LT liabilities', fm(de.bs.LongTermLiabilities), fm(de.bsUsd.LongTermLiabilities)],
            ['Equity', fm(de.bs.Equity), fm(de.bsUsd.Equity)],
          ]} />
        </Box>
      </div>
    </div>
  );
}
