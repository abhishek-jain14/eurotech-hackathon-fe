import { useEffect, useMemo, useState } from 'react';
import { listApplications } from '../../api/applicationApi';
import { listEnvironmentsByProject } from '../../api/environmentApi';
import { listScenariosByApplication } from '../../api/scenarioApi';
import { triggerExecution, listExecutionsByApplication } from '../../api/executionApi';
import RoleGate from '../../components/common/RoleGate';
import { EDIT_ROLES } from '../../constants/roles';
import { normalizeListResponse } from '../../utils/normalizeListResponse';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'positive', label: '✔ Positive' },
  { key: 'negative', label: '✘ Negative' }
];

export default function ExecutionPage() {
  const [applications, setApplications] = useState([]);
  const [applicationId, setApplicationId] = useState('');
  const [environments, setEnvironments] = useState([]);
  const [environmentId, setEnvironmentId] = useState('');
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState([]);
  const [filter, setFilter] = useState('all');
  const [endpointFilter, setEndpointFilter] = useState('all');
  const [suiteName, setSuiteName] = useState('');
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
      await triggerExecution({
        applicationId: Number(applicationId),
        environmentId: Number(environmentId),
        scenarioIds,
        suiteName: suiteName.trim() || undefined
      });
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

  // "Run via Prompt" - selects everything matching the current type/endpoint filters and runs immediately,
  // instead of requiring the user to select rows first.
  const handleRunViaPrompt = async () => {
    await runExecutionForIds(visibleScenarios.map((s) => s.id));
  };

  const hasSelectedScenarios = selectedScenarioIds.length > 0;
  const getScenarioIcon = (scenario) => {
    if (scenario?.scenarioType === 'POSITIVE' || /positive$/i.test(scenario?.name || '')) return '✔';
    return '✘';
  };
  const endpointOptions = useMemo(() => {
    const keys = new Set(scenarios.map((s) => `${s.httpMethod || 'GET'} ${s.endpoint || ''}`));
    return Array.from(keys).sort();
  }, [scenarios]);
  const visibleScenarios = useMemo(() => {
    let list = scenarios;
    if (filter === 'positive') list = list.filter((scenario) => scenario.scenarioType === 'POSITIVE');
    else if (filter === 'negative') list = list.filter((scenario) => scenario.scenarioType === 'NEGATIVE');
    if (endpointFilter !== 'all') list = list.filter((scenario) => `${scenario.httpMethod || 'GET'} ${scenario.endpoint || ''}` === endpointFilter);
    return list;
  }, [filter, endpointFilter, scenarios]);
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
          <div className="card-hd"><span className="card-title">Run via Prompt</span></div>
          <div className="sc-row3" style={{ marginBottom: 10 }}>
            <div className="fld" style={{ marginBottom: 0 }}>
              <label>Endpoint</label>
              <select value={endpointFilter} onChange={(e) => setEndpointFilter(e.target.value)} disabled={!hasSpecificApplication}>
                <option value="all">All Endpoints</option>
                {endpointOptions.map((ep) => <option key={ep} value={ep}>{ep}</option>)}
              </select>
            </div>
            <div className="fld" style={{ marginBottom: 0 }}>
              <label>Run Name <span className="sc-label-hint">(optional)</span></label>
              <input value={suiteName} onChange={(e) => setSuiteName(e.target.value)} placeholder="e.g. Nightly Smoke Run" />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                className="btn-purple"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 7 }}
                onClick={handleRunViaPrompt}
                disabled={running || !hasSpecificApplication || visibleScenarios.length === 0}
              >
                ✦ Run {visibleScenarios.length} Matching
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-hd"><span className="card-title">Select Scenarios</span><span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{selectedScenarioIds.length} of {visibleScenarios.length} selected</span></div>
          <div className="sc-filter-bar" style={{ marginBottom: 10 }}>
            {FILTERS.map((f) => (
              <span key={f.key} className={`sc-fc ${filter === f.key ? 'on' : ''}`} onClick={() => setFilter(f.key)}>{f.label}</span>
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
          {visibleScenarios.length > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginBottom: 10 }} onClick={toggleSelectAll}>
              {allVisibleScenariosSelected ? 'Deselect All' : 'Select All'}
            </button>
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
