import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApplication, resolveSpecUrl, fetchApplicationSpec, uploadApplicationSpec } from '../../api/applicationApi';

export default function ApplicationSpecsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([getApplication(id).catch((e) => { throw e; }), resolveSpecUrl(id).catch(() => null)])
      .then(([application, resolved]) => {
        if (!mounted) return;
        setApp(application);
        setUrl(resolved?.specSourceUrl || '');
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
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to upload spec');
    } finally {
      setFetching(false);
    }
  };

  if (loading) return <div className="card"><div className="empty-state">Loading…</div></div>;

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <div className="card-hd"><span className="card-title">Specification — {app?.name}</span></div>

      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
        Resolved URL: {url ? <a href={url} target="_blank" rel="noreferrer">{url}</a> : '—'}
      </div>

      {error && <div className="readonly-banner">{error}</div>}

      <div style={{ marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={handleFetch} disabled={fetching}>{fetching ? 'Fetching…' : 'Fetch Now'}</button>
        <label style={{ marginLeft: 10 }} className="btn btn-ghost">
          Upload Spec
          <input type="file" accept=".yaml,.yml,.json" onChange={handleUpload} style={{ display: 'none' }} />
        </label>
        <button style={{ marginLeft: 10 }} className="btn btn-ghost" onClick={() => navigate('/onboarding')}>Back</button>
      </div>
    </div>
  );
}
