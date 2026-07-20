import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createProject, updateProject, configureProjectTlsAuth, deleteProject } from '../../api/projectApi';
import { useProjectCache } from '../../context/ProjectCacheContext';
import RoleGate from '../../components/common/RoleGate';
import { ADMIN_ONLY } from '../../constants/roles';

const EMPTY_FORM = { name: '', description: '', specPathSuffix: '' };
const AUTH_TYPES = ['NONE', 'BASIC', 'BEARER', 'API_KEY', 'MUTUAL_TLS'];

export default function ProjectsPage() {
  const { projects, refresh: reloadProjects, ensureLoaded } = useProjectCache();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);

  // TLS config panel state, per-project
  const [tlsProjectId, setTlsProjectId] = useState(null);
  const [authType, setAuthType] = useState('NONE');
  const [tlsForm, setTlsForm] = useState({
    keystoreFile: null, keystorePassword: '', truststoreFile: null, truststorePassword: '',
    username: '', password: '', bearerToken: '', apiKeyHeaderName: '', apiKeyValue: ''
  });
  const [tlsError, setTlsError] = useState(null);
  const [tlsSaving, setTlsSaving] = useState(false);

  useEffect(() => { ensureLoaded(); }, [ensureLoaded]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const updateTls = (field, value) => setTlsForm((f) => ({ ...f, [field]: value }));

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (project) => {
    setEditingId(project.id);
    setForm({ name: project.name, description: project.description || '', specPathSuffix: project.specPathSuffix || '' });
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
        await updateProject(editingId, form);
      } else {
        await createProject(form);
      }
      handleCancelForm();
      reloadProjects();
    } catch (err) {
      setError(err.response?.data?.message || `Unable to ${editingId ? 'update' : 'create'} project`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project? All environments and applications under it must be removed first.')) return;
    try {
      await deleteProject(id);
      reloadProjects();
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to delete project');
    }
  };

  const openTlsConfig = (projectId) => {
    setTlsProjectId(projectId);
    setAuthType('NONE');
    setTlsForm({ keystoreFile: null, keystorePassword: '', truststoreFile: null, truststorePassword: '', username: '', password: '', bearerToken: '', apiKeyHeaderName: '', apiKeyValue: '' });
    setTlsError(null);
  };

  const handleTlsSave = async (e) => {
    e.preventDefault();
    setTlsError(null);
    setTlsSaving(true);
    try {
      const body = new FormData();
      body.append('authType', authType);
      if (tlsForm.keystoreFile) body.append('keystoreFile', tlsForm.keystoreFile);
      if (tlsForm.keystorePassword) body.append('keystorePassword', tlsForm.keystorePassword);
      if (tlsForm.truststoreFile) body.append('truststoreFile', tlsForm.truststoreFile);
      if (tlsForm.truststorePassword) body.append('truststorePassword', tlsForm.truststorePassword);
      if (tlsForm.username) body.append('username', tlsForm.username);
      if (tlsForm.password) body.append('password', tlsForm.password);
      if (tlsForm.bearerToken) body.append('bearerToken', tlsForm.bearerToken);
      if (tlsForm.apiKeyHeaderName) body.append('apiKeyHeaderName', tlsForm.apiKeyHeaderName);
      if (tlsForm.apiKeyValue) body.append('apiKeyValue', tlsForm.apiKeyValue);
      await configureProjectTlsAuth(tlsProjectId, body);
      setTlsProjectId(null);
      reloadProjects();
    } catch (err) {
      setTlsError(err.response?.data?.message || 'Unable to save TLS/auth config');
    } finally {
      setTlsSaving(false);
    }
  };

  return (
    <div>
      <div className="card-hd">
        <span className="card-title">Projects</span>
        <RoleGate roles={ADMIN_ONLY}>
          <button className="btn btn-primary btn-sm" onClick={() => (showForm ? handleCancelForm() : openCreate())}>{showForm ? 'Cancel' : '+ New Project'}</button>
        </RoleGate>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 14 }}>
        A Project owns the shared keystore/truststore used to fetch specs for every application under it,
        plus its Environments (Dev/Staging/Prod). Onboard applications from the Applications screen once a
        Project (and at least one Environment) exists here.
      </div>

      {error && <div className="readonly-banner">{error}</div>}

      {showForm && (
        <form className="card" onSubmit={handleSubmit}>
          <div className="fld"><label>Project Name *</label><input required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Payments Platform" /></div>
          <div className="fld"><label>Description</label><textarea rows={2} value={form.description} onChange={(e) => update('description', e.target.value)} /></div>
          <div className="fld">
            <label>Spec Path Suffix (optional)</label>
            <input value={form.specPathSuffix} onChange={(e) => update('specPathSuffix', e.target.value)} placeholder="/v3/api-docs" />
            <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Appended after the application name when deriving its spec URL from an environment's base URL.</div>
          </div>
          <div className="form-ft">
            <button type="button" className="btn btn-ghost" onClick={handleCancelForm}>Cancel</button>
            <button className="btn btn-primary" type="submit">{editingId ? 'Save Changes' : 'Create Project'}</button>
          </div>
        </form>
      )}

      <div className="card">
        {projects.length === 0 ? (
          <div className="empty-state">No projects yet. Create one to start onboarding applications.</div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Spec Path Suffix</th><th>TLS/Auth</th><th>Environment</th><th></th></tr></thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.specPathSuffix || '—'}</td>
                  <td><span className={`tag ${p.tlsConfigured ? 'tag-g' : 'tag'}`}>{p.specAuthType}</span></td>
                  <td><Link to={`/projects/${p.id}/environments`} className="btn btn-ghost btn-sm">Manage</Link></td>
                  <td>
                    <RoleGate roles={ADMIN_ONLY}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>
                      <button className="btn btn-ghost btn-sm" style={{ marginLeft: 6 }} onClick={() => openTlsConfig(p.id)}>TLS Config</button>
                      <button className="btn btn-red btn-sm" style={{ marginLeft: 6 }} onClick={() => handleDelete(p.id)}>Delete</button>
                    </RoleGate>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {tlsProjectId && (
        <div className="card" style={{ maxWidth: 480 }}>
          <div className="card-hd"><span className="card-title">Configure Keystore/Truststore</span></div>
          <form onSubmit={handleTlsSave}>
            <div className="fld">
              <label>How should the spec-fetch call reach applications' endpoints?</label>
              <select value={authType} onChange={(e) => setAuthType(e.target.value)}>
                {AUTH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {authType === 'BASIC' && (
              <>
                <div className="fld"><label>Username</label><input value={tlsForm.username} onChange={(e) => updateTls('username', e.target.value)} /></div>
                <div className="fld"><label>Password</label><input type="password" value={tlsForm.password} onChange={(e) => updateTls('password', e.target.value)} /></div>
              </>
            )}
            {authType === 'BEARER' && (
              <div className="fld"><label>Bearer Token</label><input value={tlsForm.bearerToken} onChange={(e) => updateTls('bearerToken', e.target.value)} /></div>
            )}
            {authType === 'API_KEY' && (
              <>
                <div className="fld"><label>Header Name</label><input value={tlsForm.apiKeyHeaderName} onChange={(e) => updateTls('apiKeyHeaderName', e.target.value)} placeholder="X-API-Key" /></div>
                <div className="fld"><label>Header Value</label><input value={tlsForm.apiKeyValue} onChange={(e) => updateTls('apiKeyValue', e.target.value)} /></div>
              </>
            )}
            {authType === 'MUTUAL_TLS' && (
              <>
                <div className="readonly-banner">This keystore/truststore is shared by every application onboarded under this project.</div>
                <div className="fld"><label>Keystore File (.jks / .p12) *</label><input type="file" required onChange={(e) => updateTls('keystoreFile', e.target.files?.[0] || null)} /></div>
                <div className="fld"><label>Keystore Password *</label><input type="password" required value={tlsForm.keystorePassword} onChange={(e) => updateTls('keystorePassword', e.target.value)} /></div>
                <div className="fld"><label>Truststore File (optional)</label><input type="file" onChange={(e) => updateTls('truststoreFile', e.target.files?.[0] || null)} /></div>
                <div className="fld"><label>Truststore Password</label><input type="password" value={tlsForm.truststorePassword} onChange={(e) => updateTls('truststorePassword', e.target.value)} /></div>
              </>
            )}
            {tlsError && <div className="login-error">{tlsError}</div>}
            <div className="form-ft">
              <button type="button" className="btn btn-ghost" onClick={() => setTlsProjectId(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={tlsSaving}>{tlsSaving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
