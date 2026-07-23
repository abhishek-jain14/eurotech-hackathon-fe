import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';

import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import ProjectsPage from '../pages/projects/ProjectsPage';
import ApplicationListPage from '../pages/onboarding/ApplicationListPage';
import ApplicationOnboardPage from '../pages/onboarding/ApplicationOnboardPage';
import ApplicationSpecsPage from '../pages/onboarding/ApplicationSpecsPage';
import EnvironmentListPage from '../pages/environment/EnvironmentListPage';
import ScenarioListPage from '../pages/scenarios/ScenarioListPage';
import TestDataPage from '../pages/testdata/TestDataPage';
import TestFlowsPage from '../pages/testflows/TestFlowsPage';
import ExecutionPage from '../pages/execution/ExecutionPage';
import ReportsPage from '../pages/reports/ReportsPage';
import ChangeTrackerPage from '../pages/maintenance/ChangeTrackerPage';
import CoveragePage from '../pages/coverage/CoveragePage';
import UsersPage from '../pages/users/UsersPage';
import NotFound from '../pages/NotFound';
import Unauthorized from '../pages/Unauthorized';

import { ALL_ROLES, EDIT_ROLES, ADMIN_ONLY } from '../constants/roles';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<ProtectedRoute allowedRoles={ALL_ROLES}><MainLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Viewer can see these lists, but never the create/edit routes below */}
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId/environments" element={<EnvironmentListPage />} />
        <Route path="/onboarding" element={<ApplicationListPage />} />
        <Route path="/onboarding/:id/specs" element={<ApplicationSpecsPage />} />

        <Route path="/scenarios" element={<ScenarioListPage />} />
        <Route path="/testdata" element={<TestDataPage />} />
        <Route path="/testflows" element={<TestFlowsPage />} />
        <Route path="/execution" element={<ExecutionPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/coverage" element={<CoveragePage />} />
        <Route path="/maintenance" element={<ChangeTrackerPage />} />
      </Route>

      {/* Admin/Tester-only create route - Viewer is redirected to /unauthorized */}
      <Route element={<ProtectedRoute allowedRoles={EDIT_ROLES}><MainLayout /></ProtectedRoute>}>
        <Route path="/onboarding/new" element={<ApplicationOnboardPage />} />
        <Route path="/onboarding/:id/edit" element={<ApplicationOnboardPage />} />
      </Route>

      {/* Admin-only */}
      <Route element={<ProtectedRoute allowedRoles={ADMIN_ONLY}><MainLayout /></ProtectedRoute>}>
        <Route path="/users" element={<UsersPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
