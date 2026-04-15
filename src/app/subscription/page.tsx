'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import Autocomplete from '@mui/material/Autocomplete';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import type { ProductOption, PriceOption, SubscriptionWithCustomer } from '@/types';

const STATUS_OPTIONS = ['active', 'past_due', 'canceled', 'trialing', 'all'];
const STANDALONE_OPTIONS = ['Standalone', 'Bundle', 'All'];

function formatDate(ts: number | undefined | null): string {
  if (ts == null || typeof ts !== 'number' || !Number.isFinite(ts)) return '';
  const d = new Date(ts * 1000);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

/**
 * Price Increase Widget: search, select, and schedule price increases.
 */
export default function SubscriptionPage() {
  const [productOptions, setProductOptions] = React.useState<ProductOption[]>([]);
  const [priceOptions, setPriceOptions] = React.useState<PriceOption[]>([]);
  const [productValue, setProductValue] = React.useState<ProductOption | null>(null);
  const [priceValue, setPriceValue] = React.useState<PriceOption | null>(null);
  const [status, setStatus] = React.useState<string>('active');
  const [standaloneOrBundle, setStandaloneOrBundle] = React.useState<string>('Standalone');
  const [loadingProducts, setLoadingProducts] = React.useState(false);
  const [loadingPrices, setLoadingPrices] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const [submissions, setSubmissions] = React.useState<SubscriptionWithCustomer[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [priceIncreasePercent, setPriceIncreasePercent] = React.useState<string>('');
  const [priceIncreaseDollar, setPriceIncreaseDollar] = React.useState<string>('');
  const [effectiveDate, setEffectiveDate] = React.useState<Dayjs | null>(null);
  const [snackbar, setSnackbar] = React.useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const productPriceIds = React.useMemo(() => {
    if (!productValue) return [];
    return priceOptions.filter((p) => true).map((p) => p.id);
  }, [productValue, priceOptions]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProducts(true);
      try {
        const res = await fetch('/api/products');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load products');
        if (!cancelled) setProductOptions(json.data || []);
      } catch (e) {
        if (!cancelled) setSnackbar({ open: true, message: String(e), severity: 'error' });
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPrices(true);
      try {
        const url = productValue
          ? `/api/prices?product=${encodeURIComponent(productValue.id)}`
          : '/api/prices';
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load prices');
        if (!cancelled) setPriceOptions(json.data || []);
        if (!cancelled && productValue) setPriceValue(null);
      } catch (e) {
        if (!cancelled) setSnackbar({ open: true, message: String(e), severity: 'error' });
      } finally {
        if (!cancelled) setLoadingPrices(false);
      }
    })();
    return () => { cancelled = true; };
  }, [productValue]);

  const handleSearch = async () => {
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      if (priceValue) params.set('price', priceValue.id);
      const res = await fetch(`/api/subscriptions?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load subscriptions');
      let list: SubscriptionWithCustomer[] = json.data || [];

      if (productValue && productPriceIds.length > 0) {
        list = list.filter((s) =>
          s.items.data.some((i) => productPriceIds.includes(typeof i.price === 'object' ? i.price.id : i.price))
        );
      }

      if (standaloneOrBundle === 'Standalone') {
        list = list.filter((s) => s.items.data.length === 1);
      } else if (standaloneOrBundle === 'Bundle') {
        list = list.filter((s) => s.items.data.length >= 2);
      }

      setSubmissions(list);
      setSelectedIds(new Set());
    } catch (e) {
      setSnackbar({ open: true, message: String(e), severity: 'error' });
    } finally {
      setSearching(false);
    }
  };

  const handlePercentChange = (v: string) => {
    setPriceIncreasePercent(v);
    if (v) setPriceIncreaseDollar('');
  };
  const handleDollarChange = (v: string) => {
    setPriceIncreaseDollar(v);
    if (v) setPriceIncreasePercent('');
  };

  const canSubmit =
    selectedIds.size > 0 &&
    (Boolean(priceIncreasePercent) !== Boolean(priceIncreaseDollar)) &&
    effectiveDate != null &&
    effectiveDate.isAfter(dayjs(), 'day');

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const increaseType = priceIncreasePercent ? 'percent' : 'dollar';
    const increaseValue = priceIncreasePercent ? parseFloat(priceIncreasePercent) : parseFloat(priceIncreaseDollar);
    if (isNaN(increaseValue)) return;
    const effectiveDateStr = effectiveDate!.format('YYYY-MM-DD');
    const priceId = priceValue?.id || (submissions.length === 1 && submissions[0].items.data.length === 1
      ? (submissions[0].items.data[0].price as { id: string }).id
      : undefined);

    try {
      const res = await fetch('/api/subscriptions/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionIds: Array.from(selectedIds),
          increaseType,
          increaseValue,
          effectiveDate: effectiveDateStr,
          ...(priceId && { priceId }),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Schedule request failed');
      const results: { id: string; success: boolean; error?: string }[] = json.data || [];
      for (const r of results) {
        if (r.success) {
          setSnackbar({ open: true, message: `Scheduled price increase for ${r.id}`, severity: 'success' });
        } else {
          setSnackbar({ open: true, message: `${r.id}: ${r.error}`, severity: 'error' });
        }
      }
      if (results.every((r) => r.success)) {
        setSelectedIds(new Set());
        setPriceIncreasePercent('');
        setPriceIncreaseDollar('');
        setEffectiveDate(null);
      }
    } catch (e) {
      setSnackbar({ open: true, message: String(e), severity: 'error' });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === submissions.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(submissions.map((s) => s.id)));
  };

  const customerName = (s: SubscriptionWithCustomer) => {
    const c = s.customer;
    if (typeof c === 'object' && c && 'name' in c) return (c as { name?: string | null }).name ?? '—';
    return '—';
  };
  const customerId = (s: SubscriptionWithCustomer) => {
    const c = s.customer;
    if (typeof c === 'object' && c && 'id' in c) return (c as { id: string }).id;
    return String(c);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 2, maxWidth: 1200, mx: 'auto' }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link component={NextLink} href="/" underline="hover" color="inherit">
            Home
          </Link>
          <Typography color="text.primary">Price Increase Widget</Typography>
        </Breadcrumbs>
        <Typography component="h1" variant="h4" sx={{ mb: 2 }}>Price Increase Widget</Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'center' }}>
          <Autocomplete
            sx={{ minWidth: 220 }}
            options={productOptions}
            getOptionLabel={(o) => `${o.name} (${o.id})`}
            value={productValue}
            onChange={(_, v) => setProductValue(v)}
            loading={loadingProducts}
            renderInput={(params) => <TextField {...params} label="Search by Product" />}
          />
          <Autocomplete
            sx={{ minWidth: 220 }}
            options={priceOptions}
            getOptionLabel={(o) => o.nickname || `${o.unit_amount != null ? o.unit_amount / 100 : 0} ${o.currency}`}
            value={priceValue}
            onChange={(_, v) => setPriceValue(v)}
            loading={loadingPrices}
            renderInput={(params) => <TextField {...params} label="Search by Price" />}
          />
          <FormControl sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((o) => (
                <MenuItem key={o} value={o}>{o}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 140 }}>
            <InputLabel>Standalone or Bundle</InputLabel>
            <Select value={standaloneOrBundle} label="Standalone or Bundle" onChange={(e) => setStandaloneOrBundle(e.target.value)}>
              {STANDALONE_OPTIONS.map((o) => (
                <MenuItem key={o} value={o}>{o}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={handleSearch} disabled={searching}>Search</Button>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'center' }}>
          <TextField
            label="Price Increase %"
            type="number"
            value={priceIncreasePercent}
            onChange={(e) => handlePercentChange(e.target.value)}
            disabled={Boolean(priceIncreaseDollar)}
            inputProps={{ min: 0, step: 0.01 }}
            sx={{ width: 140 }}
          />
          <TextField
            label="Price Increase $"
            type="number"
            value={priceIncreaseDollar}
            onChange={(e) => handleDollarChange(e.target.value)}
            disabled={Boolean(priceIncreasePercent)}
            inputProps={{ min: 0, step: 0.01 }}
            sx={{ width: 140 }}
          />
          <DatePicker
            label="Effective Date"
            value={effectiveDate}
            onChange={(d) => setEffectiveDate(d)}
            minDate={dayjs().add(1, 'day')}
            slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
          />
          <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>Submit</Button>
        </Box>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedIds.size > 0 && selectedIds.size < submissions.length}
                    checked={submissions.length > 0 && selectedIds.size === submissions.length}
                    onChange={toggleSelectAll}
                  />
                </TableCell>
                <TableCell>Customer Name</TableCell>
                <TableCell>Customer ID</TableCell>
                <TableCell>Subscription ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Line Items</TableCell>
                <TableCell>Price increase schedule</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {submissions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} />
                  </TableCell>
                  <TableCell>{customerName(s)}</TableCell>
                  <TableCell>{customerId(s)}</TableCell>
                  <TableCell>{s.id}</TableCell>
                  <TableCell>{s.status}</TableCell>
                  <TableCell>{formatDate(s.start_date)}</TableCell>
                  <TableCell>{formatDate(s.current_period_end)}</TableCell>
                  <TableCell>{s.items.data.length}</TableCell>
                  <TableCell>
                    {s.metadata?.price_increase_date ? (
                      <Typography component="span" sx={{ color: 'success.main', fontSize: '1.25rem' }} aria-label="Price increase scheduled" title={`Scheduled ${s.metadata.price_increase_date}`}>
                        ✓
                      </Typography>
                    ) : (
                      ''
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {submissions.length === 0 && !searching && (
          <Alert severity="info" sx={{ mt: 2 }}>Run a search to see subscriptions.</Alert>
        )}

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
    </LocalizationProvider>
  );
}
