import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Toolbar,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Tour as TourIcon,
  Book as BookIcon,
  Dashboard as DashboardIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface Tour {
  id: string;  // Changed from number to string to match backend format (e.g., 'tour-001')
  title: string;
  description: string;
  price: number;
  duration_days: number;
  max_participants: number;
}

interface Booking {
  id: number;
  booking_date: string;
  participants: number;
  total_price: number;
  status: string;
  tour_title: string;
  tour_description: string;
}

interface Stats {
  total_tours: number;
  total_bookings: number;
  total_revenue: number;
  active_users: number;
  system_status: string;
}

function AppSimple() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [openBookingDialog, setOpenBookingDialog] = useState(false);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [bookingForm, setBookingForm] = useState({
    booking_date: new Date().toISOString().split('T')[0],
    participants: 1
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch tours
  const fetchTours = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/tours`);
      const data = await response.json();
      const toursArray = data.tours || data;
      
      // Transform backend format to match frontend interface
      const transformedTours = toursArray.map((tour: any) => ({
        id: tour.id,
        title: tour.title,
        description: tour.description,
        price: tour.basePrice?.amount || tour.price || 0,
        duration_days: tour.duration?.days || tour.duration_days || 1,
        max_participants: tour.maxParticipants || tour.max_participants || 1
      }));
      
      setTours(transformedTours);
    } catch (error) {
      console.error('Error fetching tours:', error);
    }
    setLoading(false);
  };

  // Fetch bookings
  const fetchBookings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/bookings`);
      const data = await response.json();
      
      // Transform backend format to match frontend interface
      const transformedBookings = data.map((booking: any) => ({
        id: booking.id,
        booking_date: booking.booking_date,
        participants: booking.participants,
        total_price: booking.total_amount || booking.total_price || 0,
        status: booking.status,
        tour_title: booking.tour_name || booking.tour_title || 'Unknown Tour',
        tour_description: booking.tour_description || ''
      }));
      
      setBookings(transformedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchTours();
    fetchBookings();
    fetchStats();
  }, []);

  const handleBookTour = (tour: Tour) => {
    setSelectedTour(tour);
    setOpenBookingDialog(true);
  };

  const handleCreateBooking = async () => {
    if (!selectedTour) return;

    // Clear any previous messages
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Backend expects BookingRequest model with customer info
      const bookingData = {
        customer: {
          first_name: "Guest",
          last_name: "User",
          email: "guest@spirittours.com",
          phone: "+1234567890",
          country: "US",
          language: "es"
        },
        product_id: String(selectedTour.id),
        slot_id: `slot-${bookingForm.booking_date}`,
        participants_count: Number(bookingForm.participants),
        customer_type: "b2c_direct",
        booking_channel: "direct_website"
      };

      console.log('Creating booking with data:', bookingData);

      const response = await fetch(`${API_URL}/api/v1/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Booking created successfully:', data);
        setSuccessMessage(`Booking created successfully! ID: ${data.booking_id}`);
        setOpenBookingDialog(false);
        fetchBookings();
        fetchStats();
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        // Handle error responses
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('Booking failed:', response.status, errorData);
        setErrorMessage(`Error: ${errorData.detail || 'Failed to create booking'}`);
        
        // Clear error message after 5 seconds
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      setErrorMessage('Network error: Unable to connect to server');
      
      // Clear error message after 5 seconds
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <TourIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Spirit Tours - Travel Management System
          </Typography>
          <IconButton color="inherit" onClick={() => {
            fetchTours();
            fetchBookings();
            fetchStats();
          }}>
            <RefreshIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        )}

        {/* Statistics Dashboard */}
        {stats && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Tours
                  </Typography>
                  <Typography variant="h5">
                    {stats.total_tours}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Bookings
                  </Typography>
                  <Typography variant="h5">
                    {stats.total_bookings}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h5">
                    ${stats.total_revenue.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    System Status
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6">
                      {stats.system_status}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Tours Section */}
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <TourIcon sx={{ mr: 1 }} />
          Available Tours
        </Typography>
        
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {tours.map(tour => (
              <Grid item xs={12} md={6} lg={4} key={tour.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {tour.title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" paragraph>
                      {tour.description}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Chip label={`$${tour.price}`} color="primary" />
                      <Chip label={`${tour.duration_days} day(s)`} variant="outlined" />
                    </Box>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Max participants: {tour.max_participants}
                    </Typography>
                    <Button 
                      variant="contained" 
                      fullWidth 
                      startIcon={<BookIcon />}
                      onClick={() => handleBookTour(tour)}
                    >
                      Book Now
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Recent Bookings Section */}
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <BookIcon sx={{ mr: 1 }} />
          Recent Bookings
        </Typography>
        
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <List>
            {bookings.length === 0 ? (
              <ListItem>
                <ListItemText primary="No bookings yet" />
              </ListItem>
            ) : (
              bookings.slice(0, 5).map((booking) => (
                <ListItem key={booking.id} divider>
                  <ListItemText
                    primary={booking.tour_title}
                    secondary={
                      <Box>
                        <Typography variant="body2">
                          Date: {booking.booking_date} | Participants: {booking.participants}
                        </Typography>
                        <Typography variant="body2">
                          Total: ${booking.total_price.toFixed(2)}
                        </Typography>
                      </Box>
                    }
                  />
                  <Chip 
                    label={booking.status} 
                    color={booking.status === 'confirmed' ? 'success' : 'default'}
                    size="small"
                  />
                </ListItem>
              ))
            )}
          </List>
        </Paper>

        {/* Booking Dialog */}
        <Dialog open={openBookingDialog} onClose={() => setOpenBookingDialog(false)}>
          <DialogTitle>Book Tour: {selectedTour?.title}</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="Booking Date"
                type="date"
                value={bookingForm.booking_date}
                onChange={(e) => setBookingForm({...bookingForm, booking_date: e.target.value})}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Number of Participants"
                type="number"
                value={bookingForm.participants}
                onChange={(e) => setBookingForm({...bookingForm, participants: parseInt(e.target.value)})}
                inputProps={{ min: 1, max: selectedTour?.max_participants || 1 }}
              />
              {selectedTour && (
                <Typography variant="h6" sx={{ mt: 2 }}>
                  Total Price: ${(selectedTour.price * bookingForm.participants).toFixed(2)}
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenBookingDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateBooking} variant="contained" color="primary">
              Confirm Booking
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}

export default AppSimple;