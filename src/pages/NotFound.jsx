import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="login-shell">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <div className="login-title">404</div>
        <div className="login-sub">PAGE NOT FOUND</div>
        <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-block' }}>Back to Dashboard</Link>
      </div>
    </div>
  );
}
