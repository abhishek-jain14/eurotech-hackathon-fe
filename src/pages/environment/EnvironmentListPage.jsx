import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { listEnvironmentsByProject, createEnvironment, updateEnvironment, deleteEnvironment } from '../../api/environmentApi';
import RoleGate from '../../components/common/RoleGate';
import { EDIT_ROLES } from '../../constants/roles';
import { useDialog } from '../../context/DialogContext';

const ENV_NAMES = ['Dev', 'UAT', 'Staging', 'Prod'];
const CONFIG_TYPES = ['SwaggerUrl', 'Database'];
const EMPTY_FORM = { envName: ENV_NAMES[0], configType: CONFIG_TYPES[0], baseUrl: '' };

export default function EnvironmentListPage() {
  const { projectId } = useParams();
  const [environments, setEnvironments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const { confirm } = useDialog();

  const load = () => {
    listEnvironmentsByProject(projectId).then(setEnvironments).catch(() => setError('Unable to load environments.'));
  };

  useEffect(() => {
    load();
  }, [projectId]);

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
      configType: env.configType || CONFIG_TYPES[0],
      baseUrl: env.baseUrl
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
    const shouldDelete = await confirm({ title: 'Remove environment?', message: 'This will delete the environment configuration. Continue?', variant: 'danger', confirmLabel: 'Remove' });
    if (!shouldDelete) return;
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
            <div className="fld"><label>Environment Name *</label>
              <select required value={form.envName} onChange={(e) => update('envName', e.target.value)}>
                {ENV_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="fld"><label>Config Type *</label>
              <select required value={form.configType} onChange={(e) => update('configType', e.target.value)}>
                {CONFIG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="fld"><label>Base URL *</label><input required value={form.baseUrl} onChange={(e) => update('baseUrl', e.target.value)} placeholder="https://staging-api.example.com" /></div>
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
            <thead><tr><th>Name</th><th>Config Type</th><th>Base URL</th><th></th></tr></thead>
            <tbody>
              {environments.map((env) => (
                <tr key={env.id}>
                  <td>{env.envName}</td>
                  <td><span className="tag tag-p">{env.configType}</span></td>
                  <td>{env.baseUrl}</td>
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
