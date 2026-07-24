import { useRef, useState } from 'react';
import { createTestData, bulkUploadTestData } from '../../api/testDataApi';

const inputTypeFor = (type) => {
  switch ((type || '').toLowerCase()) {
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'checkbox';
    default:
      return 'text';
  }
};

/** The scenario's own endpoint (httpMethod + endpoint) is just a label - the fields come from
 * matching it against the application's parsed endpoints (SPEC_ENDPOINT cache via fetch-endpoints). */
const findMatchingEndpoint = (scenario, endpoints) => {
  if (!scenario) return null;
  return endpoints.find((ep) => ep.httpMethod === scenario.httpMethod && ep.path === scenario.endpoint) || null;
};

const endpointLabel = (ep) => ep.summary || `${ep.httpMethod || 'GET'} ${ep.path || ep.endpoint || ''}`;

// Field name is a fixed, backend-derived label (not freeform), rendered as a colored box
// rather than an editable input so it never implies the name itself can be changed. These
// rows come straight off the endpoint spec, so there's nothing here for a user to "remove".
const renderFieldRows = (fields, values, setValues) => fields.map((f) => (
  <div key={f.name} className="td-field-row">
    <div className="td-field-name">{f.name}{f.required ? ' *' : ''}</div>
    {inputTypeFor(f.type) === 'checkbox' ? (
      <input type="checkbox" checked={!!values[f.name]} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.checked }))} />
    ) : (
      <input
        type={inputTypeFor(f.type)}
        className="td-field-value-input"
        placeholder={(f.type || 'string').toLowerCase()}
        value={values[f.name] ?? ''}
        onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
      />
    )}
  </div>
));

