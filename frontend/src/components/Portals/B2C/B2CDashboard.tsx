/**
 * B2C Portal Dashboard
 * Customer dashboard with bookings, packages, and travel history
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Chip,
  Rating,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Flight,
  Hotel,
  Map,
  Star,
  Schedule,
  LocationOn,
  FavoriteBorder,
  Share,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { portalsService } from '../../../services/portalsService';

const B2CDashboard: React.FC = () => {
  const [packages, setPackages] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Mock data
    setPackages([
      {
        id: '1',
        name: 'Madrid Cultural Experience',
        destination: 'Madrid, Spain',
        duration: 5,
        price: 890,
        rating: 4.8,
        image: 'https://via.placeholder.com/300x200?text=Madrid',
        description: 'Explore the royal capital with museums, palaces, and gastronomy',
        includes: ['Hotel 4*', 'Breakfast', 'City Tour', 'Museum Passes'],
      },
      {
        id: '2',
        name: 'Barcelona Beach & City',
        destination: 'Barcelona, Spain',
        duration: 7,
        price: 1200,
        rating: 4.9,
        image: 'https://via.placeholder.com/300x200?text=Barcelona',
        description: 'Perfect mix of beach, culture, and architecture',
        includes: ['Hotel 5*', 'All Meals', 'Sagrada Familia', 'Beach Activities'],
      },
      {
        id: '3',
        name: 'Andalusian Heritage',
        destination: 'Sevilla, Spain',
        duration: 6,
        price: 950,
        rating: 4.7,
        image: 'https://via.placeholder.com/300x200?text=Sevilla',
        description: 'Discover flamenco, Moorish architecture, and tapas culture',
        includes: ['Hotel 4*', 'Breakfast', 'Flamenco Show', 'Alcazar Tour'],
      },
    ]);

    setMyBookings([
      {
        id: '1',
        package: 'Madrid Cultural Experience',
        destination: 'Madrid',
        date: '2024-11-15',
        status: 'confirmed',
        reference: 'BK-C-2024-001',
      },
      {
        id: '2',
        package: 'Barcelona Beach & City',
        destination: 'Barcelona',
        date: '2024-12-20',
        status: 'pending',
        reference: 'BK-C-2024-002',
      },
    ]);
  };

  const handleBookNow = (pkg: any) => {
    setSelectedPackage(pkg);
    setDialogOpen(true);
  };

  const handleConfirmBooking = async () => {
    try {
      await portalsService.createB2CBooking({
        package_id: selectedPackage.id,
        customer_id: 'current-user-id',
      });
      toast.success('Booking confirmed successfully!');
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error('Failed to create booking');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          Discover Your Next Adventure
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Curated travel packages for unforgettable experiences
        </Typography>
      </Box>

      {/* My Bookings Section */}
      {myBookings.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>
            My Bookings
          </Typography>
          <Grid container spacing={2}>
            {myBookings.map((booking) => (
              <Grid item xs={12} md={6} key={booking.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {booking.package}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <LocationOn sx={{ fontSize: 18 }} />
                          <Typography variant="body2">{booking.destination}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Schedule sx={{ fontSize: 18 }} />
                          <Typography variant="body2">{booking.date}</Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={booking.status}
                        color={booking.status === 'confirmed' ? 'success' : 'warning'}
                      />
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      Ref: {booking.reference}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Available Packages */}
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
        Featured Packages
      </Typography>
      <Grid container spacing={3}>
        {packages.map((pkg) => (
          <Grid item xs={12} md={4} key={pkg.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardMedia
                component="img"
                height="200"
                image={pkg.image}
                alt={pkg.name}
                sx={{ objectFit: 'cover' }}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6" component="div">
                    {pkg.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton size="small">
                      <FavoriteBorder />
                    </IconButton>
                    <IconButton size="small">
                      <Share />
                    </IconButton>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <LocationOn sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {pkg.destination}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Rating value={pkg.rating} precision={0.1} size="small" readOnly />
                  <Typography variant="body2" color="text.secondary">
                    {pkg.rating}
                  </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary" paragraph>
                  {pkg.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                    Includes:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {pkg.includes.map((item: string, index: number) => (
                      <Chip key={index} label={item} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Schedule sx={{ fontSize: 18 }} />
                  <Typography variant="body2">{pkg.duration} days</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      €{pkg.price}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      per person
                    </Typography>
                  </Box>
                  <Button variant="contained" onClick={() => handleBookNow(pkg)}>
                    Book Now
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Booking Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Booking</DialogTitle>
        <DialogContent>
          {selectedPackage && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedPackage.name}
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                {selectedPackage.description}
              </Typography>
              <Box sx={{ my: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Destination:</strong> {selectedPackage.destination}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Duration:</strong> {selectedPackage.duration} days
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Price:</strong> €{selectedPackage.price}
                </Typography>
              </Box>
              <Typography variant="caption" color="textSecondary">
                You will receive a confirmation email after booking.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmBooking}>
            Confirm Booking
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default B2CDashboard;
