import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Avatar,
  Typography,
  Button,
  Menu,
  MenuItem,
  Checkbox,
  Toolbar,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  SelectChangeEvent,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  FileDownload as ExportIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  Star as StarIcon,
  LocalOffer as TagIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import customersService from '../../services/customersService';
import {
  Customer,
  CustomerFilters,
  CustomerStatus,
  CustomerTier,
  CustomerSource,
} from '../../types/customer.types';

// ============================================================================
// Component
// ============================================================================

const CustomerList: React.FC = () => {
  const navigate = useNavigate();

  // ==========================================================================
  // State Management
  // ==========================================================================

  // Data state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Search & filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<CustomerFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Selection state
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);

  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuCustomerId, setMenuCustomerId] = useState<string | null>(null);

  // Bulk actions state
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // ==========================================================================
  // Debounced Search Effect
  // ==========================================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ==========================================================================
  // Fetch Customers
  // ==========================================================================

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const activeFilters: CustomerFilters = {
        ...filters,
        search: debouncedSearch || undefined,
      };

      const response = await customersService.getCustomers(
        page + 1,
        rowsPerPage,
        activeFilters
      );

      setCustomers(response.customers);
      setTotalCount(response.total);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      setError(err.message || 'Failed to load customers');
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, debouncedSearch, filters]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // ==========================================================================
  // Handlers - Navigation
  // ==========================================================================

  const handleViewCustomer = (customerId: string) => {
    navigate(`/customers/${customerId}`);
  };

  const handleEditCustomer = (customerId: string) => {
    navigate(`/customers/${customerId}/edit`);
  };

  const handleCreateCustomer = () => {
    navigate('/customers/new');
  };

  // ==========================================================================
  // Handlers - Menu
  // ==========================================================================

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, customerId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setMenuCustomerId(customerId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuCustomerId(null);
  };

  // ==========================================================================
  // Handlers - Delete
  // ==========================================================================

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;

    try {
      await customersService.deleteCustomer(customerToDelete.id);
      toast.success('Customer deleted successfully');
      fetchCustomers();
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    } catch (err: any) {
      console.error('Error deleting customer:', err);
      toast.error(err.message || 'Failed to delete customer');
    }
  };

  // ==========================================================================
  // Handlers - Selection
  // ==========================================================================

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedCustomers(customers.map((c) => c.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleSelectOne = (customerId: string) => {
    setSelectedCustomers((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]
    );
  };

  // ==========================================================================
  // Handlers - Bulk Actions
  // ==========================================================================

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedCustomers.length} customers?`)) return;

    try {
      setBulkActionLoading(true);
      await customersService.bulkDelete(selectedCustomers);
      toast.success(`${selectedCustomers.length} customers deleted`);
      setSelectedCustomers([]);
      fetchCustomers();
    } catch (err: any) {
      console.error('Error bulk deleting:', err);
      toast.error('Failed to delete customers');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkChangeStatus = async (status: CustomerStatus) => {
    try {
      setBulkActionLoading(true);
      await customersService.bulkChangeStatus(selectedCustomers, status);
      toast.success(`Status updated for ${selectedCustomers.length} customers`);
      setSelectedCustomers([]);
      fetchCustomers();
    } catch (err: any) {
      console.error('Error bulk status change:', err);
      toast.error('Failed to update status');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkExport = async () => {
    try {
      setBulkActionLoading(true);
      const blob = await customersService.exportCustomers({
        format: 'csv',
        fields: ['firstName', 'lastName', 'email', 'phone', 'status', 'tier', 'totalSpent'],
        filters: { ...filters, search: debouncedSearch || undefined },
      });
      
      const filename = `customers_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      customersService.downloadCustomerExport(blob, filename);
      toast.success('Customers exported successfully');
    } catch (err: any) {
      console.error('Error exporting:', err);
      toast.error('Failed to export customers');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // ==========================================================================
  // Handlers - Filters
  // ==========================================================================

  const handleFilterChange = (key: keyof CustomerFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPage(0); // Reset to first page
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setPage(0);
  };

  const handleMultiSelectChange = (
    event: SelectChangeEvent<string[]>,
    key: keyof CustomerFilters
  ) => {
    const value = event.target.value;
    handleFilterChange(key, typeof value === 'string' ? value.split(',') : value);
  };

  // ==========================================================================
  // Handlers - Pagination
  // ==========================================================================

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // ==========================================================================
  // Utility Functions
  // ==========================================================================

  const getStatusColor = (status: CustomerStatus): "default" | "primary" | "success" | "error" | "warning" => {
    switch (status) {
      case CustomerStatus.ACTIVE: return 'success';
      case CustomerStatus.VIP: return 'primary';
      case CustomerStatus.INACTIVE: return 'default';
      case CustomerStatus.BLOCKED: return 'error';
      case CustomerStatus.PENDING: return 'warning';
      default: return 'default';
    }
  };

  const getTierColor = (tier: CustomerTier): "default" | "primary" | "secondary" | "warning" | "info" => {
    switch (tier) {
      case CustomerTier.DIAMOND: return 'primary';
      case CustomerTier.PLATINUM: return 'secondary';
      case CustomerTier.GOLD: return 'warning';
      case CustomerTier.SILVER: return 'info';
      case CustomerTier.BRONZE: return 'default';
      default: return 'default';
    }
  };

  const isAllSelected = customers.length > 0 && selectedCustomers.length === customers.length;
  const isSomeSelected = selectedCustomers.length > 0 && selectedCustomers.length < customers.length;

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Customers
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateCustomer}
        >
          Add Customer
        </Button>
      </Box>

      {/* Search & Filters Bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search customers (name, email, phone, customer #)..."
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
          <Grid item xs={12} md={6} sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              variant={showFilters ? 'contained' : 'outlined'}
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchCustomers}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={handleBulkExport}
              disabled={bulkActionLoading}
            >
              Export
            </Button>
          </Grid>
        </Grid>

        {/* Advanced Filters */}
        {showFilters && (
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
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
                    {Object.values(CustomerStatus).map((status) => (
                      <MenuItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tier</InputLabel>
                  <Select
                    multiple
                    value={filters.tier || []}
                    onChange={(e) => handleMultiSelectChange(e, 'tier')}
                    input={<OutlinedInput label="Tier" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {Object.values(CustomerTier).map((tier) => (
                      <MenuItem key={tier} value={tier}>
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Source</InputLabel>
                  <Select
                    multiple
                    value={filters.source || []}
                    onChange={(e) => handleMultiSelectChange(e, 'source')}
                    input={<OutlinedInput label="Source" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {Object.values(CustomerSource).map((source) => (
                      <MenuItem key={source} value={source}>
                        {source.replace('_', ' ').toUpperCase()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
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

      {/* Bulk Actions Toolbar */}
      {selectedCustomers.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <Toolbar disableGutters>
            <Typography variant="subtitle1" sx={{ flex: '1 1 100%' }}>
              {selectedCustomers.length} selected
            </Typography>
            <Button
              variant="contained"
              color="success"
              onClick={() => handleBulkChangeStatus(CustomerStatus.ACTIVE)}
              disabled={bulkActionLoading}
              sx={{ mr: 1 }}
            >
              Activate
            </Button>
            <Button
              variant="contained"
              color="warning"
              onClick={() => handleBulkChangeStatus(CustomerStatus.INACTIVE)}
              disabled={bulkActionLoading}
              sx={{ mr: 1 }}
            >
              Deactivate
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleBulkDelete}
              disabled={bulkActionLoading}
            >
              Delete
            </Button>
          </Toolbar>
        </Paper>
      )}

      {/* Error State */}
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
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={isSomeSelected}
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Tier</TableCell>
              <TableCell>Total Spent</TableCell>
              <TableCell>Bookings</TableCell>
              <TableCell>Member Since</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                  <PersonIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No customers found
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreateCustomer}
                    sx={{ mt: 2 }}
                  >
                    Add First Customer
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow
                  key={customer.id}
                  hover
                  onClick={() => handleViewCustomer(customer.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedCustomers.includes(customer.id)}
                      onChange={() => handleSelectOne(customer.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar>{customer.firstName.charAt(0)}{customer.lastName.charAt(0)}</Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {customer.fullName}
                          {customer.status === CustomerStatus.VIP && (
                            <StarIcon sx={{ ml: 0.5, fontSize: 16, color: 'gold', verticalAlign: 'middle' }} />
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {customer.customerNumber}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <EmailIcon fontSize="small" />
                        {customer.email}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PhoneIcon fontSize="small" />
                        {customer.phone}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={customer.status}
                      color={getStatusColor(customer.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={customer.tier}
                      color={getTierColor(customer.tier)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      ${customer.totalSpent.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {customer.stats.totalBookings} total
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {customer.stats.completedBookings} completed
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {format(new Date(customer.memberSince), 'MMM dd, yyyy')}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, customer.id)}
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
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </TableContainer>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => menuCustomerId && handleViewCustomer(menuCustomerId)}>
          <PersonIcon sx={{ mr: 1 }} /> View Details
        </MenuItem>
        <MenuItem onClick={() => menuCustomerId && handleEditCustomer(menuCustomerId)}>
          <EditIcon sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuCustomerId) {
              const customer = customers.find((c) => c.id === menuCustomerId);
              if (customer) handleDeleteClick(customer);
            }
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Customer</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{customerToDelete?.fullName}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerList;
