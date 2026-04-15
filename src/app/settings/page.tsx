'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';

/**
 * Settings page: view and override Stripe API keys (masked). Save / Reset to default.
 */
export default function SettingsPage() {
  const [publishableKey, setPublishableKey] = React.useState('');
  const [secretKey, setSecretKey] = React.useState('');
  const [maskedPublishable, setMaskedPublishable] = React.useState('');
  const [maskedSecret, setMaskedSecret] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const loadSettings = React.useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load settings');
      const d = json.data || {};
      setMaskedPublishable(d.publishableKey ?? '');
      setMaskedSecret(d.secretKeyMasked ?? '');
      setPublishableKey('');
      setSecretKey('');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings');
    }
  }, []);

  React.useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publishableKey: publishableKey.trim() || undefined,
          secretKey: secretKey.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      const d = json.data || {};
      setMaskedPublishable(d.publishableKey ?? '');
      setMaskedSecret(d.secretKeyMasked ?? '');
      setPublishableKey('');
      setSecretKey('');
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    }
  };

  const handleReset = async () => {
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to reset');
      const d = json.data || {};
      setMaskedPublishable(d.publishableKey ?? '');
      setMaskedSecret(d.secretKeyMasked ?? '');
      setPublishableKey('');
      setSecretKey('');
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset');
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 560, mx: 'auto' }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link component={NextLink} href="/" underline="hover" color="inherit">
          Home
        </Link>
        <Typography color="text.primary">API Key Settings</Typography>
      </Breadcrumbs>
      <Typography variant="h5" gutterBottom>API Key Settings</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Current keys (from .env or override) are shown masked. Enter new values to override for this session.
      </Typography>

      <TextField
        fullWidth
        label="Current Publishable Key (masked)"
        value={maskedPublishable}
        InputProps={{ readOnly: true }}
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        label="Publishable Key (override)"
        value={publishableKey}
        onChange={(e) => setPublishableKey(e.target.value)}
        placeholder="pk_test_..."
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Current Secret Key (masked)"
        value={maskedSecret}
        InputProps={{ readOnly: true }}
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        label="Secret Key (override)"
        type="password"
        value={secretKey}
        onChange={(e) => setSecretKey(e.target.value)}
        placeholder="sk_test_..."
        helperText="Only last 4 characters are shown when saved. Never expose the full secret key."
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button variant="contained" onClick={handleSave}>Save</Button>
        <Button variant="outlined" onClick={handleReset}>Reset to Default</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success">Settings updated.</Alert>}
    </Box>
  );
}
