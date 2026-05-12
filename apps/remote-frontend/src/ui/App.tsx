import { useMemo, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import RemoteLeaderboardPage from '../pages/RemoteLeaderboardPage';
import { LoginScreen } from './LoginScreen';
import { RemoteAdminShell } from './RemoteAdminShell';

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

  const [authed, setAuthed] = useState(() => Boolean(sessionStorage.getItem('remoteAdminToken')));

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/leaderboard" element={<RemoteLeaderboardPage />} />
        <Route
          path="*"
          element={authed ? <RemoteAdminShell /> : <LoginScreen onLoggedIn={() => setAuthed(true)} />}
        />
      </Routes>
    </ThemeProvider>
  );
}
