import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createProject, updateProject, deleteProject } from '../../api/projectApi';
import { useProjectCache } from '../../context/ProjectCacheContext';
import RoleGate from '../../components/common/RoleGate';
import { ADMIN_ONLY } from '../../constants/roles';

const EMPTY_FORM = { name: '', description: '', jiraUrl: '' };

export default function ProjectsPage() {
  const { projects, refresh: reloadProjects, ensureLoaded } = useProjectCache();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);

  useEffect(() => { ensureLoaded(); }, [ensureLoaded]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (project) => {
    setEditingId(project.id);
    setForm({ name: project.name, description: project.description || '', jiraUrl: project.jiraUrl || '' });
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
          <div className="fld"><label>Jira URL</label><input value={form.jiraUrl} onChange={(e) => update('jiraUrl', e.target.value)} placeholder="https://mycompany.atlassian.net/browse/PROJ" /></div>
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
            <thead><tr><th>Name</th><th>Jira</th><th>Environment</th><th></th></tr></thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.jiraUrl ? <a href={p.jiraUrl} target="_blank" rel="noreferrer">Link</a> : '—'}</td>
                  <td><Link to={`/projects/${p.id}/environments`} className="btn btn-ghost btn-sm">Manage</Link></td>
                  <td>
                    <RoleGate roles={ADMIN_ONLY}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>
                      <button className="btn btn-red btn-sm" style={{ marginLeft: 6 }} onClick={() => handleDelete(p.id)}>Delete</button>
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