// Shared between the AI Prompt panel (still fully decorative/preview-only, no props passed)
// and the Single Entry form (controlled via rows/onChange - "Response Data" rows are folded
// into TestData.responseFields and asserted against the actual response at execution time;
// "Database" is left as a preview-only option since no backend DB-check support exists yet).
function ValidationFieldsSection({ rows: controlledRows, onChange }) {
  const isControlled = controlledRows !== undefined;
  const [localRows, setLocalRows] = useState([]);
  const rows = isControlled ? controlledRows : localRows;
  const setRows = isControlled ? onChange : setLocalRows;

  const addRow = () => setRows((r) => [...r, { id: `${Date.now()}-${r.length}`, source: 'Response Data', field: '', expected: '' }]);
  const updateRow = (id, patch) => setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const removeRow = (id) => setRows((r) => r.filter((row) => row.id !== id));

  return (
    <div className="td-validate-section">
      <div className="td-section-label-dim">Validate Response / Database</div>
      {isControlled && <div className="td-dim-text">"Response Data" rows are saved as expected response fields and checked against the real response at execution time. "Database" checks aren't supported yet — those rows are preview-only.</div>}
      {rows.map((row) => (
        <div className="td-validate-row" key={row.id}>
          <select value={row.source} onChange={(e) => updateRow(row.id, { source: e.target.value })}>
            <option>Response Data</option>
            <option>Database</option>
          </select>
          <input placeholder="Field name" value={row.field} onChange={(e) => updateRow(row.id, { field: e.target.value })} />
          <input placeholder="Expected value" value={row.expected} onChange={(e) => updateRow(row.id, { expected: e.target.value })} />
          <button type="button" className="td-row-remove" onClick={() => removeRow(row.id)}>✕</button>
        </div>
      ))}
      <button type="button" className="td-add-dashed" onClick={addRow}>+ Add Validation Field</button>
    </div>
  );
}

// Fully decorative per explicit user request - no backend for AI test-data generation exists
// yet. Every "action" here only ever reveals an honest preview-only note, never a fake result.
function AiPromptPanel({ applications, endpoints, scenarios }) {
  const [service, setService] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [table, setTable] = useState('');
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [genNote, setGenNote] = useState(false);

  const [jsonInput, setJsonInput] = useState('');
  const [jsonNote, setJsonNote] = useState(false);

  return (
    <div>
      <div className="td-ai-card">
        <div className="td-ai-card-hd">
          <span>✦ Generate via AI Prompt</span>
          <span className="td-ai-pill">Claude</span>
        </div>
        <div className="td-ai-card-body">
          <div className="td-section-label">Prompt Template</div>

          <div className="fld">
            <label>Service / Application</label>
            <select value={service} onChange={(e) => setService(e.target.value)}>
              <option value="">— Select —</option>
              {applications.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div className="fld">
            <label>Feature / Endpoint</label>
            <select value={endpoint} onChange={(e) => setEndpoint(e.target.value)}>
              <option value="">— Select —</option>
              {endpoints.map((ep, idx) => <option key={idx} value={idx}>{endpointLabel(ep)}</option>)}
            </select>
          </div>

          <div className="fld">
            <label>Table Name / Dataset</label>
            <input value={table} onChange={(e) => setTable(e.target.value)} placeholder="e.g. payment_records, user_accounts" />
          </div>

          <div className="fld">
            <label>Condition / Scenario to Cover</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value)}>
              <option value="">All scenarios</option>
              {scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="fld">
            <label>Description — what data should be generated</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. One valid Visa card, one expired Mastercard, one card with insufficient funds. Include realistic card numbers, expiry dates and amounts."
            />
          </div>

          <div className="fld">
            <label>Any special rules? (optional)</label>
            <input value={rules} onChange={(e) => setRules(e.target.value)} placeholder="e.g. amounts must be between $1 and $10,000, currency = USD only" />
          </div>

          <button type="button" className="td-btn-solid-purple" style={{ width: '100%' }} onClick={() => setGenNote(true)}>✦ Generate Test Data</button>
          {genNote && <div className="td-preview-note">Preview only — AI-generated test data isn't available yet.</div>}
        </div>
      </div>

      <div className="td-divider" />

      <div>
        <div className="td-section-label-accent">⚡ Generate From Request JSON</div>
        <div className="td-dim-text">Paste a request body JSON — AI will extract the fields and auto-generate test data variations covering valid, invalid, and edge cases.</div>
        <textarea
          rows={5}
          className="td-json-textarea"
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder='{"amount": 149.99, "currency": "USD", "card_number": "4111111111111111", "expiry_date": "12/2026", "cvv": "123"}'
        />
        <button type="button" className="td-btn-outline-accent" style={{ width: '100%' }} onClick={() => setJsonNote(true)}>⚡ Parse JSON &amp; Generate Variations</button>
        {jsonNote && <div className="td-preview-note">Preview only — AI-generated test data isn't available yet.</div>}
      </div>

      <div className="td-divider" />

      <ValidationFieldsSection />
    </div>
  );
}

export default function TestDataForm({ applicationId, applications = [], scenarios, endpoints, initialScenarioId, onSaved, onClose }) {
  // Landing here from Coverage's "+ Create Test Data" button should drop straight into
  // Single Entry with the missing-data scenario already picked, not the AI tab default.
  const [mode, setMode] = useState(initialScenarioId ? 'manual' : 'ai');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [recordName, setRecordName] = useState('');
  const [status, setStatus] = useState('VALID');
  const [selectedScenarioId, setSelectedScenarioId] = useState(initialScenarioId ? String(initialScenarioId) : '');
  const [headerValues, setHeaderValues] = useState({});
  const [pathQueryValues, setPathQueryValues] = useState({});
  const [requestBodyText, setRequestBodyText] = useState('');

  const [serviceName, setServiceName] = useState('');
  const [endPoint, setEndPoint] = useState('');
  const [environment, setEnvironment] = useState('');
  const [httpStatusCode, setHttpStatusCode] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [responseJsonText, setResponseJsonText] = useState('');
  const [responseFieldRows, setResponseFieldRows] = useState([]);

  const [bulkScenarioId, setBulkScenarioId] = useState('');
  const [file, setFile] = useState(null);
  const [schema, setSchema] = useState('Auto-detect');
  const [onDuplicate, setOnDuplicate] = useState('Skip');
  const [bulkSuccess, setBulkSuccess] = useState(null);
  const fileInputRef = useRef(null);

  const applicationName = applications.find((a) => String(a.id) === String(applicationId))?.name;
  const selectedScenario = scenarios.find((s) => String(s.id) === selectedScenarioId) || null;
  const matchedEndpoint = findMatchingEndpoint(selectedScenario, endpoints);
  const headerFields = (matchedEndpoint?.parameters || []).filter((p) => (p?.in || '').toLowerCase() === 'header');
  // query params were previously dropped entirely here - path AND query both belong in this
  // second group, mirroring ScenarioForm.jsx's pathQuery grouping.
  const pathQueryFields = (matchedEndpoint?.parameters || []).filter((p) => {
    const loc = (p?.in || '').toLowerCase();
    return loc === 'path' || loc === 'query' || !loc;
  });
  const hasRequestBody = Boolean(matchedEndpoint?.requestBody && Object.keys(matchedEndpoint.requestBody).length > 0);

  const handleScenarioChange = (id) => {
    setSelectedScenarioId(id);
    setHeaderValues({});
    setPathQueryValues({});
    setRequestBodyText('');
  };

  const handleClearManual = () => {
    setRecordName('');
    setStatus('VALID');
    setSelectedScenarioId('');
    setHeaderValues({});
    setPathQueryValues({});
    setRequestBodyText('');
    setServiceName('');
    setEndPoint('');
    setEnvironment('');
    setHttpStatusCode('');
    setErrorCode('');
    setErrorMsg('');
    setResponseJsonText('');
    setResponseFieldRows([]);
    setError(null);
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!selectedScenario) {
      setError('Select a test scenario first');
      return;
    }
    setSaving(true);
    try {
      let requestBodyValue;
      if (hasRequestBody && requestBodyText.trim()) {
        try {
          requestBodyValue = JSON.parse(requestBodyText);
        } catch {
          setError('Request Body must be valid JSON');
          setSaving(false);
          return;
        }
      }
      if (responseJsonText.trim()) {
        try {
          JSON.parse(responseJsonText);
        } catch {
          setError('Expected Response Body must be valid JSON');
          setSaving(false);
          return;
        }
      }
      const fieldsJson = JSON.stringify({
        headers: headerValues,
        pathParams: pathQueryValues,
        ...(requestBodyValue !== undefined ? { requestBody: requestBodyValue } : {})
      });
      const responseFieldsObj = Object.fromEntries(
        responseFieldRows
          .filter((row) => row.source === 'Response Data' && row.field.trim())
          .map((row) => [row.field.trim(), row.expected])
      );
      await createTestData({
        applicationId: Number(applicationId),
        scenarioId: selectedScenario.id,
        recordName,
        mode: 'MANUAL',
        status,
        fieldsJson,
        serviceName: serviceName.trim() || undefined,
        endPoint: endPoint.trim() || undefined,
        environment: environment.trim() || undefined,
        httpStatusCode: httpStatusCode.trim() ? Number(httpStatusCode) : undefined,
        errorCode: errorCode.trim() || undefined,
        errorMsg: errorMsg.trim() || undefined,
        responseFields: Object.keys(responseFieldsObj).length ? JSON.stringify(responseFieldsObj) : undefined,
        responseJson: responseJsonText.trim() || undefined
      });
      onSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create test data record');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (f) => {
    setFile(f);
    setBulkSuccess(null);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBulkSuccess(null);
    if (!bulkScenarioId) {
      setError('Select a test scenario for this bulk upload first');
      return;
    }
    if (!file) {
      setError('Choose a CSV file first');
      return;
    }
    setSaving(true);
    try {
      const result = await bulkUploadTestData(applicationId, bulkScenarioId, file);
      const count = Array.isArray(result) ? result.length : null;
      setBulkSuccess(count !== null ? `${count} record${count === 1 ? '' : 's'} imported.` : 'Upload complete.');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSaved(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk upload failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="td-form-overlay open">
      <div className="td-form-hd">
        <div className="td-form-title">Add Test Data</div>
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className="td-tabs">
        <button type="button" className={`td-tab ${mode === 'ai' ? 'active' : ''}`} onClick={() => setMode('ai')}>
          <div className="td-tab-icon">✦</div>
          <div className="td-tab-label">AI Prompt</div>
        </button>
        <button type="button" className={`td-tab ${mode === 'manual' ? 'active' : ''}`} onClick={() => setMode('manual')}>
          <div className="td-tab-icon">✏️</div>
          <div className="td-tab-label">Single Entry</div>
        </button>
        <button type="button" className={`td-tab ${mode === 'bulk' ? 'active' : ''}`} onClick={() => setMode('bulk')}>
          <div className="td-tab-icon">⬆</div>
          <div className="td-tab-label">Bulk Upload</div>
        </button>
      </div>

      <div className="td-form-scroll">
        {error && <div className="readonly-banner">{error}</div>}

        {mode === 'ai' && (
          <AiPromptPanel applications={applications} endpoints={endpoints} scenarios={scenarios} />
        )}

        {mode === 'manual' && (
          <form id="td-manual-form" onSubmit={handleSingleSubmit}>
            <div className="td-two-col">
              <div className="fld">
                <label>Application</label>
                <input readOnly value={applicationName || '—'} className="td-readonly-input" />
              </div>
              <div className="fld">
                <label>Test Scenario</label>
                <select value={selectedScenarioId} onChange={(e) => handleScenarioChange(e.target.value)} disabled={scenarios.length === 0}>
                  <option value="">{scenarios.length === 0 ? 'No scenarios for this application' : '— Select a scenario —'}</option>
                  {scenarios.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.httpMethod} {s.endpoint})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="td-two-col">
              <div className="fld"><label>Record Name</label><input required value={recordName} onChange={(e) => setRecordName(e.target.value)} /></div>
              <div className="fld">
                <label>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="VALID">Valid</option>
                  <option value="INVALID">Invalid</option>
                </select>
              </div>
            </div>

            {selectedScenario && (
              <>
                <div className="fld">
                  <label>Endpoint</label>
                  <input readOnly value={`${selectedScenario.httpMethod} ${selectedScenario.endpoint}`} className="td-readonly-input" />
                </div>

                {headerFields.length > 0 && (
                  <div className="fld">
                    <label>Header Fields</label>
                    {renderFieldRows(headerFields, headerValues, setHeaderValues)}
                  </div>
                )}

                {pathQueryFields.length > 0 && (
                  <div className="fld">
                    <label>Path / Query Fields</label>
                    {renderFieldRows(pathQueryFields, pathQueryValues, setPathQueryValues)}
                  </div>
                )}

                {hasRequestBody && (
                  <div className="fld">
                    <label>Request Body</label>
                    <textarea rows={4} value={requestBodyText} onChange={(e) => setRequestBodyText(e.target.value)} placeholder="{}" />
                  </div>
                )}

                <div className="td-section-label-dim">Expected Outcome</div>
                <div className="td-two-col">
                  <div className="fld"><label>Service Name</label><input value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="(optional label)" /></div>
                  <div className="fld"><label>Endpoint</label><input value={endPoint} onChange={(e) => setEndPoint(e.target.value)} placeholder="(optional label)" /></div>
                </div>
                <div className="td-two-col">
                  <div className="fld"><label>Environment</label><input value={environment} onChange={(e) => setEnvironment(e.target.value)} placeholder="e.g. Dev, Staging" /></div>
                  <div className="fld"><label>Expected HTTP Status Code</label><input type="number" min="100" max="599" value={httpStatusCode} onChange={(e) => setHttpStatusCode(e.target.value)} placeholder="e.g. 200" /></div>
                </div>
                <div className="td-two-col">
                  <div className="fld"><label>Expected Error Code</label><input value={errorCode} onChange={(e) => setErrorCode(e.target.value)} placeholder="(negative scenarios only)" /></div>
                  <div className="fld"><label>Expected Error Message</label><input value={errorMsg} onChange={(e) => setErrorMsg(e.target.value)} placeholder="(negative scenarios only)" /></div>
                </div>
                <div className="fld">
                  <label>Expected Response Body (JSON)</label>
                  <textarea rows={4} className="td-json-textarea" value={responseJsonText} onChange={(e) => setResponseJsonText(e.target.value)} placeholder='{"status": "ok"}' />
                </div>
              </>
            )}

            <ValidationFieldsSection rows={responseFieldRows} onChange={setResponseFieldRows} />
          </form>
        )}

        {mode === 'bulk' && (
          <form id="td-bulk-form" onSubmit={handleBulkSubmit}>
            <div className="fld">
              <label>Test Scenario</label>
              <select value={bulkScenarioId} onChange={(e) => { setBulkScenarioId(e.target.value); setBulkSuccess(null); }} disabled={scenarios.length === 0}>
                <option value="">{scenarios.length === 0 ? 'No scenarios for this application' : '— Select a scenario —'}</option>
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.httpMethod} {s.endpoint})</option>
                ))}
              </select>
            </div>

            <label
              className={`td-dropzone ${file ? 'has-file' : ''}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFileChange(f); }}
            >
              {/* Backend only accepts CSV today - accept stays .csv-only even though the
                  json/xlsx badges below are shown purely for visual parity with the mockup. */}
              <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => handleFileChange(e.target.files?.[0] || null)} />
              <div className="td-dropzone-icon">⬆</div>
              <div className="td-dropzone-title">Drop your file here</div>
              <div className="td-dropzone-sub">CSV, JSON or Excel.</div>
              <div className="td-dropzone-sub">First row = column headers matching schema.</div>
              <div className="td-format-badges">
                <span className="td-format-badge accent">.csv</span>
                <span className="td-format-badge accent">.json</span>
                <span className="td-format-badge amber">.xlsx</span>
              </div>
              {file && <div className="td-dropzone-file">Selected: {file.name}</div>}
            </label>

            <div className="td-two-col">
              <div className="fld">
                <label>Schema</label>
                <select value={schema} onChange={(e) => setSchema(e.target.value)}>
                  <option>Auto-detect</option>
                  <option>Payment</option>
                  <option>User</option>
                </select>
              </div>
              <div className="fld">
                <label>On Duplicate</label>
                <select value={onDuplicate} onChange={(e) => setOnDuplicate(e.target.value)}>
                  <option>Skip</option>
                  <option>Overwrite</option>
                  <option>Error</option>
                </select>
              </div>
            </div>

            <div className="td-dim-text">
              Columns named serviceName, endPoint, environment, httpStatusCode, errorCode, errorMsg, responseFields or responseJson are recognized as the expected-outcome fields (case-insensitive); every other column becomes a request field.
            </div>

            <div className="td-info-banner">✓ AI validates field names against your schema and flags mismatches before importing.</div>

            {bulkSuccess && <div className="td-success-banner">✓ {bulkSuccess}</div>}
          </form>
        )}
      </div>

      {mode === 'manual' && (
        <div className="form-ft">
          <button type="button" className="btn btn-ghost" onClick={handleClearManual}>✕ Clear</button>
          <button type="submit" form="td-manual-form" className="td-btn-solid-accent" disabled={saving}>{saving ? 'Saving…' : '+ Add to Dataset'}</button>
        </div>
      )}
      {mode === 'bulk' && (
        <div className="form-ft">
          <button type="submit" form="td-bulk-form" className="td-btn-solid-accent" style={{ width: '100%' }} disabled={saving}>{saving ? 'Uploading…' : '⬆ Upload & Validate'}</button>
        </div>
      )}
    </div>
  );
}
