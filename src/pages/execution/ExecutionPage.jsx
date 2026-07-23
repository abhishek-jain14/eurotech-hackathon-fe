import { useEffect, useState } from 'react';
import { listApplications } from '../../api/applicationApi';
import { listEnvironmentsByProject } from '../../api/environmentApi';
import { listScenariosByApplication } from '../../api/scenarioApi';
import { triggerExecution, listExecutionsByApplication } from '../../api/executionApi';
import RoleGate from '../../components/common/RoleGate';
import { EDIT_ROLES } from '../../constants/roles';
import { normalizeListResponse } from '../../utils/normalizeListResponse';

export default function ExecutionPage() {
  const [applications, setApplications] = useState([]);
  const [applicationId, setApplicationId] = useState('');
  const [environments, setEnvironments] = useState([]);
  const [environmentId, setEnvironmentId] = useState('');
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState([]);
  const [runs, setRuns] = useState([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    listApplications({ size: 100 }).then((payload) => {
      const list = normalizeListResponse(payload);
      setApplications(list);
      if (list.length) setApplicationId(String(list[0].id));
    }).catch(() => setApplications([]));
  }, []);

  const selectedApp = applications.find((a) => String(a.id) === applicationId);

  const load = () => {
    if (!applicationId || !selectedApp) return;
    // Environments belong to the application's PROJECT, not the application itself
    listEnvironmentsByProject(selectedApp.projectId).then((envs) => {
      setEnvironments(envs);
      if (envs.length) setEnvironmentId(String(envs[0].id));
    });
    listScenariosByApplication(applicationId, { size: 100 }).then((payload) => setScenarios(normalizeListResponse(payload))).catch(() => setScenarios([]));
    listExecutionsByApplication(applicationId, { size: 20 }).then((payload) => setRuns(normalizeListResponse(payload))).catch(() => setRuns([]));
  };

  useEffect(() => {
    load();
  }, [applicationId, selectedApp?.projectId]);

  const toggleScenario = (id) => {
    setSelectedScenarioIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleRun = async () => {
    setError(null);
    if (!environmentId) { setError('Add an environment under this application\'s project first'); return; }
    if (selectedScenarioIds.length === 0) { setError('Select at least one scenario to execute'); return; }
    setRunning(true);
    try {
      await triggerExecution({ applicationId: Number(applicationId), environmentId: Number(environmentId), scenarioIds: selectedScenarioIds });
      setSelectedScenarioIds([]);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Execution failed to start');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <div className="card-hd"><span className="card-title">Execution</span></div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="fld"><label>Application</label>
          <select value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
            {applications.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="fld"><label>Environment</label>
          <select value={environmentId} onChange={(e) => setEnvironmentId(e.target.value)}>
            {environments.map((env) => <option key={env.id} value={env.id}>{env.envName} ({env.baseUrl})</option>)}
          </select>
        </div>
      </div>

      {error && <div className="readonly-banner">{error}</div>}

      <RoleGate roles={EDIT_ROLES}>
        <div className="card">
          <div className="card-hd"><span className="card-title">Select Scenarios</span><span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{selectedScenarioIds.length} of {scenarios.length} selected</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
            {scenarios.map((s) => (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <input type="checkbox" checked={selectedScenarioIds.includes(s.id)} onChange={() => toggleScenario(s.id)} />
                {s.name}
              </label>
            ))}
          </div>
          <button className="btn btn-primary" onClick={handleRun} disabled={running}>{running ? 'Running…' : '▶ Run Selected'}</button>
        </div>
      </RoleGate>

      <div className="card">
        <div className="card-hd"><span className="card-title">Recent Runs</span></div>
        {runs.length === 0 ? (
          <div className="empty-state">No execution runs yet.</div>
        ) : (
          <table>
            <thead><tr><th>Suite</th><th>Environment</th><th>Status</th><th>Passed</th><th>Failed</th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>{r.suiteName}</td>
                  <td>{r.environmentName}</td>
                  <td><span className={`tag ${r.status === 'COMPLETED' ? 'tag-g' : r.status === 'FAILED' ? 'tag-r' : 'tag-p'}`}>{r.status}</span></td>
                  <td style={{ color: 'var(--accent)' }}>{r.passedCount}</td>
                  <td style={{ color: 'var(--red)' }}>{r.failedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
