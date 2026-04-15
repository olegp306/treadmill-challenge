import { Routes, Route, Navigate } from 'react-router-dom';
import WelcomePage from '../pages/WelcomePage';
import RegistrationPage from '../pages/RegistrationPage';
import StartRunningPage from '../pages/StartRunningPage';
import LeaderboardPage from '../pages/LeaderboardPage';
import ResultPage from '../pages/ResultPage';
import Main from '../pages/Main';
import RunSelectionPage from '../pages/RunSelectionPage';
import RunQueuePage from '../pages/RunQueuePage';
import RunQueueBusyPage from '../pages/RunQueueBusyPage';
import RunLeaveQueueConfirmPage from '../pages/RunLeaveQueueConfirmPage';
import DemoRunPage from '../pages/DemoRunPage';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminCompetitionPage from '../pages/admin/AdminCompetitionPage';
import AdminArchivePage from '../pages/admin/AdminArchivePage';
import AdminSettingsPage from '../pages/admin/AdminSettingsPage';
import { RequireAdmin } from '../features/admin/RequireAdmin';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Main />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/register" element={<RegistrationPage />} />
      <Route path="/start" element={<StartRunningPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/result" element={<ResultPage />} />
      <Route path="/run-select" element={<RunSelectionPage />} />
      <Route path="/run/queue" element={<RunQueuePage />} />
      <Route path="/run/queue-busy" element={<RunQueueBusyPage />} />
      <Route path="/run/leave-queue" element={<RunLeaveQueueConfirmPage />} />
      <Route path="/run/demo" element={<DemoRunPage />} />
      <Route path="/run/waiting" element={<Navigate to="/run/queue" replace />} />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminDashboardPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/competition/:id"
        element={
          <RequireAdmin>
            <AdminCompetitionPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/archive"
        element={
          <RequireAdmin>
            <AdminArchivePage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <RequireAdmin>
            <AdminSettingsPage />
          </RequireAdmin>
        }
      />
    </Routes>
  );
}
