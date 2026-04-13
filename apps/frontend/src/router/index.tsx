import { Routes, Route } from 'react-router-dom';
import WelcomePage from '../pages/WelcomePage';
import RegistrationPage from '../pages/RegistrationPage';
import StartRunningPage from '../pages/StartRunningPage';
import LeaderboardPage from '../pages/LeaderboardPage';
import ResultPage from '../pages/ResultPage';
import Main from '../pages/Main';
import RunSelectionPage from '../pages/RunSelectionPage';
import RunWaitingPage from '../pages/RunWaitingPage';

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
      <Route path="/run/waiting" element={<RunWaitingPage />} />
    </Routes>
  );
}
