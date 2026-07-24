import { useEffect, useState } from 'react';
import { getDashboardStats } from '../../api/dashboardApi';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => setError('Unable to load dashboard stats. Is the backend running?'));
  }, []);

  return (
    <div className="dashboard-shell">
      {error && <div className="readonly-banner">{error}</div>}

      <div className="dashboard-hero card">
        <div className="dashboard-hero-badge">Live health</div>
        <div className="dashboard-hero-title">Operational pulse at a glance</div>
        <div className="dashboard-hero-sub">
          Watch quality, velocity, and onboarding momentum with a dashboard that feels alive.
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card stat-card-1">
          <div className="stat-lbl">Pass Rate</div>
          <div className="stat-val" style={{ color: 'var(--accent)' }}>
            {stats ? `${stats.passRatePercent.toFixed(1)}%` : '—'}
          </div>
        </div>
        <div className="stat-card stat-card-2">
          <div className="stat-lbl">Failures</div>
          <div className="stat-val" style={{ color: 'var(--red)' }}>{stats?.totalFailures ?? '—'}</div>
        </div>
        <div className="stat-card stat-card-3">
          <div className="stat-lbl">Scenarios</div>
          <div className="stat-val">{stats?.totalScenarios ?? '—'}</div>
        </div>
        <div className="stat-card stat-card-4">
          <div className="stat-lbl">Avg Duration</div>
          <div className="stat-val">{stats ? `${stats.avgDurationSeconds.toFixed(0)}s` : '—'}</div>
        </div>
      </div>

      <div className="card dashboard-card">
        <div className="card-hd"><span className="card-title">Onboarded Applications</span></div>
        <div className="stat-val" style={{ fontSize: 22 }}>{stats?.totalApplications ?? '—'}</div>
        <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>
          Head to Applications to onboard a new one, or Execution to run a suite.
        </div>
      </div>
    </div>
  );
}
