import { useEffect, useState } from 'react';
import { listApplications } from '../../api/applicationApi';
import { listScenariosByApplication } from '../../api/scenarioApi';
import { listTestFlowsByApplication, createTestFlow, deleteTestFlow } from '../../api/testFlowApi';
import RoleGate from '../../components/common/RoleGate';
import { EDIT_ROLES } from '../../constants/roles';
import { normalizeListResponse } from '../../utils/normalizeListResponse';

export default function TestFlowsPage() {
  const [applications, setProjects] = useState([]);
  const [applicationId, setApplicationId] = useState('');
  const [scenarios, setScenarios] = useState([]);
  const [flows, setFlows] = useState([]);
  const [name, setName] = useState('');
  const [selectedScenarioIds, setSelectedScenarioIds] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    listApplications({ size: 100 }).then((page) => {
      const list = normalizeListResponse(page);
      setProjects(list);
      if (list.length && !applicationId) setApplicationId(String(list[0].id));
    });
  }, []);

  const load = () => {
    if (!applicationId) return;
    listScenariosByApplication(applicationId, { size: 100 }).then((payload) => setScenarios(normalizeListResponse(payload))).catch(() => setScenarios([]));
    listTestFlowsByApplication(applicationId).then(setFlows);
  };

  useEffect(() => {
    load();
  }, [applicationId]);

  const toggleScenario = (id) => {
    setSelectedScenarioIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    if (selectedScenarioIds.length === 0) {
      setError('Select at least one scenario to chain');
      return;
    }
    try {
      const steps = selectedScenarioIds.map((scenarioId, idx) => ({ scenarioId, sequenceOrder: idx + 1 }));
      await createTestFlow({ applicationId: Number(applicationId), name, steps });
      setName('');
      setSelectedScenarioIds([]);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create test flow');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this test flow?')) return;
    await deleteTestFlow(id);
    load();
  };

  return (
    <div>
      <div className="card-hd"><span className="card-title">Test Flows</span></div>

      <div className="fld" style={{ maxWidth: 320, marginBottom: 14 }}>
        <label>Application</label>
        <select value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
          {applications.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {error && <div className="readonly-banner">{error}</div>}

      <RoleGate roles={EDIT_ROLES}>
        <form className="card" onSubmit={handleCreate}>
          <div className="card-hd"><span className="card-title">Chain Scenarios Into a Flow</span></div>
          <div className="fld"><label>Flow Name *</label><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Charge then Refund" /></div>
          <div className="fld">
            <label>Select scenarios in execution order</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
              {scenarios.map((s) => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <input type="checkbox" checked={selectedScenarioIds.includes(s.id)} onChange={() => toggleScenario(s.id)} />
                  {s.name} <span className="tag" style={{ marginLeft: 'auto' }}>{s.httpMethod} {s.endpoint}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="form-ft"><button className="btn btn-primary" type="submit">Save Flow</button></div>
        </form>
      </RoleGate>

      <div className="card">
        {flows.length === 0 ? (
          <div className="empty-state">No test flows yet for this application.</div>
        ) : (
          flows.map((f) => (
            <div key={f.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{f.name}</strong>
                <RoleGate roles={EDIT_ROLES}>
                  <button className="btn btn-red btn-sm" onClick={() => handleDelete(f.id)}>Delete</button>
                </RoleGate>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                {f.steps.map((s) => s.scenarioName).join('  →  ')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
