import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { DEMO_SESSION, type CourseSession, type Role } from '../data/session';

/**
 * Placeholder auth: "Sign in" immediately starts a demo session.
 * The real login flow (credentials / SSO / team join code) replaces signIn() later.
 */
interface AuthValue {
  role: Role | null;
  session: CourseSession;
  signIn: (role: Role) => void;
  signOut: () => void;
}

const KEY = 'forad.role';
const AuthContext = createContext<AuthValue | null>(null);

function loadRole(): Role | null {
  try {
    const v = window.sessionStorage.getItem(KEY);
    return v === 'student' || v === 'instructor' ? v : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(loadRole);

  const signIn = useCallback((r: Role) => {
    setRole(r);
    try {
      window.sessionStorage.setItem(KEY, r);
    } catch {
      /* storage unavailable: session lasts until reload */
    }
  }, []);

  const signOut = useCallback(() => {
    setRole(null);
    try {
      window.sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return <AuthContext.Provider value={{ role, session: DEMO_SESSION, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
