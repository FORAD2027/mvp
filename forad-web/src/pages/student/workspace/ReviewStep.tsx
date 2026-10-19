import { useDecision } from '../../../lib/decisionStore';
import NumberField from '../../../components/NumberField';
import { PREDICTION_FIELDS } from '../../../data/predictionFields';
import type { PredictionKey } from '../../../data/decision';
import { num } from '../../../lib/format';
import { COUNTRIES, locateForecast, type Position } from './structure';

export default function ReviewStep({ onGo }: { onGo: (p: Position) => void }) {
  const { draft, defaults, issues, setPrediction, resetPrediction, opsIssues, opsChanged, invIssues, invChanged, finIssues, finChanged, hedgeIssues, hedgeChanged } = useDecision();
  const errors = issues.filter((i) => i.severity === 'error');
  const label = (k: PredictionKey) => PREDICTION_FIELDS[k].short;

  const pending = [
    { name: 'Tender bid', backlog: 'S-07', pos: { country: 'germany', section: 'operations' } as Position },
  ];

  const epsField = PREDICTION_FIELDS.eps;
  const epsIssue = issues.find((i) => i.key === 'eps' && i.severity === 'error');

  return (
    <div className="stack">
      <section className="card" aria-labelledby="eps-title">
        <header className="entity__head">
          <h2 id="eps-title" className="card__title">Forecast EPS for the quarter</h2>
          <span className="chip chip--muted">Locked when you submit</span>
        </header>
        <p className="card__sub">Your company-wide earnings forecast. The Planning score compares it with the actual EPS after the period runs.</p>
        <div className="fields3">
          <NumberField
            label={epsField.label}
            value={draft.predictions.eps}
            defaultValue={defaults.eps}
            decimals={epsField.decimals}
            step={epsField.step}
            unit={epsField.unit}
            onChange={(v) => setPrediction('eps', v)}
            onReset={() => resetPrediction('eps')}
            issue={epsIssue}
            help={epsField.help}
            defaultLabel="No default"
            context="Check the projected EPS on the Summary before you settle on this."
          />
        </div>
      </section>

      <section className="card">
        <h2 className="card__title">Checks</h2>
        <ul className="checks">
          <li className={errors.length ? 'is-bad' : 'is-ok'}>
            <span className="checks__icon" aria-hidden="true">{errors.length ? '!' : '✓'}</span>
            <div>
              <strong>{errors.length ? `${errors.length} forecast${errors.length === 1 ? '' : 's'} to fix` : 'Forecasts are complete'}</strong>
              <span>{errors.length ? errors.map((e) => `${label(e.key)}: ${e.message}`).join(' ') : 'Every forecast has a valid value.'}</span>
            </div>
            {errors.length > 0 && errors[0].key !== 'eps' && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onGo(locateForecast(errors[0].key))}>Fix</button>
            )}
          </li>
          <li className={opsIssues.length ? 'is-bad' : 'is-ok'}>
            <span className="checks__icon" aria-hidden="true">{opsIssues.length ? '!' : '✓'}</span>
            <div>
              <strong>{opsIssues.length ? `${opsIssues.length} operations input${opsIssues.length === 1 ? '' : 's'} to fix` : 'Operations are within the limits'}</strong>
              <span>
                {opsIssues.length
                  ? opsIssues.map((e) => `${e.entity === 'japan' ? 'Japan' : 'Germany'}: ${e.message}`).join(' ')
                  : `${opsChanged.length} of the operations inputs changed from last period.`}
              </span>
            </div>
            {opsIssues.length > 0 && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onGo({ country: opsIssues[0].entity, section: 'operations' })}>Fix</button>
            )}
          </li>
          <li className={invIssues.length ? 'is-bad' : 'is-ok'}>
            <span className="checks__icon" aria-hidden="true">{invIssues.length ? '!' : '✓'}</span>
            <div>
              <strong>{invIssues.length ? `${invIssues.length} investing input${invIssues.length === 1 ? '' : 's'} to fix` : 'Investing is within the limits'}</strong>
              <span>
                {invIssues.length
                  ? invIssues.map((e) => `${e.entity === 'us' ? 'US Holding' : e.entity === 'japan' ? 'Japan' : 'Germany'}: ${e.message}`).join(' ')
                  : `${invChanged.length} of the investing inputs changed from the defaults.`}
              </span>
            </div>
            {invIssues.length > 0 && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onGo({ country: invIssues[0].entity, section: 'investing' })}>Fix</button>
            )}
          </li>
          <li className={finIssues.length ? 'is-bad' : 'is-ok'}>
            <span className="checks__icon" aria-hidden="true">{finIssues.length ? '!' : '✓'}</span>
            <div>
              <strong>{finIssues.length ? `${finIssues.length} financing input${finIssues.length === 1 ? '' : 's'} to fix` : 'Financing is within the limits'}</strong>
              <span>
                {finIssues.length
                  ? finIssues.map((e) => `${e.entity === 'us' ? 'US Holding' : e.entity === 'japan' ? 'Japan' : 'Germany'}: ${e.message}`).join(' ')
                  : `${finChanged.length} of the financing inputs changed from the defaults.`}
              </span>
            </div>
            {finIssues.length > 0 && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onGo({ country: finIssues[0].entity, section: 'financing' })}>Fix</button>
            )}
          </li>
          <li className={hedgeIssues.length ? 'is-bad' : 'is-ok'}>
            <span className="checks__icon" aria-hidden="true">{hedgeIssues.length ? '!' : '✓'}</span>
            <div>
              <strong>{hedgeIssues.length ? `${hedgeIssues.length} hedging input${hedgeIssues.length === 1 ? '' : 's'} to fix` : 'Hedging is within the limits'}</strong>
              <span>
                {hedgeIssues.length
                  ? hedgeIssues.map((e) => `${e.entity === 'us' ? 'US Holding' : e.entity === 'japan' ? 'Japan' : 'Germany'} ${e.ccy}: ${e.message}`).join(' ')
                  : `${hedgeChanged.length} of the hedging inputs changed from the defaults.`}
              </span>
            </div>
            {hedgeIssues.length > 0 && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onGo({ country: hedgeIssues[0].entity, section: hedgeIssues[0].ccy === 'IR' ? 'ir-hedging' : `hedging-${hedgeIssues[0].ccy.toLowerCase()}` })}>Fix</button>
            )}
          </li>
          {pending.map((p) => (
            <li key={p.name} className="is-soon">
              <span className="checks__icon" aria-hidden="true">·</span>
              <div>
                <strong>{p.name}</strong>
                <span>Arrive with {p.backlog}.</span>
              </div>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onGo(p.pos)}>Open</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="card__title">Your forecasts</h2>
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Entity</th>
                <th scope="col">Forecast</th>
                <th scope="col" className="num">Yours</th>
                <th scope="col" className="num">Last actual</th>
                <th scope="col"><span className="sr-only">Edit</span></th>
              </tr>
            </thead>
            <tbody>
              {COUNTRIES.flatMap((c) =>
                c.sections.flatMap((s) =>
                  s.forecasts.map((k) => {
                    const f = PREDICTION_FIELDS[k];
                    const v = draft.predictions[k];
                    const changed = Math.abs(v - defaults[k]) > 1e-12;
                    return (
                      <tr key={k}>
                        <td>{c.name}</td>
                        <th scope="row">
                          {f.short} <span className="muted small">{f.unit}</span>
                        </th>
                        <td className="num"><span className={`mono ${changed ? 'strong' : ''}`}>{num(v, f.decimals)}</span></td>
                        <td className="num"><span className="mono muted">{num(defaults[k], f.decimals)}</span></td>
                        <td className="num">
                          <button type="button" className="linkbtn small" onClick={() => onGo({ country: c.id, section: s.id })}>
                            {s.label}
                          </button>
                        </td>
                      </tr>
                    );
                  }),
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cta">
        <div>
          <h2>Submitting arrives with S-15</h2>
          <p>
            Once every section has inputs, you will submit here before the deadline. Your forecast EPS of $
            {num(draft.predictions.eps, 2)} will be locked for the Planning score.
          </p>
        </div>
        <button type="button" className="btn btn--light btn--lg" disabled>Submit decision</button>
      </section>
    </div>
  );
}
