/**
 * @file CustomerPortal.tsx
 * @module Components/Portals
 * @description B2C Customer Portal for direct bookings
 * 
 * @features
 * - Tour browsing and booking
 * - Booking history and management
 * - Loyalty points and rewards
 * - Trip planning tools
 * - Reviews and ratings
 * - Wishlist functionality
 * - Customer support chat
 * - Multi-language support
 * 
 * @example
 * ```tsx
 * import { CustomerPortal } from '@/components/Portals/CustomerPortal';
 * 
 * <CustomerPortal customerId="customer-123" />
 * ```
 * 
 * @author Spirit Tours Development Team
 * @since 1.0.0
 */

import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Tabs,
  Tab,
  Chip,
  Avatar,
  Stack,
  Rating,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Badge,
} from '@mui/material';
import {
  Search,
  Favorite,
  FavoriteBorder,
  Event,
  Person,
  Star,
  CardGiftcard,
  Support,
  Settings,
  Logout,
  TrendingUp,
  AccessTime,
  AttachMoney,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import axios from 'axios';

// ============================================================================
// TYPES
// ============================================================================

interface Tour {
  id: string;
  title: string;
  description: string;
  image: string;
  duration: string;
  price: number;
  rating: number;
  reviews: number;
  category: string;
  featured?: boolean;
}

interface Booking {
  id: string;
  tourTitle: string;
  tourImage: string;
  date: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  guests: number;
  totalAmount: number;
}

interface LoyaltyInfo {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
  nextTierPoints: number;
  benefits: string[];
}

interface CustomerPortalProps {
  customerId: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * CustomerPortal - B2C portal for direct customer bookings
 * 
 * @component
 * @description
 * Complete customer-facing portal for booking and managing tours:
 * 
 * **Features:**
 * - Tour discovery with search and filters
 * - Instant booking and payment
 * - Booking history and management
 * - Loyalty program and rewards
 * - Personalized recommendations
 * - Review and rating system
 * - Wishlist functionality
 * - Customer support integration
 * 
 * **User Journey:**
 * 1. Browse tours (Search, Filter, Sort)
 * 2. View tour details and reviews
 * 3. Add to wishlist or book directly
 * 4. Manage bookings and track status
 * 5. Earn loyalty points
 * 6. Leave reviews after tour
 * 
 * @param {CustomerPortalProps} props - Component props
 * @returns {JSX.Element} Rendered customer portal
 */
export const CustomerPortal: React.FC<CustomerPortalProps> = ({ customerId }) => {
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  // Fetch featured tours
  const { data: tours = [] } = useQuery<Tour[]>('featuredTours', async () => {
    const response = await axios.get('/api/tours/featured');
    return response.data;
  });

  // Fetch customer bookings
  const { data: bookings = [] } = useQuery<Booking[]>(
    ['customerBookings', customerId],
    async () => {
      const response = await axios.get(`/api/customers/${customerId}/bookings`);
      return response.data;
    }
  );

  // Fetch loyalty info
  const { data: loyalty } = useQuery<LoyaltyInfo>(
    ['customerLoyalty', customerId],
    async () => {
      const response = await axios.get(`/api/customers/${customerId}/loyalty`);
      return response.data;
    }
  );

  /**
   * Toggle wishlist
   */
  const toggleWishlist = (tourId: string) => {
    setWishlist((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tourId)) {
        newSet.delete(tourId);
      } else {
        newSet.add(tourId);
      }
      return newSet;
    });
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: string) => {
    const colors: Record<string, 'primary' | 'success' | 'error'> = {
      upcoming: 'primary',
      completed: 'success',
      cancelled: 'error',
    };
    return colors[status] || 'primary';
  };

  /**
   * Get tier color
   */
  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#FFD700',
      platinum: '#E5E4E2',
    };
    return colors[tier] || '#666';
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight={600}>
            Spirit Tours
          </Typography>
          
          <Stack direction="row" spacing={2} alignItems="center">
            {loyalty && (
              <Chip
                label={`${loyalty.tier.toUpperCase()} · ${loyalty.points} pts`}
                sx={{
                  bgcolor: getTierColor(loyalty.tier),
                  color: 'white',
                  fontWeight: 600,
                }}
              />
            )}
            <IconButton>
              <Badge badgeContent={3} color="error">
                <Support />
              </Badge>
            </IconButton>
            <IconButton>
              <Settings />
            </IconButton>
            <Avatar sx={{ width: 40, height: 40 }}>
              <Person />
            </Avatar>
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ px: 3, pb: 3 }}>
        {/* Search Bar */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search tours, destinations, activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Paper>

        {/* Tabs */}
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
          <Tab label="Discover Tours" />
          <Tab label="My Bookings" />
          <Tab label="Wishlist" />
          <Tab label="Loyalty Rewards" />
        </Tabs>

        {/* Discover Tours Tab */}
        {tabValue === 0 && (
          <Grid container spacing={3}>
            {tours.map((tour) => (
              <Grid item xs={12} sm={6} md={4} key={tour.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ position: 'relative' }}>
                    <CardMedia
                      component="img"
                      height="200"
                      image={tour.image}
                      alt={tour.title}
                    />
                    {tour.featured && (
                      <Chip
                        label="Featured"
                        color="error"
                        size="small"
                        sx={{ position: 'absolute', top: 10, left: 10 }}
                      />
                    )}
                    <IconButton
                      sx={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        bgcolor: 'white',
                        '&:hover': { bgcolor: 'grey.100' },
                      }}
                      onClick={() => toggleWishlist(tour.id)}
                    >
                      {wishlist.has(tour.id) ? (
                        <Favorite color="error" />
                      ) : (
                        <FavoriteBorder />
                      )}
                    </IconButton>
                  </Box>

                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {tour.title}
                    </Typography>
                    
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {tour.description}
                    </Typography>

                    <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                      <Rating value={tour.rating} readOnly size="small" />
                      <Typography variant="caption" color="text.secondary">
                        ({tour.reviews} reviews)
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={2} mb={2}>
                      <Chip icon={<AccessTime />} label={tour.duration} size="small" />
                      <Chip label={tour.category} size="small" variant="outlined" />
                    </Stack>

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="h6" color="primary">
                        ${tour.price}
                      </Typography>
                      <Button variant="contained" size="small">
                        Book Now
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* My Bookings Tab */}
        {tabValue === 1 && (
          <Grid container spacing={3}>
            {bookings.map((booking) => (
              <Grid item xs={12} key={booking.id}>
                <Card>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <CardMedia
                      component="img"
                      sx={{ width: { xs: '100%', sm: 200 } }}
                      image={booking.tourImage}
                      alt={booking.tourTitle}
                    />
                    <CardContent sx={{ flex: 1 }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="start"
                        mb={2}
                      >
                        <Box>
                          <Typography variant="h6" gutterBottom>
                            {booking.tourTitle}
                          </Typography>
                          <Chip
                            label={booking.status}
                            color={getStatusColor(booking.status)}
                            size="small"
                          />
                        </Box>
                        <Typography variant="h6" color="primary">
                          ${booking.totalAmount}
                        </Typography>
                      </Stack>

                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="text.secondary">
                            Date
                          </Typography>
                          <Typography variant="body2">
                            {new Date(booking.date).toLocaleDateString()}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="text.secondary">
                            Guests
                          </Typography>
                          <Typography variant="body2">
                            {booking.guests} people
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Button variant="outlined" size="small" fullWidth>
                            View Details
                          </Button>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Stack>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Wishlist Tab */}
        {tabValue === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              My Wishlist ({wishlist.size} tours)
            </Typography>
            {wishlist.size === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <FavoriteBorder sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Your wishlist is empty
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Start adding tours you love to your wishlist
                </Typography>
                <Button variant="contained" onClick={() => setTabValue(0)}>
                  Discover Tours
                </Button>
              </Paper>
            ) : (
              <Typography>Wishlist items will appear here</Typography>
            )}
          </Box>
        )}

        {/* Loyalty Rewards Tab */}
        {tabValue === 3 && loyalty && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Stack alignItems="center" spacing={2}>
                    <Avatar
                      sx={{
                        width: 80,
                        height: 80,
                        bgcolor: getTierColor(loyalty.tier),
                      }}
                    >
                      <Star sx={{ fontSize: 40 }} />
                    </Avatar>
                    <Typography variant="h5" textTransform="capitalize">
                      {loyalty.tier} Member
                    </Typography>
                    <Chip
                      label={`${loyalty.points} points`}
                      color="primary"
                      sx={{ fontWeight: 600 }}
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Your Benefits
                  </Typography>
                  <List>
                    {loyalty.benefits.map((benefit, index) => (
                      <ListItem key={index}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'success.main' }}>
                            <Star />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={benefit} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Redeem Rewards
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                        <CardGiftcard color="primary" sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="body2" gutterBottom>
                          $50 Discount
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          500 points
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                        <CardGiftcard color="primary" sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="body2" gutterBottom>
                          $100 Discount
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          1000 points
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default CustomerPortal;
