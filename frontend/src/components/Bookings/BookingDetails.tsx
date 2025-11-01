import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  Chip,
  Stack,
  Divider,
  Paper,
  Avatar,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Badge,
  LinearProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AttachMoney as AttachMoneyIcon,
  Person as PersonIcon,
  CalendarToday as CalendarTodayIcon,
  LocationOn as LocationOnIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  GetApp as GetAppIcon,
  Send as SendIcon,
  LocalOffer as LocalOfferIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Restaurant as RestaurantIcon,
  Note as NoteIcon,
  History as HistoryIcon,
  Assignment as AssignmentIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { bookingsService } from '../../services/bookingsService';
import { Booking, BookingStatus, PaymentStatus } from '../../types/booking.types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const BookingDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [note, setNote] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');

  // Load booking
  useEffect(() => {
    if (id) {
      loadBooking();
    }
  }, [id]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      const data = await bookingsService.getBooking(id!);
      setBooking(data);
    } catch (error) {
      console.error('Failed to load booking:', error);
      toast.error('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  // Actions
  const handleConfirm = async () => {
    try {
      await bookingsService.confirmBooking(id!);
      toast.success('Booking confirmed');
      loadBooking();
    } catch (error) {
      console.error('Failed to confirm booking:', error);
      toast.error('Failed to confirm booking');
    }
  };

  const handleCancel = async () => {
    try {
      await bookingsService.cancelBooking({
        bookingId: id!,
        reason: cancellationReason,
      });
      toast.success('Booking cancelled');
      setCancelDialogOpen(false);
      loadBooking();
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      toast.error('Failed to cancel booking');
    }
  };

  const handleAddNote = async () => {
    try {
      await bookingsService.addNote(id!, note);
      toast.success('Note added');
      setNoteDialogOpen(false);
      setNote('');
      loadBooking();
    } catch (error) {
      console.error('Failed to add note:', error);
      toast.error('Failed to add note');
    }
  };

  const handleResendConfirmation = async () => {
    try {
      await bookingsService.resendConfirmation(id!);
      toast.success('Confirmation email sent');
    } catch (error) {
      console.error('Failed to send confirmation:', error);
      toast.error('Failed to send confirmation');
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      await bookingsService.generateInvoice(id!);
      toast.success('Invoice downloaded');
    } catch (error) {
      console.error('Failed to download invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  const handleDownloadVoucher = async () => {
    try {
      await bookingsService.generateVoucher(id!);
      toast.success('Voucher downloaded');
    } catch (error) {
      console.error('Failed to download voucher:', error);
      toast.error('Failed to download voucher');
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
      default:
        return 'default';
    }
  };

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

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (!booking) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">Booking not found</Typography>
      </Box>
    );
  }

  // Calculate payment progress
  const paidAmount = booking.payments.reduce((sum, p) => sum + p.amount, 0);
  const paymentProgress = (paidAmount / booking.pricing.total) * 100;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Booking #{booking.bookingNumber}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip
              label={booking.status}
              color={getStatusColor(booking.status)}
              icon={<CheckCircleIcon />}
            />
            <Chip
              label={booking.paymentStatus}
              color={getPaymentStatusColor(booking.paymentStatus)}
              icon={<AttachMoneyIcon />}
            />
            {booking.priority && booking.priority !== 'normal' && (
              <Chip label={booking.priority} color="error" size="small" />
            )}
            {booking.tags?.map((tag) => (
              <Chip key={tag} label={tag} variant="outlined" size="small" />
            ))}
          </Stack>
        </Box>

        <Stack direction="row" spacing={1}>
          {booking.status === BookingStatus.PENDING && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={handleConfirm}
            >
              Confirm
            </Button>
          )}
          {[BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(booking.status) && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => setCancelDialogOpen(true)}
            >
              Cancel
            </Button>
          )}
          <IconButton onClick={() => navigate(`/bookings/${id}/edit`)}>
            <EditIcon />
          </IconButton>
          <IconButton onClick={handleResendConfirmation}>
            <EmailIcon />
          </IconButton>
          <IconButton onClick={handleDownloadInvoice}>
            <GetAppIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Alerts */}
      {booking.status === BookingStatus.CANCELLED && booking.cancellationReason && (
        <Alert severity="error" sx={{ mb: 3 }} icon={<WarningIcon />}>
          <strong>Cancellation Reason:</strong> {booking.cancellationReason}
        </Alert>
      )}

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
                <Tab label="Overview" />
                <Tab label="Timeline" />
                <Tab label="Payments" />
                <Tab label="Notes" />
              </Tabs>

              {/* Overview Tab */}
              <TabPanel value={activeTab} index={0}>
                <Grid container spacing={3}>
                  {/* Tour Info */}
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                        Tour Information
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        {booking.tourImage && (
                          <Box
                            component="img"
                            src={booking.tourImage}
                            alt={booking.tourTitle}
                            sx={{ width: 100, height: 100, borderRadius: 1, objectFit: 'cover' }}
                          />
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6">{booking.tourTitle}</Typography>
                          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarTodayIcon fontSize="small" color="action" />
                              <Typography variant="body2">
                                {format(new Date(booking.tourStartDate), 'MMM dd, yyyy')}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PersonIcon fontSize="small" color="action" />
                              <Typography variant="body2">
                                {booking.totalParticipants} participants
                              </Typography>
                            </Box>
                          </Stack>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Customer Info */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                        Customer Information
                      </Typography>
                      <Stack spacing={1.5}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar>
                            {booking.customer.firstName.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body1">
                              {booking.customer.firstName} {booking.customer.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {booking.customer.country}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmailIcon fontSize="small" color="action" />
                          <Typography variant="body2">{booking.customer.email}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PhoneIcon fontSize="small" color="action" />
                          <Typography variant="body2">{booking.customer.phone}</Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>

                  {/* Participants */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                        Participants ({booking.participants.length})
                      </Typography>
                      <List dense>
                        {booking.participants.map((participant, index) => (
                          <ListItem key={participant.id}>
                            <ListItemIcon>
                              <Avatar sx={{ width: 32, height: 32 }}>
                                {participant.firstName.charAt(0)}
                              </Avatar>
                            </ListItemIcon>
                            <ListItemText
                              primary={`${participant.firstName} ${participant.lastName}`}
                              secondary={`Age: ${participant.age}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  </Grid>

                  {/* Special Requests */}
                  {booking.specialRequests && (
                    <Grid item xs={12}>
                      <Paper sx={{ p: 2, bgcolor: 'info.lighter' }}>
                        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <InfoIcon color="info" fontSize="small" />
                          Special Requests
                        </Typography>
                        <Typography variant="body2">{booking.specialRequests}</Typography>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </TabPanel>

              {/* Timeline Tab */}
              <TabPanel value={activeTab} index={1}>
                <Timeline>
                  {booking.timeline.map((event) => (
                    <TimelineItem key={event.id}>
                      <TimelineOppositeContent color="text.secondary">
                        {format(new Date(event.timestamp), 'MMM dd, yyyy HH:mm')}
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot color="primary">
                          <HistoryIcon fontSize="small" />
                        </TimelineDot>
                        <TimelineConnector />
                      </TimelineSeparator>
                      <TimelineContent>
                        <Typography variant="subtitle2">{event.event}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {event.description}
                        </Typography>
                        {event.actor && (
                          <Typography variant="caption" color="text.secondary">
                            by {event.actor}
                          </Typography>
                        )}
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              </TabPanel>

              {/* Payments Tab */}
              <TabPanel value={activeTab} index={2}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Payment Progress
                  </Typography>
                  <LinearProgress variant="determinate" value={paymentProgress} sx={{ height: 8, borderRadius: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    {booking.pricing.currency} {paidAmount.toFixed(2)} of {booking.pricing.currency} {booking.pricing.total.toFixed(2)} paid ({paymentProgress.toFixed(0)}%)
                  </Typography>
                </Box>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Method</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Transaction ID</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {booking.payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {format(new Date(payment.paymentDate), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Chip label={payment.method} size="small" />
                          </TableCell>
                          <TableCell align="right">
                            {payment.currency} {payment.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={payment.status}
                              size="small"
                              color={getPaymentStatusColor(payment.status)}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">{payment.transactionId || '-'}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {booking.payments.length === 0 && (
                  <Alert severity="info">No payments recorded yet</Alert>
                )}
              </TabPanel>

              {/* Notes Tab */}
              <TabPanel value={activeTab} index={3}>
                <Box sx={{ mb: 2 }}>
                  <Button
                    startIcon={<NoteIcon />}
                    variant="outlined"
                    onClick={() => setNoteDialogOpen(true)}
                  >
                    Add Note
                  </Button>
                </Box>

                {booking.internalNotes ? (
                  <Paper sx={{ p: 2, bgcolor: 'warning.lighter' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Internal Notes
                    </Typography>
                    <Typography variant="body2">{booking.internalNotes}</Typography>
                  </Paper>
                ) : (
                  <Alert severity="info">No internal notes</Alert>
                )}
              </TabPanel>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Pricing Summary */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 16 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pricing Summary
              </Typography>

              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Subtotal:</Typography>
                  <Typography variant="body2">
                    {booking.pricing.currency} {booking.pricing.subtotal.toFixed(2)}
                  </Typography>
                </Box>

                {booking.pricing.discount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
                    <Typography variant="body2">Discount:</Typography>
                    <Typography variant="body2">
                      -{booking.pricing.currency} {booking.pricing.discount.toFixed(2)}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Tax:</Typography>
                  <Typography variant="body2">
                    {booking.pricing.currency} {booking.pricing.tax.toFixed(2)}
                  </Typography>
                </Box>

                {booking.pricing.serviceFee > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Service Fee:</Typography>
                    <Typography variant="body2">
                      {booking.pricing.currency} {booking.pricing.serviceFee.toFixed(2)}
                    </Typography>
                  </Box>
                )}

                <Divider />

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" color="primary">
                    {booking.pricing.currency} {booking.pricing.total.toFixed(2)}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'text.secondary' }}>
                  <Typography variant="body2">Paid:</Typography>
                  <Typography variant="body2">
                    {booking.pricing.currency} {paidAmount.toFixed(2)}
                  </Typography>
                </Box>

                {paidAmount < booking.pricing.total && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'error.main' }}>
                    <Typography variant="body2" fontWeight="medium">
                      Balance Due:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {booking.pricing.currency} {(booking.pricing.total - paidAmount).toFixed(2)}
                    </Typography>
                  </Box>
                )}
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={1}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<GetAppIcon />}
                  onClick={handleDownloadInvoice}
                >
                  Download Invoice
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<AssignmentIcon />}
                  onClick={handleDownloadVoucher}
                >
                  Download Voucher
                </Button>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Typography variant="caption" color="text.secondary">
                Created: {format(new Date(booking.createdAt), 'MMM dd, yyyy HH:mm')}
              </Typography>
              <br />
              <Typography variant="caption" color="text.secondary">
                Updated: {format(new Date(booking.updatedAt), 'MMM dd, yyyy HH:mm')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cancel Booking</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Are you sure you want to cancel this booking? This action cannot be undone.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Cancellation Reason"
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            placeholder="Please provide a reason for cancellation..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCancel} color="error" variant="contained">
            Confirm Cancellation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={noteDialogOpen} onClose={() => setNoteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Internal Note</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add internal notes (not visible to customer)..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddNote} variant="contained">
            Add Note
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BookingDetails;
