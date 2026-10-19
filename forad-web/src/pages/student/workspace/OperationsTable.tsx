import { useEffect, useId, useState, type ReactNode } from 'react';
import { useAuth } from '../../../lib/auth';
import { useDecision } from '../../../lib/decisionStore';
import { bimrFor, type Ccy } from '../../../data/bimr';
import type { PredictionKey } from '../../../data/decision';
import {
  CCY_OPTIONS, DAY_ADJUSTMENT, DAY_OPTIONS, RULES,
  type Days, type GermanyOps, type JapanOps, type OpsEntity,
} from '../../../data/operations';
import { POSITION_IS_SAMPLE } from '../../../data/teamPosition';
import { num } from '../../../lib/format';
import type { Position } from './structure';

const fmt = (v: number, d = 0) => num(v, d);
const pctAdj = (x: number) => (x === 0 ? '' : `${x > 0 ? '+' : '−'}${Math.abs(x * 100)}%`);

/* ------------------------------------------------------------------ cells */

export function CellNumber({
  id, value, decimals = 0, onChange, invalid, describedBy, label,
}: { id: string; value: number; decimals?: number; onChange: (v: number) => void; invalid?: boolean; describedBy?: string; label: string }) {
  const show = (v: number) => (Number.isFinite(v) ? new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v) : '');
  const [text, setText] = useState(() => show(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(show(value)); }, [value, focused]); // eslint-disable-line react-hooks/exhaustive-deps
  const commit = (raw: string) => {
    const c = raw.replace(/[,\s]/g, '');
    if (c === '' || c === '-' || c === '.') return;
    const n = Number(c);
    if (Number.isFinite(n)) onChange(n);
  };
  return (
    <input
      id={id}
      className={`ocell__input mono ${invalid ? 'is-invalid' : ''}`}
      inputMode="decimal"
      aria-label={label}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => { setText(e.target.value); commit(e.target.value); }}
      onBlur={() => { setFocused(false); setText(show(value)); }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    />
  );
}

export function CellSelect<T extends string | number>({
  id, value, options, render, onChange, label,
}: { id: string; value: T; options: T[]; render: (o: T) => string; onChange: (v: T) => void; label: string }) {
  return (
    <select id={id} className="ocell__select mono" aria-label={label} value={String(value)} onChange={(e) => onChange(options.find((o) => String(o) === e.target.value)!)}>
      {options.map((o) => <option key={String(o)} value={String(o)}>{render(o)}</option>)}
    </select>
  );
}

/* ------------------------------------------------------------------ rows */

interface RowProps {
  label: string;
  last: ReactNode;
  children: ReactNode; // decision cell
  editable?: boolean;
  changed?: boolean;
  note?: ReactNode;
  issue?: string;
  tone?: 'bad';
  idBase?: string;
}

export function Row({ label, last, children, editable, changed, note, issue, tone, idBase }: RowProps) {
  const auto = useId();
  const base = idBase ?? auto;
  return (
    <tr className={`orow ${editable ? 'orow--input' : 'orow--calc'} ${changed ? 'is-changed' : ''} ${issue ? 'is-bad' : ''}`}>
      <th scope="row">
        {editable ? <label htmlFor={`${base}-in`}>{label}</label> : label}
        <span className="orow__lastinline mono">Last: {last}</span>
      </th>
      <td className="num mono ocell--last">{last}</td>
      <td className={`num ocell ${tone === 'bad' ? 'ocell--bad' : ''}`}>
        {children}
        {note && !issue && <span className="ocell__note" id={`${base}-note`}>{note}</span>}
        {issue && <span className="ocell__issue" id={`${base}-issue`} role="alert">{issue}</span>}
      </td>
    </tr>
  );
}

export function Group({ title }: { title: string }) {
  return (
    <tr className="ogroup">
      <th scope="rowgroup" colSpan={3}>{title}</th>
    </tr>
  );
}

/* ------------------------------------------------------------------ table */

