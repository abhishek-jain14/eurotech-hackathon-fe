import { useEffect, useState } from 'react';
import { listApplications } from '../../api/applicationApi';
import { listScenariosByApplication, createScenario, deleteScenario } from '../../api/scenarioApi';
import RoleGate from '../../components/common/RoleGate';
import { EDIT_ROLES } from '../../constants/roles';

const EMPTY_FORM = { name: '', httpMethod: 'GET', endpoint: '', scenarioType: 'POSITIVE', source: 'MANUAL', riskLevel: 'MEDIUM', description: '' };

export default function ScenarioListPage() {
  const [applications, setProjects] = useState([]);
  const [applicationId, setApplicationId] = useState('');
  const [scenarios, setScenarios] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);

  useEffect(() => {
    listApplications({ size: 100 }).then((page) => {
      const list = page.content || [];
      setProjects(list);
      if (list.length && !applicationId) setApplicationId(String(list[0].id));
    });
  }, []);

  const load = () => {
    if (!applicationId) return;
    listScenariosByApplication(applicationId, { size: 100 }).then((page) => setScenarios(page.content || []));
  };

  useEffect(load, [applicationId]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await createScenario({ ...form, applicationId: Number(applicationId) });
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create scenario');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this scenario?')) return;
    await deleteScenario(id);
    load();
  };

  return (
    <div>
      <div className="card-hd">
        <span className="card-title">Test Scenarios</span>
        <RoleGate roles={EDIT_ROLES}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ New Scenario'}</button>
        </RoleGate>
      </div>

      <div className="fld" style={{ maxWidth: 320, marginBottom: 14 }}>
        <label>Application</label>
        <select value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
          {applications.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {error && <div className="readonly-banner">{error}</div>}

      <RoleGate roles={EDIT_ROLES}>
        {showForm && (
          <form className="card" onSubmit={handleCreate}>
            <div className="fld"><label>Name *</label><input required value={form.name} onChange={(e) => update('name', e.target.value)} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
              <div className="fld"><label>Method</label>
                <select value={form.httpMethod} onChange={(e) => update('httpMethod', e.target.value)}>
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="fld"><label>Endpoint</label><input value={form.endpoint} onChange={(e) => update('endpoint', e.target.value)} placeholder="/payments/charge" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div className="fld"><label>Type</label>
                <select value={form.scenarioType} onChange={(e) => update('scenarioType', e.target.value)}>
                  <option value="POSITIVE">Positive</option><option value="NEGATIVE">Negative</option>
                </select>
              </div>
              <div className="fld"><label>Source</label>
                <select value={form.source} onChange={(e) => update('source', e.target.value)}>
                  <option value="AI">AI</option><option value="MANUAL">Manual</option><option value="JIRA">Jira</option>
                </select>
              </div>
              <div className="fld"><label>Risk</label>
                <select value={form.riskLevel} onChange={(e) => update('riskLevel', e.target.value)}>
                  <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option>
                </select>
              </div>
            </div>
            <div className="fld"><label>Description</label><textarea rows={2} value={form.description} onChange={(e) => update('description', e.target.value)} /></div>
            <div className="form-ft"><button className="btn btn-primary" type="submit">Save Scenario</button></div>
          </form>
        )}
      </RoleGate>

      <div className="card">
        {scenarios.length === 0 ? (
          <div className="empty-state">No scenarios yet for this application.</div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Endpoint</th><th>Type</th><th>Source</th><th>Risk</th><th></th></tr></thead>
            <tbody>
              {scenarios.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.httpMethod} {s.endpoint}</td>
                  <td><span className={`tag ${s.scenarioType === 'POSITIVE' ? 'tag-g' : 'tag-r'}`}>{s.scenarioType}</span></td>
                  <td><span className="tag tag-p">{s.source}</span></td>
                  <td>{s.riskLevel}</td>
                  <td>
                    <RoleGate roles={EDIT_ROLES}>
                      <button className="btn btn-red btn-sm" onClick={() => handleDelete(s.id)}>Delete</button>
                    </RoleGate>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
