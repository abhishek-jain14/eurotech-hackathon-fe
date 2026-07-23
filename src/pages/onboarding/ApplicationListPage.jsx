import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listApplications, deleteApplication, listSpecVersions, approveSpecVersion, rejectSpecVersion,
  getSpecVersionImpact
} from '../../api/applicationApi';
import RoleGate from '../../components/common/RoleGate';
import { EDIT_ROLES, ROLES } from '../../constants/roles';
import { normalizeListResponse } from '../../utils/normalizeListResponse';

export default function ApplicationListPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewing, setReviewing] = useState(null); // { app, pending, impact }

  const load = () => {
    setLoading(true);
    listApplications({ page: 0, size: 50 })
      .then((payload) => setApplications(normalizeListResponse(payload)))
      .catch(() => setError('Unable to load applications. Is the backend running?'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Permanently delete this application?')) return;
    await deleteApplication(id);
    load();
  };

  const openReview = async (app) => {
    const versions = await listSpecVersions(app.id);
    const pending = versions.find((v) => v.status === 'PENDING');
    const impact = pending ? await getSpecVersionImpact(app.id, pending.id) : null;
    setReviewing({ app, pending, impact });
  };

  const handleApprove = async () => {
    await approveSpecVersion(reviewing.app.id, reviewing.pending.id);
    setReviewing(null);
    load();
  };

  const handleReject = async () => {
    await rejectSpecVersion(reviewing.app.id, reviewing.pending.id);
    setReviewing(null);
    load();
  };

  return (
    <div>
      <div className="card-hd">
        <span className="card-title">Onboarded Applications</span>
        <RoleGate roles={EDIT_ROLES}>
          <Link to="/onboarding/new" className="btn btn-primary btn-sm">+ Add Application</Link>
        </RoleGate>
      </div>

      {error && <div className="readonly-banner">{error}</div>}

      <div className="card">
        {loading ? (
          <div>
            <div className="skeleton-line" style={{ width: '38%', marginBottom: 12 }} />
            <div className="skeleton-block" />
            <div className="skeleton-line" style={{ width: '92%' }} />
            <div className="skeleton-line" style={{ width: '86%' }} />
            <div className="skeleton-line" style={{ width: '76%' }} />
          </div>
        ) : applications.length === 0 ? (
          <div className="empty-state">No applications onboarded yet. Create a Project first, then onboard an application under it.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Application Name</th><th>Project Name</th><th>Type</th><th>Version</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.projectName}</td>
                  <td><span className="tag">{a.applicationType}</span></td>
                  <td>v{a.currentSpecVersionNumber ?? '—'}</td>
                  <td><span className={`tag ${a.status === 'ACTIVE' ? 'tag-g' : 'tag-r'}`}>{a.status}</span></td>
                  <td>
                    <Link to={`/onboarding/${a.id}/specs`} className="btn btn-ghost btn-sm">Manage Specs</Link>
                    <RoleGate roles={EDIT_ROLES}>
                      <Link to={`/onboarding/${a.id}/edit`} className="btn btn-ghost btn-sm" style={{ marginLeft: 6 }}>Edit</Link>
                    </RoleGate>
                    <button
                      className="btn btn-sm"
                      style={{ marginLeft: 6, borderColor: 'var(--amber)', color: 'var(--amber)' }}
                      disabled={!a.hasPendingSpecVersion}
                      onClick={() => openReview(a)}
                    >
                      Review Pending
                    </button>
                    <RoleGate roles={[ROLES.ADMIN]}>
                      <button className="btn btn-red btn-sm" style={{ marginLeft: 6 }} onClick={() => handleDelete(a.id)}>Delete</button>
                    </RoleGate>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {reviewing && reviewing.pending && (
        <div className="card" style={{ maxWidth: 640 }}>
          <div className="card-hd"><span className="card-title">Review Pending Spec Version — {reviewing.app.name}</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 12 }}>
            Version v{reviewing.pending.versionNumber} detected via {reviewing.pending.source}. Nothing goes
            live until you approve it below.
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

          <RoleGate roles={EDIT_ROLES}>
            <div className="form-ft">
              <button className="btn btn-ghost" onClick={() => setReviewing(null)}>Close</button>
              <button className="btn btn-red" onClick={handleReject}>Reject</button>
              <button className="btn btn-primary" onClick={handleApprove}>Approve &amp; Promote to Current</button>
            </div>
          </RoleGate>
        </div>
      )}
    </div>
  );
}
