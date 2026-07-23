import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listApplications, fetchEndpoints } from '../../api/applicationApi';
import { listScenariosByApplication, createScenario, updateScenario, deleteScenario } from '../../api/scenarioApi';
import RoleGate from '../../components/common/RoleGate';
import { EDIT_ROLES } from '../../constants/roles';
import ScenarioForm from './ScenarioForm';
import { buildGherkinLines } from './gherkinPreview';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'positive', label: '✅ Positive' },
  { key: 'negative', label: '❌ Negative' },
  { key: 'ai', label: 'AI' },
  { key: 'jira', label: 'Jira' },
  { key: 'manual', label: 'Manual' }
];

const TABS = [
  { key: 'details', label: 'Details' },
  { key: 'steps', label: 'Steps' },
  { key: 'data', label: 'Test Data' },
  { key: 'history', label: 'History' }
];

const formatTimestamp = (val) => {
  if (!val) return null;
  const date = new Date(val);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const typeTagClass = (scenarioType) => (scenarioType === 'POSITIVE' ? 'tag-g' : 'tag-r');
const sourceTagClass = (source) => (source === 'AI' ? 'tag-p' : source === 'JIRA' ? 'tag-a' : 'tag');
const sourceLabel = (source) => (source === 'AI' ? 'AI Generated' : source === 'JIRA' ? 'From Jira' : 'Manual');
const riskTagClass = (risk) => (risk === 'HIGH' ? 'tag-r' : risk === 'MEDIUM' ? 'tag-a' : 'tag-g');

function DetailsTab({ scenario, applicationName, onEdit, onDelete, onRun, onToggleActive }) {
  const sc = scenario;
  const isActive = sc.active !== false;
  const statusCode = sc.apiTestData?.expectedStatusCode;
  const statusColor = statusCode == null ? null : statusCode < 300 ? 'var(--accent)' : statusCode < 500 ? 'var(--amber)' : 'var(--red)';
  const createdAtLabel = formatTimestamp(sc.createdAt);

  return (
    <div>
      <div className="sc-panel-actions">
        <label className="sc-active-toggle" style={{ marginLeft: 0, marginRight: 'auto' }}>
          <span>{isActive ? 'Active' : 'Inactive'}</span>
          <span
            className={`sc-toggle ${isActive ? 'on' : ''}`}
            onClick={onToggleActive}
            title={isActive ? 'Active — click to disable' : 'Inactive — click to enable'}
          />
        </label>
        <RoleGate roles={EDIT_ROLES}>
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>✎ Edit</button>
          <button className="btn btn-red btn-sm" onClick={onDelete}>🗑 Delete</button>
        </RoleGate>
        <button className="btn btn-primary btn-sm" onClick={onRun}>▶ Run</button>
      </div>

      <div className={isActive ? '' : 'sc-detail-off'}>
        <div className="sc-detail-title">{sc.name}</div>
        <div className="sc-detail-tags">
          <span className={`tag ${typeTagClass(sc.scenarioType)}`}>{sc.scenarioType === 'POSITIVE' ? 'positive' : 'negative'}</span>
          <span className={`tag ${sourceTagClass(sc.source)}`}>{sourceLabel(sc.source)}</span>
          {sc.riskLevel && <span className={`tag ${riskTagClass(sc.riskLevel)}`}>{sc.riskLevel.charAt(0) + sc.riskLevel.slice(1).toLowerCase()} Risk</span>}
          {statusCode != null && <span className="tag" style={{ borderColor: statusColor, color: statusColor }}>HTTP {statusCode}</span>}
        </div>

        {sc.description && <div className="sc-detail-desc">{sc.description}</div>}

        <div className="sc-meta-list">
          {applicationName && (
            <div className="sc-meta-row"><span>Application</span><span style={{ color: 'var(--accent)' }}>{applicationName}</span></div>
          )}
          {sc.endpoint && (
            <div className="sc-meta-row"><span>Endpoint</span><span>{sc.httpMethod} {sc.endpoint}</span></div>
          )}
          {sc.scenarioType && (
            <div className="sc-meta-row"><span>Type</span><span className={`tag ${typeTagClass(sc.scenarioType)}`}>{sc.scenarioType}</span></div>
          )}
          {sc.riskLevel && (
            <div className="sc-meta-row"><span>Risk Level</span><span className={`tag ${riskTagClass(sc.riskLevel)}`}>{sc.riskLevel}</span></div>
          )}
          {sc.source && (
            <div className="sc-meta-row"><span>Source</span><span className={`tag ${sourceTagClass(sc.source)}`}>{sourceLabel(sc.source)}</span></div>
          )}
          {createdAtLabel && (
            <div className="sc-meta-row"><span>Created</span><span style={{ color: 'var(--text-dim)' }}>{createdAtLabel}{sc.createdBy ? ` · ${sc.createdBy}` : ''}</span></div>
          )}
        </div>

        {sc.source === 'AI' && (
          <div className="sc-ai-box">
            <div className="sc-ai-box-title">✦ AI Context</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>Generated from {sc.httpMethod} {sc.endpoint}.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepsTab({ scenario }) {
  const lines = buildGherkinLines(scenario);
  return (
    <div>
      <div className="sc-steps-label">Gherkin Test Steps</div>
      <div className="sc-gherkin-box">
        {lines.map((line, i) => (
          <div key={i}>
            {line.map((tok, j) => (tok.cls ? <span key={j} className={`sc-${tok.cls}`}>{tok.text}</span> : <span key={j}>{tok.text}</span>))}
          </div>
        ))}
      </div>
    </div>
  );
}

function DataTab() {
  return <div className="empty-state">No linked dataset — test data linking isn't available for scenarios yet.</div>;
}

function HistoryTab({ navigate }) {
  return (
    <div className="empty-state">
      <div>Run history isn't tracked per scenario. See the Execution page for application-level run history.</div>
      <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => navigate('/execution')}>→ Go to Execution</button>
    </div>
  );
}

export default function ScenarioListPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [applicationId, setApplicationId] = useState('');
  const [scenarios, setScenarios] = useState([]);
  const [endpoints, setEndpoints] = useState([]);
  const [endpointsLoading, setEndpointsLoading] = useState(false);
  const [endpointsError, setEndpointsError] = useState(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeTab, setActiveTab] = useState('details');

  const [showForm, setShowForm] = useState(false);
  const [editingScenario, setEditingScenario] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    listApplications({ size: 100 }).then((page) => {
      const list = page.content || [];
      setApplications(list);
      if (list.length && !applicationId) setApplicationId(String(list[0].id));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = (focusId) => {
    if (!applicationId) { setScenarios([]); return; }
    listScenariosByApplication(applicationId, { size: 100 }).then((page) => {
      const list = page.content || [];
      setScenarios(list);
      if (focusId != null && list.some((s) => s.id === focusId)) {
        setActiveId(focusId);
      } else {
        setActiveId((cur) => (cur && list.some((s) => s.id === cur) ? cur : (list[0]?.id ?? null)));
      }
    });
  };

  useEffect(() => load(), [applicationId]);

  useEffect(() => {
    if (activeId == null) return;
    document.getElementById(`sc-item-${activeId}`)?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  useEffect(() => {
    setSelectedIds([]);
    setShowForm(false);
    setEditingScenario(null);
  }, [applicationId]);

  useEffect(() => {
    if (!applicationId) { setEndpoints([]); return; }
    setEndpointsLoading(true);
    setEndpointsError(null);
    fetchEndpoints(applicationId)
      .then((data) => {
        const endpointsArray = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
        setEndpoints(endpointsArray);
      })
      .catch((err) => {
        setEndpointsError(err.response?.data?.message || 'Unable to fetch endpoints');
        setEndpoints([]);
      })
      .finally(() => setEndpointsLoading(false));
  }, [applicationId]);

  const filtered = scenarios.filter((s) => {
    if (search && !(s.name || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'positive') return s.scenarioType === 'POSITIVE';
    if (filter === 'negative') return s.scenarioType === 'NEGATIVE';
    if (filter === 'ai') return s.source === 'AI';
    if (filter === 'jira') return s.source === 'JIRA';
    if (filter === 'manual') return s.source === 'MANUAL';
    return true;
  });

  const activeScenario = scenarios.find((s) => s.id === activeId) || null;
  const selectedApplication = applications.find((a) => String(a.id) === String(applicationId));
  const activeApplicationName = selectedApplication?.name;

  const toggleSelect = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const clearSelection = () => setSelectedIds([]);

  const openCreateForm = () => { setEditingScenario(null); setShowForm(true); };
  const openEditForm = (s) => { setEditingScenario(s); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingScenario(null); };

  const handleDeleteOne = async (id) => {
    if (!confirm('Delete this scenario?')) return;
    setError(null);
    try {
      await deleteScenario(id);
      if (activeId === id) setActiveId(null);
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete scenario');
    }
  };

  const handleToggleActive = async (s) => {
    setError(null);
    try {
      await updateScenario(s.id, {
        applicationId: Number(applicationId),
        name: s.name,
        httpMethod: s.httpMethod,
        endpoint: s.endpoint,
        scenarioType: s.scenarioType,
        source: s.source,
        riskLevel: s.riskLevel,
        description: s.description,
        active: !s.active,
        apiTestData: s.apiTestData
      });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update scenario status');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} scenario(s)?`)) return;
    setError(null);
    try {
      for (const id of selectedIds) await deleteScenario(id);
      setSelectedIds([]);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete selected scenarios');
    }
  };

  const handleBulkDuplicate = async () => {
    setError(null);
    try {
      const toDup = scenarios.filter((s) => selectedIds.includes(s.id));
      for (const s of toDup) {
        await createScenario({
          applicationId: Number(applicationId),
          name: `Copy of ${s.name}`,
          httpMethod: s.httpMethod,
          endpoint: s.endpoint,
          scenarioType: s.scenarioType,
          source: s.source,
          riskLevel: s.riskLevel,
          description: s.description,
          active: s.active,
          apiTestData: s.apiTestData
        });
      }
      setSelectedIds([]);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to duplicate selected scenarios');
    }
  };

  return (
    <div>
      <div className="card-hd">
        <span className="card-title">Test Scenarios</span>
        <div className="fld" style={{ marginBottom: 0, minWidth: 220 }}>
          <label>Application</label>
          <select value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
            {applications.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="readonly-banner">{error}</div>}

      <div className="sc-wrap">
        <div className="sc-list-panel">
          <div className="card sc-list-card">
            <div className="sc-search">
              <input placeholder="🔍 Search scenarios…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="sc-filter-bar">
              {FILTERS.map((f) => (
                <span key={f.key} className={`sc-fc ${filter === f.key ? 'on' : ''}`} onClick={() => setFilter(f.key)}>{f.label}</span>
              ))}
            </div>

            {selectedIds.length > 0 && (
              <div className="sc-bulk-bar">
                <span style={{ color: 'var(--purple)' }}>{selectedIds.length} selected</span>
                <RoleGate roles={EDIT_ROLES}>
                  <button className="btn btn-ghost btn-sm" onClick={handleBulkDuplicate}>⧉ Duplicate</button>
                  <button className="btn btn-red btn-sm" onClick={handleBulkDelete}>🗑 Delete</button>
                </RoleGate>
                <button className="btn btn-ghost btn-sm" onClick={clearSelection}>✕ Clear</button>
              </div>
            )}

            <div className="sc-items">
              {filtered.length === 0 ? (
                <div className="empty-state">{scenarios.length === 0 ? 'No scenarios yet for this application.' : 'No scenarios match.'}</div>
              ) : filtered.map((s) => (
                <div
                  key={s.id}
                  id={`sc-item-${s.id}`}
                  className={`sc-item ${activeId === s.id ? 'active' : ''} ${s.active === false ? 'sc-item-off' : ''}`}
                  onClick={() => setActiveId(s.id)}
                >
                  <span
                    className={`sc-cb ${selectedIds.includes(s.id) ? 'on' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleSelect(s.id); }}
                  >{selectedIds.includes(s.id) ? '✓' : ''}</span>
                  <span>{s.scenarioType === 'POSITIVE' ? '✅' : '❌'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sc-name">{s.name}</div>
                    <div className="sc-ep">{s.httpMethod} {s.endpoint}</div>
                  </div>
                  <span className={`sc-src sc-src-${(s.source || '').toLowerCase()}`}>{s.source}</span>
                  <RoleGate roles={EDIT_ROLES}>
                    <span className="sc-item-actions">
                      <button type="button" className="sc-ic-btn edit" onClick={(e) => { e.stopPropagation(); openEditForm(s); }}>✎</button>
                      <button type="button" className="sc-ic-btn del" onClick={(e) => { e.stopPropagation(); handleDeleteOne(s.id); }}>🗑</button>
                    </span>
                  </RoleGate>
                </div>
              ))}
            </div>

            <div className="sc-list-footer">
              <RoleGate roles={EDIT_ROLES}>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={openCreateForm}>+ Add Scenario</button>
              </RoleGate>
            </div>
          </div>
        </div>

        <div className="sc-right">
          <div className="card sc-right-card">
            {showForm ? (
              <ScenarioForm
                applicationId={applicationId}
                projectId={selectedApplication?.projectId}
                endpoints={endpoints}
                endpointsLoading={endpointsLoading}
                endpointsError={endpointsError}
                editingScenario={editingScenario}
                onSaved={(shouldClose, newId) => { load(newId); if (shouldClose) closeForm(); }}
                onClose={closeForm}
              />
            ) : (
              <>
                <div className="sc-panel-tabs">
                  {TABS.map((t) => (
                    <div key={t.key} className={`sc-ptab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>{t.label}</div>
                  ))}
                </div>
                <div className="sc-panel-body">
                  {!activeScenario ? (
                    <div className="empty-state">Select a scenario from the list, or add one to get started.</div>
                  ) : (
                    <>
                      {activeTab === 'details' && (
                        <DetailsTab
                          scenario={activeScenario}
                          applicationName={activeApplicationName}
                          onEdit={() => openEditForm(activeScenario)}
                          onDelete={() => handleDeleteOne(activeScenario.id)}
                          onRun={() => navigate('/execution')}
                          onToggleActive={() => handleToggleActive(activeScenario)}
                        />
                      )}
                      {activeTab === 'steps' && <StepsTab scenario={activeScenario} />}
                      {activeTab === 'data' && <DataTab />}
                      {activeTab === 'history' && <HistoryTab navigate={navigate} />}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
