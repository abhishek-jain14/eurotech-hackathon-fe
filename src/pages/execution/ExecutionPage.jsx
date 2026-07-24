import { useEffect, useMemo, useState } from 'react';
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
  const [filter, setFilter] = useState('all');
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
  const hasSpecificApplication = Boolean(applicationId && applicationId !== 'all' && selectedApp);

  const load = () => {
    if (!hasSpecificApplication) {
      setEnvironments([]);
      setScenarios([]);
      setRuns([]);
      setEnvironmentId('');
      return;
    }
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

  const runExecutionForIds = async (scenarioIds) => {
    setError(null);
    if (!environmentId) { setError('Add an environment under this application\'s project first'); return; }
    if (scenarioIds.length === 0) { setError('Select at least one scenario to execute'); return; }
    setRunning(true);
    try {
      await triggerExecution({ applicationId: Number(applicationId), environmentId: Number(environmentId), scenarioIds });
      setSelectedScenarioIds([]);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Execution failed to start');
    } finally {
      setRunning(false);
    }
  };

  const handleRun = async () => {
    await runExecutionForIds(selectedScenarioIds);
  };

  const hasSelectedScenarios = selectedScenarioIds.length > 0;
  const getScenarioIcon = (scenario) => {
    if (scenario?.scenarioType === 'POSITIVE' || /positive$/i.test(scenario?.name || '')) return '✔';
    return '✘';
  };
  const visibleScenarios = useMemo(() => {
    if (filter === 'positive') return scenarios.filter((scenario) => scenario.scenarioType === 'POSITIVE');
    if (filter === 'negative') return scenarios.filter((scenario) => scenario.scenarioType === 'NEGATIVE');
    return scenarios;
  }, [filter, scenarios]);
  const allVisibleScenariosSelected = visibleScenarios.length > 0 && visibleScenarios.every((scenario) => selectedScenarioIds.includes(scenario.id));

  const toggleSelectAll = () => {
    if (allVisibleScenariosSelected) {
      setSelectedScenarioIds((prev) => prev.filter((id) => !visibleScenarios.some((scenario) => scenario.id === id)));
    } else {
      setSelectedScenarioIds((prev) => {
        const next = new Set(prev);
        visibleScenarios.forEach((scenario) => next.add(scenario.id));
        return Array.from(next);
      });
    }
  };

  return (
    <div>
      <div className="card-hd"><span className="card-title">Execution</span></div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="fld"><label>Application</label>
          <select value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
            <option value="all">All</option>
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
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {['all', 'positive', 'negative'].map((option) => (
              <button
                key={option}
                className={`btn btn-sm ${filter === option ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(option)}
                style={{
                  padding: '4px 8px',
                  fontSize: 11,
                  color: filter === option && option === 'positive' ? '#16a34a' : filter === option && option === 'negative' ? '#dc2626' : undefined,
                  borderColor: filter === option && option === 'positive' ? '#16a34a' : filter === option && option === 'negative' ? '#dc2626' : undefined,
                  backgroundColor: filter === option && option === 'positive' ? '#dcfce7' : filter === option && option === 'negative' ? '#fee2e2' : undefined
                }}
              >
                {option === 'all' ? 'All' : option === 'positive' ? '✔ Positive' : '✘ Negative'}
              </button>
            ))}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 8 }}>
            <input type="checkbox" checked={allVisibleScenariosSelected} onChange={toggleSelectAll} />
            Select all visible
          </label>
          {!hasSpecificApplication ? (
            <div className="empty-state" style={{ marginBottom: 12 }}>Select a specific application to view and run scenarios.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
              {visibleScenarios.map((s) => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <input type="checkbox" checked={selectedScenarioIds.includes(s.id)} onChange={() => toggleScenario(s.id)} />
                  <span style={{ fontSize: 12, color: getScenarioIcon(s) === '✔' ? 'green' : 'red' }}>{getScenarioIcon(s)}</span>
                  {s.name}
                </label>
              ))}
            </div>
          )}
          <button className="btn btn-primary" onClick={handleRun} disabled={running || !hasSelectedScenarios}>{running ? 'Running…' : '▶ Run Selected'}</button>
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
