import { useEffect, useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCoverageOverview, getApplicationCoverage } from '../../api/coverageApi';
import RoleGate from '../../components/common/RoleGate';
import { EDIT_ROLES, ROLES } from '../../constants/roles';

const APP_STATUS_TAG = { GOOD: 'tag-g', FAILURES: 'tag-r', UNCOVERED: 'tag-r', PARTIAL: 'tag-o' };
const APP_STATUS_LABEL = { GOOD: '✓ Good', FAILURES: '⚠ Failures', UNCOVERED: '⚠ Uncovered', PARTIAL: '⚡ Partial' };
const EP_STATUS_TAG = { FULL: 'tag-g', FAILURES: 'tag-r', NO_TESTS: 'tag-r', PARTIAL: 'tag-o' };
const EP_STATUS_LABEL = { FULL: '✓ Full', FAILURES: '⚠ Failures', NO_TESTS: '✗ No Tests', PARTIAL: '⚡ Partial' };
const METHOD_TAG = { GET: 'tag-g', POST: 'tag-p', PUT: 'tag-o', PATCH: 'tag-o', DELETE: 'tag-r' };

export default function CoveragePage() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);
  const [expandedAppId, setExpandedAppId] = useState(null);
  const [endpointsByApp, setEndpointsByApp] = useState({}); // appId -> EndpointCoverageDto[]
  const [loadingAppId, setLoadingAppId] = useState(null);

  const load = () => {
    getCoverageOverview()
      .then(setOverview)
      .catch(() => setError('Unable to load coverage. Is the backend running?'));
  };

  useEffect(load, []);

  const toggleAppDetail = async (appId) => {
    if (expandedAppId === appId) {
      setExpandedAppId(null);
      return;
    }
    setExpandedAppId(appId);
    if (!endpointsByApp[appId]) {
      setLoadingAppId(appId);
      try {
        const rows = await getApplicationCoverage(appId);
        setEndpointsByApp((prev) => ({ ...prev, [appId]: rows }));
      } catch {
        setEndpointsByApp((prev) => ({ ...prev, [appId]: [] }));
      } finally {
        setLoadingAppId(null);
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 'bold' }}>Coverage</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
            Test coverage and last execution results across all applications. Click an application to drill in.
          </div>
        </div>
      </div>

      {error && <div className="readonly-banner">{error}</div>}

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-lbl">Endpoint Coverage</div>
          <div className="stat-val" style={{ color: 'var(--accent)' }}>{overview ? `${overview.endpointCoveragePercent}%` : '—'}</div>
          <div className="stat-delta">{overview ? `${overview.coveredEndpoints}/${overview.totalEndpoints} endpoints` : ''}</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Total Scenarios</div>
          <div className="stat-val">{overview?.totalScenarios ?? '—'}</div>
          <div className="stat-delta">{overview ? `across ${overview.applications.length} apps` : ''}</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Last Run Passed</div>
          <div className="stat-val" style={{ color: 'var(--accent)' }}>{overview?.lastRunPassed ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Last Run Failed</div>
          <div className="stat-val" style={{ color: 'var(--red)' }}>{overview?.lastRunFailed ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Gaps to Fix</div>
          <div className="stat-val" style={{ color: 'var(--amber)' }}>{overview?.gapsToFix ?? '—'}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-hd" style={{ padding: 16 }}>
          <span className="card-title">Application Coverage</span>
        </div>
        {!overview ? (
          <div className="empty-state">Loading…</div>
        ) : overview.applications.length === 0 ? (
          <div className="empty-state">No applications onboarded yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Application</th>
                <th style={{ textAlign: 'center' }}>Endpoints</th>
                <th style={{ textAlign: 'center' }}>Coverage %</th>
                <th style={{ textAlign: 'center' }}>Scenarios</th>
                <th style={{ textAlign: 'center', color: 'var(--accent)' }}>Passed</th>
                <th style={{ textAlign: 'center', color: 'var(--red)' }}>Failed</th>
                <th style={{ textAlign: 'center', color: 'var(--amber)' }}>Gaps</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {overview.applications.map((app) => (
                <Fragment key={app.applicationId}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => toggleAppDetail(app.applicationId)}>
                    <td>
                      <div style={{ fontWeight: 'bold' }}>{app.applicationName}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-dim)' }}>{app.applicationType}{app.specFormat ? ` · ${app.specFormat}` : ''}</div>
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-dim)' }}>{app.totalEndpoints}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 'bold', color: app.coveragePercent === 100 ? 'var(--accent)' : 'var(--amber)' }}>{app.coveragePercent}%</div>
                      <div style={{ width: 50, height: 4, background: 'var(--border-2)', borderRadius: 2, margin: '3px auto 0', overflow: 'hidden' }}>
                        <div style={{ width: `${app.coveragePercent}%`, height: '100%', background: app.coveragePercent === 100 ? 'var(--accent)' : 'var(--amber)' }} />
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{app.totalScenarios}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--accent)' }}>{app.passedCount}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--red)' }}>{app.failedCount}</td>
                    <td style={{ textAlign: 'center', color: 'var(--amber)' }}>{app.gapsCount}</td>
                    <td style={{ textAlign: 'center' }}><span className={`tag ${APP_STATUS_TAG[app.status] || ''}`}>{APP_STATUS_LABEL[app.status] || app.status}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); toggleAppDetail(app.applicationId); }}>
                        Details {expandedAppId === app.applicationId ? '▴' : '▾'}
                      </button>
                    </td>
                  </tr>
                  {expandedAppId === app.applicationId && (
                    <tr>
                      <td colSpan={9} style={{ padding: 0, background: 'var(--surface-2)' }}>
                        <div style={{ padding: '14px 20px', borderTop: '2px solid var(--accent)' }}>
                          <div style={{ fontSize: 10, fontWeight: 'bold', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                            {app.applicationName} — Endpoint Breakdown
                          </div>
                          {loadingAppId === app.applicationId ? (
                            <div className="empty-state">Loading…</div>
                          ) : (endpointsByApp[app.applicationId] || []).length === 0 ? (
                            <div className="empty-state">No endpoints found for this application's current spec.</div>
                          ) : (
                            <table style={{ marginBottom: 12 }}>
                              <thead>
                                <tr>
                                  <th>Endpoint</th>
                                  <th style={{ textAlign: 'center' }}>Positive</th>
                                  <th style={{ textAlign: 'center' }}>Negative</th>
                                  <th style={{ textAlign: 'center', color: 'var(--accent)' }}>Passed</th>
                                  <th style={{ textAlign: 'center', color: 'var(--red)' }}>Failed</th>
                                  <th style={{ textAlign: 'center' }}>Flow</th>
                                  <th style={{ textAlign: 'center' }}>Data</th>
                                  <th style={{ textAlign: 'center' }}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {endpointsByApp[app.applicationId].map((ep, i) => (
                                  <tr key={i}>
                                    <td>
                                      <span className={`tag ${METHOD_TAG[ep.httpMethod] || ''}`} style={{ marginRight: 8 }}>{ep.httpMethod}</span>
                                      <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{ep.path}</span>
                                      {ep.summary && <div style={{ fontSize: 9, color: 'var(--text-dim)' }}>{ep.summary}</div>}
                                    </td>
                                    <td style={{ textAlign: 'center', color: ep.positiveCount > 0 ? 'var(--text)' : 'var(--text-dim)' }}>{ep.positiveCount || '—'}</td>
                                    <td style={{ textAlign: 'center', color: ep.negativeCount > 0 ? 'var(--text)' : 'var(--red)' }}>{ep.status === 'NO_TESTS' ? '—' : ep.negativeCount}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--accent)' }}>{ep.passedCount}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: ep.failedCount > 0 ? 'var(--red)' : 'var(--text-dim)' }}>{ep.failedCount}</td>
                                    <td style={{ textAlign: 'center', color: ep.status === 'NO_TESTS' ? 'var(--text-dim)' : ep.hasFlow ? 'var(--accent)' : 'var(--red)' }}>{ep.status === 'NO_TESTS' ? '—' : ep.hasFlow ? '✓' : '✗'}</td>
                                    <td style={{ textAlign: 'center', color: ep.status === 'NO_TESTS' ? 'var(--text-dim)' : ep.hasTestData ? 'var(--accent)' : 'var(--red)' }}>{ep.status === 'NO_TESTS' ? '—' : ep.hasTestData ? '✓' : '✗'}</td>
                                    <td style={{ textAlign: 'center' }}>
                                      {ep.status === 'PARTIAL' && ep.missingDataScenarioIds?.length > 0 ? (
                                        <>
                                          <RoleGate roles={EDIT_ROLES}>
                                            <button
                                              className="btn btn-primary btn-sm"
                                              onClick={() => navigate('/testdata', {
                                                state: { applicationId: app.applicationId, scenarioId: ep.missingDataScenarioIds[0] }
                                              })}
                                            >
                                              + Create Test Data
                                            </button>
                                          </RoleGate>
                                          <RoleGate roles={[ROLES.VIEWER]}>
                                            <span className={`tag ${EP_STATUS_TAG.PARTIAL}`}>{EP_STATUS_LABEL.PARTIAL}</span>
                                          </RoleGate>
                                        </>
                                      ) : (
                                        <span className={`tag ${EP_STATUS_TAG[ep.status] || ''}`}>{EP_STATUS_LABEL[ep.status] || ep.status}</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/scenarios')}>→ View Scenarios</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/onboarding/${app.applicationId}/specs`)}>✦ Fix Gaps</button>
                          </div>
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
