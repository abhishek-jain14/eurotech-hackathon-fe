import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div className="login-shell">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <div className="login-title" style={{ color: 'var(--red)' }}>403</div>
        <div className="login-sub">YOUR ROLE DOESN'T HAVE ACCESS TO THIS SCREEN</div>
        <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-block' }}>Back to Dashboard</Link>
      </div>
    </div>
  );
}
