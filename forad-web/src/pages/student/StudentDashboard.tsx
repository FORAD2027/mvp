import { useAuth } from '../../lib/auth';
import { useRouter } from '../../lib/router';
import { appNow } from '../../data/session';
import { deadlineLabel, timeLeft } from '../../lib/format';
import { FINANCIALS_ARE_SAMPLE, finFor, type FinPeriod } from '../../data/financials';
import SummaryDiagram from '../../components/fin/SummaryDiagram';
import Statement from '../../components/fin/Statement';
import PeScoring from '../../components/fin/PeScoring';
import { CONS_BS, CONS_IS, SUB_BS, SUB_CF, SUB_IS, US_BS, US_CF, US_IS, type Row } from '../../components/fin/rows';

type Report = 'summary' | 'cbs' | 'cis' | 'pe' | 'japan' | 'germany' | 'us';
const REPORTS: { id: Report; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'cbs', label: 'Consolidated balance sheet' },
  { id: 'cis', label: 'Consolidated income statement' },
  { id: 'pe', label: 'PE scoring' },
  { id: 'japan', label: 'Japan' },
  { id: 'germany', label: 'Germany' },
  { id: 'us', label: 'US Holding' },
];

type SubReport = 'bs' | 'bsUsd' | 'is' | 'isUsd' | 'cf';
const ENTITY = {
  japan: { name: 'Japanese subsidiary', ccy: 'JPY' },
  germany: { name: 'German subsidiary', ccy: 'EUR' },
} as const;

export interface ReportsState { r?: string; s?: string; v?: string }

/** The Summary screen and Results reports. Used on the Dashboard page and in the Summary pop-up. */
export function DashboardReports({ state, onChange }: { state: ReportsState; onChange: (next: ReportsState) => void }) {
  const { session } = useAuth();
  const P = session.currentPeriod;
  const fc = finFor(P);
  const act = finFor(P - 1);

  const report: Report = (REPORTS.find((r) => r.id === state.r)?.id ?? 'summary');
  const sub = (state.s as SubReport) || 'bs';
  const showActual = state.v === 'actual';
  const go = (r: string, s?: string, v?: string) => onChange({ r, s, v });

  if (!fc || !act) return <p>No results for this period.</p>;
  const cols = (pick: (f: FinPeriod) => Record<string, number>) => [
    { label: `Period ${P - 1} actual`, data: pick(act) },
    { label: `Period ${P} forecast`, data: pick(fc) },
  ];

  let body: JSX.Element;
  if (report === 'summary') {
    body = (
      <div className="stack">
        <div className="pills" role="group" aria-label="Which period">
          <button type="button" aria-pressed={!showActual} className={`pill ${!showActual ? 'is-active' : ''}`} onClick={() => go('summary', undefined, undefined)}>
            Period {P} forecast
          </button>
          <button type="button" aria-pressed={showActual} className={`pill ${showActual ? 'is-active' : ''}`} onClick={() => go('summary', undefined, 'actual')}>
            Period {P - 1} actual
          </button>
        </div>
        <SummaryDiagram
          fin={showActual ? act : fc}
          title={showActual ? `FORAD summary · Period ${P - 1} actual` : `FORAD summary · Period ${P} forecast`}
          onOpen={(r, s) => go(r, s)}
        />
      </div>
    );
  } else if (report === 'cbs') {
    body = <Statement title="Consolidated balance sheet" unit="Millions of USD" rows={CONS_BS} cols={cols((f) => f.cons.bs)} />;
  } else if (report === 'cis') {
    body = <Statement title="Consolidated income statement" unit="Millions of USD" rows={CONS_IS} cols={cols((f) => f.cons.is_)} />;
  } else if (report === 'pe') {
    body = <PeScoring fin={fc} cols={[{ label: `Period ${P - 1} actual`, fin: act }, { label: `Period ${P} forecast`, fin: fc }]} />;
  } else if (report === 'us') {
    const s = (['bs', 'is', 'cf'] as const).includes(sub as 'bs') ? sub : 'bs';
    const map: Record<string, { title: string; rows: Row[]; pick: (f: FinPeriod) => Record<string, number> }> = {
      bs: { title: 'Balance sheet', rows: US_BS, pick: (f) => f.us.bs },
      is: { title: 'Income statement', rows: US_IS, pick: (f) => f.us.is_ },
      cf: { title: 'Cash flow', rows: US_CF, pick: (f) => f.us.cf },
    };
    const m = map[s];
    body = (
      <div className="stack">
        <SubPills value={s} options={[['bs', 'Balance sheet'], ['is', 'Income statement'], ['cf', 'Cash flow']]} onPick={(v) => go('us', v)} />
        <Statement title={`US Holding Company · ${m.title}`} unit="Millions of USD" rows={m.rows} cols={cols(m.pick)} />
      </div>
    );
  } else {
    const e = ENTITY[report];
    const opts: [SubReport, string][] = [
      ['bs', `Balance sheet · ${e.ccy}`], ['bsUsd', 'Balance sheet · USD'],
      ['is', `Income statement · ${e.ccy}`], ['isUsd', 'Income statement · USD'],
      ['cf', `Cash flow · ${e.ccy}`],
    ];
    const s: SubReport = opts.some(([k]) => k === sub) ? sub : 'bs';
    const pickers: Record<SubReport, { title: string; rows: Row[]; unit: string; pick: (f: FinPeriod) => Record<string, number> }> = {
      bs: { title: `Balance sheet · ${e.ccy}`, rows: SUB_BS, unit: `Millions of ${e.ccy}`, pick: (f) => f[report].bs },
      bsUsd: { title: 'Balance sheet · USD', rows: SUB_BS, unit: 'Millions of USD, translated at the end-of-period rate', pick: (f) => f[report].bsUsd },
      is: { title: `Income statement · ${e.ccy}`, rows: SUB_IS, unit: `Millions of ${e.ccy}`, pick: (f) => f[report].is_ },
      isUsd: { title: 'Income statement · USD', rows: SUB_IS, unit: 'Millions of USD, translated at the average rate', pick: (f) => f[report].isUsd },
      cf: { title: `Cash flow · ${e.ccy}`, rows: SUB_CF, unit: `Millions of ${e.ccy}`, pick: (f) => f[report].cf },
    };
    const m = pickers[s];
    body = (
      <div className="stack">
        <SubPills value={s} options={opts} onPick={(v) => go(report, v)} />
        <Statement title={`${e.name} · ${m.title}`} unit={m.unit} rows={m.rows} cols={cols(m.pick)} />
      </div>
    );
  }

  return (
    <div className="stack">
        <div className="rtabs" role="tablist" aria-label="Report">
          {REPORTS.map((r) => (
            <button key={r.id} role="tab" type="button" aria-selected={report === r.id} className={`rtab ${report === r.id ? 'is-active' : ''}`} onClick={() => go(r.id)}>
              {r.label}
            </button>
          ))}
        </div>

        {body}
    </div>
  );
}

