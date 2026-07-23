import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';

const TITLES = {
  '/dashboard': ['Dashboard', ''],
  '/projects': ['Projects', 'Setup'],
  '/onboarding': ['Applications', 'Setup'],
  '/maintenance': ['Change Tracker', 'Specification drift & auto-heal'],
  '/scenarios': ['Test Scenarios', ''],
  '/testdata': ['Test Data', ''],
  '/testflows': ['Test Flows', 'Chained scenarios'],
  '/execution': ['Execution', ''],
  '/reports': ['Reports', ''],
  '/users': ['User Management', 'Admin']
};

export default function Topbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const matchKey = Object.keys(TITLES).find((k) => location.pathname.startsWith(k));
  const [title, crumb] = matchKey ? TITLES[matchKey] : ['QAGenie', ''];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="topbar">
      <span className="topbar-title">{title}</span>
      {crumb && <span className="topbar-crumb">/ {crumb}</span>}
      <div className="topbar-right">
        <span className="role-badge">{user?.username} · {user?.role}</span>
        <button className="btn btn-ghost btn-sm" onClick={toggleTheme}>
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
}
