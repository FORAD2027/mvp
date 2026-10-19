import { useRouter } from '../../../lib/router';
import { useAuth } from '../../../lib/auth';
import { useDecision } from '../../../lib/decisionStore';
import { COUNTRIES, SEQUENCE, findCountry, findSection, type CountryDef, type Position } from './structure';
import SectionView from './SectionView';
import ReviewStep from './ReviewStep';

/** S-04: country tabs (US, Japan, Germany), each with Operations, Investing, Financing and Hedging. */
export default function Workspace() {
  const { route, navigate } = useRouter();
  const { session } = useAuth();
  const { issues, changedKeys, draft, opsIssues, opsChanged, invIssues, invChanged, finIssues, finChanged, hedgeIssues, hedgeChanged } = useDecision();

  const isReview = route.params.country === 'review';
  const country = findCountry(route.params.country);
  const section = findSection(country, route.params.section);
  const go = (pos: Position | 'review') =>
    pos === 'review'
      ? navigate('/student/execution', { view: 'decisions', country: 'review' })
      : navigate('/student/execution', { view: 'decisions', country: pos.country, section: pos.section });

  const keysOf = (c: CountryDef) => c.sections.flatMap((s) => s.forecasts);
  const countryStatus = (c: CountryDef) => {
    const keys = keysOf(c);
    const errs = issues.filter((i) => i.severity === 'error' && keys.includes(i.key)).length + opsIssues.filter((i) => i.entity === c.id).length + invIssues.filter((i) => i.entity === c.id).length + finIssues.filter((i) => i.entity === c.id).length + hedgeIssues.filter((i) => i.entity === c.id).length;
    if (errs) return { text: `${errs} to fix`, tone: 'warn' };
    const ch = changedKeys.filter((k) => keys.includes(k)).length + opsChanged.filter((k) => k.startsWith(`${c.id}.`)).length + invChanged.filter((k) => k.startsWith(`${c.id}.`)).length + finChanged.filter((k) => k.startsWith(`${c.id}.`)).length + hedgeChanged.filter((k) => k.startsWith(`${c.id}.`)).length;
    return ch ? { text: `${ch} changed`, tone: 'ok' } : { text: 'Not started', tone: 'idle' };
  };

  const here = SEQUENCE.findIndex((p) => p.country === country.id && p.section === section.id);
  const prev = isReview ? SEQUENCE[SEQUENCE.length - 1] : here > 0 ? SEQUENCE[here - 1] : null;
  const next = isReview ? null : here < SEQUENCE.length - 1 ? SEQUENCE[here + 1] : 'review';
  const labelOf = (p: Position | 'review') => {
    if (p === 'review') return 'Review & submit';
    const c = findCountry(p.country);
    const s = findSection(c, p.section);
    return p.country === country.id ? s.label : `${c.name} · ${s.label}`;
  };

  return (
    <div className="stack-lg">
      <section className="pagehead">
        <p className="eyebrow">Company execution · Period {session.currentPeriod} decision</p>
        <div className="pagehead__row">
          <h1>{isReview ? 'Review & submit' : `${country.name} · ${section.label}`}</h1>
          <span className="muted small" aria-live="polite">
            {draft.updatedAt
              ? `Draft saved on this device at ${new Date(draft.updatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
              : 'No changes yet'}
          </span>
        </div>
        {!isReview && <p className="lead">{section.lead}</p>}
      </section>

      <div className="ctabs">
        <div role="tablist" aria-label="Entity" className="ctabs__list">
          {COUNTRIES.map((c) => {
            const on = !isReview && c.id === country.id;
            const st = countryStatus(c);
            return (
              <button
                key={c.id}
                role="tab"
                type="button"
                aria-selected={on}
                className={`ctab ${on ? 'is-active' : ''}`}
                onClick={() => go({ country: c.id, section: on ? section.id : c.sections[0].id })}
              >
                <span className="ctab__name">{c.name}</span>
                <span className="ctab__meta">
                  <span className="ctab__ccy mono">{c.currency}</span>
                  <span className={`ctab__status ctab__status--${st.tone}`}>{st.text}</span>
                </span>
              </button>
            );
          })}
        </div>
        <button type="button" className={`ctab ctab--review ${isReview ? 'is-active' : ''}`} aria-pressed={isReview} onClick={() => go('review')}>
          <span className="ctab__name">Review &amp; submit</span>
          <span className="ctab__meta"><span className="ctab__status">All entities</span></span>
        </button>
      </div>

      {!isReview && (
        <>
          <nav className="stabs" aria-label={`${country.name} sections`}>
            {country.sections.map((s) => {
              const on = s.id === section.id;
              const isOps = s.kind === 'operations';
              const isInv = s.kind === 'investing';
              const isFin = s.kind === 'financing';
              const hCcy = s.id === 'ir-hedging' ? 'IR' : s.id.replace('hedging-', '').toUpperCase();
              const isHedge = s.kind === 'hedging';
              const changed = s.forecasts.filter((k) => changedKeys.includes(k)).length
                + (isOps ? opsChanged.filter((k) => k.startsWith(`${country.id}.`)).length : 0)
                + (isInv ? invChanged.filter((k) => k.startsWith(`${country.id}.`)).length : 0)
                + (isFin ? finChanged.filter((k) => k.startsWith(`${country.id}.`)).length : 0)
                + (isHedge ? hedgeChanged.filter((k) => k.startsWith(`${country.id}.${hCcy}.`)).length : 0);
              const hasErr = issues.some((i) => i.severity === 'error' && s.forecasts.includes(i.key))
                || (isOps && opsIssues.some((i) => i.entity === country.id))
                || (isInv && invIssues.some((i) => i.entity === country.id))
                || (isFin && finIssues.some((i) => i.entity === country.id))
                || (isHedge && hedgeIssues.some((i) => i.entity === country.id && i.ccy === hCcy));
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`stab ${on ? 'is-active' : ''}`}
                  aria-current={on ? 'page' : undefined}
                  onClick={() => go({ country: country.id, section: s.id })}
                >
                  {s.label}
                  {hasErr ? <span className="stab__dot stab__dot--warn" aria-label="needs fixing" /> : changed ? <span className="stab__dot" aria-label={`${changed} changed`} /> : null}
                </button>
              );
            })}
          </nav>
          <SectionView country={country} section={section} onGo={go} />
        </>
      )}

      {isReview && <ReviewStep onGo={go} />}

      <div className="stepnav">
        <button type="button" className="btn btn--ghost" disabled={!prev} onClick={() => prev && go(prev)}>
          ← {prev ? labelOf(prev) : 'Back'}
        </button>
        {next && (
          <button type="button" className="btn btn--primary" onClick={() => go(next)}>
            Next: {labelOf(next)} →
          </button>
        )}
      </div>
    </div>
  );
}
