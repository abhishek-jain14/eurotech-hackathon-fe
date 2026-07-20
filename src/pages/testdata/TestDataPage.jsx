import { useEffect, useState } from 'react';
import { listApplications } from '../../api/applicationApi';
import { listTestDataByApplication, createTestData, bulkUploadTestData, deleteTestData } from '../../api/testDataApi';
import RoleGate from '../../components/common/RoleGate';
import { EDIT_ROLES } from '../../constants/roles';

export default function TestDataPage() {
  const [applications, setProjects] = useState([]);
  const [applicationId, setApplicationId] = useState('');
  const [records, setRecords] = useState([]);
  const [recordName, setRecordName] = useState('');
  const [fieldsJson, setFieldsJson] = useState('{"amount":"100.00","currency":"USD"}');
  const [file, setFile] = useState(null);
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
    listTestDataByApplication(applicationId, { size: 100 }).then((page) => setRecords(page.content || []));
  };

  useEffect(load, [applicationId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      JSON.parse(fieldsJson);
      await createTestData({ applicationId: Number(applicationId), recordName, mode: 'MANUAL', status: 'VALID', fieldsJson });
      setRecordName('');
      load();
    } catch {
      setError('Fields must be valid JSON');
    }
  };

  const handleBulk = async (e) => {
    e.preventDefault();
    if (!file) return;
    setError(null);
    try {
      await bulkUploadTestData(applicationId, file);
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
            <div className="fld"><label>Fields (JSON)</label><textarea rows={4} value={fieldsJson} onChange={(e) => setFieldsJson(e.target.value)} /></div>
            <div className="form-ft"><button className="btn btn-primary" type="submit">Add Record</button></div>
          </form>

          <form className="card" onSubmit={handleBulk}>
            <div className="card-hd"><span className="card-title">Bulk Upload (CSV)</span></div>
            <div className="fld"><label>CSV File</label><input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>First row = column headers, one record per subsequent row.</div>
            <div className="form-ft"><button className="btn btn-primary" type="submit">Upload</button></div>
          </form>
        </div>
      </RoleGate>

      <div className="card">
        {records.length === 0 ? (
          <div className="empty-state">No test data records yet.</div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Mode</th><th>Status</th><th>Fields</th><th></th></tr></thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>{r.recordName}</td>
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
