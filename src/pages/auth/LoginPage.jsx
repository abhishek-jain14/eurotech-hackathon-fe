import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username, password);
      const dest = location.state?.from?.pathname || '/dashboard';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-title">QA<span>Genie</span></div>
        <div className="login-sub">WISH. TEST. SHIP.</div>

        <form onSubmit={handleSubmit}>
          <div className="fld">
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div className="fld">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
          {error && <div className="login-error">{error}</div>}
        </form>

        <div className="login-hint">
          Dummy access for demo/dev: <strong>admin</strong> / <strong>test</strong> (resolves to ADMIN).
          Other roles (TESTER, VIEWER) are provisioned via the Users screen and validated against the backend.
        </div>
      </div>
    </div>
  );
}
