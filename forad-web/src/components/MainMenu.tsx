import { useEffect, useRef } from 'react';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';

interface Item {
  label: string;
  sub: string;
  path: string;
  params?: Record<string, string | number>;
  badge?: string;
  isActive: (path: string, params: Record<string, string>) => boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

/** S-02: the menu holds only Market Reports & Results and the Dashboard. */
export default function MainMenu({ open, onClose }: Props) {
  const { route, navigate } = useRouter();
  const { session } = useAuth();
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const items: Item[] = [
    {
      label: 'Market Reports & Results', sub: 'Each period’s market report, and results once released', path: '/student/reports',
      params: { tab: 'market', p: session.currentPeriod }, badge: `P${session.currentPeriod}`,
      isActive: (p) => p === '/student/reports',
    },
    { label: 'Dashboard', sub: 'Summary, statements and PE scoring', path: '/student', isActive: (p) => p === '/student' },
  ];
  const groups = [{ title: 'Menu', items }];

  let first = true;
  return (
    <>
      <button type="button" className="scrim" aria-label="Close menu" onClick={onClose} tabIndex={-1} />
      <nav id="main-menu" className="mainmenu" aria-label="Main menu">
        {groups.map((g) => (
          <div key={g.title} className="mainmenu__group mainmenu__group--flat">
            {g.items.map((it) => {
              const active = it.isActive(route.path, route.params);
              const ref = first ? firstRef : undefined;
              first = false;
              return (
                <button
                  key={it.label}
                  ref={ref}
                  type="button"
                  className={`mainmenu__item ${active ? 'is-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => {
                    navigate(it.path, it.params);
                    onClose();
                  }}
                >
                  <span className="mainmenu__text">
                    <span className="mainmenu__label">{it.label}</span>
                    <span className="mainmenu__sub">{it.sub}</span>
                  </span>
                  {it.badge && <span className="chip chip--accent">{it.badge}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </>
  );
}
