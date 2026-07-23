import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function MainLayout() {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('fade-in');

  useEffect(() => {
    setTransitionStage('fade-out');
    const timeout = window.setTimeout(() => {
      setDisplayLocation(location);
      setTransitionStage('fade-in');
    }, 160);
    return () => window.clearTimeout(timeout);
  }, [location]);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar />
        <div className="content">
          <div key={displayLocation.pathname} className={`route-transition ${transitionStage}`}>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
