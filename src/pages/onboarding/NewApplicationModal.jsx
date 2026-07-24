import { useEffect, useState } from 'react';
import { useProjectCache } from '../../context/ProjectCacheContext';
import { onboardApplication } from '../../api/applicationApi';

const APP_TYPES = [
  { value: 'BACKEND', label: '📋 Backend' },
  { value: 'FRONTEND', label: '🖥️ Frontend' }
];

// Identity-only, matching the "New Application" mockup: no spec URL is asked for here,
// the caller routes into the Manage Specs page right after creation so it can be uploaded there.
export default function NewApplicationModal({ onClose, onCreated }) {
  const { projects = [], ensureLoaded } = useProjectCache();
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [applicationType, setApplicationType] = useState('BACKEND');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { ensureLoaded(); }, [ensureLoaded]);

  useEffect(() => {
    if (projects.length && !projectId) setProjectId(String(projects[0].id));
  }, [projects, projectId]);

  const handleCreate = async () => {
    if (!name.trim()) { setError('Application Name is required'); return; }
    if (!projectId) { setError('Select a project first'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const created = await onboardApplication({
        projectId: Number(projectId),
        name: name.trim(),
        description: '',
        applicationType,
        specFormat: 'YAML',
        specSourceMode: 'CUSTOM',
        referenceEnvironmentId: null,
        specSourceUrl: null,
        autoSyncEnabled: false
      });
      onCreated(created);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-card" style={{ width: 'min(400px, 100%)' }} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">New Application</div>
        <div className="dialog-message">Just the application's identity for now — you'll upload its first spec version right after.</div>

        <div className="fld">
          <label>Project *</label>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.length === 0 && <option value="">No projects yet — create one first</option>}
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="fld">
          <label>Application Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PaymentAPI" />
        </div>

        <div className="fld">
          <label>Type</label>
          <div className="type-tile-row">
            {APP_TYPES.map((t) => (
              <div
                key={t.value}
                className={`type-tile ${applicationType === t.value ? 'active' : ''}`}
                onClick={() => setApplicationType(t.value)}
              >
                {t.label}
              </div>
            ))}
          </div>
        </div>

        {error && <div className="login-error">{error}</div>}

        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={submitting || !projectId}>
            {submitting ? 'Creating…' : 'Create Application'}
          </button>
        </div>
      </div>
    </div>
  );
}
