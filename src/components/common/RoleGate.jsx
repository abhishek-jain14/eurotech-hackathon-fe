import { useAuth } from '../../context/AuthContext';

/**
 * Hides children from roles not in `roles`. Used inline inside list pages
 * to hide "Add / Edit / Delete" buttons from VIEWER without needing a
 * separate route.
 */
export default function RoleGate({ roles, children }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return null;
  return children;
}
