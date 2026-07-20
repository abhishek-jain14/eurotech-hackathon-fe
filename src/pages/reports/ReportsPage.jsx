import { useEffect, useState } from 'react';
import { listApplications } from '../../api/applicationApi';
import { getApplicationReportSummary } from '../../api/reportApi';

export default function ReportsPage() {
  const [applications, setProjects] = useState([]);
  const [applicationId, setApplicationId] = useState('');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    listApplications({ size: 100 }).then((page) => {
      const list = page.content || [];
      setProjects(list);
      if (list.length && !applicationId) setApplicationId(String(list[0].id));
    });
  }, []);

  useEffect(() => {
    if (applicationId) getApplicationReportSummary(applicationId).then(setSummary);
  }, [applicationId]);

  return (
    <div>
      <div className="card-hd"><span className="card-title">Reports</span></div>
      <div className="fld" style={{ maxWidth: 320, marginBottom: 14 }}>
        <label>Application</label>
        <select value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
          {applications.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><div className="stat-lbl">Pass Rate</div><div className="stat-val" style={{ color: 'var(--accent)' }}>{summary ? `${summary.passRatePercent.toFixed(1)}%` : '—'}</div></div>
        <div className="stat-card"><div className="stat-lbl">Total Runs</div><div className="stat-val">{summary?.totalRuns ?? '—'}</div></div>
        <div className="stat-card"><div className="stat-lbl">Passed</div><div className="stat-val" style={{ color: 'var(--accent)' }}>{summary?.totalPassed ?? '—'}</div></div>
        <div className="stat-card"><div className="stat-lbl">Failed</div><div className="stat-val" style={{ color: 'var(--red)' }}>{summary?.totalFailed ?? '—'}</div></div>
      </div>

      <div className="card">
        <div className="card-hd"><span className="card-title">Average Duration</span></div>
        <div className="stat-val" style={{ fontSize: 22 }}>{summary ? `${summary.avgDurationSeconds.toFixed(0)}s` : '—'}</div>
      </div>
    </div>
  );
}
