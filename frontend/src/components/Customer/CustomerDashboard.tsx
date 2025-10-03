/**
 * Customer Portal Dashboard
 * Self-service portal for customers
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,
} from '@mui/material';
import {
  Flight,
  Hotel,
  Event,
  Help,
  Star,
  AccountCircle,
  Settings,
  Notifications,
} from '@mui/icons-material';
import { useQuery, useMutation } from 'react-query';
import { bookingAPI } from '../../services/api/bookingAPI';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

export const CustomerDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  const { data: bookings, isLoading } = useQuery(
    'myBookings',
    bookingAPI.getMyBookings
  );

  const submitReviewMutation = useMutation(
    (data: any) => fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  );

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const openReviewDialog = (booking: any) => {
    setSelectedBooking(booking);
    setReviewDialogOpen(true);
  };

  const submitReview = async () => {
    if (selectedBooking) {
      await submitReviewMutation.mutateAsync({
        bookingId: selectedBooking.id,
        tourId: selectedBooking.tourId,
        rating,
        comment: reviewText,
      });
      setReviewDialogOpen(false);
      setRating(0);
      setReviewText('');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main' }}>
              <AccountCircle sx={{ fontSize: 60 }} />
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h4" gutterBottom>
              Welcome Back!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your bookings and explore new destinations
            </Typography>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<Settings />}
              href="/profile/settings"
            >
              Settings
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Event color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Upcoming</Typography>
              </Box>
              <Typography variant="h4">
                {bookings?.filter((b: any) => b.status === 'confirmed').length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active bookings
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Flight color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Completed</Typography>
              </Box>
              <Typography variant="h4">
                {bookings?.filter((b: any) => b.status === 'completed').length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Past trips
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Star color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Rewards</Typography>
              </Box>
              <Typography variant="h4">1,250</Typography>
              <Typography variant="body2" color="text.secondary">
                Points earned
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Notifications color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Notifications</Typography>
              </Box>
              <Typography variant="h4">3</Typography>
              <Typography variant="body2" color="text.secondary">
                Unread messages
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Card>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="My Bookings" />
          <Tab label="Favorites" />
          <Tab label="Reviews" />
          <Tab label="Support" />
        </Tabs>

        {/* My Bookings Tab */}
        <TabPanel value={tabValue} index={0}>
          <List>
            {bookings?.map((booking: any) => (
              <ListItem
                key={booking.id}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 2,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ListItemIcon>
                  <Hotel sx={{ fontSize: 40 }} />
                </ListItemIcon>
                <ListItemText
                  primary={booking.tour.title}
                  secondary={
                    <>
                      <Typography variant="body2" component="span">
                        {new Date(booking.tourDate).toLocaleDateString()}
                      </Typography>
                      <br />
                      <Typography variant="body2" component="span" color="text.secondary">
                        {booking.adults} adults, {booking.children} children
                      </Typography>
                    </>
                  }
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                  <Chip
                    label={booking.status}
                    color={getStatusColor(booking.status)}
                    size="small"
                  />
                  {booking.status === 'completed' && (
                    <Button
                      size="small"
                      onClick={() => openReviewDialog(booking)}
                    >
                      Write Review
                    </Button>
                  )}
                  <Button size="small" variant="outlined">
                    View Details
                  </Button>
                </Box>
              </ListItem>
            ))}
          </List>
        </TabPanel>

        {/* Favorites Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography>Your favorite tours will appear here</Typography>
        </TabPanel>

        {/* Reviews Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography>Your reviews will appear here</Typography>
        </TabPanel>

        {/* Support Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Help sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Need Help?
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Our support team is here to help you 24/7
            </Typography>
            <Button variant="contained" size="large">
              Contact Support
            </Button>
          </Box>
        </TabPanel>
      </Card>

      {/* Review Dialog */}
      <Dialog
        open={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Write a Review</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Rating
            </Typography>
            <Rating
              value={rating}
              onChange={(event, newValue) => setRating(newValue || 0)}
              size="large"
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Your Review"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={submitReview}
            variant="contained"
            disabled={rating === 0 || !reviewText}
          >
            Submit Review
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
