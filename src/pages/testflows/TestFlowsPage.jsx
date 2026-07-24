import { useEffect, useMemo, useState } from 'react';
import { listApplications } from '../../api/applicationApi';
import { listScenariosByApplication } from '../../api/scenarioApi';
import { listTestFlowsByApplication, createTestFlow, deleteTestFlow } from '../../api/testFlowApi';
import RoleGate from '../../components/common/RoleGate';
import { EDIT_ROLES } from '../../constants/roles';
import { normalizeListResponse } from '../../utils/normalizeListResponse';

const buildFlowStep = (scenario, fallbackName = 'Scenario') => ({
  id: scenario?.id,
  scenarioId: scenario?.id,
  name: scenario?.name || fallbackName,
  httpMethod: scenario?.httpMethod || 'GET',
  endpoint: scenario?.endpoint || '/'
});

export default function TestFlowsPage() {
  const [applications, setApplications] = useState([]);
  const [applicationId, setApplicationId] = useState('');
  const [scenarios, setScenarios] = useState([]);
  const [flows, setFlows] = useState([]);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [selectedSteps, setSelectedSteps] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listApplications({ size: 100 })
      .then((page) => {
        const list = normalizeListResponse(page);
        setApplications(list);
        if (list.length && !applicationId) setApplicationId(String(list[0].id));
      })
      .catch(() => setApplications([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!applicationId) {
      setScenarios([]);
      setFlows([]);
      setSelectedSteps([]);
      setName('');
      return;
    }

    listScenariosByApplication(applicationId, { size: 100 })
      .then((payload) => setScenarios(normalizeListResponse(payload)))
      .catch(() => setScenarios([]));

    listTestFlowsByApplication(applicationId)
      .then((payload) => setFlows(Array.isArray(payload) ? payload : []))
      .catch(() => setFlows([]));
  }, [applicationId]);

  const filteredScenarios = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return scenarios;
    return scenarios.filter((scenario) => {
      const haystack = `${scenario.name || ''} ${scenario.httpMethod || ''} ${scenario.endpoint || ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [scenarios, search]);

  const selectedApplication = applications.find((app) => String(app.id) === String(applicationId));

  const addStep = (scenario) => {
    setSelectedSteps((prev) => {
      if (prev.some((step) => step.scenarioId === scenario.id)) return prev;
      return [...prev, buildFlowStep(scenario)];
    });
  };

  const removeStep = (scenarioId) => {
    setSelectedSteps((prev) => prev.filter((step) => step.scenarioId !== scenarioId));
  };

  const moveStep = (scenarioId, direction) => {
    setSelectedSteps((prev) => {
      const index = prev.findIndex((step) => step.scenarioId === scenarioId);
      if (index < 0) return prev;
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(index, 1);
      updated.splice(nextIndex, 0, moved);
      return updated;
    });
  };

  const loadFlow = (flow) => {
    const scenarioMap = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
    const nextSteps = (flow.steps || []).map((step) => {
      const scenario = scenarioMap.get(step.scenarioId);
      return {
        id: step.scenarioId,
        scenarioId: step.scenarioId,
        name: step.scenarioName || scenario?.name || 'Scenario',
        httpMethod: scenario?.httpMethod || 'GET',
        endpoint: scenario?.endpoint || '/'
      };
    });
    setName(flow.name || '');
    setSelectedSteps(nextSteps);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Add a flow name before saving');
      return;
    }

    if (selectedSteps.length === 0) {
      setError('Add at least one scenario to the flow');
      return;
    }

    try {
      setSaving(true);
      const steps = selectedSteps.map((step, idx) => ({ scenarioId: step.scenarioId, sequenceOrder: idx + 1 }));
      await createTestFlow({ applicationId: Number(applicationId), name: name.trim(), steps });
      setName('');
      setSelectedSteps([]);
      listTestFlowsByApplication(applicationId)
        .then((payload) => setFlows(Array.isArray(payload) ? payload : []))
        .catch(() => setFlows([]));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save this test flow');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this test flow?')) return;
    try {
      await deleteTestFlow(id);
      setFlows((prev) => prev.filter((flow) => flow.id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete this test flow');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-hd">
          <span className="card-title">Test Flow Builder</span>
          <span className="tag tag-p">Backend-driven</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: 10, padding: 14 }}>
          <div className="fld" style={{ marginBottom: 0 }}>
            <label>Application</label>
            <select value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
              {applications.map((app) => (
                <option key={app.id} value={app.id}>{app.name}</option>
              ))}
            </select>
          </div>

          <div className="fld" style={{ marginBottom: 0 }}>
            <label>Flow Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Charge then refund"
            />
          </div>

          <RoleGate roles={EDIT_ROLES}>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Saving…' : 'Save Flow'}
            </button>
          </RoleGate>
        </div>
      </div>

      {error && <div className="readonly-banner" style={{ marginTop: 10 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 300px', gap: 12, marginTop: 12, alignItems: 'start' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="card-hd">
            <span className="card-title">Test Library</span>
            <span className="tag">{scenarios.length} scenarios</span>
          </div>
          <div style={{ padding: 10 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search scenarios"
              style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 6, padding: '7px 10px', color: 'var(--text)', fontFamily: 'monospace' }}
            />
          </div>
          <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflowY: 'auto' }}>
            {filteredScenarios.length === 0 ? (
              <div className="empty-state" style={{ minHeight: 120 }}>
                <div>No scenarios match this search.</div>
              </div>
            ) : (
              filteredScenarios.map((scenario) => (
                <div key={scenario.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{scenario.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>
                        {scenario.httpMethod} {scenario.endpoint}
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => addStep(scenario)}>Add</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="card-hd">
            <span className="card-title">Flow Canvas</span>
            <span className="tag tag-g">{selectedSteps.length} step{selectedSteps.length === 1 ? '' : 's'}</span>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 420, overflowY: 'auto' }}>
            {selectedSteps.length === 0 ? (
              <div className="empty-state" style={{ minHeight: 260 }}>
                <div style={{ fontSize: 28 }}>⤳</div>
                <div>Select scenarios from the library to build the flow.</div>
              </div>
            ) : (
              selectedSteps.map((step, idx) => (
                <div key={step.scenarioId} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--surface-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text-dim)' }}>{idx + 1}</div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{step.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>{step.httpMethod} {step.endpoint}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => moveStep(step.scenarioId, 'up')} disabled={idx === 0}>↑</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => moveStep(step.scenarioId, 'down')} disabled={idx === selectedSteps.length - 1}>↓</button>
                      <button className="btn btn-red btn-sm" onClick={() => removeStep(step.scenarioId)}>Remove</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="card-hd">
            <span className="card-title">Flow Summary</span>
            <span className="tag">{selectedApplication?.name || 'Select app'}</span>
          </div>
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="info-box">
              Use the backend-backed scenario library to chain steps into a reusable test flow for this application.
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-dim)' }}>Current flow</span>
              <strong>{name.trim() || 'Untitled flow'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-dim)' }}>Steps</span>
              <strong>{selectedSteps.length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-dim)' }}>Application</span>
              <strong>{selectedApplication?.name || '—'}</strong>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>Saved Flows</div>
              {flows.length === 0 ? (
                <div className="empty-state" style={{ minHeight: 90 }}>
                  <div>No saved flows yet.</div>
                </div>
              ) : (
                flows.map((flow) => (
                  <div key={flow.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10, marginBottom: 8, background: 'var(--surface-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{flow.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>
                          {flow.steps?.length || 0} step{(flow.steps?.length || 0) === 1 ? '' : 's'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => loadFlow(flow)}>Open</button>
                        <RoleGate roles={EDIT_ROLES}>
                          <button className="btn btn-red btn-sm" onClick={() => handleDelete(flow.id)}>Delete</button>
                        </RoleGate>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
