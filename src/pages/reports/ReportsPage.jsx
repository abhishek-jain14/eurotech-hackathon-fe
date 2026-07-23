import { useEffect, useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { listApplications } from '../../api/applicationApi';
import { getApplicationReportDetail, listReportSignoffs, submitSignoff } from '../../api/reportApi';
import { listExecutionsByApplication } from '../../api/executionApi';
import ExecutionHistoryChart from '../../components/reports/ExecutionHistoryChart';
import PassFailDonut from '../../components/reports/PassFailDonut';
import RoleGate from '../../components/common/RoleGate';
import { EDIT_ROLES } from '../../constants/roles';

const SIGNOFF_TAG = { PENDING: 'tag', APPROVED: 'tag-g', REJECTED: 'tag-r' };
const SIGNOFF_LABEL = { PENDING: 'Pending', APPROVED: '✓ Approved', REJECTED: '✗ Rejected' };

function formatDuration(seconds) {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ComparisonBars({ current, previous }) {
  const rows = [
    { label: 'Pass Rate', curVal: current.passRatePercent, prevVal: previous.passRatePercent, curLabel: `${current.passRatePercent.toFixed(1)}%`, prevLabel: `${previous.passRatePercent.toFixed(1)}%`, max: 100, color: 'var(--accent)' },
    { label: 'Duration', curVal: current.durationSeconds, prevVal: previous.durationSeconds, curLabel: formatDuration(current.durationSeconds), prevLabel: formatDuration(previous.durationSeconds), max: Math.max(current.durationSeconds, previous.durationSeconds, 1), color: 'var(--amber)' },
    { label: 'Failures', curVal: current.failedCount, prevVal: previous.failedCount, curLabel: current.failedCount, prevLabel: previous.failedCount, max: Math.max(current.failedCount, previous.failedCount, 1), color: 'var(--red)' }
  ];
  return (
    <div>
      {rows.map((r) => (
        <div key={r.label} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>{r.label}</span>
            <span><span style={{ color: r.color }}>{r.curLabel}</span> vs <span style={{ color: 'var(--text-dim)' }}>{r.prevLabel}</span></span>
          </div>
          <div style={{ height: 6, background: 'var(--border-2)', borderRadius: 3, marginBottom: 2, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (r.curVal / r.max) * 100)}%`, height: '100%', background: r.color, borderRadius: 3 }} />
          </div>
          <div style={{ height: 6, background: 'var(--border-2)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (r.prevVal / r.max) * 100)}%`, height: '100%', background: 'var(--text-dim)', borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [applicationId, setApplicationId] = useState('');
  const [detail, setDetail] = useState(null);
  const [runs, setRuns] = useState([]);
  const [signoffs, setSignoffs] = useState([]);
  const [expandedSignoffId, setExpandedSignoffId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    listApplications({ size: 100 }).then((page) => {
      const list = page.content || [];
      setApplications(list);
      if (list.length && !applicationId) setApplicationId(String(list[0].id));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSignoffs = () => listReportSignoffs().then(setSignoffs).catch(() => setSignoffs([]));

  useEffect(() => {
    loadSignoffs();
  }, []);

  useEffect(() => {
    if (!applicationId) return;
    setError(null);
    getApplicationReportDetail(applicationId).then(setDetail).catch(() => setError('Unable to load report. Is the backend running?'));
    listExecutionsByApplication(applicationId, { size: 100 }).then((page) => setRuns(page.content || []));
  }, [applicationId]);

  const handleSignoff = async (appId, action) => {
    setError(null);
    try {
      await submitSignoff(appId, { action, comment: commentDrafts[appId] || '' });
      setExpandedSignoffId(null);
      loadSignoffs();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to record sign-off');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 2 }}>Reports &amp; Insights</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
            {detail?.latestRun
              ? `${detail.latestRun.suiteName} · ${formatDateTime(detail.latestRun.startedAt)} · ${formatDuration(detail.latestRun.durationSeconds)}`
              : 'No runs yet for this application'}
          </div>
        </div>
        <div className="fld" style={{ marginBottom: 0, minWidth: 220 }}>
          <label>Application</label>
          <select value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
            {applications.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="readonly-banner">{error}</div>}

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {!detail ? (
          Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="stat-card">
              <div className="skeleton-line" style={{ width: '52%', marginBottom: 10 }} />
              <div className="skeleton-block" style={{ height: 24, marginBottom: 8 }} />
              <div className="skeleton-line" style={{ width: '60%' }} />
            </div>
          ))
        ) : (
          <>
            <div className="stat-card">
              <div className="stat-lbl">Pass Rate</div>
              <div className="stat-val" style={{ color: 'var(--accent)' }}>{detail?.latestRun ? `${detail.latestRun.passRatePercent.toFixed(1)}%` : '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-lbl">Total Tests</div>
              <div className="stat-val">{detail?.latestRun?.totalTests ?? '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-lbl">Passed</div>
              <div className="stat-val" style={{ color: 'var(--accent)' }}>{detail?.latestRun?.passedCount ?? '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-lbl">Failed</div>
              <div className="stat-val" style={{ color: 'var(--red)' }}>{detail?.latestRun?.failedCount ?? '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-lbl">Flaky</div>
              <div className="stat-val" style={{ color: 'var(--amber)' }}>{detail?.flakyScenarios?.length ?? '—'}</div>
            </div>
            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/coverage')} title="View in Coverage">
              <div className="stat-lbl">Uncovered</div>
              <div className="stat-val" style={{ color: 'var(--red)' }}>{detail?.uncoveredEndpoints ?? '—'}</div>
              <div className="stat-delta">endpoints · view →</div>
            </div>
            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/coverage')} title="View in Coverage">
              <div className="stat-lbl">Partial</div>
              <div className="stat-val" style={{ color: 'var(--amber)' }}>{detail?.partialEndpoints ?? '—'}</div>
              <div className="stat-delta">endpoints · view →</div>
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-hd"><span className="card-title">Pass / Fail Breakdown</span></div>
          <PassFailDonut passed={detail?.latestRun?.passedCount || 0} failed={detail?.latestRun?.failedCount || 0} skipped={detail?.skippedCount || 0} />
        </div>

        <div className="card">
          <div className="card-hd"><span className="card-title">Comparison: Previous Run</span></div>
          {!detail?.latestRun || !detail?.previousRun ? (
            <div className="empty-state">No previous run to compare against.</div>
          ) : (
            <ComparisonBars current={detail.latestRun} previous={detail.previousRun} />
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-hd"><span className="card-title">Flakiness Tracker</span></div>
        {!detail?.flakyScenarios?.length ? (
          <div className="empty-state">No flaky scenarios detected in recent runs.</div>
        ) : (
          detail.flakyScenarios.map((f) => (
            <div key={f.scenarioId} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
                <span>{f.scenarioName}</span>
                <span style={{ color: f.stabilityPercent >= 60 ? 'var(--amber)' : 'var(--red)' }}>{f.stabilityPercent.toFixed(0)}% stable</span>
              </div>
              <div style={{ height: 7, background: 'var(--border-2)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${f.stabilityPercent}%`, height: '100%', background: f.stabilityPercent >= 60 ? 'var(--amber)' : 'var(--red)', borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 3 }}>Failed {f.failedRuns} of last {f.totalRuns} runs</div>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <div className="card-hd"><span className="card-title">Failure Details</span></div>
        {!detail?.failures?.length ? (
          <div className="empty-state">No failures in the latest run.</div>
        ) : (
          <table>
            <thead><tr><th>Scenario</th><th>Request</th><th>Status</th><th>Test Data</th><th>Error</th></tr></thead>
            <tbody>
              {detail.failures.map((f) => (
                <tr key={f.resultId}>
                  <td>{f.scenarioName}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 10 }}>{f.requestMethod} {f.requestUrl}</td>
                  <td><span className="tag tag-r">{f.responseStatusCode ?? 'ERR'}</span></td>
                  <td>{f.testDataRecordName || '—'}</td>
                  <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.errorMessage}>{f.errorMessage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <ExecutionHistoryChart runs={runs} />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-hd" style={{ padding: 16 }}>
          <span className="card-title">Release Sign-Off</span>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
            {signoffs.filter((s) => s.status === 'APPROVED' && !s.stale).length} of {signoffs.length} applications signed off
          </span>
        </div>
        {signoffs.length === 0 ? (
          <div className="empty-state">No applications onboarded yet.</div>
        ) : (
          <table>
            <thead><tr><th>Application</th><th>Status</th><th>Signed Off By</th><th>When</th><th>Comment</th><th></th></tr></thead>
            <tbody>
              {signoffs.map((s) => (
                <Fragment key={s.applicationId}>
                  <tr>
                    <td style={{ fontWeight: 'bold' }}>{s.applicationName}</td>
                    <td>
                      <span className={`tag ${SIGNOFF_TAG[s.status] || ''}`}>{SIGNOFF_LABEL[s.status] || s.status}</span>
                      {s.stale && <span className="tag tag-o" style={{ marginLeft: 6 }}>⚠ New run since</span>}
                    </td>
                    <td>{s.signedOffBy || '—'}</td>
                    <td style={{ fontSize: 10, color: 'var(--text-dim)' }}>{s.signedOffAt ? formatDateTime(s.signedOffAt) : '—'}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.comment}>{s.comment || '—'}</td>
                    <td>
                      <RoleGate roles={EDIT_ROLES}>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={!s.latestRunId}
                          onClick={() => setExpandedSignoffId(expandedSignoffId === s.applicationId ? null : s.applicationId)}
                        >
                          {s.latestRunId ? 'Review' : 'No runs yet'}
                        </button>
                      </RoleGate>
                    </td>
                  </tr>
                  {expandedSignoffId === s.applicationId && (
                    <tr>
                      <td colSpan={6} style={{ background: 'var(--surface-2)', padding: 14 }}>
                        <textarea
                          rows={2}
                          placeholder="Add comment, risk note or reason…"
                          value={commentDrafts[s.applicationId] ?? s.comment ?? ''}
                          onChange={(e) => setCommentDrafts((d) => ({ ...d, [s.applicationId]: e.target.value }))}
                          style={{ width: '100%', marginBottom: 10 }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleSignoff(s.applicationId, 'APPROVE')}>✓ Approve</button>
                          <button className="btn btn-red btn-sm" onClick={() => handleSignoff(s.applicationId, 'REJECT')}>✗ Reject</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setExpandedSignoffId(null)}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
