import { useRouter } from '../../lib/router';
import { useAuth } from '../../lib/auth';
import Workspace from './workspace/Workspace';

export default function CompanyExecution() {
  const { route, navigate } = useRouter();
  const { session } = useAuth();
  if (route.params.view !== 'stress') return <Workspace />;

  // Stress test lab: placeholder until its backlog item is built.
  return (
    <div className="stack-lg">
      <section className="pagehead">
        <p className="eyebrow">Company execution</p>
        <h1>Stress test lab</h1>
        <p className="lead">Test your decisions against market shocks before you submit. Every run is saved so you can compare.</p>
      </section>
      <section className="card empty">
        <span className="chip chip--muted">Later build</span>
        <h2>The stress test lab needs the projection engine first</h2>
        <p>
          It will run your current decisions against six standard shocks plus your own scenario, and keep a history of runs.
          Your Period {session.currentPeriod} forecasts are already saved and will be its starting point.
        </p>
        <div className="row">
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/student/execution', { view: 'decisions' })}>
            Back to decisions
          </button>
        </div>
      </section>
    </div>
  );
}
