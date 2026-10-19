import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { deadlineLabel, timeLeft } from '../lib/format';
import { appNow } from '../data/session';
import ReportDialog from './ReportDialog';
import SummaryDialog from './SummaryDialog';
import { useRouter } from '../lib/router';

interface Props {
  menuOpen: boolean;
  onToggleMenu: () => void;
}

/** S-01: team name, period and decision deadline are always visible. */
export default function AppHeader({ menuOpen, onToggleMenu }: Props) {
  const { session, signOut } = useAuth();
  const [now, setNow] = useState(() => appNow());
  const [userOpen, setUserOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const { route } = useRouter();
  const onExecution = route.path === '/student/execution';

  useEffect(() => {
    const t = window.setInterval(() => setNow(appNow()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const left = timeLeft(session.deadline, now);
  const initials = session.studentName.split(' ').map((w) => w[0]).join('').slice(0, 2);

  return (
    <header className="appbar">
      <button
        type="button"
        className="iconbtn appbar__menu"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        aria-controls="main-menu"
        onClick={onToggleMenu}
      >
        <span className={`burger ${menuOpen ? 'burger--open' : ''}`} aria-hidden="true">
          <span /><span /><span />
        </span>
      </button>

      <div className="appbar__brand">
        <span className="wordmark">FORAD</span>
      </div>

      <dl className="appbar__facts">
        <div>
          <dt>Team</dt>
          <dd>{session.teamName}</dd>
        </div>
        <div>
          <dt>Period</dt>
          <dd>{session.totalPeriods ? `${session.currentPeriod} of ${session.totalPeriods}` : session.currentPeriod}</dd>
        </div>
        <div className="appbar__deadline">
          <dt>Decision due</dt>
          <dd>
            <span>{deadlineLabel(session.deadline)}</span>
            <span className={`chip ${left.urgent ? 'chip--warn' : 'chip--dark'}`}>{left.text}</span>
          </dd>
        </div>
      </dl>

      <div className="appbar__actions">
      {onExecution && (
        <button
          type="button"
          className="btn btn--outline-light appbar__report"
          aria-haspopup="dialog"
          onClick={() => { setUserOpen(false); setSummaryOpen(true); }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1.75" y="1.75" width="5" height="4" /><rect x="9.25" y="1.75" width="5" height="4" /><rect x="5.5" y="10.25" width="5" height="4" />
            <path d="M4.25 5.75v2.5h7.5v-2.5M8 8.25v2" />
          </svg>
          <span className="appbar__report-long">Summary</span>
          <span className="appbar__report-short">Summary</span>
        </button>
      )}
      <button
        type="button"
        className="btn btn--outline-light appbar__report"
        aria-haspopup="dialog"
        onClick={() => { setUserOpen(false); setReportOpen(true); }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3.5 1.75h6l3 3v9.5h-9z" /><path d="M9.5 1.75v3h3M5.75 8h4.5M5.75 10.75h4.5" />
        </svg>
        <span className="appbar__report-long">Period {session.currentPeriod} market report</span>
        <span className="appbar__report-short">P{session.currentPeriod} report</span>
      </button>
      </div>

      <div className="appbar__user">
        <button
          type="button"
          className="avatar"
          aria-label={`Account: ${session.studentName}`}
          aria-expanded={userOpen}
          onClick={() => setUserOpen((v) => !v)}
        >
          {initials}
        </button>
        {userOpen && (
          <div className="usermenu" role="menu">
            <div className="usermenu__who">
              <strong>{session.studentName}</strong>
              <span>{session.teamName} · {session.courseName}</span>
            </div>
            <button type="button" role="menuitem" className="usermenu__item" onClick={signOut}>
              Sign out
            </button>
          </div>
        )}
      </div>
      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} />
      {onExecution && <SummaryDialog open={summaryOpen} onClose={() => setSummaryOpen(false)} />}
    </header>
  );
}
