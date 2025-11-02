import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Stack,
  Divider,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  CalendarToday as CalendarTodayIcon,
  LocationOn as LocationOnIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  AttachMoney as AttachMoneyIcon,
  Info as InfoIcon,
  Celebration as CelebrationIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { bookingsService } from '../../services/bookingsService';
import { Booking } from '../../types/booking.types';

const BookingConfirmation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

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
      toast.error('Failed to load booking');
    } finally {
      setLoading(false);
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

  const handleDownloadVoucher = async () => {
    try {
      await bookingsService.generateVoucher(id!);
      toast.success('Voucher downloaded');
    } catch (error) {
      console.error('Failed to download voucher:', error);
      toast.error('Failed to download voucher');
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

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Booking Confirmation - ${booking?.bookingNumber}`,
        text: `Tour: ${booking?.tourTitle}\nDate: ${booking?.tourStartDate}`,
        url: window.location.href,
      }).then(() => {
        toast.success('Shared successfully');
      }).catch(() => {
        toast.error('Failed to share');
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
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

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 4 }}>
      {/* Success Header */}
      <Paper
        sx={{
          p: 4,
          mb: 3,
          textAlign: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <CelebrationIcon sx={{ fontSize: 80, mb: 2 }} />
        <Typography variant="h3" gutterBottom fontWeight="bold">
          Booking Confirmed!
        </Typography>
        <Typography variant="h6" sx={{ mb: 2, opacity: 0.9 }}>
          Your adventure is all set
        </Typography>
        <Chip
          label={`Booking #${booking.bookingNumber}`}
          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '1rem', py: 2 }}
        />
      </Paper>

      {/* Action Buttons */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }} justifyContent="center">
        <Button
          variant="contained"
          startIcon={<EmailIcon />}
          onClick={handleResendConfirmation}
        >
          Email Confirmation
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleDownloadVoucher}
        >
          Download Voucher
        </Button>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
        >
          Print
        </Button>
        <Button
          variant="outlined"
          startIcon={<ShareIcon />}
          onClick={handleShare}
        >
          Share
        </Button>
      </Stack>

      {/* Important Information Alert */}
      <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
        A confirmation email has been sent to <strong>{booking.customer.email}</strong>. 
        Please check your inbox and spam folder.
      </Alert>

      {/* Tour Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarTodayIcon color="primary" />
            Tour Details
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              {booking.tourImage && (
                <Box
                  component="img"
                  src={booking.tourImage}
                  alt={booking.tourTitle}
                  sx={{ width: '100%', borderRadius: 2, objectFit: 'cover' }}
                />
              )}
            </Grid>
            <Grid item xs={12} md={8}>
              <Typography variant="h5" gutterBottom>
                {booking.tourTitle}
              </Typography>

              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CalendarTodayIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Start Date"
                    secondary={format(new Date(booking.tourStartDate), 'EEEE, MMMM dd, yyyy')}
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <CalendarTodayIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Duration"
                    secondary={`${booking.duration.days} days, ${booking.duration.nights} nights`}
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <PersonIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Participants"
                    secondary={`${booking.totalParticipants} people`}
                  />
                </ListItem>

                {booking.guideAssigned && (
                  <ListItem>
                    <ListItemIcon>
                      <PersonIcon color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Tour Guide"
                      secondary={booking.guideAssigned.name}
                    />
                  </ListItem>
                )}
              </List>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Customer Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon color="primary" />
            Customer Information
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
                  {booking.customer.firstName.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {booking.customer.firstName} {booking.customer.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Lead Traveler
                  </Typography>
                </Box>
              </Box>

              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <EmailIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email"
                    secondary={booking.customer.email}
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <PhoneIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Phone"
                    secondary={booking.customer.phone}
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <LocationOnIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Country"
                    secondary={booking.customer.country}
                  />
                </ListItem>
              </List>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                All Participants ({booking.participants.length})
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'action.hover' }}>
                {booking.participants.map((participant, index) => (
                  <Box key={participant.id} sx={{ mb: index < booking.participants.length - 1 ? 1 : 0 }}>
                    <Typography variant="body2">
                      {index + 1}. {participant.firstName} {participant.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Age: {participant.age}
                      {participant.dietaryRestrictions && participant.dietaryRestrictions.length > 0 && (
                        <> • {participant.dietaryRestrictions.join(', ')}</>
                      )}
                    </Typography>
                  </Box>
                ))}
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttachMoneyIcon color="primary" />
            Payment Summary
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Subtotal:</Typography>
              <Typography>{booking.pricing.currency} {booking.pricing.subtotal.toFixed(2)}</Typography>
            </Box>

            {booking.pricing.discount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
                <Typography>Discount:</Typography>
                <Typography>-{booking.pricing.currency} {booking.pricing.discount.toFixed(2)}</Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Tax:</Typography>
              <Typography>{booking.pricing.currency} {booking.pricing.tax.toFixed(2)}</Typography>
            </Box>

            {booking.pricing.serviceFee > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Service Fee:</Typography>
                <Typography>{booking.pricing.currency} {booking.pricing.serviceFee.toFixed(2)}</Typography>
              </Box>
            )}

            <Divider />

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">Total Amount:</Typography>
              <Typography variant="h6" color="primary">
                {booking.pricing.currency} {booking.pricing.total.toFixed(2)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Amount Paid:</Typography>
              <Typography color="success.main">
                {booking.pricing.currency} {booking.payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
              </Typography>
            </Box>

            {booking.payments.reduce((sum, p) => sum + p.amount, 0) < booking.pricing.total && (
              <Alert severity="warning">
                <Typography variant="body2">
                  <strong>Balance Due:</strong> {booking.pricing.currency}{' '}
                  {(booking.pricing.total - booking.payments.reduce((sum, p) => sum + p.amount, 0)).toFixed(2)}
                </Typography>
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Special Requests */}
      {booking.specialRequests && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Special Requests
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2">{booking.specialRequests}</Typography>
          </CardContent>
        </Card>
      )}

      {/* What's Next */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            What's Next?
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Confirmation Email Sent"
                secondary="Check your inbox for booking confirmation and tour details"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <EmailIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="Pre-Tour Information"
                secondary="We'll send you preparation details 7 days before the tour"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <PhoneIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="24/7 Support"
                secondary="Contact us anytime if you have questions or need to make changes"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <CalendarTodayIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="Day Before Reminder"
                secondary="We'll send you a reminder with meeting point details"
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="outlined"
              onClick={() => navigate(`/bookings/${id}`)}
            >
              View Full Details
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate('/bookings')}
            >
              View All Bookings
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Footer Note */}
      <Alert severity="success" sx={{ mt: 3 }}>
        <Typography variant="body2">
          Thank you for choosing Spirit Tours! We're excited to have you on this adventure. 
          If you have any questions, please don't hesitate to contact us.
        </Typography>
      </Alert>
    </Box>
  );
};

export default BookingConfirmation;
