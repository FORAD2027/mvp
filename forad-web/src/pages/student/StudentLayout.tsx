import { useCallback, useState, type ReactNode } from 'react';
import AppHeader from '../../components/AppHeader';
import MainMenu from '../../components/MainMenu';
import { pageName, useRouter } from '../../lib/router';

export default function StudentLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = useCallback(() => setMenuOpen(false), []);
  const { route, previous, back, navigate } = useRouter();
  const onDashboard = route.path === '/student' && !route.params.r;
  // Back goes to the previous page of this visit; with no history it falls back to the Dashboard.
  const target = previous && !(previous.path === '/' ) ? pageName(previous) : onDashboard ? null : 'Dashboard';
  const goBack = () => (previous && previous.path !== '/' ? back() : navigate('/student'));

  return (
    <div className="shell">
      <AppHeader menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((v) => !v)} />
      <div className="shell__menu-anchor">
        <MainMenu open={menuOpen} onClose={close} />
      </div>
      <main className="page">
        {target && (
          <button type="button" className="backlink" onClick={goBack}>
            <span aria-hidden="true">←</span> Back to {target}
          </button>
        )}
        {children}
      </main>
    </div>
  );
}
