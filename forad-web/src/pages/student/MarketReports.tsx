import { useAuth } from '../../lib/auth';
import { useRouter } from '../../lib/router';
import { bimrFor, publishedBimr, reportWithActualsFor } from '../../data/bimr';
import { deadlineLabel, num } from '../../lib/format';
import { BimrView, Board, Delta, EXPORT_NOTE, MarketsTable, Prose, pctMove } from '../../components/report/BimrReportView';
import StockChart from '../../components/report/StockChart';

type Tab = 'market' | 'results';

export default function MarketReports() {
  const { session } = useAuth();
  const { route, navigate } = useRouter();
  const tab: Tab = route.params.tab === 'results' ? 'results' : 'market';
  const cur = session.currentPeriod;
  const released = session.resultsReleasedThrough;

  // Market reports: every published report. Results: every period up to the open one;
  // periods the instructor has not released yet are listed as pending.
  const periods = tab === 'market'
    ? publishedBimr(cur).map((r) => r.period)
    : Array.from({ length: cur + 1 }, (_, i) => cur - i);
  const requested = Number(route.params.p);
  const fallback = tab === 'market' ? cur : released;
  const period = route.params.p !== undefined && periods.includes(requested) ? requested : fallback;
  const pending = tab === 'results' && period > released;

  const setTab = (t: Tab) => navigate('/student/reports', { tab: t, p: t === 'market' ? cur : released });
  const setPeriod = (p: number) => navigate('/student/reports', { tab, p });

  return (
    <div className="stack-lg">
      <section className="pagehead">
        <p className="eyebrow">Market reports &amp; results</p>
        <h1>{tab === 'market' ? `Period ${period} market report` : `Period ${period} results`}</h1>
        <p className="lead">
          {tab === 'market'
            ? 'The Business International Money Report your instructor publishes when each period opens.'
            : 'What happened in each period. Results appear once your instructor runs the period and releases them.'}
        </p>
      </section>

      <div className="tabsbar">
        <div role="tablist" aria-label="Report type" className="tabs">
          {(['market', 'results'] as Tab[]).map((t) => (
            <button key={t} role="tab" type="button" aria-selected={tab === t} className={`tabs__tab ${tab === t ? 'is-active' : ''}`} onClick={() => setTab(t)}>
              {t === 'market' ? 'Market reports' : 'Results'}
            </button>
          ))}
        </div>
        <div className="pills" role="group" aria-label="Choose period">
          <span className="muted small">Period</span>
          {periods.map((p) => {
            const isPending = tab === 'results' && p > released;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={p === period}
                className={`pill ${p === period ? 'is-active' : ''} ${isPending ? 'pill--pending' : ''}`}
                onClick={() => setPeriod(p)}
              >
                P{p}{tab === 'market' && p === cur ? ' · current' : ''}{isPending ? ' · pending' : ''}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'market' && (
        <BimrView
          report={bimrFor(period)!}
          isCurrent={period === cur}
          onStartDecision={() => navigate('/student/execution', { view: 'decisions' })}
        />
      )}
      {tab === 'results' && (pending ? <PendingResults period={period} /> : <ResultsView period={period} />)}
    </div>
  );
}

/* ============================================================ Results */

function PendingResults({ period }: { period: number }) {
  const { session } = useAuth();
  const isOpen = period === session.currentPeriod;
  return (
    <section className="card empty">
      <h2>Period {period} results are not released yet</h2>
      <p>
        {isOpen
          ? `Period ${period} is still open. Decisions are due ${deadlineLabel(session.deadline)}. After the deadline your instructor runs the period and releases the results here.`
          : `Your instructor has run Period ${period} but has not released the results yet.`}
      </p>
    </section>
  );
}

function ResultsView({ period }: { period: number }) {
  const { session } = useAuth();
  const src = reportWithActualsFor(period);
  if (!src) return <PendingResults period={period} />;
  const own = bimrFor(period); // the report students used for this period's decision
  const board = src.leaderboard;

  return (
    <div className="stack">
      <p className="muted small">Released with the Period {src.period} market report. Your team’s own financial statements and P/E scores arrive with the results build (S-16).</p>

      {period >= 1 && <StockChart releasedThrough={session.resultsReleasedThrough} throughPeriod={period} />}

      <div className="grid2">
        <section className="card" aria-labelledby="res-mkt">
          <h2 id="res-mkt" className="card__title">Product markets</h2>
          <MarketsTable title={`Period ${period} (actual)`} markets={src.actual.markets} compare={own?.forecast.period === period ? own.forecast.markets : undefined} />
          {own?.forecast.period === period && <p className="footnote">Compared with the Marketing Board forecast in the Period {period} report.</p>}
          <p className="footnote">{EXPORT_NOTE}</p>
          <Prose paras={src.actual.commentary} />
        </section>

        <section className="card" aria-labelledby="res-fin">
          <h2 id="res-fin" className="card__title">Financial markets over the period</h2>
          <dl className="kv kv--wide">
            <div><dt>$/€</dt><dd className="mono">{num(src.spot.start.usdPerEur, 2)} → <strong>{num(src.spot.end.usdPerEur, 2)}</strong> <Delta text={pctMove(src.spot.start.usdPerEur, src.spot.end.usdPerEur)} /></dd></div>
            <div><dt>¥/$</dt><dd className="mono">{num(src.spot.start.jpyPerUsd, 2)} → <strong>{num(src.spot.end.jpyPerUsd, 2)}</strong> <Delta text={pctMove(src.spot.start.jpyPerUsd, src.spot.end.jpyPerUsd)} /></dd></div>
            <div><dt>Oil at period end</dt><dd className="mono">{src.oil.endPrice === null ? '—' : `$${num(src.oil.endPrice, 0)}`}</dd></div>
            {own && (
              <div><dt>3-month LIBOR $ · € · ¥ (start)</dt><dd className="mono">{num(own.rates.USD.libor3m * 100, 3)} · {num(own.rates.EUR.libor3m * 100, 3)} · {num(own.rates.JPY.libor3m * 100, 3)}%</dd></div>
            )}
          </dl>
          {src.tenderResult ? (
            <div className="callout"><strong>Tender market, Period {src.tenderResult.period}</strong><span>{src.tenderResult.text}</span></div>
          ) : (
            <p className="muted small">No tender sales this period.</p>
          )}
        </section>
      </div>

      {board ? (
        <section className="card" aria-labelledby="res-board">
          <h2 id="res-board" className="card__title">Stock price after Period {board.afterPeriod}</h2>
          <p>{board.headline}</p>
          <Board board={board} />
        </section>
      ) : (
        <section className="card empty">
          <h2>Period 0 is the company you inherited</h2>
          <p>Every team starts from the same position. Rankings begin after Period 1.</p>
        </section>
      )}
    </div>
  );
}
