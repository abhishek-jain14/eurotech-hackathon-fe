import { useEffect, useState } from 'react';
import { listApplications, fetchEndpoints } from '../../api/applicationApi';
import { listScenariosByApplication } from '../../api/scenarioApi';
import { listTestDataByApplication, createTestData, bulkUploadTestData, deleteTestData } from '../../api/testDataApi';
import RoleGate from '../../components/common/RoleGate';
import { EDIT_ROLES } from '../../constants/roles';

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

export default function TestDataPage() {
  const [applications, setProjects] = useState([]);
  const [applicationId, setApplicationId] = useState('');
  const [records, setRecords] = useState([]);
  const [recordName, setRecordName] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);

  // Test-data-against-a-scenario flow: pick a scenario for this application, its
  // endpoint (and header/path fields, sourced from the SPEC_ENDPOINT cache via
  // fetch-endpoints) is derived and rendered so values can be entered per field.
  const [scenarios, setScenarios] = useState([]);
  const [endpoints, setEndpoints] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('');
  const [headerValues, setHeaderValues] = useState({});
  const [pathValues, setPathValues] = useState({});
  const [requestBodyText, setRequestBodyText] = useState('');
  const [bulkScenarioId, setBulkScenarioId] = useState('');

  useEffect(() => {
    listApplications({ size: 100 }).then((page) => {
      const list = page.content || [];
      setProjects(list);
      if (list.length && !applicationId) setApplicationId(String(list[0].id));
    });
  }, []);

  const load = () => {
    if (!applicationId) return;
    listTestDataByApplication(applicationId, { size: 100 }).then((page) => setRecords(page.content || []));
  };

  useEffect(load, [applicationId]);

  useEffect(() => {
    setSelectedScenarioId('');
    setBulkScenarioId('');
    setHeaderValues({});
    setPathValues({});
    setRequestBodyText('');
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

  const selectedScenario = scenarios.find((s) => String(s.id) === selectedScenarioId) || null;
  const matchedEndpoint = findMatchingEndpoint(selectedScenario, endpoints);
  const headerFields = (matchedEndpoint?.parameters || []).filter((p) => (p?.in || '').toLowerCase() === 'header');
  const pathFields = (matchedEndpoint?.parameters || []).filter((p) => (p?.in || '').toLowerCase() === 'path');
  const hasRequestBody = Boolean(matchedEndpoint?.requestBody && Object.keys(matchedEndpoint.requestBody).length > 0);

  const handleScenarioChange = (id) => {
    setSelectedScenarioId(id);
    setHeaderValues({});
    setPathValues({});
    setRequestBodyText('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    if (!selectedScenario) {
      setError('Select a test scenario first');
      return;
    }
    try {
      let requestBodyValue;
      if (hasRequestBody && requestBodyText.trim()) {
        try {
          requestBodyValue = JSON.parse(requestBodyText);
        } catch {
          setError('Request Body must be valid JSON');
          return;
        }
      }
      const fieldsJson = JSON.stringify({
        headers: headerValues,
        pathParams: pathValues,
        ...(requestBodyValue !== undefined ? { requestBody: requestBodyValue } : {})
      });
      await createTestData({
        applicationId: Number(applicationId),
        scenarioId: selectedScenario.id,
        recordName,
        mode: 'MANUAL',
        status: 'VALID',
        fieldsJson
      });
      setRecordName('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create test data record');
    }
  };

  const handleBulk = async (e) => {
    e.preventDefault();
    if (!file) return;
    if (!bulkScenarioId) {
      setError('Select a test scenario for this bulk upload first');
      return;
    }
    setError(null);
    try {
      await bulkUploadTestData(applicationId, bulkScenarioId, file);
      setFile(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk upload failed');
    }
  };

  const handleDelete = async (id) => {
    await deleteTestData(id);
    load();
  };

  const renderFieldRows = (fields, values, setValues) => fields.map((f) => (
    <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ minWidth: 150 }}>{f.name}{f.required ? ' *' : ''}</span>
      <span className="tag" style={{ fontSize: 10 }}>{f.type || 'string'}</span>
      {inputTypeFor(f.type) === 'checkbox' ? (
        <input type="checkbox" checked={!!values[f.name]} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.checked }))} />
      ) : (
        <input
          type={inputTypeFor(f.type)}
          style={{ flex: 1 }}
          value={values[f.name] ?? ''}
          onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
        />
      )}
    </div>
  ));

  return (
    <div>
      <div className="card-hd"><span className="card-title">Test Data</span></div>

      <div className="fld" style={{ maxWidth: 320, marginBottom: 14 }}>
        <label>Application</label>
        <select value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
          {applications.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {error && <div className="readonly-banner">{error}</div>}

      <RoleGate roles={EDIT_ROLES}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <form className="card" onSubmit={handleCreate}>
            <div className="card-hd"><span className="card-title">Single Entry</span></div>
            <div className="fld"><label>Record Name</label><input required value={recordName} onChange={(e) => setRecordName(e.target.value)} /></div>

            <div className="fld">
              <label>Test Scenario</label>
              <select value={selectedScenarioId} onChange={(e) => handleScenarioChange(e.target.value)} disabled={scenarios.length === 0}>
                <option value="">{scenarios.length === 0 ? 'No scenarios for this application' : '— Select a scenario —'}</option>
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.httpMethod} {s.endpoint})</option>
                ))}
              </select>
            </div>

            {selectedScenario && (
              <>
                <div className="fld">
                  <label>Endpoint</label>
                  <input readOnly value={`${selectedScenario.httpMethod} ${selectedScenario.endpoint}`} style={{ background: 'var(--bg-secondary)' }} />
                </div>

                {headerFields.length > 0 && (
                  <div className="fld">
                    <label>Header Fields</label>
                    {renderFieldRows(headerFields, headerValues, setHeaderValues)}
                  </div>
                )}

                {pathFields.length > 0 && (
                  <div className="fld">
                    <label>Path Fields</label>
                    {renderFieldRows(pathFields, pathValues, setPathValues)}
                  </div>
                )}

                {hasRequestBody && (
                  <div className="fld">
                    <label>Request Body</label>
                    <textarea rows={4} value={requestBodyText} onChange={(e) => setRequestBodyText(e.target.value)} placeholder="{}" />
                  </div>
                )}
              </>
            )}

            <div className="form-ft"><button className="btn btn-primary" type="submit">Add Record</button></div>
          </form>

          <form className="card" onSubmit={handleBulk}>
            <div className="card-hd"><span className="card-title">Bulk Upload (CSV)</span></div>
            <div className="fld">
              <label>Test Scenario</label>
              <select value={bulkScenarioId} onChange={(e) => setBulkScenarioId(e.target.value)} disabled={scenarios.length === 0}>
                <option value="">{scenarios.length === 0 ? 'No scenarios for this application' : '— Select a scenario —'}</option>
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.httpMethod} {s.endpoint})</option>
                ))}
              </select>
            </div>
            <div className="fld"><label>CSV File</label><input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>First row = column headers, one record per subsequent row - every row is created against the scenario selected above.</div>
            <div className="form-ft"><button className="btn btn-primary" type="submit">Upload</button></div>
          </form>
        </div>
      </RoleGate>

      <div className="card">
        {records.length === 0 ? (
          <div className="empty-state">No test data records yet.</div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Scenario</th><th>Mode</th><th>Status</th><th>Fields</th><th></th></tr></thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>{r.recordName}</td>
                  <td>{r.scenarioName || '—'}</td>
                  <td><span className="tag tag-p">{r.mode}</span></td>
                  <td><span className={`tag ${r.status === 'VALID' ? 'tag-g' : 'tag-r'}`}>{r.status}</span></td>
                  <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.fieldsJson}</td>
                  <td>
                    <RoleGate roles={EDIT_ROLES}>
                      <button className="btn btn-red btn-sm" onClick={() => handleDelete(r.id)}>Delete</button>
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