export default function OperationsTable({ entity, onGo }: { entity: OpsEntity; onGo: (p: Position) => void }) {
  const { session } = useAuth();
  const { draft, issues, changedKeys, setPrediction, lastPos, derived, opsIssues, opsChanged, setOps, resetOpsEntity, resetPrediction } = useDecision();
  const P = session.currentPeriod;
  const report = bimrFor(P);
  const preferred: Ccy = report?.forecast.markets[entity].invoiceCurrency ?? 'USD';
  const d = derived[entity];
  const r = RULES[entity];
  const sym = r.sym;
  const uid = useId();

  const issue = (k: string) => opsIssues.find((i) => i.entity === entity && i.key === k)?.message;
  const changed = (k: string) => opsChanged.includes(`${entity}.${k}`);
  const fcChanged = (k: PredictionKey) => changedKeys.includes(k);
  const id = (k: string) => `${uid}-${k}`;

  const numRow = (k: string, label: string, value: number, lastV: number, set: (v: number) => void, note?: ReactNode, decimals = 0) => {
    const iss = issue(k);
    return (
      <Row key={k} label={label} last={fmt(lastV, decimals)} editable changed={changed(k)} issue={iss} note={note} idBase={id(k)}>
        <CellNumber id={`${id(k)}-in`} label={label} value={value} decimals={decimals} onChange={set} invalid={!!iss} describedBy={iss ? `${id(k)}-issue` : note ? `${id(k)}-note` : undefined} />
      </Row>
    );
  };
  const fcRow = (k: PredictionKey, label: string, lastV: number | null, decimals = 0) => {
    const iss = issues.find((i) => i.key === k && i.severity === 'error')?.message;
    return (
      <Row key={k} label={label} last={lastV === null ? '—' : fmt(lastV, decimals)} editable changed={fcChanged(k)} issue={iss} idBase={id(k)}
        note={fcChanged(k) ? <button type="button" className="linkbtn" onClick={() => resetPrediction(k)}>Reset</button> : undefined}>
        <CellNumber id={`${id(k)}-in`} label={label} value={draft.predictions[k]} decimals={decimals} onChange={(v) => setPrediction(k, v)} invalid={!!iss} describedBy={iss ? `${id(k)}-issue` : undefined} />
      </Row>
    );
  };
  const daysRow = (k: string, label: string, value: Days, lastV: Days, set: (v: Days) => void, what: 'price' | 'cost') => (
    <Row key={k} label={label} last={fmt(lastV)} editable changed={changed(k)} idBase={id(k)}
      note={DAY_ADJUSTMENT[value] ? `${what} ${pctAdj(DAY_ADJUSTMENT[value])}` : undefined}>
      <CellSelect id={`${id(k)}-in`} label={label} value={value} options={DAY_OPTIONS} render={(o) => String(o)} onChange={set} />
    </Row>
  );
  const ccyRow = (k: string, label: string, value: Ccy, lastV: Ccy, set: (v: Ccy) => void, penalty: boolean) => (
    <Row key={k} label={label} last={lastV} editable changed={changed(k)} idBase={id(k)}
      note={penalty && value !== preferred ? `price −1% (preferred: ${preferred})` : undefined}>
      <CellSelect id={`${id(k)}-in`} label={label} value={value} options={CCY_OPTIONS} render={(o) => (penalty && o === preferred ? `${o} (pref.)` : o)} onChange={set} />
    </Row>
  );

  const capNote = d.capacityAdded > 0 ? `+${fmt(d.capacityAdded)} · ${sym}${fmt(d.capacityCost)} on day 0` : undefined;
  const excessNote = d.salesFromCurrent > 0 ? `+${RULES.excessProductionCost * 100}% production cost on these units` : undefined;

  let rows: ReactNode;
  if (entity === 'japan') {
    const o = draft.operations.japan;
    const lj = lastPos.japan;
    const g = draft.operations.germany;
    const set = <K extends keyof JapanOps>(k: K) => (v: JapanOps[K]) => setOps('japan', k, v);
    const covered = o.oilFutures && derived.japan.oilExposure ? Math.round((o.oilFutures * RULES.oilContractBarrels) / -derived.japan.oilExposure * 100) : 0;
    rows = (
      <>
        <Group title="Capacity and inventory" />
        {numRow('capacity', 'Capacity', o.capacity, lj.capacity, set('capacity'), capNote)}
        <Row label="Beginning inventory" last={fmt(lj.beginningInventory)}>{fmt(d.beginningInventory)}</Row>
        {numRow('production', 'Production decided', o.production, lj.production, set('production'))}
        <Row label="Sales volume" last={fmt(lj.salesVolume)}>{fmt(d.salesVolume)}</Row>
        <Row label="Ending inventory" last={fmt(lj.endingInventory)} tone={d.endingInventory < 0 ? 'bad' : undefined}>{fmt(d.endingInventory)}</Row>
        <Row label="Sales from current production" last={fmt(lj.salesFromCurrent)} note={excessNote}>{fmt(d.salesFromCurrent)}</Row>

        <Group title="Sales forecast" />
        {fcRow('jpDomesticUnits', 'Domestic sales units', lj.domesticUnits)}
        {fcRow('jpExportUnits', 'Export sales units', lj.exportUnits)}
        {fcRow('jpPrice', 'Price forecast (JPY)', lj.price)}
        <Row label="Inter-company sales units" last={fmt(lj.icUnits)} note={`2 × Germany production (${fmt(g.production)})`}>{fmt(derived.japan.icUnits)}</Row>

        <Group title="Currency of invoice" />
        {ccyRow('exportCurrency', 'Export currency', o.exportCurrency, lj.exportCurrency, set('exportCurrency'), true)}
        <Row label="Inter-company currency" last={lastPos.germany.icCurrency} note={<SetIn onGo={onGo} />}>{g.icCurrency}</Row>
        <Row label="Inter-company sales price (USD)" last={fmt(lastPos.germany.icPrice, 2)} note={<SetIn onGo={onGo} />}>{fmt(g.icPrice, 2)}</Row>

        <Group title="Collection and payment days" />
        {daysRow('domCollectDays', 'Domestic collections days', o.domCollectDays, lj.domCollectDays, set('domCollectDays'), 'price')}
        {daysRow('expCollectDays', 'Export collections days', o.expCollectDays, lj.expCollectDays, set('expCollectDays'), 'price')}
        <Row label="Inter-company collection days" last={fmt(lastPos.germany.icDays)} note={<SetIn onGo={onGo} />}>{fmt(g.icDays)}</Row>
        {daysRow('domPayDays', 'Domestic payables days', o.domPayDays, lj.domPayDays, set('domPayDays'), 'cost')}
        {daysRow('importPayDays', 'Import payable days', o.importPayDays, lj.importPayDays, set('importPayDays'), 'cost')}

        <Group title="Dividend" />
        {numRow('dividend', 'Dividend to holding company (JPY)', o.dividend, lj.dividend, set('dividend'), 'Paid on day 90')}

        <Group title="Oil" />
        {fcRow('oil', 'Ending oil price per barrel (USD)', lj.oilPrice, 2)}
        <Row label="Oil futures price per barrel (USD)" last={lj.oilFuturesPrice === null ? '—' : fmt(lj.oilFuturesPrice, 2)} note="Not in this period’s report">—</Row>
        <Row label="Oil exposure long/(short) (barrels)" last={fmt(lj.oilExposure)}>{fmt(derived.japan.oilExposure)}</Row>
        {numRow('oilFutures', 'Oil futures, 1 contract = 1,000 barrels, buy/(sell)', o.oilFutures, lj.oilFutures, set('oilFutures'),
          o.oilFutures > 0 ? `Buys ${fmt(o.oilFutures * RULES.oilContractBarrels)} barrels · ${covered}% of exposure` : o.oilFutures < 0 ? `Sells ${fmt(-o.oilFutures * RULES.oilContractBarrels)} barrels` : undefined)}
      </>
    );
  } else {
    const o = draft.operations.germany;
    const lg = lastPos.germany;
    const set = <K extends keyof GermanyOps>(k: K) => (v: GermanyOps[K]) => setOps('germany', k, v);
    const lo = lg.icPrice * (1 - RULES.icBand);
    const hi = lg.icPrice * (1 + RULES.icBand);
    rows = (
      <>
        <Group title="Capacity and inventory" />
        {numRow('capacity', 'Capacity', o.capacity, lg.capacity, set('capacity'), capNote)}
        <Row label="Beginning inventory" last={fmt(lg.beginningInventory)}>{fmt(d.beginningInventory)}</Row>
        {numRow('production', 'Production decided', o.production, lg.production, set('production'), `Uses ${fmt(2 * o.production)} units from Japan`)}
        <Row label="Sales volume" last={fmt(lg.salesVolume)}>{fmt(d.salesVolume)}</Row>
        <Row label="Ending inventory" last={fmt(lg.endingInventory)} tone={d.endingInventory < 0 ? 'bad' : undefined}>{fmt(d.endingInventory)}</Row>
        <Row label="Sales from current production" last={fmt(lg.salesFromCurrent)} note={excessNote}>{fmt(d.salesFromCurrent)}</Row>

        <Group title="Sales forecast" />
        {fcRow('deDomesticUnits', 'Domestic sales units', lg.domesticUnits)}
        {fcRow('deExportUnits', 'Export sales units', lg.exportUnits)}
        {fcRow('dePrice', 'Price forecast (EUR)', lg.price)}

        <Group title="Currency of invoice and inter-company" />
        {ccyRow('exportCurrency', 'Export currency', o.exportCurrency, lg.exportCurrency, set('exportCurrency'), true)}
        {ccyRow('icCurrency', 'Inter-company currency', o.icCurrency, lg.icCurrency, set('icCurrency'), false)}
        {numRow('icPrice', 'Inter-company sales price (USD)', o.icPrice, lg.icPrice, set('icPrice'), `Allowed ${fmt(lo, 2)} to ${fmt(hi, 2)}`, 2)}

        <Group title="Collection and payment days" />
        {daysRow('domCollectDays', 'Domestic collections days', o.domCollectDays, lg.domCollectDays, set('domCollectDays'), 'price')}
        {daysRow('expCollectDays', 'Export collections days', o.expCollectDays, lg.expCollectDays, set('expCollectDays'), 'price')}
        <Row label="Inter-company collection days" last={fmt(lg.icDays)} editable changed={changed('icDays')} idBase={id('icDays')} note="Japan collects on these days">
          <CellSelect id={`${id('icDays')}-in`} label="Inter-company collection days" value={o.icDays} options={DAY_OPTIONS} render={(x) => String(x)} onChange={set('icDays')} />
        </Row>
        {daysRow('domPayDays', 'Domestic payables days', o.domPayDays, lg.domPayDays, set('domPayDays'), 'cost')}
        {daysRow('importPayDays', 'Import payable days', o.importPayDays, lg.importPayDays, set('importPayDays'), 'cost')}

        <Group title="Dividend" />
        {numRow('dividend', 'Dividend to holding company (EUR)', o.dividend, lg.dividend, set('dividend'), 'Paid on day 90')}
      </>
    );
  }

  const anyChanged = opsChanged.some((k) => k.startsWith(`${entity}.`));
  const name = entity === 'japan' ? 'Japanese' : 'German';

  return (
    <section className="card ops" aria-labelledby={`${uid}-title`}>
      <header className="entity__head">
        <div>
          <h2 id={`${uid}-title`} className="card__title">{name} sub: operations</h2>
          {POSITION_IS_SAMPLE && <p className="card__sub">Period {P - 1} company figures are a sample until your team’s results are connected.</p>}
        </div>
        <button type="button" className="btn btn--ghost btn--sm" disabled={!anyChanged} onClick={() => resetOpsEntity(entity)}>
          Reset to Period {P - 1}
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
    </section>
  );
}

function SetIn({ onGo }: { onGo: (p: Position) => void }) {
  return (
    <button type="button" className="linkbtn" onClick={() => onGo({ country: 'germany', section: 'operations' })}>
      Set in Germany
    </button>
  );
}
