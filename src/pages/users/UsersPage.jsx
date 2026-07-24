import { useEffect, useState } from 'react';
import { listUsers, createUser, deactivateUser, deleteUser } from '../../api/userApi';
import { useDialog } from '../../context/DialogContext';
import { normalizeListResponse } from '../../utils/normalizeListResponse';

const EMPTY_FORM = { username: '', password: '', fullName: '', email: '', role: 'TESTER' };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const { confirm } = useDialog();

  const load = () => listUsers({ size: 100 }).then((payload) => setUsers(normalizeListResponse(payload))).catch(() => setUsers([]));

  useEffect(() => {
    load();
  }, []);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await createUser(form);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create user');
    }
  };

  const handleDeactivate = async (id) => { await deactivateUser(id); load(); };
  const handleDelete = async (id) => {
    const shouldDelete = await confirm({ title: 'Delete user?', message: 'This will permanently delete the selected user. Continue?', variant: 'danger', confirmLabel: 'Delete' });
    if (!shouldDelete) return;
    await deleteUser(id);
    load();
  };

  return (
    <div>
      <div className="card-hd"><span className="card-title">Platform Users</span></div>

      <form className="card" onSubmit={handleCreate} style={{ maxWidth: 480 }}>
        <div className="card-hd"><span className="card-title">Create User</span></div>
        <div className="fld"><label>Username *</label><input required value={form.username} onChange={(e) => update('username', e.target.value)} /></div>
        <div className="fld"><label>Password *</label><input required type="password" value={form.password} onChange={(e) => update('password', e.target.value)} /></div>
        <div className="fld"><label>Full Name</label><input value={form.fullName} onChange={(e) => update('fullName', e.target.value)} /></div>
        <div className="fld"><label>Email</label><input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></div>
        <div className="fld"><label>Role *</label>
          <select value={form.role} onChange={(e) => update('role', e.target.value)}>
            <option value="ADMIN">Admin</option>
            <option value="TESTER">Tester</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </div>
        {error && <div className="login-error">{error}</div>}
        <div className="form-ft"><button className="btn btn-primary" type="submit">Create User</button></div>
      </form>

      <div className="card">
        <table>
          <thead><tr><th>Username</th><th>Full Name</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.fullName}</td>
                <td><span className="tag tag-p">{u.role}</span></td>
                <td><span className={`tag ${u.active ? 'tag-g' : 'tag-r'}`}>{u.active ? 'Active' : 'Inactive'}</span></td>
                <td>
                  {u.active && <button className="btn btn-ghost btn-sm" onClick={() => handleDeactivate(u.id)}>Deactivate</button>}
                  <button className="btn btn-red btn-sm" style={{ marginLeft: 6 }} onClick={() => handleDelete(u.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
