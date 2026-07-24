import { useEffect, useRef, useState } from 'react';
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
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const matchKey = Object.keys(TITLES).find((k) => location.pathname.startsWith(k));
  const [title, crumb] = matchKey ? TITLES[matchKey] : ['QAGenie', ''];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  return (
    <div className="topbar">
      <span className="topbar-title">{title}</span>
      {crumb && <span className="topbar-crumb">/ {crumb}</span>}
      <div className="topbar-right">
        <button className="btn btn-ghost btn-sm" onClick={toggleTheme}>
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
        <div className="profile-section" ref={profileRef}>
          <button className="role-badge profile-trigger" onClick={() => setProfileOpen((open) => !open)}>
            <span className="profile-avatar" aria-hidden="true">{(user?.username || 'U').slice(0, 1).toUpperCase()}</span>
            <span>{user?.username} · {user?.role}</span>
            <span aria-hidden="true">{profileOpen ? '▴' : '▾'}</span>
          </button>
          {profileOpen && (
            <div className="profile-menu">
              <button className="btn btn-ghost btn-sm profile-logout" onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
