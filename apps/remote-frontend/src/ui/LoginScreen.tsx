import { useState } from 'react';
import { Box, Button, Paper, TextField, Typography } from '@mui/material';
import { api } from '../api/client';

export function LoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.login(pin);
      onLoggedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: '#0d0d0d',
      }}
    >
      <Paper sx={{ width: 'min(420px, 100%)', p: 3, border: '1px solid #333', bgcolor: '#1a1a1a' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff' }}>
          REMOTE ADMINISTRATOR
        </Typography>
        <Typography sx={{ mt: 1, color: '#aaa' }}>Введите PIN администратора</Typography>
        <Box
          component="form"
          autoComplete="off"
          onSubmit={submit}
          sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <TextField
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            type="password"
            inputMode="numeric"
            label="PIN"
            fullWidth
            autoFocus
            inputProps={{
              autoComplete: 'new-password',
              name: 'trc_remote_panel_pin_v1',
            }}
          />
          {error ? (
            <Typography sx={{ color: '#f85149', fontSize: 14 }}>
              {error}
            </Typography>
          ) : null}
          <Button type="submit" variant="contained" disabled={loading || pin.length < 4} sx={{ py: 1.4, fontWeight: 800 }}>
            {loading ? '...' : 'Войти'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

