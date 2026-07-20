import { useEffect, useState } from 'react';
import { listApplications, rejectSpecVersion } from '../../api/applicationApi';
import { analyzeApplication, listPendingVersions, getPendingImpact, healVersion } from '../../api/changeTrackerApi';
import RoleGate from '../../components/common/RoleGate';
import { EDIT_ROLES } from '../../constants/roles';

export default function ChangeTrackerPage() {
  const [applications, setApplications] = useState([]);
  const [applicationId, setApplicationId] = useState('');
  const [pendingVersions, setPendingVersions] = useState([]);
  const [impacts, setImpacts] = useState({}); // versionId -> impact
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    listApplications({ size: 100 }).then((page) => {
      const list = page.content || [];
      setApplications(list);
      if (list.length) setApplicationId(String(list[0].id));
    });
  }, []);

  const load = async () => {
    if (!applicationId) return;
    const pending = await listPendingVersions(applicationId);
    setPendingVersions(pending);
    const impactMap = {};
    for (const v of pending) {
      impactMap[v.id] = await getPendingImpact(applicationId, v.id);
    }
    setImpacts(impactMap);
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

  return (
    <div>
      <div className="card-hd"><span className="card-title">Change Tracker</span></div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 14 }}>
        Re-fetches the live spec and compares it against the current version. Identical content is a
        no-op; genuinely different content lands here as a pending version - nothing goes live until
        you approve (heal) or reject it.
      </div>

      <div className="fld" style={{ maxWidth: 320, marginBottom: 14 }}>
        <label>Application</label>
        <select value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
          {applications.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {error && <div className="readonly-banner">{error}</div>}

      <RoleGate roles={EDIT_ROLES}>
        <div style={{ marginBottom: 14 }}>
          <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing}>{analyzing ? 'Analyzing…' : 'Analyze vs. Live Spec'}</button>
        </div>
      </RoleGate>

      {pendingVersions.length === 0 ? (
        <div className="card"><div className="empty-state">No pending changes. Run an analysis to check for drift.</div></div>
      ) : (
        pendingVersions.map((v) => {
          const impact = impacts[v.id];
          return (
            <div className="card" key={v.id}>
              <div className="card-hd">
                <span className="card-title">Pending v{v.versionNumber} — detected via {v.source}</span>
              </div>
              {impact && impact.changes.length === 0 ? (
                <div className="empty-state">No structural differences detected.</div>
              ) : impact ? (
                <table>
                  <thead><tr><th>Change</th><th>Endpoint</th><th>Description</th></tr></thead>
                  <tbody>
                    {impact.changes.map((c, i) => (
                      <tr key={i}>
                        <td><span className={`tag ${c.changeType === 'ADDED' ? 'tag-g' : c.changeType === 'REMOVED' ? 'tag-r' : 'tag-p'}`}>{c.changeType}</span></td>
                        <td>{c.endpoint}</td>
                        <td>{c.description}</td>
                      </tr>
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
                  <button className="btn btn-primary" onClick={() => handleHeal(v.id)}>Heal (Approve)</button>
                </div>
              </RoleGate>
            </div>
          );
        })
      )}
    </div>
  );
}
