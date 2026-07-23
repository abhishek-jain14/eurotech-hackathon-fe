import { useEffect, useState } from 'react';
import { listApplications, fetchEndpoints } from '../../api/applicationApi';
import { listScenariosByApplication, createScenario, deleteScenario } from '../../api/scenarioApi';
import RoleGate from '../../components/common/RoleGate';
import { EDIT_ROLES } from '../../constants/roles';

const EMPTY_FORM = { name: '', httpMethod: 'GET', endpoint: '', scenarioType: 'POSITIVE', source: 'MANUAL', riskLevel: 'MEDIUM', description: '' };

export default function ScenarioListPage() {
  const [applications, setProjects] = useState([]);
  const [applicationId, setApplicationId] = useState('');
  const [scenarios, setScenarios] = useState([]);
  const [endpoints, setEndpoints] = useState([]);
  const [endpointsLoading, setEndpointsLoading] = useState(false);
  const [endpointsError, setEndpointsError] = useState(null);
  const [apiTestData, setApiTestData] = useState({
    endpoint: null,
    headersEnabled: false,
    headers: [], // [{name,value}]
    pathParamsEnabled: false,
    pathOrQueryParams: {},
    requestBodyEnabled: false,
    requestBodyValues: '', // JSON string for simplicity
    requestBodySchema: null, // Store the schema for formatting display
    expectedStatusCode: 200,
    expectedResponseBody: '',
    active: true
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);

  useEffect(() => {
    listApplications({ size: 100 }).then((page) => {
      const list = page.content || [];
      setProjects(list);
      if (list.length && !applicationId) setApplicationId(String(list[0].id));
    });
  }, []);

  const load = () => {
    if (!applicationId) return;
    listScenariosByApplication(applicationId, { size: 100 }).then((page) => setScenarios(page.content || []));
  };

  useEffect(load, [applicationId]);

  // Fetch endpoints for the selected application
  useEffect(() => {
    if (!applicationId) {
      setEndpoints([]);
      return;
    }
    setEndpointsLoading(true);
    setEndpointsError(null);
    fetchEndpoints(applicationId)
      .then((data) => {
        // Handle both array and paginated response formats
        const endpointsArray = Array.isArray(data?.content) 
          ? data.content 
          : Array.isArray(data) 
          ? data 
          : [];
        setEndpoints(endpointsArray);
      })
      .catch((err) => {
        console.error('Failed to fetch endpoints:', err);
        setEndpointsError(err.response?.data?.message || 'Unable to fetch endpoints');
        setEndpoints([]);
      })
      .finally(() => setEndpointsLoading(false));
  }, [applicationId]);

  // Helper to build params object from endpoint definition
  const buildParamsFromEndpoint = (ep) => {
    const params = {};
    const path = ep?.path || ep?.endpoint || '';
    const re = /\{([^}]+)\}/g;
    let m;
    while ((m = re.exec(path))) {
      params[m[1]] = `<${m[1]}>`;
    }
    if (Array.isArray(ep?.parameters)) {
      ep.parameters.forEach((p) => {
        if (p?.name && !(p.name in params)) params[p.name] = `<${p.name}>`;
      });
    }
    return params;
  };

  // Helper to generate request body from endpoint schema
  const generateRequestBodyFromSchema = (schema) => {
    if (!schema || !schema.properties) return null;
    const result = {};
    Object.entries(schema.properties).forEach(([key, prop]) => {
      const type = prop.type;
      if (type === 'string') {
        result[key] = `<${key}_string>`;
      } else if (type === 'integer') {
        result[key] = `<${key}_integer>`;
      } else if (type === 'number') {
        result[key] = `<${key}_number>`;
      } else if (type === 'boolean') {
        result[key] = `<${key}_boolean>`;
      } else {
        result[key] = `<${key}_${type}>`;
      }
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
      if (type === 'string') {
        value = `"<${key}_string>"`;
      } else if (type === 'integer') {
        value = `<${key}_integer>`;
      } else if (type === 'number') {
        value = `<${key}_number>`;
      } else if (type === 'boolean') {
        value = `<${key}_boolean>`;
      } else {
        value = `<${key}_${type}>`;
      }
      const comma = idx < entries.length - 1 ? ',' : '';
      lines.push(`  "${key}": ${value}${comma}`);
    });
    lines.push('}');
    return lines.join('\n');
  };

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      // Build revised payload according to new API shape
      const headersObj = apiTestData.headersEnabled
        ? apiTestData.headers.reduce((acc, h) => {
            if (h.name) acc[h.name] = h.value;
            return acc;
          }, {})
        : undefined;

      let requestBodyValuesObj;
      if (apiTestData.requestBodyEnabled && apiTestData.requestBodyValues) {
        try {
          requestBodyValuesObj = JSON.parse(apiTestData.requestBodyValues);
        } catch (err) {
          setError('Invalid JSON in Request Body values');
          setSubmitting(false);
          return;
        }
      }

      // use pathOrQueryParams object from state when enabled
      const pathOrQueryParamsObj = apiTestData.pathParamsEnabled ? apiTestData.pathOrQueryParams : undefined;

      const payload = {
        applicationId: Number(applicationId),
        name: form.name,
        httpMethod: form.httpMethod,
        endpoint: form.endpoint,
        scenarioType: form.scenarioType,
        source: form.source,
        riskLevel: form.riskLevel,
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

      // Remove undefined keys from apiTestData
      if (!payload.apiTestData.headers) delete payload.apiTestData.headers;
      if (!payload.apiTestData.pathOrQueryParams) delete payload.apiTestData.pathOrQueryParams;
      if (!payload.apiTestData.requestBodyValues) delete payload.apiTestData.requestBodyValues;

      await createScenario(payload);
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create scenario');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this scenario?')) return;
    await deleteScenario(id);
    load();
  };

  return (
    <div>
      <div className="card-hd">
        <span className="card-title">Test Scenarios</span>
        <RoleGate roles={EDIT_ROLES}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ New Scenario'}</button>
        </RoleGate>
      </div>

      <div className="fld" style={{ maxWidth: 320, marginBottom: 14 }}>
        <label>Application</label>
        <select value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
          {applications.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {/* Display available endpoints for the selected application */}
      {applicationId && (
        <div style={{ marginBottom: 14 }}>
          {endpointsLoading && (
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Loading endpoints�</div>
          )}
          {endpointsError && (
            <div className="readonly-banner" style={{ marginBottom: 10 }}>{endpointsError}</div>
          )}
          {!endpointsLoading && endpoints.length > 0 && (
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, color: 'var(--text-dim)' }}>Available Endpoints:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {endpoints.map((ep, idx) => (
                  <div key={idx} style={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    padding: '4px 8px', 
                    borderRadius: 4, 
                    fontSize: 11,
                    cursor: 'pointer',
                    border: '1px solid var(--border-color)',
                    transition: 'all 0.2s'
                  }} 
                  onClick={() => {
                    const method = ep.httpMethod || 'GET';
                    const path = ep.path || ep.endpoint || '';
                    update('httpMethod', method);
                    update('endpoint', path);
                    const params = buildParamsFromEndpoint(ep);
                    setApiTestData((s) => ({ ...s, endpoint: { path, httpMethod: method, summary: ep.summary || '', requestBody: ep.requestBody || null }, pathOrQueryParams: params }));
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = 'var(--accent)'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'var(--bg-secondary)'}
                  >
                    <strong>{ep.httpMethod || 'GET'}</strong> {ep.path || ep.endpoint || '�'}
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

      {error && <div className="readonly-banner">{error}</div>}

      <RoleGate roles={EDIT_ROLES}>
        {showForm && (
          <form className="card" onSubmit={handleCreate}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              <div className="fld">
                <label>Active</label>
                <input type="checkbox" checked={apiTestData.active} onChange={(e) => setApiTestData((s) => ({ ...s, active: e.target.checked }))} />
              </div>
              <div className="fld">
                <label>Expected Status</label>
                <input type="number" value={apiTestData.expectedStatusCode} onChange={(e) => setApiTestData((s) => ({ ...s, expectedStatusCode: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginTop: 8 }}>
              <div className="fld">
                <label><input type="checkbox" checked={apiTestData.headersEnabled} onChange={(e) => setApiTestData((s) => ({ ...s, headersEnabled: e.target.checked }))} /> Enable Headers</label>
                {apiTestData.headersEnabled && (
                  <div style={{ marginTop: 8 }}>
                    {apiTestData.headers.map((h, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <input placeholder="Name" value={h.name} onChange={(e) => setApiTestData((s) => { const headers = [...s.headers]; headers[i] = { ...headers[i], name: e.target.value }; return { ...s, headers }; })} />
                        <input placeholder="Value" value={h.value} onChange={(e) => setApiTestData((s) => { const headers = [...s.headers]; headers[i] = { ...headers[i], value: e.target.value }; return { ...s, headers }; })} />
                        <button type="button" className="btn btn-ghost" onClick={() => setApiTestData((s) => ({ ...s, headers: s.headers.filter((_, idx) => idx !== i) }))}>Remove</button>
                      </div>
                    ))}
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setApiTestData((s) => ({ ...s, headers: [...s.headers, { name: '', value: '' }] }))}>Add Header</button>
                  </div>
                )}
              </div>

              <div className="fld">
                <label><input type="checkbox" checked={apiTestData.pathParamsEnabled} onChange={(e) => setApiTestData((s) => ({ ...s, pathParamsEnabled: e.target.checked }))} /> Enable Path/Query Params (JSON)</label>
                {apiTestData.pathParamsEnabled && (
                  <div style={{ marginTop: 8 }}>
                    {Object.keys(apiTestData.pathOrQueryParams || {}).length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>No params detected from endpoint.</div>
                    ) : (
                      <div>
                        {Object.entries(apiTestData.pathOrQueryParams).map(([key, val], i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                            <input value={key} disabled style={{ width: 160, background: '#f6f6f6' }} />
                            <input value={val} onChange={(e) => setApiTestData((s) => ({ ...s, pathOrQueryParams: { ...s.pathOrQueryParams, [key]: e.target.value } }))} />
                            <button type="button" className="btn btn-ghost" onClick={() => setApiTestData((s) => { const p = { ...s.pathOrQueryParams }; delete p[key]; return { ...s, pathOrQueryParams: p }; })}>Remove</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
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
                <div style={{ marginTop: 8, padding: 12, backgroundColor: '#f6f6f6', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', border: '1px solid #ddd', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {formatRequestBodyForDisplay(apiTestData.requestBodySchema || apiTestData.endpoint?.requestBody)}
                </div>
              )}
            </div>

            <div style={{ marginTop: 8 }}>
              <label>Expected Response Body</label>
              <input value={apiTestData.expectedResponseBody} onChange={(e) => setApiTestData((s) => ({ ...s, expectedResponseBody: e.target.value }))} />
            </div>
            <div className="fld"><label>Description</label><textarea rows={2} value={form.description} onChange={(e) => update('description', e.target.value)} /></div>
            <div className="form-ft"><button className="btn btn-primary" type="submit">Save Scenario</button></div>
          </form>
        )}
      </RoleGate>

      <div className="card">
        {scenarios.length === 0 ? (
          <div className="empty-state">No scenarios yet for this application.</div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Endpoint</th><th>Type</th><th>Source</th><th>Risk</th><th></th></tr></thead>
            <tbody>
              {scenarios.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.httpMethod} {s.endpoint}</td>
                  <td><span className={`tag ${s.scenarioType === "POSITIVE" ? "tag-g" : "tag-r"}`}>{s.scenarioType}</span></td>
                  <td><span className="tag tag-p">{s.source}</span></td>
                  <td>{s.riskLevel}</td>
                  <td>
                    <RoleGate roles={EDIT_ROLES}>
                      <button className="btn btn-red btn-sm" onClick={() => handleDelete(s.id)}>Delete</button>
                    </RoleGate>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

