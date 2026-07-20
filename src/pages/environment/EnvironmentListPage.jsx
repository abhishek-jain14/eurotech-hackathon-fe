import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { listEnvironmentsByProject, createEnvironment, updateEnvironment, deleteEnvironment } from '../../api/environmentApi';
import RoleGate from '../../components/common/RoleGate';
import { EDIT_ROLES } from '../../constants/roles';

const EMPTY_FORM = { envName: '', envType: 'DEV', baseUrl: '', authType: 'NONE', maxWorkers: 4, timeoutSeconds: 30 };

export default function EnvironmentListPage() {
  const { projectId } = useParams();
  const [environments, setEnvironments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);

  const load = () => {
    listEnvironmentsByProject(projectId).then(setEnvironments).catch(() => setError('Unable to load environments.'));
  };

  useEffect(load, [projectId]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (env) => {
    setEditingId(env.id);
    setForm({
      envName: env.envName,
      envType: env.envType,
      baseUrl: env.baseUrl,
      authType: env.authType || 'NONE',
      maxWorkers: env.maxWorkers,
      timeoutSeconds: env.timeoutSeconds
    });
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await updateEnvironment(editingId, { ...form, projectId: Number(projectId) });
      } else {
        await createEnvironment({ ...form, projectId: Number(projectId) });
      }
      handleCancelForm();
      load();
    } catch (err) {
      setError(err.response?.data?.message || `Unable to ${editingId ? 'update' : 'add'} environment`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this environment configuration?')) return;
    await deleteEnvironment(id);
    load();
  };

  return (
    <div>
      <Link to="/projects" className="btn btn-ghost btn-sm" style={{ marginBottom: 12, display: 'inline-block' }}>← Back to Projects</Link>

      <div className="card-hd">
        <span className="card-title">Environments</span>
        <RoleGate roles={EDIT_ROLES}>
          <button className="btn btn-primary btn-sm" onClick={() => (showForm ? handleCancelForm() : openCreate())}>
            {showForm ? 'Cancel' : '+ Add Environment'}
          </button>
        </RoleGate>
      </div>

      {error && <div className="readonly-banner">{error}</div>}

      <RoleGate roles={EDIT_ROLES}>
        {showForm && (
          <form className="card" onSubmit={handleSubmit}>
            <div className="fld"><label>Environment Name *</label><input required value={form.envName} onChange={(e) => update('envName', e.target.value)} placeholder="Staging" /></div>
            <div className="fld"><label>Type *</label>
              <select value={form.envType} onChange={(e) => update('envType', e.target.value)}>
                <option value="DEV">Dev</option><option value="STAGING">Staging</option><option value="PROD">Prod</option>
              </select>
            </div>
            <div className="fld"><label>Base URL *</label><input required value={form.baseUrl} onChange={(e) => update('baseUrl', e.target.value)} placeholder="https://staging-api.example.com" /></div>
            <div className="fld"><label>Auth Type</label>
              <select value={form.authType} onChange={(e) => update('authType', e.target.value)}>
                <option value="NONE">None</option><option value="BASIC">Basic</option><option value="BEARER">Bearer</option><option value="API_KEY">API Key</option><option value="OAUTH2">OAuth2</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="fld"><label>Max Workers</label><input type="number" value={form.maxWorkers} onChange={(e) => update('maxWorkers', Number(e.target.value))} /></div>
              <div className="fld"><label>Timeout (s)</label><input type="number" value={form.timeoutSeconds} onChange={(e) => update('timeoutSeconds', Number(e.target.value))} /></div>
            </div>
            <div className="form-ft">
              <button type="button" className="btn btn-ghost" onClick={handleCancelForm}>Cancel</button>
              <button className="btn btn-primary" type="submit">{editingId ? 'Save Changes' : 'Save Environment'}</button>
            </div>
          </form>
        )}
      </RoleGate>

      <div className="card">
        {environments.length === 0 ? (
          <div className="empty-state">No environments configured yet for this application.</div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Type</th><th>Base URL</th><th>Auth</th><th>Workers</th><th>Timeout</th><th></th></tr></thead>
            <tbody>
              {environments.map((env) => (
                <tr key={env.id}>
                  <td>{env.envName}</td>
                  <td><span className="tag tag-p">{env.envType}</span></td>
                  <td>{env.baseUrl}</td>
                  <td>{env.authType || 'NONE'}</td>
                  <td>{env.maxWorkers}</td>
                  <td>{env.timeoutSeconds}s</td>
                  <td>
                    <RoleGate roles={EDIT_ROLES}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(env)}>Edit</button>
                      <button className="btn btn-red btn-sm" style={{ marginLeft: 6 }} onClick={() => handleDelete(env.id)}>Remove</button>
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
