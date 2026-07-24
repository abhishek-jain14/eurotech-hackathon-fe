import { useEffect, useState } from 'react';
import { listSpecVersions, generateScenariosForSpecVersion } from '../../api/applicationApi';
import { createScenario, updateScenario } from '../../api/scenarioApi';
import { listTestDataByApplication } from '../../api/testDataApi';
import { useProjectCache } from '../../context/ProjectCacheContext';
import { buildGherkinLines } from './gherkinPreview';

const EMPTY_FORM = { name: '', httpMethod: 'GET', endpoint: '', scenarioType: 'POSITIVE', source: 'MANUAL', riskLevel: 'MEDIUM', description: '' };
const EMPTY_API_TEST_DATA = { endpoint: null, expectedStatusCode: 200, active: true };

// Expected-status choices offered per scenario type, mirroring the reference mockup.
const STATUS_OPTIONS = {
  POSITIVE: ['200 OK', '201 Created', '202 Accepted', '204 No Content'],
  NEGATIVE: ['400 Bad Request', '401 Unauthorized', '403 Forbidden', '404 Not Found', '409 Conflict', '422 Unprocessable Entity', '429 Too Many Requests']
};
const statusOptionsFor = (type) => STATUS_OPTIONS[type] || STATUS_OPTIONS.POSITIVE;
const statusLabelFor = (code, type) => statusOptionsFor(type).find((o) => o.startsWith(String(code))) || '';

// One checkbox-able list combining header/path/query parameters and request body properties,
// instead of three separately-toggled sections - each row remembers where its value belongs
// so submit can still route it into the right apiTestData bucket.
const buildFieldRows = (headerFields, pathQueryFields, bodySchema) => {
  const rows = [];
  headerFields.forEach((f) => rows.push({ key: `header:${f.name}`, name: f.name, type: f.type || 'string', required: !!f.required, location: 'header' }));
  pathQueryFields.forEach((f) => rows.push({ key: `pathQuery:${f.name}`, name: f.name, type: f.type || 'string', required: !!f.required, location: 'pathQuery' }));
  if (bodySchema?.properties) {
    const required = new Set(bodySchema.required || []);
    Object.entries(bodySchema.properties).forEach(([name, prop]) => {
      rows.push({ key: `body:${name}`, name, type: prop?.type || 'string', required: required.has(name), location: 'body' });
    });
  }
  return rows;
};
const requiredKeys = (rows) => new Set(rows.filter((r) => r.required).map((r) => r.key));

// No backend field exists for structured response validations, so rows are folded into the
// existing expectedResponseBody string using a small readable grammar, and parsed back out
// when editing. Anything that doesn't match the grammar (e.g. legacy free text) survives as
// a single Response JSON row rather than being silently dropped.
const VALIDATION_DB_RE = /^database\s+(\S+)\.(\S+)\s+equals\s+<.+>$/i;
const VALIDATION_FIELD_RE = /^(\S+)\s+equals\s+<.+>$/i;

const parseValidationRows = (text) => {
  if (!text) return [];
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
    const db = line.match(VALIDATION_DB_RE);
    if (db) return { id: crypto.randomUUID(), source: 'Database', field: '', table: db[1], column: db[2] };
    const f = line.match(VALIDATION_FIELD_RE);
    if (f) return { id: crypto.randomUUID(), source: 'Response JSON', field: f[1], table: '', column: '' };
    return { id: crypto.randomUUID(), source: 'Response JSON', field: line, table: '', column: '' };
  });
};

const serializeValidationRows = (rows) => rows
  .filter((r) => (r.source === 'Database' ? r.table && r.column : r.field))
  .map((r) => (r.source === 'Database' ? `database ${r.table}.${r.column} equals <${r.column}>` : `${r.field} equals <${r.field}>`))
  .join('\n');

const newValidationRow = () => ({ id: crypto.randomUUID(), source: 'Response JSON', field: '', table: '', column: '' });

