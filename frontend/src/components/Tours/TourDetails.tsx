/**
 * Tour Details Component
 * 
 * Displays comprehensive tour information with booking capability
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Rating,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
  Alert,
  ImageList,
  ImageListItem,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteIconBorder,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Star as StarIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  CalendarMonth as CalendarIcon,
  AttachMoney as MoneyIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import toursService from '../../services/toursService';
import type { Tour, Review } from '../../types/tour.types';

// ============================================================================
// TYPES
// ============================================================================

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// ============================================================================
// TAB PANEL
// ============================================================================

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ marginTop: '24px' }}>
    {value === index && children}
  </div>
);

// ============================================================================
// COMPONENT
// ============================================================================

const TourDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // State
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (id) {
      loadTourDetails();
    }
  }, [id]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const loadTourDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await toursService.getTour(id);
      setTour(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load tour details');
      toast.error('Failed to load tour');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/tours/${id}/edit`);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!id) return;

    try {
      setDeleting(true);
      await toursService.deleteTour(id);
      toast.success('Tour deleted successfully');
      navigate('/tours');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete tour');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleShare = () => {
    if (navigator.share && tour) {
      navigator.share({
        title: tour.title,
        text: tour.shortDescription,
        url: window.location.href,
      }).catch(() => {
        // Copy to clipboard as fallback
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard');
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const handleFavoriteToggle = () => {
    setFavorite(!favorite);
    toast.success(favorite ? 'Removed from favorites' : 'Added to favorites');
  };

  const handleBookNow = () => {
    navigate(`/bookings/new?tourId=${id}`);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderOverview = () => (
    <Box>
      {/* Description */}
      <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-line' }}>
        {tour?.description}
      </Typography>

      {/* Quick Info */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tour Highlights
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <ScheduleIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Duration"
                    secondary={`${tour?.duration.days} days, ${tour?.duration.nights} nights`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PeopleIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Group Size"
                    secondary={`${tour?.minParticipants}-${tour?.maxParticipants} participants`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <LocationIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Location"
                    secondary={`${tour?.location.city}, ${tour?.location.country}`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pricing
              </Typography>
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h3" color="primary" gutterBottom>
                  {tour?.basePrice.currency} {tour?.basePrice.amount.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  per person
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={handleBookNow}
                >
                  Book Now
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderItinerary = () => (
    <Box>
      {tour?.itinerary && tour.itinerary.length > 0 ? (
        tour.itinerary.map((day) => (
          <Card key={day.day} variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  {day.day}
                </Avatar>
                <Typography variant="h6">{day.title}</Typography>
              </Box>
              <Typography variant="body1" paragraph>
                {day.description}
              </Typography>
              {day.activities && day.activities.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Activities:
                  </Typography>
                  <List dense>
                    {day.activities.map((activity, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <CheckIcon color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={activity} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Alert severity="info">No itinerary available</Alert>
      )}
    </Box>
  );

  const renderInclusions = () => (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom color="success.main">
            Included
          </Typography>
          <List>
            {tour?.inclusions
              .filter((inc) => inc.included)
              .map((inclusion) => (
                <ListItem key={inclusion.id}>
                  <ListItemIcon>
                    <CheckIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary={inclusion.name}
                    secondary={inclusion.description}
                  />
                </ListItem>
              ))}
          </List>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom color="error.main">
            Not Included
          </Typography>
          <List>
            {tour?.exclusions && tour.exclusions.length > 0 ? (
              tour.exclusions.map((exclusion, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <CloseIcon color="error" />
                  </ListItemIcon>
                  <ListItemText primary={exclusion} />
                </ListItem>
              ))
            ) : (
              <ListItem>
                <ListItemText primary="No exclusions listed" />
              </ListItem>
            )}
          </List>
        </Grid>
      </Grid>
    </Box>
  );

  const renderReviews = () => (
    <Box>
      {/* Overall Rating */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Typography variant="h2" color="primary">
                {tour?.rating.toFixed(1)}
              </Typography>
            </Grid>
            <Grid item>
              <Rating value={tour?.rating || 0} readOnly precision={0.1} />
              <Typography variant="body2" color="text.secondary">
                Based on {tour?.totalReviews} reviews
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Individual Reviews */}
      {tour?.reviews && tour.reviews.length > 0 ? (
        tour.reviews.map((review) => (
          <Card key={review.id} variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar src={review.customerAvatar} sx={{ mr: 2 }}>
                  {review.customerName.charAt(0)}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1">
                    {review.customerName}
                    {review.verified && (
                      <Chip label="Verified" size="small" color="success" sx={{ ml: 1 }} />
                    )}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Rating value={review.rating} readOnly size="small" />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Typography variant="h6" gutterBottom>
                {review.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {review.comment}
              </Typography>

              {review.response && (
                <Box sx={{ mt: 2, pl: 2, borderLeft: '3px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Response from {review.response.respondedBy}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {review.response.message}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Alert severity="info">No reviews yet. Be the first to review!</Alert>
      )}
    </Box>
  );

  const renderLoading = () => (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="rectangular" height={400} sx={{ mb: 3 }} />
      <Skeleton variant="text" height={60} sx={{ mb: 2 }} />
      <Skeleton variant="text" height={40} sx={{ mb: 2 }} />
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Skeleton variant="rectangular" height={300} />
        </Grid>
        <Grid item xs={12} md={4}>
          <Skeleton variant="rectangular" height={300} />
        </Grid>
      </Grid>
    </Box>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return renderLoading();
  }

  if (error || !tour) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'Tour not found'}</Alert>
        <Button onClick={() => navigate('/tours')} sx={{ mt: 2 }}>
          Back to Tours
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Image Gallery */}
      <Card sx={{ mb: 3 }}>
        <Box
          sx={{
            height: 400,
            backgroundImage: `url(${tour.images[0]?.url || '/placeholder-tour.jpg'})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
        >
          {/* Action Buttons */}
          <Box sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 1 }}>
            <IconButton
              sx={{ bgcolor: 'white', '&:hover': { bgcolor: 'grey.100' } }}
              onClick={handleFavoriteToggle}
            >
              {favorite ? <FavoriteIcon color="error" /> : <FavoriteIconBorder />}
            </IconButton>
            <IconButton
              sx={{ bgcolor: 'white', '&:hover': { bgcolor: 'grey.100' } }}
              onClick={handleShare}
            >
              <ShareIcon />
            </IconButton>
            <IconButton
              sx={{ bgcolor: 'white', '&:hover': { bgcolor: 'grey.100' } }}
              onClick={handleEdit}
            >
              <EditIcon />
            </IconButton>
            <IconButton
              sx={{ bgcolor: 'white', '&:hover': { bgcolor: 'grey.100' } }}
              onClick={handleDeleteClick}
            >
              <DeleteIcon />
            </IconButton>
          </Box>

          {/* Badges */}
          <Box sx={{ position: 'absolute', top: 16, left: 16 }}>
            {tour.featured && (
              <Chip label="Featured" color="primary" sx={{ mr: 1 }} />
            )}
            {tour.trending && (
              <Chip label="Trending" color="secondary" sx={{ mr: 1 }} />
            )}
            <Chip
              label={tour.status}
              color={tour.status === 'active' ? 'success' : 'default'}
            />
          </Box>
        </Box>

        {/* Thumbnail Gallery */}
        {tour.images.length > 1 && (
          <ImageList cols={6} sx={{ m: 1 }} rowHeight={80}>
            {tour.images.map((image, index) => (
              <ImageListItem
                key={image.id}
                onClick={() => setSelectedImage(image.url)}
                sx={{ cursor: 'pointer' }}
              >
                <img src={image.url} alt={image.alt} loading="lazy" />
              </ImageListItem>
            ))}
          </ImageList>
        )}
      </Card>

      {/* Content */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h3" gutterBottom>
              {tour.title}
            </Typography>
            
            {/* Meta Info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <StarIcon color="primary" />
                <Typography variant="body1">
                  {tour.rating.toFixed(1)} ({tour.totalReviews} reviews)
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocationIcon color="action" />
                <Typography variant="body1">
                  {tour.location.city}, {tour.location.country}
                </Typography>
              </Box>
            </Box>

            {/* Tags */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={tour.category} variant="outlined" />
              <Chip label={tour.difficulty} variant="outlined" color="warning" />
              {tour.tags.map((tag) => (
                <Chip key={tag} label={tag} variant="outlined" size="small" />
              ))}
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Tabs */}
          <Box>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="Overview" />
              <Tab label="Itinerary" />
              <Tab label="Inclusions" />
              <Tab label={`Reviews (${tour.totalReviews})`} />
            </Tabs>

            <TabPanel value={activeTab} index={0}>
              {renderOverview()}
            </TabPanel>
            <TabPanel value={activeTab} index={1}>
              {renderItinerary()}
            </TabPanel>
            <TabPanel value={activeTab} index={2}>
              {renderInclusions()}
            </TabPanel>
            <TabPanel value={activeTab} index={3}>
              {renderReviews()}
            </TabPanel>
          </Box>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Booking Card */}
          <Card sx={{ position: 'sticky', top: 16 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Book This Tour
              </Typography>
              
              <Box sx={{ textAlign: 'center', py: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                <Typography variant="h4" color="primary">
                  {tour.basePrice.currency} {tour.basePrice.amount.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  per person
                </Typography>
              </Box>

              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <ScheduleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${tour.duration.days} days / ${tour.duration.nights} nights`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PeopleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={`${tour.minParticipants}-${tour.maxParticipants} people`} />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CalendarIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Multiple dates available" />
                </ListItem>
              </List>

              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleBookNow}
                sx={{ mt: 2 }}
              >
                Book Now
              </Button>

              <Button
                variant="outlined"
                fullWidth
                size="large"
                sx={{ mt: 1 }}
              >
                Check Availability
              </Button>
            </CardContent>
          </Card>

          {/* Tour Guides */}
          {tour.guides && tour.guides.length > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Your Guides
                </Typography>
                {tour.guides.map((guide) => (
                  <Box key={guide.id} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar src={guide.avatar} sx={{ mr: 2, width: 56, height: 56 }}>
                      {guide.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1">{guide.name}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Rating value={guide.rating} readOnly size="small" />
                        <Typography variant="caption">
                          ({guide.totalTours} tours)
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Tour</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{tour.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Modal */}
      <Dialog
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        maxWidth="lg"
        fullWidth
      >
        <img src={selectedImage || ''} alt="Tour" style={{ width: '100%', height: 'auto' }} />
      </Dialog>
    </Box>
  );
};

export default TourDetails;
