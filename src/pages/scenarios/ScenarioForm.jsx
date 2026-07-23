import { useEffect, useState } from 'react';
import { listSpecVersions, generateScenariosForSpecVersion } from '../../api/applicationApi';
import { createScenario, updateScenario } from '../../api/scenarioApi';

const EMPTY_FORM = { name: '', httpMethod: 'GET', endpoint: '', scenarioType: 'POSITIVE', source: 'MANUAL', riskLevel: 'MEDIUM', description: '' };
const EMPTY_API_TEST_DATA = {
  endpoint: null,
  headersEnabled: false,
  headers: [], // [{name,value}]
  pathParamsEnabled: false,
  pathOrQueryParams: {},
  requestBodyEnabled: false,
  requestBodyValues: '', // JSON string for simplicity
  requestBodySchema: null,
  expectedStatusCode: 200,
  expectedResponseBody: '',
  active: true
};

const GENERATION_OPTIONS = [
  { value: 'POSITIVE', label: 'Positive only' },
  { value: 'NEGATIVE', label: 'Negative only' },
  { value: 'POSITIVE_NEGATIVE', label: 'Positive + Negative' }
];

// Helper to generate request body from endpoint schema
const generateRequestBodyFromSchema = (schema) => {
  if (!schema || !schema.properties) return null;
  const result = {};
  Object.entries(schema.properties).forEach(([key, prop]) => {
    const type = prop.type;
    if (type === 'string') result[key] = `<${key}_string>`;
    else if (type === 'integer') result[key] = `<${key}_integer>`;
    else if (type === 'number') result[key] = `<${key}_number>`;
    else if (type === 'boolean') result[key] = `<${key}_boolean>`;
    else result[key] = `<${key}_${type}>`;
  });
  return result;
};

// Helper to format request body for display
const formatRequestBodyForDisplay = (schema) => {
  if (!schema || !schema.properties) return '';
  const lines = ['{'];
  const entries = Object.entries(schema.properties);
  entries.forEach(([key, prop], idx) => {
    const type = prop.type;
    let value;
    if (type === 'string') value = `"<${key}_string>"`;
    else if (type === 'integer') value = `<${key}_integer>`;
    else if (type === 'number') value = `<${key}_number>`;
    else if (type === 'boolean') value = `<${key}_boolean>`;
    else value = `<${key}_${type}>`;
    const comma = idx < entries.length - 1 ? ',' : '';
    lines.push(`  "${key}": ${value}${comma}`);
  });
  lines.push('}');
  return lines.join('\n');
};

