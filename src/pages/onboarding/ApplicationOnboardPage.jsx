import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjectCache } from '../../context/ProjectCacheContext';
import { onboardApplication, updateApplication, getApplication } from '../../api/applicationApi';

export default function ApplicationOnboardPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const { projects, ensureLoaded } = useProjectCache();
  const [projectId, setProjectId] = useState('');

  const [form, setForm] = useState({ name: '', description: '', applicationType: 'BACKEND', specFormat: 'YAML' });

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { ensureLoaded(); }, [ensureLoaded]);

  useEffect(() => {
    if (!isEditMode) {
      if (projects.length && !projectId) setProjectId(String(projects[0].id));
      return;
    }
    getApplication(id).then((app) => {
      setForm({ name: app.name, description: app.description || '', applicationType: app.applicationType, specFormat: app.specFormat || 'YAML' });
      setProjectId(String(app.projectId));
      setLoading(false);
    }).catch(() => {
      setError('Unable to load application');
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, id, projects]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        projectId: Number(projectId),
        name: form.name,
        description: form.description,
        applicationType: form.applicationType,
        specFormat: form.specFormat,
        specSourceMode: 'CUSTOM',
        referenceEnvironmentId: null,
        specSourceUrl: null
      };
      if (isEditMode) {
        await updateApplication(id, payload);
      } else {
        await onboardApplication({ ...payload, autoSyncEnabled: false });
      }
      navigate('/onboarding');
    } catch (err) {
      setError(err.response?.data?.message || `Unable to ${isEditMode ? 'update' : 'onboard'} application`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="card"><div className="empty-state">Loading…</div></div>;
  }

  return (
    <div className="card" style={{ maxWidth: 620 }}>
      <div className="card-hd"><span className="card-title">{isEditMode ? `Edit Application — ${form.name}` : 'Onboard a New Application'}</span></div>

      <form onSubmit={handleSubmit}>
        <div className="fld">
          <label>Project * (gives this application its keystore/truststore)</label>
          <select required value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.length === 0 && <option value="">No projects yet — create one first</option>}
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="fld">
          <label>Application Name *</label>
          <input required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. PaymentAPI" />
        </div>
        <div className="fld">
          <label>Description</label>
          <textarea rows={2} value={form.description} onChange={(e) => update('description', e.target.value)} />
        </div>
        <div className="fld">
          <label>Type *</label>
          <select value={form.applicationType} onChange={(e) => update('applicationType', e.target.value)}>
            <option value="BACKEND">Backend</option>
            <option value="FRONTEND">Frontend</option>
          </select>
        </div>

        {error && <div className="login-error">{error}</div>}

        <div className="form-ft">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/onboarding')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting || !projectId}>
            {submitting ? 'Saving…' : isEditMode ? 'Save Changes' : 'Onboard Application'}
          </button>
        </div>
      </form>
    </div>
  );
}
