import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Tiny hash router: #/student/reports?tab=market&p=3
 * Kept dependency-free on purpose; swap for react-router when routes multiply.
 */
export interface Route {
  path: string;
  params: Record<string, string>;
}

function parse(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  const params: Record<string, string> = {};
  new URLSearchParams(query).forEach((v, k) => (params[k] = v));
  return { path: path || '/', params };
}

function serialize(path: string, params: Record<string, string | number | undefined> = {}): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && q.set(k, String(v)));
  const qs = q.toString();
  return `#${path}${qs ? `?${qs}` : ''}`;
}

interface RouterValue {
  route: Route;
  navigate: (path: string, params?: Record<string, string | number | undefined>) => void;
  /** The page before this one in this visit, if any. */
  previous: Route | null;
  /** Go back one page inside the app. */
  back: () => void;
}

const RouterContext = createContext<RouterValue | null>(null);

function readHash(): Route {
  try {
    return parse(window.location.hash);
  } catch {
    return parse('');
  }
}

const key = (r: Route) => serialize(r.path, r.params);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(readHash);
  // In-app history for the Back button. Kept in memory so it also works where the
  // browser's history API is blocked (embedded viewers).
  const stack = useRef<string[]>([key(readHash())]);
  const [depth, setDepth] = useState(1);
  const browserHistory = useRef(true); // false once pushState is refused

  useEffect(() => {
    const sync = () => {
      const r = readHash();
      const k = key(r);
      const s = stack.current;
      if (s.length > 1 && s[s.length - 2] === k) s.pop(); // browser Back
      else if (s[s.length - 1] !== k) s.push(k);
      setDepth(s.length);
      setRoute(r);
    };
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  const navigate = useCallback<RouterValue['navigate']>((path, params) => {
    const next = serialize(path, params);
    const s = stack.current;
    if (s[s.length - 1] === next) return;
    s.push(next);
    setDepth(s.length);
    setRoute(parse(next));
    try {
      window.history.pushState(null, '', next);
    } catch {
      browserHistory.current = false; // some embedded viewers block history; in-memory routing still works
    }
    window.scrollTo({ top: 0 });
  }, []);

  const back = useCallback(() => {
    const s = stack.current;
    if (s.length < 2) return;
    if (browserHistory.current) {
      // Keep the browser's own Back/Forward in step; popstate syncs the route and the stack.
      window.history.back();
      return;
    }
    s.pop();
    const prev = s[s.length - 1];
    setDepth(s.length);
    setRoute(parse(prev));
    try {
      window.history.replaceState(null, '', prev);
    } catch {
      /* in-memory routing still works */
    }
    window.scrollTo({ top: 0 });
  }, []);

  const previous = depth > 1 ? parse(stack.current[stack.current.length - 2]) : null;

  return <RouterContext.Provider value={{ route, navigate, previous, back }}>{children}</RouterContext.Provider>;
}

/** Plain-language name of a student page, for "Back to …". */
export function pageName(r: Route): string {
  if (r.path === '/student') {
    const tabs: Record<string, string> = { cbs: 'Consolidated balance sheet', cis: 'Consolidated income statement', pe: 'PE scoring', japan: 'Japan statements', germany: 'Germany statements', us: 'US Holding statements' };
    return tabs[r.params.r] ?? 'Dashboard';
  }
  if (r.path === '/student/reports') {
    const p = r.params.p ? `Period ${r.params.p} ` : '';
    return r.params.tab === 'results' ? `${p}results` : `${p}market report`;
  }
  if (r.path === '/student/execution') {
    if (r.params.view === 'stress') return 'Stress test lab';
    if (r.params.country === 'review') return 'Review & submit';
    const c: Record<string, string> = { us: 'US Holding', japan: 'Japan', germany: 'Germany' };
    const secs: Record<string, string> = {
      operations: 'Operations', investing: 'Investing', financing: 'Financing',
      'hedging-usd': 'Hedging · USD', 'hedging-jpy': 'Hedging · JPY', 'hedging-eur': 'Hedging · EUR',
    };
    if (!r.params.country) return 'Decision workspace';
    return `${c[r.params.country] ?? 'Decision'} · ${secs[r.params.section ?? 'operations'] ?? 'Operations'}`;
  }
  return 'previous page';
}

export function useRouter(): RouterValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used inside RouterProvider');
  return ctx;
}
