import { useEffect, useState } from 'react';
import { listApplications } from '../../api/applicationApi';

const SAMPLE_COVERAGE = {
  endpointCoveragePercent: 79,
  totalEndpoints: 24,
  coveredEndpoints: 19,
  scenarioCoveragePercent: 83,
  executedScenarios: 63,
  totalScenarios: 76,
  uncoveredEndpoints: 5,
  lastRun: '18 Jun 2026',
  lastResult: 'Passed'
};

export default function CoveragePage() {
  const [applications, setApplications] = useState([]);
  const [applicationId, setApplicationId] = useState('');
  const [coverage, setCoverage] = useState(null);

  useEffect(() => {
    listApplications({ size: 100 }).then((page) => {
      const list = page.content || [];
      setApplications(list);
      if (list.length && !applicationId) setApplicationId(String(list[0].id));
    });
  }, []);

  useEffect(() => {
    if (!applicationId) return;
    const selectedApp = applications.find((app) => String(app.id) === applicationId);
    setCoverage({
      ...SAMPLE_COVERAGE,
      appName: selectedApp?.name || 'Application'
    });
  }, [applicationId, applications]);

  return (
    <div>
      <div className="card-hd">
        <span className="card-title">Coverage</span>
        <span className="card-sub">Test coverage and last execution results across applications.</span>
      </div>

      <div className="fld" style={{ maxWidth: 320, marginBottom: 20 }}>
        <label>Application</label>
        <select value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
          {applications.map((application) => (
            <option key={application.id} value={application.id}>{application.name}</option>
          ))}
        </select>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-lbl">Endpoint Coverage</div>
          <div className="stat-val" style={{ color: 'var(--accent)' }}>
            {coverage ? `${coverage.endpointCoveragePercent}%` : '—'}
          </div>
          <div className="stat-delta up">
            {coverage ? `${coverage.coveredEndpoints}/${coverage.totalEndpoints}` : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Scenario Coverage</div>
          <div className="stat-val" style={{ color: 'var(--accent)' }}>
            {coverage ? `${coverage.scenarioCoveragePercent}%` : '—'}
          </div>
          <div className="stat-delta up">
            {coverage ? `${coverage.executedScenarios}/${coverage.totalScenarios}` : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Uncovered Endpoints</div>
          <div className="stat-val" style={{ color: 'var(--red)' }}>
            {coverage ? coverage.uncoveredEndpoints : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Last Run</div>
          <div className="stat-val">{coverage ? coverage.lastRun : '—'}</div>
          <div style={{ fontSize: 14, marginTop: 4, color: coverage ? 'var(--accent)' : 'var(--text-dim)' }}>
            {coverage ? coverage.lastResult : '—'}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd"><span className="card-title">Coverage gaps</span></div>
        <div style={{ padding: 18 }}>
          <div style={{ marginBottom: 12, color: 'var(--text-dim)' }}>
            Review uncovered endpoints and use scenarios or test flows to close gaps.
          </div>
          <div className="coverage-gap-row">
            <div>
              <div className="coverage-gap-title">POST /payments/charge</div>
              <div className="coverage-gap-desc">No scenario covers this endpoint. Add a test flow to remove the gap.</div>
            </div>
            <button className="btn btn-ghost btn-sm">Open flow</button>
          </div>
          <div className="coverage-gap-row">
            <div>
              <div className="coverage-gap-title">GET /orders/{`{orderId}`}</div>
              <div className="coverage-gap-desc">Only partial coverage is present; add assertions for response fields.</div>
            </div>
            <button className="btn btn-ghost btn-sm">Review scenario</button>
          </div>
        </div>
      </div>
    </div>
  );
}
