import { Routes, Route } from 'react-router-dom';
import WelcomePage from '../pages/WelcomePage';
import RegistrationPage from '../pages/RegistrationPage';
import StartRunningPage from '../pages/StartRunningPage';
import LeaderboardPage from '../pages/LeaderboardPage';
import ResultPage from '../pages/ResultPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/register" element={<RegistrationPage />} />
      <Route path="/start" element={<StartRunningPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/result" element={<ResultPage />} />
    </Routes>
  );
}
