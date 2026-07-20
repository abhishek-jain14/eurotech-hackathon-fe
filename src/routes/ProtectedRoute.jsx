import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps a page element. `allowedRoles` omitted => any authenticated user
 * may view. Viewer role never sees create/edit pages because those routes
 * are simply never given VIEWER in `allowedRoles` (see AppRoutes.jsx).
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
