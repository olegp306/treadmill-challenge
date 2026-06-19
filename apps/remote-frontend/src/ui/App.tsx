import { useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import RemoteLeaderboardLandingPage from '../pages/RemoteLeaderboardLandingPage';
import RemoteLeaderboardPage from '../pages/RemoteLeaderboardPage';
import { LoginScreen } from './LoginScreen';
import { RemoteAdminShell } from './RemoteAdminShell';

function RemoteAdminGate() {
  const [authed, setAuthed] = useState(() => Boolean(sessionStorage.getItem('remoteAdminToken')));
  return authed ? <RemoteAdminShell /> : <LoginScreen onLoggedIn={() => setAuthed(true)} />;
}

export default function App() {
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'dark',
          background: { default: '#0d0d0d', paper: '#161616' },
          primary: { main: '#e6233a' },
        },
        shape: { borderRadius: 12 },
      }),
    []
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<RemoteLeaderboardPage />} />
        <Route path="/leaderboard" element={<RemoteLeaderboardPage />} />
        <Route path="/leaderboard2" element={<RemoteLeaderboardLandingPage />} />
        <Route path="/admin" element={<RemoteAdminGate />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}
