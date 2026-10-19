import NumberField from '../../../components/NumberField';
import OperationsTable from './OperationsTable';
import InvestingTable from './InvestingTable';
import FinancingTable from './FinancingTable';
import HedgingTable from './HedgingTable';
import IrHedgingTable from './IrHedgingTable';
import { bimrFor } from '../../../data/bimr';
import { useAuth } from '../../../lib/auth';
import { useDecision } from '../../../lib/decisionStore';
import { actualsFor } from '../../../data/actuals';
import { PREDICTION_FIELDS } from '../../../data/predictionFields';
import type { PredictionKey } from '../../../data/decision';
import { num } from '../../../lib/format';
import { findCountry, findSection, type CountryDef, type Position, type SectionDef } from './structure';

interface Props {
  country: CountryDef;
  section: SectionDef;
  onGo: (p: Position) => void;
}

/** One country section: its forecasts (live inputs) and the decisions it will hold. */
export default function SectionView({ country, section, onGo }: Props) {
  const { session } = useAuth();
  const { draft, defaults, issues, setPrediction, resetPrediction } = useDecision();
  const last = actualsFor(session.currentPeriod - 1);
  const issueFor = (k: PredictionKey) => issues.find((i) => i.key === k && i.severity === 'error');

  const linked = section.linkedForecast;
  const linkedField = linked ? PREDICTION_FIELDS[linked.key] : null;
  const linkedWhere = linked ? `${findCountry(linked.country).name} · ${findSection(findCountry(linked.country), linked.section).label}` : '';

  if (section.id === 'ir-hedging') {
    return <IrHedgingTable />;
  }

  if (section.kind === 'hedging') {
    const ccy = section.id.replace('hedging-', '').toUpperCase() as 'USD' | 'JPY' | 'EUR';
    return <HedgingTable entity={country.id} ccy={ccy} onGo={onGo} />;
  }

  if (section.kind === 'financing') {
    return <FinancingTable entity={country.id} />;
  }

  if (section.kind === 'investing') {
    return (
      <div className="stack">
        <InvestingTable entity={country.id} />
      </div>
    );
  }

  if (section.kind === 'operations' && (country.id === 'japan' || country.id === 'germany')) {
    const report = bimrFor(session.currentPeriod);
    return (
      <div className="stack">
        <OperationsTable entity={country.id} onGo={onGo} />
        {country.id === 'germany' && (
          <section className="card tendercard" aria-labelledby="tender-title">
            <div>
              <h2 id="tender-title" className="card__title">Tender market</h2>
              <p className="card__sub">
                {report?.tenderOutlook ?? 'No tender market announced for this period.'}
              </p>
            </div>
            <span className="chip chip--muted">Bidding arrives with S-07</span>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="stack">
      {section.forecasts.length > 0 && (
        <section className="card" aria-labelledby={`${country.id}-${section.id}-fc`}>
          <header className="entity__head">
            <h2 id={`${country.id}-${section.id}-fc`} className="card__title">
              {section.forecasts.length === 1 ? 'Your forecast' : 'Your forecasts'}
            </h2>
            <span className="chip chip--muted">Starts at Period {session.currentPeriod - 1} actual</span>
          </header>
          <p className="card__sub">
            Your projection is built on these. When the period runs, the actual figures replace them.
          </p>
          <div className="fields3">
            {section.forecasts.map((k) => {
              const f = PREDICTION_FIELDS[k];
              return (
                <NumberField
                  key={k}
                  label={f.label}
                  value={draft.predictions[k]}
                  defaultValue={defaults[k]}
                  decimals={f.decimals}
                  step={f.step}
                  unit={f.unit}
                  onChange={(v) => setPrediction(k, v)}
                  onReset={() => resetPrediction(k)}
                  issue={issueFor(k)}
                  help={f.help}
                  defaultLabel={k === 'eps' ? 'No default' : undefined}
                  context={k === 'eps' ? 'Your team’s last EPS will appear here once team results are connected.' : k === 'oil' && last && last.oil === null ? 'No oil price was published for last period.' : undefined}
                />
              );
            })}
          </div>
        </section>
      )}

      {linked && linkedField && (
        <section className="card linked">
          <div>
            <p className="muted small">Your end-of-period forecast, used for this section</p>
            <p className="linked__value">
              {linkedField.short}: <span className="mono">{num(draft.predictions[linked.key], linkedField.decimals)}</span>
            </p>
            <p className="muted small">Set once for the whole company in {linkedWhere}.</p>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onGo({ country: linked.country, section: linked.section })}>
            Change in {linkedWhere}
          </button>
        </section>
      )}

      {section.planned.length > 0 && (
        <section className="card" aria-labelledby={`${country.id}-${section.id}-dec`}>
          <header className="entity__head">
            <h2 id={`${country.id}-${section.id}-dec`} className="card__title">Decisions</h2>
            <span className="chip chip--muted">Inputs arrive with {section.backlog}</span>
          </header>
          <ul className="planned planned--grid">
            {section.planned.map((d) => (
              <li key={d.name}>
                <span className="planned__name">{d.name}</span>
                <span className="planned__note">{d.note}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {country.id === 'us' && section.id === 'operations' && (
        <div className="notice notice--quiet">
          <strong>No production here.</strong> Japan and Germany run the operations. The holding company’s income is
          royalties plus whatever the subsidiaries send it as dividends and interest.
        </div>
      )}
    </div>
  );
}
