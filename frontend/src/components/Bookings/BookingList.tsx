import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  TextField,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Pagination,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  ListItemText,
  Avatar,
  Tooltip,
  Badge,
  Alert,
  Skeleton,
  InputAdornment,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Email as EmailIcon,
  GetApp as GetAppIcon,
  Assignment as AssignmentIcon,
  LocalOffer as LocalOfferIcon,
  ContentCopy as ContentCopyIcon,
  AttachMoney as AttachMoneyIcon,
  CalendarToday as CalendarTodayIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { bookingsService } from '../../services/bookingsService';
import {
  Booking,
  BookingStatus,
  PaymentStatus,
  BookingFilters,
} from '../../types/booking.types';
import { useDebounce } from '../../hooks/useDebounce';

interface BookingListProps {
  embedded?: boolean;
  tourId?: string;
  customerId?: string;
  onBookingSelect?: (booking: Booking) => void;
}

const BookingList: React.FC<BookingListProps> = ({
  embedded = false,
  tourId,
  customerId,
  onBookingSelect,
}) => {
  const navigate = useNavigate();

  // State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState<BookingFilters>({
    tourId,
    customerId,
  });

  // Debounced search
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Load bookings
  useEffect(() => {
    loadBookings();
  }, [page, debouncedSearch, filters, tourId, customerId]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await bookingsService.getBookings(page, pageSize, {
        ...filters,
        search: debouncedSearch || undefined,
        tourId: tourId || filters.tourId,
        customerId: customerId || filters.customerId,
      });

      setBookings(response.bookings);
      setTotalPages(response.totalPages);
      setTotalCount(response.total);
    } catch (error) {
      console.error('Failed to load bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  // Handle booking click
  const handleBookingClick = (booking: Booking) => {
    if (onBookingSelect) {
      onBookingSelect(booking);
    } else {
      navigate(`/bookings/${booking.id}`);
    }
  };

  // Handle select booking
  const handleSelectBooking = (bookingId: string) => {
    setSelectedBookings((prev) =>
      prev.includes(bookingId)
        ? prev.filter((id) => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedBookings.length === bookings.length) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(bookings.map((b) => b.id));
    }
  };

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, booking: Booking) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedBooking(booking);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedBooking(null);
  };

  // Action handlers
  const handleConfirmBooking = async (bookingId: string) => {
    try {
      await bookingsService.confirmBooking(bookingId);
      toast.success('Booking confirmed');
      loadBookings();
    } catch (error) {
      console.error('Failed to confirm booking:', error);
      toast.error('Failed to confirm booking');
    }
    handleMenuClose();
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await bookingsService.cancelBooking({
        bookingId,
        reason: 'Cancelled by operator',
      });
      toast.success('Booking cancelled');
      loadBookings();
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      toast.error('Failed to cancel booking');
    }
    handleMenuClose();
  };

  const handleDeleteBooking = async () => {
    if (!selectedBooking) return;

    try {
      await bookingsService.deleteBooking(selectedBooking.id);
      toast.success('Booking deleted');
      setDeleteConfirmOpen(false);
      loadBookings();
    } catch (error) {
      console.error('Failed to delete booking:', error);
      toast.error('Failed to delete booking');
    }
  };

  const handleResendConfirmation = async (bookingId: string) => {
    try {
      await bookingsService.resendConfirmation(bookingId);
      toast.success('Confirmation email sent');
    } catch (error) {
      console.error('Failed to send confirmation:', error);
      toast.error('Failed to send confirmation');
    }
    handleMenuClose();
  };

  const handleDuplicateBooking = async (bookingId: string) => {
    try {
      const newBooking = await bookingsService.duplicateBooking(bookingId);
      toast.success('Booking duplicated');
      navigate(`/bookings/${newBooking.id}/edit`);
    } catch (error) {
      console.error('Failed to duplicate booking:', error);
      toast.error('Failed to duplicate booking');
    }
    handleMenuClose();
  };

  const handleDownloadInvoice = async (bookingId: string) => {
    try {
      await bookingsService.generateInvoice(bookingId);
      toast.success('Invoice downloaded');
    } catch (error) {
      console.error('Failed to download invoice:', error);
      toast.error('Failed to download invoice');
    }
    handleMenuClose();
  };

  // Bulk actions
  const handleBulkConfirm = async () => {
    try {
      await bookingsService.bulkAction({
        bookingIds: selectedBookings,
        action: 'confirm',
      });
      toast.success(`${selectedBookings.length} booking(s) confirmed`);
      setSelectedBookings([]);
      loadBookings();
    } catch (error) {
      console.error('Failed to bulk confirm:', error);
      toast.error('Failed to confirm bookings');
    }
  };

  const handleBulkCancel = async () => {
    try {
      await bookingsService.bulkAction({
        bookingIds: selectedBookings,
        action: 'cancel',
      });
      toast.success(`${selectedBookings.length} booking(s) cancelled`);
      setSelectedBookings([]);
      loadBookings();
    } catch (error) {
      console.error('Failed to bulk cancel:', error);
      toast.error('Failed to cancel bookings');
    }
  };

  const handleExport = async () => {
    try {
      await bookingsService.exportBookings({
        filters,
        format: 'csv',
      });
      toast.success('Bookings exported');
    } catch (error) {
      console.error('Failed to export bookings:', error);
      toast.error('Failed to export bookings');
    }
  };

  // Get status color
  const getStatusColor = (status: BookingStatus): 'default' | 'primary' | 'success' | 'warning' | 'error' => {
    switch (status) {
      case BookingStatus.CONFIRMED:
      case BookingStatus.PAID:
        return 'success';
      case BookingStatus.PENDING:
        return 'warning';
      case BookingStatus.CANCELLED:
      case BookingStatus.NO_SHOW:
        return 'error';
      case BookingStatus.IN_PROGRESS:
        return 'primary';
      case BookingStatus.COMPLETED:
        return 'success';
      default:
        return 'default';
    }
  };

  // Get payment status color
  const getPaymentStatusColor = (status: PaymentStatus): 'default' | 'success' | 'warning' | 'error' => {
    switch (status) {
      case PaymentStatus.PAID:
        return 'success';
      case PaymentStatus.PENDING:
      case PaymentStatus.PARTIALLY_PAID:
        return 'warning';
      case PaymentStatus.FAILED:
      case PaymentStatus.REFUNDED:
        return 'error';
      default:
        return 'default';
    }
  };

  // Render filter dialog
  const renderFilterDialog = () => (
    <Dialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Filter Bookings</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                multiple
                value={filters.status || []}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as BookingStatus[] })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as BookingStatus[]).map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {Object.values(BookingStatus).map((status) => (
                  <MenuItem key={status} value={status}>
                    <Checkbox checked={(filters.status || []).includes(status)} />
                    <ListItemText primary={status} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Payment Status</InputLabel>
              <Select
                multiple
                value={filters.paymentStatus || []}
                onChange={(e) =>
                  setFilters({ ...filters, paymentStatus: e.target.value as PaymentStatus[] })
                }
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as PaymentStatus[]).map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {Object.values(PaymentStatus).map((status) => (
                  <MenuItem key={status} value={status}>
                    <Checkbox checked={(filters.paymentStatus || []).includes(status)} />
                    <ListItemText primary={status} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={6}>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={6}>
            <TextField
              fullWidth
              type="date"
              label="End Date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={6}>
            <TextField
              fullWidth
              type="number"
              label="Min Amount"
              value={filters.minAmount || ''}
              onChange={(e) => setFilters({ ...filters, minAmount: parseFloat(e.target.value) || undefined })}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
          </Grid>
          
          <Grid item xs={6}>
            <TextField
              fullWidth
              type="number"
              label="Max Amount"
              value={filters.maxAmount || ''}
              onChange={(e) => setFilters({ ...filters, maxAmount: parseFloat(e.target.value) || undefined })}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          setFilters({});
          setFilterDialogOpen(false);
        }}>
          Clear
        </Button>
        <Button onClick={() => setFilterDialogOpen(false)}>Cancel</Button>
        <Button onClick={() => {
          setFilterDialogOpen(false);
          setPage(1);
          loadBookings();
        }} variant="contained">
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Render context menu
  const renderContextMenu = () => (
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
      <MenuItem onClick={() => selectedBooking && handleBookingClick(selectedBooking)}>
        <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
        View Details
      </MenuItem>
      <MenuItem onClick={() => selectedBooking && navigate(`/bookings/${selectedBooking.id}/edit`)}>
        <EditIcon fontSize="small" sx={{ mr: 1 }} />
        Edit
      </MenuItem>
      {selectedBooking?.status === BookingStatus.PENDING && (
        <MenuItem onClick={() => selectedBooking && handleConfirmBooking(selectedBooking.id)}>
          <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
          Confirm
        </MenuItem>
      )}
      {selectedBooking && [BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(selectedBooking.status) && (
        <MenuItem onClick={() => selectedBooking && handleCancelBooking(selectedBooking.id)}>
          <CancelIcon fontSize="small" sx={{ mr: 1 }} />
          Cancel
        </MenuItem>
      )}
      <MenuItem onClick={() => selectedBooking && handleResendConfirmation(selectedBooking.id)}>
        <EmailIcon fontSize="small" sx={{ mr: 1 }} />
        Resend Confirmation
      </MenuItem>
      <MenuItem onClick={() => selectedBooking && handleDuplicateBooking(selectedBooking.id)}>
        <ContentCopyIcon fontSize="small" sx={{ mr: 1 }} />
        Duplicate
      </MenuItem>
      <MenuItem onClick={() => selectedBooking && handleDownloadInvoice(selectedBooking.id)}>
        <GetAppIcon fontSize="small" sx={{ mr: 1 }} />
        Download Invoice
      </MenuItem>
      <MenuItem
        onClick={() => {
          setDeleteConfirmOpen(true);
          handleMenuClose();
        }}
        sx={{ color: 'error.main' }}
      >
        <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
        Delete
      </MenuItem>
    </Menu>
  );

  // Render delete confirmation
  const renderDeleteConfirm = () => (
    <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
      <DialogTitle>Confirm Delete</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete booking {selectedBooking?.bookingNumber}? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
        <Button onClick={handleDeleteBooking} color="error" variant="contained">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      {/* Header */}
      {!embedded && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4">Bookings</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/bookings/new')}
          >
            New Booking
          </Button>
        </Box>
      )}

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search by booking number, customer name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  startIcon={<FilterListIcon />}
                  onClick={() => setFilterDialogOpen(true)}
                  variant="outlined"
                >
                  Filters
                </Button>
                <Button
                  startIcon={<GetAppIcon />}
                  onClick={handleExport}
                  variant="outlined"
                >
                  Export
                </Button>
                
                {selectedBookings.length > 0 && (
                  <>
                    <Button
                      startIcon={<CheckCircleIcon />}
                      onClick={handleBulkConfirm}
                      variant="outlined"
                      color="success"
                    >
                      Confirm ({selectedBookings.length})
                    </Button>
                    <Button
                      startIcon={<CancelIcon />}
                      onClick={handleBulkCancel}
                      variant="outlined"
                      color="error"
                    >
                      Cancel ({selectedBookings.length})
                    </Button>
                  </>
                )}
              </Stack>
            </Grid>
          </Grid>
          
          {/* Active Filters */}
          {(filters.status?.length || filters.paymentStatus?.length) && (
            <Box sx={{ mt: 2 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Typography variant="body2" sx={{ mr: 1, alignSelf: 'center' }}>
                  Active filters:
                </Typography>
                {filters.status?.map((status) => (
                  <Chip
                    key={status}
                    label={status}
                    size="small"
                    onDelete={() =>
                      setFilters({
                        ...filters,
                        status: filters.status?.filter((s) => s !== status),
                      })
                    }
                  />
                ))}
                {filters.paymentStatus?.map((status) => (
                  <Chip
                    key={status}
                    label={status}
                    size="small"
                    onDelete={() =>
                      setFilters({
                        ...filters,
                        paymentStatus: filters.paymentStatus?.filter((s) => s !== status),
                      })
                    }
                  />
                ))}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedBookings.length === bookings.length && bookings.length > 0}
                    indeterminate={selectedBookings.length > 0 && selectedBookings.length < bookings.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Booking #</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Tour</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Participants</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Payment</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 10 }).map((_, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <Box sx={{ py: 4 }}>
                      <AssignmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        No bookings found
                      </Typography>
                      <Typography color="text.secondary">
                        {searchQuery || filters.status?.length
                          ? 'Try adjusting your search or filters'
                          : 'Create your first booking to get started'}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => (
                  <TableRow
                    key={booking.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleBookingClick(booking)}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedBookings.includes(booking.id)}
                        onChange={() => handleSelectBooking(booking.id)}
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {booking.bookingNumber}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(booking.createdAt), 'MMM dd, yyyy')}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {booking.customer.firstName.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2">
                            {booking.customer.firstName} {booking.customer.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {booking.customer.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">{booking.tourTitle}</Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {format(new Date(booking.tourStartDate), 'MMM dd, yyyy')}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        icon={<PersonIcon />}
                        label={booking.totalParticipants}
                        size="small"
                      />
                    </TableCell>
                    
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {booking.pricing.currency} {booking.pricing.total.toFixed(2)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        label={booking.status}
                        color={getStatusColor(booking.status)}
                        size="small"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        icon={<AttachMoneyIcon />}
                        label={booking.paymentStatus}
                        color={getPaymentStatusColor(booking.paymentStatus)}
                        size="small"
                      />
                    </TableCell>
                    
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, booking)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {!loading && totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount} bookings
            </Typography>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}
      </Card>

      {/* Dialogs */}
      {renderFilterDialog()}
      {renderContextMenu()}
      {renderDeleteConfirm()}
    </Box>
  );
};

export default BookingList;
