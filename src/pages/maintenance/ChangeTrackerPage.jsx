import { useEffect, useState, Fragment } from 'react';
import { listApplications, rejectSpecVersion } from '../../api/applicationApi';
import { analyzeApplication, listPendingVersions, getPendingImpact, healVersion } from '../../api/changeTrackerApi';
import RoleGate from '../../components/common/RoleGate';
import { EDIT_ROLES } from '../../constants/roles';
import { normalizeListResponse } from '../../utils/normalizeListResponse';
import { FIELD_CHANGE_LABEL, FIELD_CHANGE_TAG, buildFieldRows } from '../../utils/specFieldDiff';

const CHANGE_TAG = { ADDED: 'tag-g', REMOVED: 'tag-r', MODIFIED: 'tag-p' };

export default function ChangeTrackerPage() {
  const [applications, setApplications] = useState([]);
  const [applicationId, setApplicationId] = useState('');
  const [pendingVersions, setPendingVersions] = useState([]);
  const [impacts, setImpacts] = useState({}); // versionId -> impact
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    listApplications({ size: 100 }).then((page) => {
      const list = normalizeListResponse(page);
      setApplications(list);
      if (list.length) setApplicationId(String(list[0].id));
    });
  }, []);

  const load = async () => {
    if (!applicationId) return;
    setLoadingImpact(true);
    try {
      const pending = await listPendingVersions(applicationId);
      setPendingVersions(pending);
      const impactMap = {};
      for (const v of pending) {
        impactMap[v.id] = await getPendingImpact(applicationId, v.id);
      }
      setImpacts(impactMap);
    } finally {
      setLoadingImpact(false);
    }
  };

  useEffect(() => { load(); }, [applicationId]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      await analyzeApplication(applicationId);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed - is the application reachable?');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleHeal = async (versionId) => {
    await healVersion(applicationId, versionId);
    load();
  };

  const handleReject = async (versionId) => {
    await rejectSpecVersion(applicationId, versionId);
    load();
  };

  const selectedApp = applications.find((a) => String(a.id) === String(applicationId));

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div className="card-hd"><span className="card-title">Change Tracker</span></div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.7, maxWidth: 720 }}>
          Re-fetches the live spec and compares it against the current version. Identical content is a
          no-op; genuinely different content lands here as a pending version — nothing goes live until
          you approve (heal) or reject it.
        </div>
      </div>

      {error && <div className="readonly-banner">{error}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-hd">
          <span className="card-title">Onboarded Applications</span>
          <span className="tag tag-p">{applications.length} application{applications.length === 1 ? '' : 's'}</span>
        </div>
        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
          {applications.map((a) => (
            <div
              key={a.id}
              className={`sc-item ${String(a.id) === String(applicationId) ? 'active' : ''}`}
              onClick={() => setApplicationId(String(a.id))}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 'bold' }}>{a.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                  {a.applicationType}{a.specFormat ? ` · ${a.specFormat}` : ''}{a.currentSpecVersionNumber ? ` · v${a.currentSpecVersionNumber}` : ''}
                </div>
              </div>
              <span className={`tag ${a.hasPendingSpecVersion ? 'tag-a' : 'tag-g'}`}>
                {a.hasPendingSpecVersion ? 'Pending review' : 'Up to date'}
              </span>
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <RoleGate roles={EDIT_ROLES}>
            <button className="btn btn-primary btn-sm" onClick={handleAnalyze} disabled={analyzing || !applicationId}>
              {analyzing ? '⏳ Analyzing…' : '✦ Analyze Changes'}
            </button>
          </RoleGate>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
            {selectedApp ? <><span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>{selectedApp.name}</span> selected — ready to compare the local spec against the server.</> : 'Select an application to compare its local spec against the latest on the server.'}
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">Analysis</span>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{loadingImpact ? 'Loading…' : (pendingVersions.length === 0 ? 'Up to date' : `${pendingVersions.length} pending version${pendingVersions.length === 1 ? '' : 's'}`)}</span>
        </div>

        {pendingVersions.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 30, marginBottom: 10 }}>🧬</div>
            <div>Select an application above and run Analyze to detect added, removed and renamed fields between versions.</div>
          </div>
        ) : (
          pendingVersions.map((v) => {
            const impact = impacts[v.id];
            // A MODIFIED entry with no field-level rows is a false positive (e.g. the
            // backend flagged the endpoint but nothing actually differs field-by-field) -
            // ADDED/REMOVED endpoints are real changes even without field rows, so only
            // MODIFIED is filtered here.
            const fieldRowsByEndpoint = (impact?.changes || [])
              .map((c) => ({
                c,
                fieldRows: buildFieldRows((impact.fieldChanges || []).find((f) => f.endpoint === c.endpoint))
              }))
              .filter(({ c, fieldRows }) => c.changeType !== 'MODIFIED' || fieldRows.length > 0);
            const summary = fieldRowsByEndpoint.reduce((acc, { fieldRows }) => {
              fieldRows.forEach((r) => { acc[r.kind] = (acc[r.kind] || 0) + 1; });
              return acc;
            }, {});

            return (
              <div key={v.id} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 8 }}>
                  Pending v{v.versionNumber} — detected via {v.source}
                </div>

                {impact && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    {Object.entries(summary).map(([kind, count]) => (
                      <span key={kind} className={`tag ${FIELD_CHANGE_TAG[kind] || 'tag-p'}`}>{count} {(FIELD_CHANGE_LABEL[kind] || kind).toLowerCase()}</span>
                    ))}
                    {impact.affectedScenarioCount > 0 && (
                      <span className="tag tag-p">{impact.affectedScenarioCount} scenario{impact.affectedScenarioCount === 1 ? '' : 's'} impacted</span>
                    )}
                  </div>
                )}

                {impact && fieldRowsByEndpoint.length === 0 ? (
                  <div className="empty-state">No structural differences detected.</div>
                ) : impact ? (
                  <table>
                    <thead><tr><th>Change</th><th>Endpoint</th><th>Description</th></tr></thead>
                    <tbody>
                      {fieldRowsByEndpoint.map(({ c, fieldRows }, i) => (
                        <Fragment key={i}>
                          <tr>
                            <td><span className={`tag ${CHANGE_TAG[c.changeType] || 'tag-p'}`}>{c.changeType}</span></td>
                            <td>{c.endpoint}</td>
                            <td>{c.description}</td>
                          </tr>
                          {fieldRows.length > 0 && (
                            <tr>
                              <td colSpan={3} style={{ padding: 0, background: 'var(--surface-2)' }}>
                                <table style={{ margin: '4px 12px 10px' }}>
                                  <thead>
                                    <tr>
                                      <th>Field Change</th>
                                      <th>Old</th>
                                      <th>New</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {fieldRows.map((r, ri) => (
                                      <tr key={ri}>
                                        <td>
                                          <span className={`tag ${FIELD_CHANGE_TAG[r.kind] || ''}`}>
                                            {FIELD_CHANGE_LABEL[r.kind] || r.kind}
                                          </span>
                                        </td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 11, color: r.oldValue ? 'var(--red)' : 'var(--text-dim)', textDecoration: r.oldValue && r.kind !== 'TYPE_CHANGED' ? 'line-through' : 'none' }}>{r.oldValue || '—'}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 11, color: r.newValue ? 'var(--accent)' : 'var(--text-dim)' }}>{r.newValue || '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                ) : null}

                {impact && impact.affectedScenarioCount > 0 && (
                  <div className="readonly-banner" style={{ marginTop: 10 }}>
                    {impact.affectedScenarioCount} scenario(s) reference changed endpoints: {impact.affectedScenarios.map((s) => s.scenarioName).join(', ')}
                  </div>
                )}

                <RoleGate roles={EDIT_ROLES}>
                  <div className="form-ft">
                    <button className="btn btn-red" onClick={() => handleReject(v.id)}>Reject</button>
                    <button className="btn btn-primary" onClick={() => handleHeal(v.id)}>✦ Heal (Approve)</button>
                  </div>
                </RoleGate>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}