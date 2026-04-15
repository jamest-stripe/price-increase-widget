'use client';

import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import NextLink from 'next/link';

const routes = [
  {
    path: '/',
    label: 'Home',
    description: 'Index of all routes in this app. Use the tabs to see descriptions and links to each page.',
  },
  {
    path: '/subscription',
    label: 'Price Increase Widget',
    description:
      'Search Stripe subscriptions by product, price, status, and type (standalone or bundle). Select subscriptions and schedule a price increase with a percentage or dollar amount and an effective date. Converts subscriptions to subscription schedules and adds a new phase with the updated price.',
  },
  {
    path: '/settings',
    label: 'API Key Settings',
    description:
      'View and override Stripe API keys (publishable and secret). Keys are masked for security. Overrides apply for the app session; reset to use values from .env.',
  },
];

/**
 * Homepage: vertical tabs listing routes with descriptions and links.
 */
export default function HomePage() {
  const [value, setValue] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleLoadTestData = async () => {
    setLoading(true);
    setSnackbar((p) => ({ ...p, open: false }));
    try {
      const res = await fetch('/api/test-data', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load test data');
      setSnackbar({ open: true, message: json.data?.message ?? 'Test data loaded.', severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: e instanceof Error ? e.message : 'Failed to load test data', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTestData = async () => {
    setRemoving(true);
    setSnackbar((p) => ({ ...p, open: false }));
    try {
      const res = await fetch('/api/test-data', { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to remove test data');
      setSnackbar({ open: true, message: json.data?.message ?? 'Test data removed.', severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: e instanceof Error ? e.message : 'Failed to remove test data', severity: 'error' });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ px: 3, py: 2 }}>
        <Typography color="text.primary">Home</Typography>
      </Breadcrumbs>
      <Box sx={{ display: 'flex', flex: 1 }}>
      <Tabs
        orientation="vertical"
        value={value}
        onChange={handleChange}
        sx={{
          borderRight: 1,
          borderColor: 'divider',
          minWidth: 280,
          pt: 2,
        }}
      >
        {routes.map((r, i) => (
          <Tab
            key={r.path}
            label={r.label}
            component={NextLink}
            href={r.path}
            id={`vertical-tab-${i}`}
            aria-controls={`vertical-tabpanel-${i}`}
          />
        ))}
      </Tabs>
      <Box
        role="tabpanel"
        id={`vertical-tabpanel-${value}`}
        aria-labelledby={`vertical-tab-${value}`}
        sx={{
          flex: 1,
          p: 3,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Typography variant="h5" gutterBottom>
          {routes[value].label}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {routes[value].description}
        </Typography>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={handleLoadTestData}
            disabled={loading || removing}
            size="medium"
          >
            {loading ? 'Loading…' : 'Load testing data'}
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleRemoveTestData}
            disabled={loading || removing}
            size="medium"
          >
            {removing ? 'Removing…' : 'Remove testing data'}
          </Button>
        </Box>
        <Link component={NextLink} href={routes[value].path} variant="body1">
          Open {routes[value].label} →
        </Link>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar((p) => ({ ...p, open: false }))}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
      </Box>
    </Box>
  );
}