/** Dashboard = FORAD 2.0 Summary screen, with the Results reports one tab away. */
export default function StudentDashboard() {
  const { session } = useAuth();
  const { route, navigate } = useRouter();
  const P = session.currentPeriod;
  const left = timeLeft(session.deadline, appNow());

  return (
    <div className="stack-lg">
      <section className="pagehead">
        <p className="eyebrow">{session.teamName} · Period {P} · {session.term}</p>
        <div className="pagehead__row">
          <h1>Period {P} summary</h1>
          <div className="pagehead__actions">
            <button type="button" className="btn btn--ghost" onClick={() => navigate('/student/execution', { view: 'stress' })}>Stress test lab</button>
            <button type="button" className="btn btn--primary" onClick={() => navigate('/student/execution', { view: 'decisions' })}>Open Period {P} decision</button>
          </div>
        </div>
        <p className="lead">
          Projected results for the period you are deciding, next to last period’s actuals. Decisions are due{' '}
          <strong>{deadlineLabel(session.deadline)}</strong> ({left.text.toLowerCase()}).
        </p>
        {FINANCIALS_ARE_SAMPLE && (
          <p className="notice notice--quiet small">
            <strong>Sample figures.</strong> These statements are a consistent sample for {session.teamName}. They will come from your team’s results and
            recalculate from your decisions once the simulation engine is connected.
          </p>
        )}
      </section>

      <DashboardReports
        state={{ r: route.params.r, s: route.params.s, v: route.params.v }}
        onChange={(n) => navigate('/student', { r: n.r, s: n.s, v: n.v })}
      />
    </div>
  );
}

function SubPills<T extends string>({ value, options, onPick }: { value: T; options: [T, string][]; onPick: (v: T) => void }) {
  return (
    <div className="pills" role="group" aria-label="Statement">
      {options.map(([k, l]) => (
        <button key={k} type="button" aria-pressed={value === k} className={`pill ${value === k ? 'is-active' : ''}`} onClick={() => onPick(k)}>{l}</button>
      ))}
    </div>
  );
}