export default function ScenarioForm({ applicationId, endpoints, endpointsLoading, endpointsError, editingScenario, onSaved, onClose }) {
  const isEdit = !!editingScenario;
  const [mode, setMode] = useState(isEdit ? 'manual' : null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [apiTestData, setApiTestData] = useState(EMPTY_API_TEST_DATA);
  const [endpointFields, setEndpointFields] = useState({ header: [], pathQuery: [] });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [genType, setGenType] = useState('POSITIVE_NEGATIVE');
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState(null);
  const [genError, setGenError] = useState(null);

  useEffect(() => {
    setError(null);
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
      setApiTestData({
        endpoint: atd.endpoint || (editingScenario.endpoint ? { path: editingScenario.endpoint, httpMethod: editingScenario.httpMethod, summary: '' } : null),
        headersEnabled: Object.keys(headersObj).length > 0,
        headers: Object.entries(headersObj).map(([name, value]) => ({ name, value })),
        pathParamsEnabled: Object.keys(paramsObj).length > 0,
        pathOrQueryParams: paramsObj,
        requestBodyEnabled: !!atd.requestBodyValues,
        requestBodyValues: atd.requestBodyValues ? JSON.stringify(atd.requestBodyValues) : '',
        requestBodySchema: null,
        expectedStatusCode: atd.expectedStatusCode ?? 200,
        expectedResponseBody: atd.expectedResponseBody || '',
        active: editingScenario.active !== undefined ? editingScenario.active : true
      });
      // Re-detect header/path/query fields from the matching endpoint spec so the
      // checklist still reflects what the endpoint actually supports.
      const match = (endpoints || []).find((ep) => (ep.path || ep.endpoint) === editingScenario.endpoint && (ep.httpMethod || 'GET') === editingScenario.httpMethod);
      if (match) {
        const parameters = Array.isArray(match.parameters) ? match.parameters : [];
        setEndpointFields({
          header: parameters.filter((p) => (p?.in || '').toLowerCase() === 'header'),
          pathQuery: parameters.filter((p) => { const loc = (p?.in || '').toLowerCase(); return loc === 'path' || loc === 'query' || !loc; })
        });
      } else {
        setEndpointFields({ header: [], pathQuery: [] });
      }
    } else {
      setMode(null);
      setForm(EMPTY_FORM);
      setApiTestData(EMPTY_API_TEST_DATA);
      setEndpointFields({ header: [], pathQuery: [] });
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

  const handleEndpointPick = (ep) => {
    const method = ep.httpMethod || 'GET';
    const path = ep.path || ep.endpoint || '';
    update('httpMethod', method);
    update('endpoint', path);

    const parameters = Array.isArray(ep.parameters) ? ep.parameters : [];
    const headerFields = parameters.filter((p) => (p?.in || '').toLowerCase() === 'header');
    const pathQueryFields = parameters.filter((p) => { const loc = (p?.in || '').toLowerCase(); return loc === 'path' || loc === 'query' || !loc; });
    setEndpointFields({ header: headerFields, pathQuery: pathQueryFields });

    setApiTestData((s) => ({
      ...s,
      endpoint: { path, httpMethod: method, summary: ep.summary || '', requestBody: ep.requestBody || null },
      headers: [],
      pathOrQueryParams: {}
    }));
  };

  const handleGenerate = async () => {
    if (!currentVersion) return;
    setGenerating(true);
    setGenError(null);
    setGenMessage(null);
    try {
      const created = await generateScenariosForSpecVersion(applicationId, currentVersion.id, genType);
      const count = Array.isArray(created) ? created.length : 0;
      setGenMessage(`${count} scenario${count === 1 ? '' : 's'} generated`);
      onSaved(false);
    } catch (err) {
      setGenError(err.response?.data?.message || 'Unable to generate scenarios');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const headersObj = apiTestData.headersEnabled
        ? apiTestData.headers.reduce((acc, h) => { if (h.name) acc[h.name] = h.value; return acc; }, {})
        : undefined;

      let requestBodyValuesObj;
      if (apiTestData.requestBodyEnabled && apiTestData.requestBodyValues) {
        try {
          requestBodyValuesObj = JSON.parse(apiTestData.requestBodyValues);
        } catch (err) {
          setError('Invalid JSON in Request Body values');
          setSaving(false);
          return;
        }
      }

      const pathOrQueryParamsObj = apiTestData.pathParamsEnabled ? apiTestData.pathOrQueryParams : undefined;

      const payload = {
        applicationId: Number(applicationId),
        name: form.name,
        httpMethod: form.httpMethod,
        endpoint: form.endpoint,
        scenarioType: form.scenarioType,
        source: form.source,
        riskLevel: form.riskLevel,
        description: form.description,
        active: apiTestData.active,
        apiTestData: {
          endpoint: apiTestData.endpoint || { path: form.endpoint, httpMethod: form.httpMethod, summary: '' },
          headers: headersObj,
          pathOrQueryParams: apiTestData.pathParamsEnabled ? pathOrQueryParamsObj : undefined,
          requestBodyValues: requestBodyValuesObj,
          expectedStatusCode: Number(apiTestData.expectedStatusCode),
          expectedResponseBody: apiTestData.expectedResponseBody
        }
      };

      if (!payload.apiTestData.headers) delete payload.apiTestData.headers;
      if (!payload.apiTestData.pathOrQueryParams) delete payload.apiTestData.pathOrQueryParams;
      if (!payload.apiTestData.requestBodyValues) delete payload.apiTestData.requestBodyValues;

      if (isEdit) await updateScenario(editingScenario.id, payload);
      else await createScenario(payload);

      onSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save scenario');
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit ? 'Edit Scenario' : mode === 'ai' ? 'Generate with AI' : mode === 'manual' ? 'Add Scenario — Manual Entry' : 'Add Scenario';

  return (
    <div className="sc-form-overlay open">
      <div className="sc-form-hd">
        {!isEdit && mode && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode(null)}>← Back</button>
        )}
        <div className="sc-form-title">{title}</div>
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={onClose}>✕ Close</button>
      </div>

      <div className="sc-form-scroll">
        {error && <div className="readonly-banner">{error}</div>}

        {!isEdit && mode === null && (
          <div className="sc-mode-picker">
            <div className="sc-mode-card" onClick={() => setMode('manual')}>
              <div className="sc-mode-icon">✏️</div>
              <div className="sc-mode-title">Manual Entry</div>
              <div className="sc-mode-desc">Define endpoint, type, steps and expected results yourself with full control.</div>
            </div>
            <div className="sc-mode-card" onClick={() => setMode('ai')}>
              <div className="sc-mode-icon">✦</div>
              <div className="sc-mode-title">Generate with AI</div>
              <div className="sc-mode-desc">Generate scenarios from this application's current approved spec version.</div>
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
                  <label>Scenario Type</label>
                  <select value={genType} onChange={(e) => setGenType(e.target.value)}>
                    {GENERATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 12 }}>Using spec version v{currentVersion.versionNumber} (current).</div>
                <button type="button" className="btn btn-primary" disabled={generating} onClick={handleGenerate}>{generating ? 'Generating…' : '✦ Generate'}</button>
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

        {mode === 'manual' && (
          <form id="sc-manual-form" onSubmit={handleSubmit}>
            {applicationId && (
              <div style={{ marginBottom: 14 }}>
                {endpointsLoading && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Loading endpoints…</div>}
                {endpointsError && <div className="readonly-banner" style={{ marginBottom: 10 }}>{endpointsError}</div>}
                {!endpointsLoading && endpoints.length > 0 && (
                  <div className="fld">
                    <label>Available Endpoints — click to fill in</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {endpoints.map((ep, idx) => (
                        <div
                          key={idx}
                          className="sc-ep-chip"
                          onClick={() => handleEndpointPick(ep)}
                        >
                          <strong>{ep.httpMethod || 'GET'}</strong> {ep.path || ep.endpoint || '—'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!endpointsLoading && endpoints.length === 0 && !endpointsError && (
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>No endpoints available for this application.</div>
                )}
              </div>
            )}

            <div className="fld"><label>Name *</label><input required value={form.name} onChange={(e) => update('name', e.target.value)} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
              <div className="fld"><label>Method</label>
                <select value={form.httpMethod} onChange={(e) => update('httpMethod', e.target.value)}>
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="fld"><label>Endpoint</label><input value={form.endpoint} onChange={(e) => update('endpoint', e.target.value)} placeholder="/payments/charge" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div className="fld"><label>Type</label>
                <select value={form.scenarioType} onChange={(e) => update('scenarioType', e.target.value)}>
                  <option value="POSITIVE">Positive</option><option value="NEGATIVE">Negative</option>
                </select>
              </div>
              <div className="fld"><label>Source</label>
                <select value={form.source} onChange={(e) => update('source', e.target.value)}>
                  <option value="AI">AI</option><option value="MANUAL">Manual</option><option value="JIRA">Jira</option>
                </select>
              </div>
              <div className="fld"><label>Risk</label>
                <select value={form.riskLevel} onChange={(e) => update('riskLevel', e.target.value)}>
                  <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="fld">
                <label>Active</label>
                <input type="checkbox" checked={apiTestData.active} onChange={(e) => setApiTestData((s) => ({ ...s, active: e.target.checked }))} />
              </div>
              <div className="fld">
                <label>Expected Status</label>
                <input type="number" value={apiTestData.expectedStatusCode} onChange={(e) => setApiTestData((s) => ({ ...s, expectedStatusCode: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginTop: 4 }}>
              <div className="fld">
                <label><input type="checkbox" checked={apiTestData.headersEnabled} onChange={(e) => setApiTestData((s) => ({ ...s, headersEnabled: e.target.checked }))} /> Enable Headers</label>
                {apiTestData.headersEnabled && (
                  <div style={{ marginTop: 8 }}>
                    {endpointFields.header.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Detected from endpoint — check to include:</div>
                        {endpointFields.header.map((f) => {
                          const checked = apiTestData.headers.some((h) => h.name === f.name);
                          const current = apiTestData.headers.find((h) => h.name === f.name);
                          return (
                            <div key={f.name} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => setApiTestData((s) => ({
                                  ...s,
                                  headersEnabled: true,
                                  headers: e.target.checked
                                    ? [...s.headers, { name: f.name, value: `<${f.name}>` }]
                                    : s.headers.filter((h) => h.name !== f.name)
                                }))}
                              />
                              <span style={{ minWidth: 140 }}>{f.name}{f.required ? ' *' : ''}</span>
                              <span className="tag" style={{ fontSize: 10 }}>{f.type || 'string'}</span>
                              {checked && (
                                <input
                                  style={{ flex: 1 }}
                                  value={current?.value || ''}
                                  onChange={(e) => setApiTestData((s) => ({ ...s, headers: s.headers.map((h) => h.name === f.name ? { ...h, value: e.target.value } : h) }))}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {apiTestData.headers.filter((h) => !endpointFields.header.some((f) => f.name === h.name)).map((h) => {
                      const i = apiTestData.headers.indexOf(h);
                      return (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                          <input placeholder="Name" value={h.name} onChange={(e) => setApiTestData((s) => { const headers = [...s.headers]; headers[i] = { ...headers[i], name: e.target.value }; return { ...s, headers }; })} />
                          <input placeholder="Value" value={h.value} onChange={(e) => setApiTestData((s) => { const headers = [...s.headers]; headers[i] = { ...headers[i], value: e.target.value }; return { ...s, headers }; })} />
                          <button type="button" className="btn btn-ghost" onClick={() => setApiTestData((s) => ({ ...s, headers: s.headers.filter((_, idx) => idx !== i) }))}>Remove</button>
                        </div>
                      );
                    })}
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setApiTestData((s) => ({ ...s, headers: [...s.headers, { name: '', value: '' }] }))}>Add Header</button>
                  </div>
                )}
              </div>

              <div className="fld">
                <label><input type="checkbox" checked={apiTestData.pathParamsEnabled} onChange={(e) => setApiTestData((s) => ({ ...s, pathParamsEnabled: e.target.checked }))} /> Enable Path/Query Params</label>
                {apiTestData.pathParamsEnabled && (
                  <div style={{ marginTop: 8 }}>
                    {endpointFields.pathQuery.length > 0 ? (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Detected from endpoint — check to include:</div>
                        {endpointFields.pathQuery.map((f) => {
                          const params = apiTestData.pathOrQueryParams || {};
                          const checked = Object.prototype.hasOwnProperty.call(params, f.name);
                          return (
                            <div key={f.name} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => setApiTestData((s) => {
                                  const next = { ...(s.pathOrQueryParams || {}) };
                                  if (e.target.checked) next[f.name] = `<${f.name}>`;
                                  else delete next[f.name];
                                  return { ...s, pathParamsEnabled: true, pathOrQueryParams: next };
                                })}
                              />
                              <span style={{ minWidth: 140 }}>{f.name}{f.required ? ' *' : ''}</span>
                              <span className="tag" style={{ fontSize: 10 }}>{f.type || 'string'}</span>
                              {checked && (
                                <input
                                  style={{ flex: 1 }}
                                  value={params[f.name] || ''}
                                  onChange={(e) => setApiTestData((s) => ({ ...s, pathOrQueryParams: { ...s.pathOrQueryParams, [f.name]: e.target.value } }))}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>No path/query params detected from endpoint.</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 4 }}>
              <label>
                <input
                  type="checkbox"
                  checked={apiTestData.requestBodyEnabled}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const schema = apiTestData.endpoint?.requestBody;
                      if (schema) {
                        const bodyObj = generateRequestBodyFromSchema(schema);
                        setApiTestData((s) => ({ ...s, requestBodyEnabled: true, requestBodyValues: JSON.stringify(bodyObj), requestBodySchema: schema }));
                      } else {
                        setApiTestData((s) => ({ ...s, requestBodyEnabled: false, requestBodyValues: '' }));
                      }
                    } else {
                      setApiTestData((s) => ({ ...s, requestBodyEnabled: false, requestBodyValues: '', requestBodySchema: null }));
                    }
                  }}
                />
                Enable Request Body
              </label>
              {apiTestData.requestBodyEnabled && (
                <div style={{ marginTop: 8, padding: 12, background: 'var(--surface-2)', borderRadius: 6, fontSize: 12, fontFamily: 'monospace', border: '1px solid var(--border-2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {formatRequestBodyForDisplay(apiTestData.requestBodySchema || apiTestData.endpoint?.requestBody)}
                </div>
              )}
            </div>

            <div className="fld" style={{ marginTop: 8 }}>
              <label>Expected Response Body</label>
              <input value={apiTestData.expectedResponseBody} onChange={(e) => setApiTestData((s) => ({ ...s, expectedResponseBody: e.target.value }))} />
            </div>
            <div className="fld"><label>Description</label><textarea rows={2} value={form.description} onChange={(e) => update('description', e.target.value)} /></div>
          </form>
        )}
      </div>

      {mode === 'manual' && (
        <div className="form-ft">
          <button type="button" className="btn btn-ghost" onClick={onClose}>✕ Cancel</button>
          <button type="submit" form="sc-manual-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Scenario'}</button>
        </div>
      )}
    </div>
  );
}
