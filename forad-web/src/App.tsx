import { useEffect } from 'react';
import { useAuth } from './lib/auth';
import { useRouter } from './lib/router';
import SignIn from './pages/SignIn';
import StudentLayout from './pages/student/StudentLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import MarketReports from './pages/student/MarketReports';
import CompanyExecution from './pages/student/CompanyExecution';
import InstructorHome from './pages/instructor/InstructorHome';

export default function App() {
  const { role } = useAuth();
  const { route, navigate } = useRouter();

  // Guard: signed-out users always land on sign-in; signed-in users skip it.
  useEffect(() => {
    if (!role && route.path !== '/') navigate('/');
    if (role === 'student' && !route.path.startsWith('/student')) navigate('/student');
    if (role === 'instructor' && !route.path.startsWith('/instructor')) navigate('/instructor');
  }, [role, route.path, navigate]);

  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Sign in · FORAD',
      '/student': 'Dashboard · FORAD',
      '/student/reports': 'Market reports & results · FORAD',
      '/student/execution': 'Company execution · FORAD',
      '/instructor': 'Instructor console · FORAD',
    };
    document.title = titles[route.path] ?? 'FORAD';
  }, [route.path]);

  if (!role) return <SignIn />;
  if (role === 'instructor') return <InstructorHome />;

  let page = <StudentDashboard />;
  if (route.path === '/student/reports') page = <MarketReports />;
  if (route.path === '/student/execution') page = <CompanyExecution />;
  return <StudentLayout>{page}</StudentLayout>;
}
