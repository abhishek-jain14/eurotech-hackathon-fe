import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjectCache } from '../../context/ProjectCacheContext';
import { listEnvironmentsByProject } from '../../api/environmentApi';
import { onboardApplication, updateApplication, getApplication, uploadApplicationSpec, fetchApplicationSpec } from '../../api/applicationApi';

export default function ApplicationOnboardPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const { projects, ensureLoaded } = useProjectCache();
  const [projectId, setProjectId] = useState('');
  const [environments, setEnvironments] = useState([]);
  const [environmentId, setEnvironmentId] = useState('');

  const [form, setForm] = useState({ name: '', description: '', applicationType: 'BACKEND', specFormat: 'YAML' });
  const [sourceMode, setSourceMode] = useState('DERIVED'); // DERIVED | CUSTOM
  const [customUrl, setCustomUrl] = useState('');
  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Step 2 (create flow only): fetch-now step, shown after the application record exists
  const [createdApp, setCreatedApp] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [fetchedOk, setFetchedOk] = useState(false);

  useEffect(() => { ensureLoaded(); }, [ensureLoaded]);

  useEffect(() => {
    if (!isEditMode) {
      if (projects.length && !projectId) setProjectId(String(projects[0].id));
      return;
    }
    getApplication(id).then((app) => {
      setForm({ name: app.name, description: app.description || '', applicationType: app.applicationType, specFormat: app.specFormat || 'YAML' });
      setProjectId(String(app.projectId));
      setSourceMode(app.specSourceMode || 'DERIVED');
      setCustomUrl(app.specSourceUrl || '');
      setEnvironmentId(app.referenceEnvironmentId ? String(app.referenceEnvironmentId) : '');
      setLoading(false);
    }).catch(() => {
      setError('Unable to load application');
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, id, projects]);

  useEffect(() => {
    if (!projectId) return;
    listEnvironmentsByProject(projectId).then((envs) => {
      setEnvironments(envs);
      if (!isEditMode) setEnvironmentId(envs.length ? String(envs[0].id) : '');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const selectedProject = projects.find((p) => String(p.id) === projectId);
  const selectedEnv = environments.find((e) => String(e.id) === environmentId);

  const derivedUrlPreview = () => {
    if (!selectedEnv || !form.name) return '(select an environment and enter an application name)';
    let base = selectedEnv.baseUrl || '';
    if (base.endsWith('/')) base = base.slice(0, -1);
    const suffix = selectedProject?.specPathSuffix || '';
    return `${base}/${form.name}${suffix}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (sourceMode === 'DERIVED' && !environmentId) {
      setError('Select an environment, or switch to a custom URL');
      return;
    }
    if (sourceMode === 'CUSTOM' && !customUrl) {
      setError('Enter a custom URL, or switch back to deriving one from an environment');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        projectId: Number(projectId),
        name: form.name,
        description: form.description,
        applicationType: form.applicationType,
        specFormat: form.specFormat,
        specSourceMode: sourceMode,
        referenceEnvironmentId: sourceMode === 'DERIVED' ? Number(environmentId) : (environmentId ? Number(environmentId) : null),
        specSourceUrl: sourceMode === 'CUSTOM' ? customUrl : null
      };
      if (isEditMode) {
        await updateApplication(id, payload);
        navigate('/onboarding');
        return;
      }
      const created = await onboardApplication({ ...payload, autoSyncEnabled: false });
      if (file) {
        await uploadApplicationSpec(created.id, file);
        navigate('/onboarding');
      } else {
        setCreatedApp(created);
      }
    } catch (err) {
      setError(err.response?.data?.message || `Unable to ${isEditMode ? 'update' : 'onboard'} application`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFetchNow = async () => {
    setFetchError(null);
    setFetching(true);
    try {
      await fetchApplicationSpec(createdApp.id);
      setFetchedOk(true);
    } catch (err) {
      // Surfaces backend guidance verbatim, e.g. TLS_REQUIRED with instructions to configure the Project's keystore/truststore
      setFetchError(err.response?.data?.message || 'Unable to fetch the specification');
    } finally {
      setFetching(false);
    }
  };

  if (loading) {
    return <div className="card"><div className="empty-state">Loading…</div></div>;
  }

  if (createdApp) {
    return (
      <div className="card" style={{ maxWidth: 560 }}>
        <div className="card-hd"><span className="card-title">Fetch Specification</span></div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 14 }}>
          <strong>{createdApp.name}</strong> was onboarded under project <strong>{createdApp.projectName}</strong>.
          No file was uploaded, so fetch the spec now from the resolved URL below using the project's
          configured keystore/truststore (if any).
        </div>
        <div className="fld"><label>Resolved URL</label><input readOnly value={createdApp.specSourceUrl || derivedUrlPreview()} /></div>

        {fetchedOk ? (
          <div>
            <div className="readonly-banner" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>Specification fetched and stored.</div>
            <button className="btn btn-primary" onClick={() => navigate('/onboarding')}>Done</button>
          </div>
        ) : (
          <>
            {fetchError && (
              <div className="login-error" style={{ marginBottom: 10 }}>
                {fetchError}
                {fetchError.includes('TLS') && (
                  <div style={{ marginTop: 6 }}>
                    <a href="/projects" style={{ color: 'var(--accent)' }}>Configure the project's keystore/truststore →</a>
                  </div>
                )}
              </div>
            )}
            <div className="form-ft">
              <button className="btn btn-ghost" onClick={() => navigate('/onboarding')}>Skip for now</button>
              <button className="btn btn-primary" onClick={handleFetchNow} disabled={fetching}>{fetching ? 'Fetching…' : 'Fetch Now'}</button>
            </div>
          </>
        )}
      </div>
    );
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
            <option value="BACKEND">Backend (OpenAPI / Swagger / GraphQL)</option>
            <option value="FRONTEND">Frontend (DOM snapshot / selector map)</option>
          </select>
        </div>

        <div className="fld">
          <label>Spec Source</label>
          <select value={sourceMode} onChange={(e) => setSourceMode(e.target.value)}>
            <option value="DERIVED">Derive from Project + Environment + Application name</option>
            <option value="CUSTOM">Overwrite with my own URL</option>
          </select>
        </div>

        {sourceMode === 'DERIVED' ? (
          <>
            <div className="fld">
              <label>Environment *</label>
              <select required value={environmentId} onChange={(e) => setEnvironmentId(e.target.value)}>
                {environments.length === 0 && <option value="">No environments under this project yet</option>}
                {environments.map((env) => <option key={env.id} value={env.id}>{env.envName} ({env.baseUrl})</option>)}
              </select>
            </div>
            <div className="fld">
              <label>Derived URL Preview</label>
              <input readOnly value={derivedUrlPreview()} />
            </div>
          </>
        ) : (
          <div className="fld">
            <label>Custom Spec URL *</label>
            <input required value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://api.example.com/openapi.yaml" />
          </div>
        )}

        {!isEditMode && (
          <div className="fld">
            <label>Or Upload a Spec File Instead (skips fetching entirely)</label>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
        )}

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