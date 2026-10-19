import { useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { bimrFor } from '../data/bimr';
import { BimrView } from './report/BimrReportView';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** The current period's market report, opened from the top bar on any page. */
export default function ReportDialog({ open, onClose }: Props) {
  const { session } = useAuth();
  const { navigate } = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const report = bimrFor(session.currentPeriod);

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

  if (!report) return null;

  const go = (path: string, params?: Record<string, string | number>) => {
    onClose();
    navigate(path, params);
  };

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="report-dialog-title"
      onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="dialog__panel">
        <header className="dialog__head">
          <div>
            <p className="eyebrow">Current market report</p>
            <h2 id="report-dialog-title">Period {report.period} market report</h2>
          </div>
          <button type="button" className="iconbtn iconbtn--plain" aria-label="Close report" onClick={onClose}>
            <span aria-hidden="true">✕</span>
          </button>
        </header>
        <div className="dialog__body">
          <BimrView report={report} isCurrent />
        </div>
        <footer className="dialog__foot">
          <button type="button" className="btn btn--ghost" onClick={() => go('/student/reports', { tab: 'market', p: report.period })}>
            Open as a page
          </button>
          <button type="button" className="btn btn--primary" onClick={() => go('/student/execution', { view: 'decisions' })}>
            Go to Period {report.period} decision
          </button>
        </footer>
      </div>
    </dialog>
  );
}
