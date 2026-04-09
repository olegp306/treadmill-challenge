import { Routes, Route, Navigate } from 'react-router-dom';
import WelcomePage from '../pages/WelcomePage';
import RegistrationPage from '../pages/RegistrationPage';
import StartRunningPage from '../pages/StartRunningPage';
import LeaderboardPage from '../pages/LeaderboardPage';
import ResultPage from '../pages/ResultPage';
import ArOzioIpadPage from '../pages/ArOzioIpadPage';
import ParticipateLayout from '../pages/participate/ParticipateLayout';
import ParticipateStep1Page from '../pages/participate/ParticipateStep1Page';
import ParticipateStep2Page from '../pages/participate/ParticipateStep2Page';
import ParticipateStep3Page from '../pages/participate/ParticipateStep3Page';
import ParticipateStep4Page from '../pages/participate/ParticipateStep4Page';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ArOzioIpadPage />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/register" element={<RegistrationPage />} />
      <Route path="/start" element={<StartRunningPage />} />
      <Route path="/participate" element={<ParticipateLayout />}>
        <Route index element={<Navigate to="1" replace />} />
        <Route path="1" element={<ParticipateStep1Page />} />
        <Route path="2" element={<ParticipateStep2Page />} />
        <Route path="3" element={<ParticipateStep3Page />} />
        <Route path="4" element={<ParticipateStep4Page />} />
      </Route>
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/result" element={<ResultPage />} />
    </Routes>
  );
}