export default function ScenarioForm({ applicationId, applicationName, projectId, endpoints, endpointsLoading, endpointsError, editingScenario, onSaved, onClose }) {
  const isEdit = !!editingScenario;
  const [mode, setMode] = useState(isEdit ? 'manual' : null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [apiTestData, setApiTestData] = useState(EMPTY_API_TEST_DATA);
  const [fieldRows, setFieldRows] = useState([]);
  const [includedKeys, setIncludedKeys] = useState(new Set());
  const [validationRows, setValidationRows] = useState([newValidationRow()]);
  const [gherkinLines, setGherkinLines] = useState(null);
  const [jiraTicketKey, setJiraTicketKey] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const { projects, ensureLoaded } = useProjectCache();
  useEffect(() => { ensureLoaded(); }, [ensureLoaded]);
  const project = projects.find((p) => String(p.id) === String(projectId));

  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState(null);
  const [genError, setGenError] = useState(null);

  // Decorative only - there's no scenario<->dataset link on the backend yet (see the
  // Test Data tab's own "linking isn't available for scenarios yet" message), so this
  // just previews existing dataset names and is never sent in the save payload.
  const [testDatasets, setTestDatasets] = useState([]);
  const [linkedDataset, setLinkedDataset] = useState('');
  useEffect(() => {
    if (!applicationId) { setTestDatasets([]); return; }
    listTestDataByApplication(applicationId, { size: 100 }).then((page) => setTestDatasets(page.content || [])).catch(() => setTestDatasets([]));
  }, [applicationId]);

  useEffect(() => {
    setError(null);
    setGherkinLines(null);
    if (editingScenario) {
      setMode('manual');
      setForm({
        name: editingScenario.name || '',
        httpMethod: editingScenario.httpMethod || 'GET',
        endpoint: editingScenario.endpoint || '',
        scenarioType: editingScenario.scenarioType || 'POSITIVE',
        source: editingScenario.source || 'MANUAL',
        riskLevel: editingScenario.riskLevel || 'MEDIUM',
        description: editingScenario.description || ''
      });
      const atd = editingScenario.apiTestData || {};
      const headersObj = atd.headers && typeof atd.headers === 'object' ? atd.headers : {};
      const paramsObj = atd.pathOrQueryParams && typeof atd.pathOrQueryParams === 'object' ? atd.pathOrQueryParams : {};
      const bodyObj = atd.requestBodyValues && typeof atd.requestBodyValues === 'object' ? atd.requestBodyValues : {};
      setApiTestData({
        endpoint: atd.endpoint || (editingScenario.endpoint ? { path: editingScenario.endpoint, httpMethod: editingScenario.httpMethod, summary: '' } : null),
        expectedStatusCode: atd.expectedStatusCode ?? 200,
        active: editingScenario.active !== undefined ? editingScenario.active : true
      });
      const parsedValidations = parseValidationRows(atd.expectedResponseBody);
      setValidationRows(parsedValidations.length ? parsedValidations : [newValidationRow()]);

      // Re-detect fields from the matching endpoint spec so the checklist still reflects
      // what the endpoint actually supports, then pre-check whichever optional fields this
      // scenario already had a value for.
      const match = (endpoints || []).find((ep) => (ep.path || ep.endpoint) === editingScenario.endpoint && (ep.httpMethod || 'GET') === editingScenario.httpMethod);
      const parameters = match ? (Array.isArray(match.parameters) ? match.parameters : []) : [];
      const headerFields = parameters.filter((p) => (p?.in || '').toLowerCase() === 'header');
      const pathQueryFields = parameters.filter((p) => { const loc = (p?.in || '').toLowerCase(); return loc === 'path' || loc === 'query' || !loc; });
      const rows = buildFieldRows(headerFields, pathQueryFields, match?.requestBody);
      setFieldRows(rows);
      const included = requiredKeys(rows);
      rows.forEach((r) => {
        if (included.has(r.key)) return;
        const present = r.location === 'header' ? Object.prototype.hasOwnProperty.call(headersObj, r.name)
          : r.location === 'pathQuery' ? Object.prototype.hasOwnProperty.call(paramsObj, r.name)
          : Object.prototype.hasOwnProperty.call(bodyObj, r.name);
        if (present) included.add(r.key);
      });
      setIncludedKeys(included);
    } else {
      setMode(null);
      setForm(EMPTY_FORM);
      setApiTestData(EMPTY_API_TEST_DATA);
      setFieldRows([]);
      setIncludedKeys(new Set());
      setValidationRows([newValidationRow()]);
      setLinkedDataset('');
      setJiraTicketKey('');
    }
  }, [editingScenario, endpoints]);

  useEffect(() => {
    if (mode !== 'ai' || !applicationId) return;
    setVersionsLoading(true);
    setGenMessage(null);
    setGenError(null);
    listSpecVersions(applicationId)
      .then((v) => setVersions(v || []))
      .catch(() => setVersions([]))
      .finally(() => setVersionsLoading(false));
  }, [mode, applicationId]);

  const currentVersion = versions.find((v) => v.status === 'CURRENT');

  const update = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const pickMode = (m) => {
    setMode(m);
    if (m === 'jira') update('source', 'JIRA');
    else if (m === 'manual') update('source', 'MANUAL');
  };

  const handleEndpointPick = (ep) => {
    const method = ep.httpMethod || 'GET';
    const path = ep.path || ep.endpoint || '';
    setForm((f) => ({ ...f, httpMethod: method, endpoint: path, name: f.name.trim() ? f.name : `${method} ${path} — valid request` }));

    const parameters = Array.isArray(ep.parameters) ? ep.parameters : [];
    const headerFields = parameters.filter((p) => (p?.in || '').toLowerCase() === 'header');
    const pathQueryFields = parameters.filter((p) => { const loc = (p?.in || '').toLowerCase(); return loc === 'path' || loc === 'query' || !loc; });
    const rows = buildFieldRows(headerFields, pathQueryFields, ep.requestBody);
    setFieldRows(rows);
    setIncludedKeys(requiredKeys(rows));
    setGherkinLines(null);

    setApiTestData((s) => ({ ...s, endpoint: { path, httpMethod: method, summary: ep.summary || '', requestBody: ep.requestBody || null } }));
  };

  const toggleField = (row) => {
    if (row.required) return; // mandatory, locked
    setIncludedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(row.key)) next.delete(row.key); else next.add(row.key);
      return next;
    });
  };

  const handleTypeChange = (type) => {
    setForm((f) => ({ ...f, scenarioType: type }));
    setApiTestData((s) => {
      if (statusLabelFor(s.expectedStatusCode, type)) return s; // still valid for the new type
      return { ...s, expectedStatusCode: parseInt(statusOptionsFor(type)[0], 10) };
    });
  };

  const updateValidationRow = (id, patch) => setValidationRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const setValidationSource = (id, source) => updateValidationRow(id, { source, field: '', table: '', column: '' });
  const addValidationRow = () => setValidationRows((rows) => [...rows, newValidationRow()]);
  const removeValidationRow = (id) => setValidationRows((rows) => rows.filter((r) => r.id !== id));

  const handleGenerate = async () => {
    if (!currentVersion || !genPrompt.trim()) return;
    setGenerating(true);
    setGenError(null);
    setGenMessage(null);
    try {
      const created = await generateScenariosForSpecVersion(applicationId, currentVersion.id, 'POSITIVE_NEGATIVE', genPrompt.trim());
      const count = Array.isArray(created) ? created.length : 0;
      setGenMessage(`${count} scenario${count === 1 ? '' : 's'} generated`);
      onSaved(false);
    } catch (err) {
      setGenError(err.response?.data?.message || 'Unable to generate scenarios');
    } finally {
      setGenerating(false);
    }
  };

  // Shared by the Gherkin preview and the real save payload so they can never diverge.
  const buildDraftApiTestData = () => {
    const headersObj = {}; const pathOrQueryParamsObj = {}; const requestBodyValuesObj = {};
    fieldRows.forEach((f) => {
      if (!includedKeys.has(f.key)) return;
      const val = `<${f.name}>`;
      if (f.location === 'header') headersObj[f.name] = val;
      else if (f.location === 'pathQuery') pathOrQueryParamsObj[f.name] = val;
      else requestBodyValuesObj[f.name] = val;
    });
    return {
      endpoint: apiTestData.endpoint || { path: form.endpoint, httpMethod: form.httpMethod, summary: '' },
      headers: Object.keys(headersObj).length ? headersObj : undefined,
      pathOrQueryParams: Object.keys(pathOrQueryParamsObj).length ? pathOrQueryParamsObj : undefined,
      requestBodyValues: Object.keys(requestBodyValuesObj).length ? requestBodyValuesObj : undefined,
      expectedStatusCode: Number(apiTestData.expectedStatusCode),
      expectedResponseBody: serializeValidationRows(validationRows)
    };
  };

  const handleGenerateGherkin = () => {
    setGherkinLines(buildGherkinLines({ name: form.name, httpMethod: form.httpMethod, endpoint: form.endpoint, apiTestData: buildDraftApiTestData() }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const ticketKey = jiraTicketKey.trim();
      const name = mode === 'jira' && ticketKey && !form.name.startsWith(ticketKey) ? `${ticketKey} ${form.name}` : form.name;

      const payload = {
        applicationId: Number(applicationId),
        name,
        httpMethod: form.httpMethod,
        endpoint: form.endpoint,
        scenarioType: form.scenarioType,
        source: form.source,
        riskLevel: form.riskLevel,
        description: form.description,
        active: apiTestData.active,
        apiTestData: buildDraftApiTestData()
      };

      if (!payload.apiTestData.headers) delete payload.apiTestData.headers;
      if (!payload.apiTestData.pathOrQueryParams) delete payload.apiTestData.pathOrQueryParams;
      if (!payload.apiTestData.requestBodyValues) delete payload.apiTestData.requestBodyValues;

      if (isEdit) {
        await updateScenario(editingScenario.id, payload);
        onSaved(true);
      } else {
        const created = await createScenario(payload);
        onSaved(true, created?.id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save scenario');
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit ? 'Edit Scenario' : mode === 'ai' ? 'Generate with AI' : mode === 'manual' ? 'Add Scenario — Custom Entry' : mode === 'jira' ? 'Add Scenario — From Jira' : 'Add Scenario';
  const selectedEndpointIndex = endpoints.findIndex((ep) => (ep.httpMethod || 'GET') === form.httpMethod && (ep.path || ep.endpoint) === form.endpoint);

  return (
    <div className="sc-form-overlay open">
      <div className="sc-form-hd">
        {!isEdit && mode && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode(null)}>← Back</button>
        )}
        <div className="sc-form-title">{title}</div>
        {(mode === 'manual' || mode === 'jira') && (
          <label className="sc-active-toggle">
            <span>Active</span>
            <span
              className={`sc-toggle ${apiTestData.active ? 'on' : ''}`}
              onClick={() => setApiTestData((s) => ({ ...s, active: !s.active }))}
            />
          </label>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>✕ Close</button>
      </div>

      <div className="sc-form-scroll">
        {error && <div className="readonly-banner">{error}</div>}

        {!isEdit && mode === null && (
          <div className="sc-mode-picker">
            <div className="sc-mode-card" onClick={() => pickMode('ai')}>
              <div className="sc-mode-icon">✦</div>
              <div className="sc-mode-title">Generate with AI</div>
              <div className="sc-mode-desc">Generate scenarios from this application's current approved spec version.</div>
              <span className="sc-mode-badge ai">AI Powered</span>
            </div>
            <div className="sc-mode-card" onClick={() => pickMode('manual')}>
              <div className="sc-mode-icon">✏️</div>
              <div className="sc-mode-title">Custom Entry</div>
              <div className="sc-mode-desc">Define endpoint, type, steps and expected results yourself with full control.</div>
              <span className="sc-mode-badge manual">Custom Entry</span>
            </div>
            <div className="sc-mode-card" onClick={() => pickMode('jira')}>
              <div className="sc-mode-icon">◉</div>
              <div className="sc-mode-title">From Jira</div>
              <div className="sc-mode-desc">Reference an existing Jira ticket while you fill in the endpoint, type, steps and expected results.</div>
              <span className="sc-mode-badge jira">Jira</span>
            </div>
          </div>
        )}

        {mode === 'ai' && !isEdit && (
          <div>
            {versionsLoading && <div className="empty-state">Loading spec versions…</div>}
            {!versionsLoading && !currentVersion && (
              <div className="readonly-banner">No current spec version for this application — fetch or approve one under Applications first.</div>
            )}
            {!versionsLoading && currentVersion && (
              <>
                <div className="fld">
                  <label>Generate with AI <span style={{ color: 'var(--red)' }}>*</span></label>
                  <textarea
                    rows={4}
                    value={genPrompt}
                    onChange={(e) => setGenPrompt(e.target.value)}
                    placeholder='Describe what to test, e.g. "Focus on validation errors for missing required fields and boundary values on numeric fields"'
                  />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 12 }}>Using spec version v{currentVersion.versionNumber} (current). Generates both positive and negative scenarios for every endpoint.</div>
                <button type="button" className="btn btn-primary" disabled={generating || !genPrompt.trim()} onClick={handleGenerate}>{generating ? 'Generating…' : '✦ Generate'}</button>
                {!genPrompt.trim() && <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6 }}>A prompt is required to generate scenarios.</div>}
                {genError && <div className="readonly-banner" style={{ marginTop: 10 }}>{genError}</div>}
                {genMessage && (
                  <div className="sc-ai-box" style={{ marginTop: 12 }}>
                    <div className="sc-ai-box-title">✦ {genMessage}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>The scenario list has been refreshed.</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {(mode === 'manual' || mode === 'jira') && (
          <form id="sc-manual-form" onSubmit={handleSubmit}>
            <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 14 }}>{mode === 'jira' ? 'Import from Jira' : 'Custom Entry'}</div>

            {mode === 'jira' && (
              <div className="fld" style={{ marginBottom: 14 }}>
                <label>Jira Ticket Key</label>
                <input placeholder="e.g. PAY-441" value={jiraTicketKey} onChange={(e) => setJiraTicketKey(e.target.value)} />
                {project?.jiraUrl ? (
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
                    Reference: <a href={project.jiraUrl} target="_blank" rel="noreferrer">{project.jiraUrl}</a>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6, fontStyle: 'italic' }}>
                    No Jira URL configured for this project — add one under Projects to link tickets directly.
                  </div>
                )}
              </div>
            )}

            <div className="sc-row2">
              <div className="fld">
                <label>Application</label>
                <select value={applicationId} disabled><option>{applicationName || '—'}</option></select>
              </div>
              <div className="fld">
                <label>Endpoint</label>
                <select
                  value={selectedEndpointIndex}
                  disabled={endpointsLoading || endpoints.length === 0}
                  onChange={(e) => { const idx = Number(e.target.value); if (idx >= 0) handleEndpointPick(endpoints[idx]); }}
                >
                  <option value={-1}>{endpointsLoading ? 'Loading endpoints…' : endpoints.length === 0 ? 'No endpoints available' : '-- Select endpoint --'}</option>
                  {endpoints.map((ep, idx) => <option key={idx} value={idx}>{ep.httpMethod || 'GET'} {ep.path || ep.endpoint || '—'}</option>)}
                </select>
              </div>
            </div>
            {endpointsError && <div className="readonly-banner" style={{ marginBottom: 10 }}>{endpointsError}</div>}
            {!endpointsLoading && endpoints.length === 0 && (
              <div className="sc-row2">
                <div className="fld"><label>Method (custom)</label>
                  <select value={form.httpMethod} onChange={(e) => update('httpMethod', e.target.value)}>
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="fld"><label>Endpoint (custom)</label><input value={form.endpoint} onChange={(e) => update('endpoint', e.target.value)} placeholder="/payments/charge" /></div>
              </div>
            )}

            <div className="fld"><label>Scenario Name *</label><input required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Payment with invalid CVV" /></div>

            <div className="sc-row3">
              <div className="fld"><label>Type</label>
                <select value={form.scenarioType} onChange={(e) => handleTypeChange(e.target.value)}>
                  <option value="POSITIVE">Positive</option><option value="NEGATIVE">Negative</option>
                </select>
              </div>
              <div className="fld"><label>Expected Status</label>
                <select value={statusLabelFor(apiTestData.expectedStatusCode, form.scenarioType)} onChange={(e) => setApiTestData((s) => ({ ...s, expectedStatusCode: parseInt(e.target.value, 10) }))}>
                  {statusOptionsFor(form.scenarioType).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="fld"><label>Risk Level</label>
                <select value={form.riskLevel} onChange={(e) => update('riskLevel', e.target.value)}>
                  <option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
                </select>
              </div>
            </div>

            <div className="fld">
              <label>Description</label>
              {isEdit ? (
                <>
                  <textarea rows={3} value={form.description} readOnly disabled style={{ color: 'var(--text-dim)' }} />
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                    This is the generated Gherkin steps run at execution — not editable here to avoid desyncing it from the scenario's header/path/query fields.
                  </div>
                </>
              ) : (
                <textarea rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="What does this test verify?" />
              )}
            </div>

            {fieldRows.length > 0 && (
              <div className="fld">
                <label>Request Fields <span className="sc-label-hint">· mandatory pre-selected, optional opt-in · values bound to linked dataset</span></label>
                {fieldRows.map((f) => {
                  const on = includedKeys.has(f.key);
                  return (
                    <div className="sc-field-row" key={f.key} onClick={() => toggleField(f)}>
                      <span className={`sc-field-cb ${on ? 'on' : ''} ${f.required ? 'locked' : ''}`}>{on ? '✓' : ''}</span>
                      <span className="sc-field-name">{f.name}</span>
                      <span className="sc-field-type">{f.type}</span>
                      <span className={`tag ${f.required ? 'tag-r' : ''}`}>{f.required ? 'required' : 'optional'}</span>
                      <span className="sc-field-ph">&lt;{f.name}&gt;</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="fld">
              <label>Validate Response Fields <span className="sc-label-hint">· expected values bound to linked dataset</span></label>
              {validationRows.map((row) => (
                <div className="td-validate-row" key={row.id}>
                  <select style={{ flex: '0 0 130px' }} value={row.source} onChange={(e) => setValidationSource(row.id, e.target.value)}>
                    <option>Response JSON</option>
                    <option>Database</option>
                  </select>
                  {row.source === 'Database' ? (
                    <>
                      <input placeholder="table (e.g. payments)" value={row.table} onChange={(e) => updateValidationRow(row.id, { table: e.target.value })} />
                      <input placeholder="column (e.g. status)" value={row.column} onChange={(e) => updateValidationRow(row.id, { column: e.target.value })} />
                    </>
                  ) : (
                    <input placeholder="field name (e.g. transaction_id)" value={row.field} onChange={(e) => updateValidationRow(row.id, { field: e.target.value })} />
                  )}
                  <button type="button" className="td-row-remove" onClick={() => removeValidationRow(row.id)}>✕</button>
                </div>
              ))}
              <button type="button" className="td-add-dashed" onClick={addValidationRow}>+ Add Validation</button>
            </div>

            <div className="fld">
              <button type="button" className="btn-purple" style={{ width: '100%', textAlign: 'center', padding: '10px 14px', borderRadius: 7 }} onClick={handleGenerateGherkin}>✦ Generate Gherkin Test Case</button>
              {gherkinLines && (
                <div className="sc-gherkin-box" style={{ marginTop: 10 }}>
                  {gherkinLines.map((line, i) => (
                    <div key={i}>{line.map((tok, j) => (tok.cls ? <span key={j} className={`sc-${tok.cls}`}>{tok.text}</span> : <span key={j}>{tok.text}</span>))}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="fld">
              <label>Link Test Dataset</label>
              <select value={linkedDataset} onChange={(e) => setLinkedDataset(e.target.value)}>
                <option value="">-- None --</option>
                {testDatasets.map((d) => <option key={d.id} value={d.recordName}>{d.recordName}</option>)}
              </select>
            </div>
          </form>
        )}
      </div>

      {(mode === 'manual' || mode === 'jira') && (
        <div className="form-ft">
          <button type="button" className="btn btn-ghost" onClick={onClose}>✕ Cancel</button>
          <button type="submit" form="sc-manual-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : mode === 'jira' ? 'Import from Jira' : 'Save Scenario'}</button>
        </div>
      )}
    </div>
  );
}
