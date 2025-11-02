import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  Button,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  SelectChangeEvent,
  Grid,
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Receipt as ReceiptIcon,
  Refresh as RefreshIcon,
  FileDownload as ExportIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Undo as RefundIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import apiClient from '../../services/apiClient';
import {
  Payment,
  PaymentStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentFilters,
} from '../../types/payment.types';

// ============================================================================
// Props Interface
// ============================================================================

interface PaymentHistoryProps {
  customerId?: string;
  bookingId?: string;
  limit?: number;
}

// ============================================================================
// Component
// ============================================================================

const PaymentHistory: React.FC<PaymentHistoryProps> = ({ customerId, bookingId, limit }) => {
  const navigate = useNavigate();

  // ==========================================================================
  // State Management
  // ==========================================================================

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(limit || 20);
  const [totalCount, setTotalCount] = useState(0);

  // Search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<PaymentFilters>({
    customerId,
    bookingId,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuPaymentId, setMenuPaymentId] = useState<string | null>(null);

  // ==========================================================================
  // Debounced Search
  // ==========================================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ==========================================================================
  // Fetch Payments
  // ==========================================================================

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/api/payments', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search: debouncedSearch || undefined,
          ...filters,
        },
      });

      setPayments(response.data.payments || []);
      setTotalCount(response.data.total || 0);
    } catch (err: any) {
      console.error('Error fetching payments:', err);
      setError(err.message || 'Failed to load payments');
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, rowsPerPage, debouncedSearch, filters]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, paymentId: string) => {
    setAnchorEl(event.currentTarget);
    setMenuPaymentId(paymentId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuPaymentId(null);
  };

  const handleViewDetails = () => {
    if (menuPaymentId) {
      navigate(`/payments/${menuPaymentId}`);
    }
    handleMenuClose();
  };

  const handleInitiateRefund = () => {
    if (menuPaymentId) {
      navigate(`/payments/${menuPaymentId}/refund`);
    }
    handleMenuClose();
  };

  const handleFilterChange = (key: keyof PaymentFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPage(0);
  };

  const handleMultiSelectChange = (event: SelectChangeEvent<string[]>, key: keyof PaymentFilters) => {
    const value = event.target.value;
    handleFilterChange(key, typeof value === 'string' ? value.split(',') : value);
  };

  const handleClearFilters = () => {
    setFilters({
      customerId,
      bookingId,
    });
    setSearchQuery('');
    setPage(0);
  };

  // ==========================================================================
  // Utility Functions
  // ==========================================================================

  const getStatusColor = (status: PaymentStatus): "default" | "primary" | "success" | "error" | "warning" => {
    switch (status) {
      case PaymentStatus.COMPLETED: return 'success';
      case PaymentStatus.PENDING: return 'warning';
      case PaymentStatus.PROCESSING: return 'primary';
      case PaymentStatus.FAILED: return 'error';
      case PaymentStatus.CANCELLED: return 'default';
      case PaymentStatus.REFUNDED: return 'error';
      case PaymentStatus.PARTIALLY_REFUNDED: return 'warning';
      default: return 'default';
    }
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Payment History</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchPayments}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Search & Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              placeholder="Search payments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              variant={showFilters ? 'contained' : 'outlined'}
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
              fullWidth
            >
              Filters
            </Button>
          </Grid>
        </Grid>

        {/* Advanced Filters */}
        {showFilters && (
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    multiple
                    value={filters.status || []}
                    onChange={(e) => handleMultiSelectChange(e, 'status')}
                    input={<OutlinedInput label="Status" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {Object.values(PaymentStatus).map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Method</InputLabel>
                  <Select
                    multiple
                    value={filters.method || []}
                    onChange={(e) => handleMultiSelectChange(e, 'method')}
                    input={<OutlinedInput label="Method" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {Object.values(PaymentMethod).map((method) => (
                      <MenuItem key={method} value={method}>
                        {method.replace('_', ' ').toUpperCase()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleClearFilters}
                  startIcon={<ClearIcon />}
                >
                  Clear Filters
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Payment ID</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                  <ReceiptIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No payments found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {payment.paymentNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {format(new Date(payment.createdAt), 'MMM dd, yyyy')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(payment.createdAt), 'HH:mm')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: payment.currency,
                      }).format(payment.amount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={payment.method.replace('_', ' ')}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={payment.status}
                      color={getStatusColor(payment.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {payment.description}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, payment.id)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </TableContainer>

      {/* Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleViewDetails}>
          <ReceiptIcon sx={{ mr: 1 }} /> View Details
        </MenuItem>
        <MenuItem onClick={handleInitiateRefund}>
          <RefundIcon sx={{ mr: 1 }} /> Initiate Refund
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default PaymentHistory;
