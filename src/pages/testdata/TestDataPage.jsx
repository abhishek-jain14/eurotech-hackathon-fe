import { useEffect, useState } from 'react';
import { listApplications, fetchEndpoints } from '../../api/applicationApi';
import { listScenariosByApplication } from '../../api/scenarioApi';
import { listTestDataByApplication, updateTestData, deleteTestData } from '../../api/testDataApi';
import RoleGate from '../../components/common/RoleGate';
import { EDIT_ROLES } from '../../constants/roles';
import TestDataForm from './TestDataForm';
import { parseFieldsJson, previewPairs, fieldCount, effectiveFieldEntries, effectiveGroupKey, headerKeys } from './testDataFields';

export default function TestDataPage() {
  const [applications, setApplications] = useState([]);
  const [applicationId, setApplicationId] = useState('');
  const [records, setRecords] = useState([]);
  const [error, setError] = useState(null);

  const [scenarios, setScenarios] = useState([]);
  const [endpoints, setEndpoints] = useState([]);

  const [selectedIds, setSelectedIds] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [editStatus, setEditStatus] = useState('VALID');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listApplications({ size: 100 }).then((page) => {
      const list = page.content || [];
      setApplications(list);
      if (list.length && !applicationId) setApplicationId(String(list[0].id));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = () => {
    if (!applicationId) { setRecords([]); return; }
    listTestDataByApplication(applicationId, { size: 200 }).then((page) => setRecords(page.content || []));
  };

  useEffect(load, [applicationId]);

  useEffect(() => {
    setSelectedIds([]);
    setActiveId(null);
    setEditing(false);
    setShowForm(false);
    if (!applicationId) {
      setScenarios([]);
      setEndpoints([]);
      return;
    }
    listScenariosByApplication(applicationId, { size: 200 }).then((page) => setScenarios(page.content || [])).catch(() => setScenarios([]));
    fetchEndpoints(applicationId)
      .then((data) => {
        const list = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
        setEndpoints(list);
      })
      .catch(() => setEndpoints([]));
  }, [applicationId]);

  const applicationName = applications.find((a) => String(a.id) === String(applicationId))?.name;
  const activeRecord = records.find((r) => r.id === activeId) || null;
  const activeParsed = parseFieldsJson(activeRecord?.fieldsJson);

  const toggleSelect = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleSelectAll = (checked) => setSelectedIds(checked ? records.map((r) => r.id) : []);
  const clearSelection = () => setSelectedIds([]);

  const selectRow = (id) => { setEditing(false); setActiveId(id); };
  const closePanel = () => { setActiveId(null); setEditing(false); };

  const startEdit = (record) => {
    const parsed = parseFieldsJson(record.fieldsJson);
    setActiveId(record.id);
    setEditStatus(record.status || 'VALID');
    setEditValues(Object.fromEntries(effectiveFieldEntries(parsed)));
    setEditing(true);
  };

  const openCreateForm = () => setShowForm(true);
  const closeCreateForm = () => setShowForm(false);

  const handleDeleteOne = async (id) => {
    if (!confirm('Delete this test data record?')) return;
    setError(null);
    try {
      await deleteTestData(id);
      if (activeId === id) closePanel();
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete test data record');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} record(s)?`)) return;
    setError(null);
    try {
      for (const id of selectedIds) await deleteTestData(id);
      setSelectedIds([]);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete selected records');
    }
  };

  const handleSaveEdit = async () => {
    if (!activeRecord) return;
    setError(null);
    setSaving(true);
    try {
      const group = effectiveGroupKey(activeParsed) || 'requestBody';
      const fieldsJson = JSON.stringify({ ...activeParsed, [group]: editValues });
      await updateTestData(activeRecord.id, {
        applicationId: Number(applicationId),
        scenarioId: activeRecord.scenarioId,
        recordName: activeRecord.recordName,
        mode: activeRecord.mode || 'MANUAL',
        status: editStatus,
        fieldsJson
      });
      setEditing(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="card-hd">
        <div>
          <span className="card-title">Test Data</span>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>Input parameters and records linked to test scenarios. Click a row to view details.</div>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div className="fld" style={{ marginBottom: 0, minWidth: 200 }}>
            <label>Application</label>
            <select value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
              {applications.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: 1 }}>{records.length} RECORD{records.length === 1 ? '' : 'S'}</span>
          <RoleGate roles={EDIT_ROLES}>
            <button className="btn btn-primary" onClick={openCreateForm}>+ Add Test Data</button>
          </RoleGate>
        </div>
      </div>

      {error && <div className="readonly-banner">{error}</div>}

      {selectedIds.length > 0 && (
        <div className="td-bulk-bar">
          <span style={{ color: 'var(--purple)' }}>{selectedIds.length} selected</span>
          <RoleGate roles={EDIT_ROLES}>
            <button className="btn btn-red btn-sm" onClick={handleBulkDelete}>🗑 Delete Selected</button>
          </RoleGate>
          <button className="btn btn-ghost btn-sm" onClick={clearSelection}>✕ Clear</button>
        </div>
      )}

      <div className="td-body">
        {!showForm && (
          <>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {records.length === 0 ? (
                <div className="empty-state">No test data records yet for this application.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 32 }}>
                        <input type="checkbox" checked={selectedIds.length === records.length} onChange={(e) => toggleSelectAll(e.target.checked)} />
                      </th>
                      <th>Record Name</th>
                      <th>Service</th>
                      <th>Feature</th>
                      <th>Key Input Params</th>
                      <th>Fields</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => {
                      const parsed = parseFieldsJson(r.fieldsJson);
                      const preview = previewPairs(parsed).map(([k, v]) => `${k}: ${v}`).join(', ');
                      return (
                        <tr
                          key={r.id}
                          className={`td-row ${activeId === r.id ? 'active' : ''}`}
                          onClick={() => selectRow(r.id)}
                        >
                          <td onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelect(r.id)} />
                          </td>
                          <td>{r.recordName}</td>
                          <td>{applicationName || '—'}</td>
                          <td>{r.scenarioName || '—'}</td>
                          <td className="td-preview-cell">{preview || '—'}</td>
                          <td>{fieldCount(parsed)}</td>
                          <td><span className={`tag ${r.status === 'VALID' ? 'tag-g' : 'tag-r'}`}>{r.status === 'VALID' ? 'Valid' : 'Invalid'}</span></td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <RoleGate roles={EDIT_ROLES}>
                              <button type="button" className="td-ic-btn edit" onClick={() => startEdit(r)}>✎</button>
                              <button type="button" className="td-ic-btn del" onClick={() => handleDeleteOne(r.id)}>🗑</button>
                            </RoleGate>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {activeRecord && (
              <div className="card td-detail-panel">
                <div className="td-detail-hd">
                  <span className="td-detail-title">{activeRecord.recordName}{activeRecord.scenarioName ? ` — ${activeRecord.scenarioName}` : ''}</span>
                  <RoleGate roles={EDIT_ROLES}>
                    {!editing && <button className="btn btn-ghost btn-sm" onClick={() => startEdit(activeRecord)}>✎ Edit</button>}
                  </RoleGate>
                  <button className="btn btn-ghost btn-sm" onClick={closePanel}>✕ Close</button>
                </div>

                <div className="td-detail-meta">
                  <span className="td-breadcrumb">{applicationName || '—'} → {activeRecord.scenarioName || '—'}</span>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {headerKeys(activeParsed).length > 0 && (
                      <span className="tag">Headers: {headerKeys(activeParsed).join(', ')}</span>
                    )}
                    <span className={`tag ${(editing ? editStatus : activeRecord.status) === 'VALID' ? 'tag-g' : 'tag-r'}`}>
                      {(editing ? editStatus : activeRecord.status) === 'VALID' ? 'Valid' : 'Invalid'}
                    </span>
                  </span>
                </div>

                {editing && (
                  <div className="fld" style={{ maxWidth: 220, margin: '0 0 12px' }}>
                    <label>Status</label>
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                      <option value="VALID">Valid</option>
                      <option value="INVALID">Invalid</option>
                    </select>
                  </div>
                )}

                <div className="td-field-grid">
                  {editing ? (
                    Object.keys(editValues).length === 0 ? (
                      <div className="empty-state">No fields to edit for this record.</div>
                    ) : Object.entries(editValues).map(([key, value]) => (
                      <div className="td-field-card" key={key}>
                        <div className="td-field-label">{key}</div>
                        <input value={value ?? ''} onChange={(e) => setEditValues((v) => ({ ...v, [key]: e.target.value }))} />
                      </div>
                    ))
                  ) : (
                    effectiveFieldEntries(activeParsed).length === 0 ? (
                      <div className="empty-state">No parsed fields for this record.</div>
                    ) : effectiveFieldEntries(activeParsed).map(([key, value]) => (
                      <div className="td-field-card" key={key}>
                        <div className="td-field-label">{key}</div>
                        <div className="td-field-value">{value === '' || value === null || value === undefined ? <span style={{ color: 'var(--text-dim)' }}>(empty)</span> : String(value)}</div>
                      </div>
                    ))
                  )}
                </div>

                {editing && (
                  <div className="form-ft" style={{ justifyContent: 'space-between' }}>
                    <RoleGate roles={EDIT_ROLES}>
                      <button className="btn btn-red btn-sm" onClick={() => handleDeleteOne(activeRecord.id)}>🗑 Delete</button>
                    </RoleGate>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                      <button className="btn btn-primary btn-sm" disabled={saving} onClick={handleSaveEdit}>{saving ? 'Saving…' : 'Save Changes'}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {showForm && (
          <TestDataForm
            applicationId={applicationId}
            applications={applications}
            scenarios={scenarios}
            endpoints={endpoints}
            onSaved={(shouldClose) => { load(); if (shouldClose) closeCreateForm(); }}
            onClose={closeCreateForm}
          />
        )}
      </div>
    </div>
  );
}
