import { useAuth } from '../../lib/auth';

/** Instructor side is a placeholder for now; the MVP focuses on the student flow first. */
export default function InstructorHome() {
  const { session, signOut } = useAuth();
  return (
    <div className="shell">
      <header className="appbar appbar--instructor">
        <div className="appbar__brand">
          <span className="wordmark">FORAD</span>
          <span className="appbar__role">Instructor console</span>
        </div>
        <dl className="appbar__facts">
          <div><dt>Course</dt><dd>{session.courseName} · {session.term}</dd></div>
          <div><dt>Period</dt><dd>{session.totalPeriods ? `${session.currentPeriod} of ${session.totalPeriods}` : session.currentPeriod}</dd></div>
        </dl>
        <button type="button" className="btn btn--outline-light" onClick={signOut}>Sign out</button>
      </header>
      <main className="page stack-lg">
        <section className="pagehead">
          <p className="eyebrow">Instructor</p>
          <h1>Instructor console</h1>
          <p className="lead">The student experience is being built first. These instructor tools follow in the MVP.</p>
        </section>
        <section className="card">
          <h2 className="card__title">Coming in the MVP</h2>
          <ul className="plainlist">
            <li><strong>Course setup</strong> · course, calendar of deadlines, teams and roster</li>
            <li><strong>Market data</strong> · per-period assumptions for the US, Japan and Germany</li>
            <li><strong>Market reports</strong> · write commentary and publish the report students see</li>
            <li><strong>Run the period</strong> · submission monitor, tender auction, run and publish results</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
