export const ROLES = {
  ADMIN: 'ADMIN',
  TESTER: 'TESTER',
  VIEWER: 'VIEWER'
};

// Roles allowed to create/edit/delete (everything except user management)
export const EDIT_ROLES = [ROLES.ADMIN, ROLES.TESTER];

// Only ADMIN manages platform users
export const ADMIN_ONLY = [ROLES.ADMIN];

// All authenticated roles can view
export const ALL_ROLES = [ROLES.ADMIN, ROLES.TESTER, ROLES.VIEWER];
