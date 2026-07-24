import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getApplication, resolveSpecUrl, fetchApplicationSpec, uploadApplicationSpec, listSpecVersions,
  getSpecVersionImpact, approveSpecVersion, rejectSpecVersion, generateScenariosForSpecVersion
} from '../../api/applicationApi';
import RoleGate from '../../components/common/RoleGate';
import { EDIT_ROLES } from '../../constants/roles';

const STATUS_TAG = { CURRENT: 'tag-g', PENDING: 'tag-p', REJECTED: 'tag-r' };

const GENERATION_OPTIONS = [
  { value: 'POSITIVE', label: 'Positive only' },
  { value: 'NEGATIVE', label: 'Negative only' },
  { value: 'POSITIVE_NEGATIVE', label: 'Positive + Negative' }
];

const formatTimestamp = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

export default function ApplicationSpecsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [url, setUrl] = useState('');
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [reviewing, setReviewing] = useState(null); // { version, impact }
  const [genType, setGenType] = useState({}); // versionId -> selected scenario type
  const [generating, setGenerating] = useState(null); // versionId in flight

  const loadVersions = () => listSpecVersions(id).then(setVersions).catch(() => setVersions([]));

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([getApplication(id).catch((e) => { throw e; }), resolveSpecUrl(id).catch(() => null), listSpecVersions(id).catch(() => [])])
      .then(([application, resolved, specVersions]) => {
        if (!mounted) return;
        setApp(application);
        setUrl(resolved?.specSourceUrl || '');
        setVersions(specVersions || []);
      })
      .catch((err) => setError(err.response?.data?.message || 'Unable to load application'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [id]);

  const handleFetch = async () => {
    setFetching(true);
    setError(null);
    try {
      await fetchApplicationSpec(id);
      alert('Specification fetched successfully');
      loadVersions();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to fetch spec');
    } finally {
      setFetching(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFetching(true);
    setError(null);
    try {
      await uploadApplicationSpec(id, file);
      alert('Spec uploaded');
      loadVersions();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to upload spec');
    } finally {
      setFetching(false);
    }
  };

  const openReview = async (version) => {
    setError(null);
    try {
      const impact = await getSpecVersionImpact(id, version.id);
      setReviewing({ version, impact });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load impact for this version');
    }
  };

  const handleApprove = async () => {
    await approveSpecVersion(id, reviewing.version.id);
    setReviewing(null);
    loadVersions();
  };

  const handleReject = async () => {
    await rejectSpecVersion(id, reviewing.version.id);
    setReviewing(null);
    loadVersions();
  };

  const handleGenerate = async (version) => {
    const scenarioType = genType[version.id] || GENERATION_OPTIONS[0].value;
    setGenerating(version.id);
    setError(null);
    try {
      const created = await generateScenariosForSpecVersion(id, version.id, scenarioType);
      const count = Array.isArray(created) ? created.length : 0;
      alert(`${count} scenario${count === 1 ? '' : 's'} generated`);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to generate scenarios');
    } finally {
      setGenerating(null);
    }
  };

  if (loading) return (
    <div className="card" style={{ maxWidth: 720 }}>
      <div className="skeleton-line" style={{ width: '45%', marginBottom: 16 }} />
      <div className="skeleton-block" style={{ height: 26, marginBottom: 10 }} />
      <div className="skeleton-block" style={{ height: 26, marginBottom: 10 }} />
      <div className="skeleton-line" style={{ width: '28%', marginTop: 12 }} />
    </div>
  );

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <div className="card-hd"><span className="card-title">Specification — {app?.name}</span></div>

      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
        Resolved URL: {url ? <a href={url} target="_blank" rel="noreferrer">{url}</a> : '—'}
      </div>

      {error && <div className="readonly-banner">{error}</div>}

      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={handleFetch} disabled={fetching}>{fetching ? 'Fetching…' : 'Fetch Now'}</button>
        <label style={{ marginLeft: 10 }} className="btn btn-ghost">
          Upload Spec
          <input type="file" accept=".yaml,.yml,.json" onChange={handleUpload} style={{ display: 'none' }} />
        </label>
        <button style={{ marginLeft: 10 }} className="btn btn-ghost" onClick={() => navigate('/onboarding')}>Back</button>
      </div>

      <div className="card-hd" style={{ padding: '8px 0' }}><span className="card-title" style={{ fontSize: 13 }}>Versions</span></div>
      {versions.length === 0 ? (
        <div className="empty-state">No spec versions yet. Fetch or upload one above.</div>
      ) : (
        <table>
          <thead>
            <tr><th>Version</th><th>Source</th><th>Status</th><th>Uploaded At</th><th></th></tr>
          </thead>
          <tbody>
            {versions
              .slice()
              .sort((a, b) => (b.versionNumber ?? 0) - (a.versionNumber ?? 0))
              .map((v) => (
                <tr key={v.id}>
                  <td>v{v.versionNumber}</td>
                  <td>{v.source}</td>
                  <td><span className={`tag ${STATUS_TAG[v.status] || ''}`}>{v.status}</span></td>
                  <td>{formatTimestamp(v.createdAt || v.detectedAt || v.uploadedAt)}</td>
                  <td>
                    {v.status === 'PENDING' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => openReview(v)}>Review</button>
                    )}
                    {v.status === 'CURRENT' && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <select
                          value={genType[v.id] || GENERATION_OPTIONS[0].value}
                          onChange={(e) => setGenType((s) => ({ ...s, [v.id]: e.target.value }))}
                        >
                          {GENERATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <RoleGate roles={EDIT_ROLES}>
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={generating === v.id}
                            onClick={() => handleGenerate(v)}
                          >
                            {generating === v.id ? 'Generating…' : 'Generate'}
                          </button>
                        </RoleGate>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      {reviewing && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-hd"><span className="card-title">Review Pending Spec Version — v{reviewing.version.versionNumber}</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 12 }}>
            Detected via {reviewing.version.source}. Nothing goes live until you approve it below.
          </div>

          {reviewing.impact.changes.length === 0 ? (
            <div className="empty-state">No structural differences detected against the current version.</div>
          ) : (
            <table>
              <thead><tr><th>Change</th><th>Endpoint</th><th>Description</th></tr></thead>
              <tbody>
                {reviewing.impact.changes.map((c, i) => (
                  <tr key={i}>
                    <td><span className={`tag ${c.changeType === 'ADDED' ? 'tag-g' : c.changeType === 'REMOVED' ? 'tag-r' : 'tag-p'}`}>{c.changeType}</span></td>
                    <td>{c.endpoint}</td>
                    <td>{c.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reviewing.impact.affectedScenarioCount > 0 && (
            <div className="readonly-banner" style={{ marginTop: 12 }}>
              {reviewing.impact.affectedScenarioCount} existing scenario(s) reference endpoints that changed:{' '}
              {reviewing.impact.affectedScenarios.map((s) => s.scenarioName).join(', ')}
            </div>
          )}

          <div className="form-ft">
            <button className="btn btn-ghost" onClick={() => setReviewing(null)}>Close</button>
            <RoleGate roles={EDIT_ROLES}>
              <button className="btn btn-red" onClick={handleReject}>Reject</button>
              <button className="btn btn-primary" onClick={handleApprove}>Approve &amp; Promote to Current</button>
            </RoleGate>
          </div>
        </div>
      )}
    </div>
  );
}