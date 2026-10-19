import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { DashboardReports, type ReportsState } from '../pages/student/StudentDashboard';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** The Dashboard (Summary screen and Results reports) as a pop-up, opened from Company execution. */
export default function SummaryDialog({ open, onClose }: Props) {
  const { session } = useAuth();
  const { navigate } = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<ReportsState>({});

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      d.querySelector<HTMLElement>('.dialog__body')?.scrollTo(0, 0);
    }
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    document.body.classList.toggle('noscroll', open);
    return () => document.body.classList.remove('noscroll');
  }, [open]);

  const P = session.currentPeriod;
  return (
    <dialog
      ref={ref}
      className="dialog dialog--wide"
      aria-labelledby="summary-dialog-title"
      onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="dialog__panel">
        <header className="dialog__head">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h2 id="summary-dialog-title">Period {P} summary</h2>
          </div>
          <button type="button" className="iconbtn iconbtn--plain" aria-label="Close summary" onClick={onClose}>
            <span aria-hidden="true">✕</span>
          </button>
        </header>
        <div className="dialog__body">
          {open && <DashboardReports state={state} onChange={setState} />}
        </div>
        <footer className="dialog__foot">
          <p className="muted small dialog__footnote">Sample figures until team results are connected.</p>
          <button type="button" className="btn btn--ghost" onClick={() => { onClose(); navigate('/student', { r: state.r, s: state.s, v: state.v }); }}>
            Open Dashboard
          </button>
          <button type="button" className="btn btn--primary" onClick={onClose}>Back to decisions</button>
        </footer>
      </div>
    </dialog>
  );
}
