import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: '◈' }]
  },
  {
    label: 'Setup',
    items: [
      { to: '/projects', label: 'Projects', icon: '◆' },
      { to: '/onboarding', label: 'Applications', icon: '⊕' },
      { to: '/maintenance', label: 'Change Tracker', icon: '⚡' }
    ]
  },
  {
    label: 'Testing',
    items: [
      { to: '/scenarios', label: 'Scenarios', icon: '≡' },
      { to: '/testdata', label: 'Test Data', icon: '⊞' },
      { to: '/testflows', label: 'Test Flows', icon: '⤳' },
      { to: '/execution', label: 'Execution', icon: '▶' },
      { to: '/coverage', label: 'Coverage', icon: '◎' }
    ]
  },
  {
    label: 'Insights',
    items: [
      { to: '/reports', label: 'Reports', icon: '◉' }
    ]
  }
];

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <div className="sidebar">
      <div className="logo">
        <div className="logo-name">QA<span>Genie</span></div>
        <div className="logo-sub">WISH. TEST. SHIP.</div>
      </div>

      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <div className="nav-sec">{section.label.toUpperCase()}</div>
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
            >
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </div>
      ))}

      {user?.role === ROLES.ADMIN && (
        <div>
          <div className="nav-sec">ADMIN</div>
          <NavLink to="/users" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <span>☰</span> Users
          </NavLink>
        </div>
      )}

      <div style={{ flex: 1 }} />
    </div>
  );
}
