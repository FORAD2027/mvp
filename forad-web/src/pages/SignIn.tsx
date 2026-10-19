import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';

export default function SignIn() {
  const { signIn, session } = useAuth();
  const { navigate } = useRouter();

  const go = (role: 'student' | 'instructor') => {
    signIn(role);
    navigate(role === 'student' ? '/student' : '/instructor');
  };

  return (
    <div className="signin">
      <section className="signin__brand" aria-label="About FORAD">
        <div className="wordmark wordmark--lg">FORAD</div>
        <p className="signin__tagline">Multinational Finance Simulation</p>
        <p className="signin__pitch">
          Run the treasury of a US multinational with subsidiaries in Japan and Germany. Every quarter you forecast the
          markets, fund the business, manage currency risk and tax. The highest share price wins.
        </p>
        <ul className="signin__currencies" aria-label="Currencies in play">
          <li><span>$</span>US Holding</li>
          <li><span>¥</span>Japan</li>
          <li><span>€</span>Germany</li>
        </ul>
      </section>

      <main className="signin__panel">
        <div className="signin__card">
          <p className="eyebrow">{session.courseName} · {session.term}</p>
          <h1 className="signin__title">Sign in</h1>
          <p className="muted">Use your school account to open your team's company.</p>

          <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => go('student')}>
            Sign in as student
          </button>

          <p className="signin__alt">
            Teaching this course?{' '}
            <button type="button" className="linkbtn" onClick={() => go('instructor')}>
              Sign in as instructor
            </button>
          </p>
        </div>
        <p className="signin__foot">FORAD was created by Prof. Lee Remmers (INSEAD). FORAD 2.0 web edition, development build.</p>
      </main>
    </div>
  );
}
