import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  TextField,
  Rating,
  Avatar,
  Chip,
  Stack,
  Divider,
  Paper,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  ThumbUp as ThumbUpIcon,
  ThumbUpOutlined as ThumbUpOutlinedIcon,
  Reply as ReplyIcon,
  MoreVert as MoreVertIcon,
  FilterList as FilterListIcon,
  VerifiedUser as VerifiedUserIcon,
  Flag as FlagIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { toursService } from '../../services/toursService';
import { Review, ReviewResponse } from '../../types/tour.types';

interface TourReviewsProps {
  tourId: string;
  canManage?: boolean;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  verifiedPercentage: number;
}

interface ReplyFormData {
  content: string;
}

const TourReviews: React.FC<TourReviewsProps> = ({
  tourId,
  canManage = false,
}) => {
  // State
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    averageRating: 0,
    totalReviews: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    verifiedPercentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'lowest' | 'helpful'>('recent');
  const [filterRating, setFilterRating] = useState<number | null>(null);
  
  // Dialog states
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Review | null>(null);
  const [replyForm, setReplyForm] = useState<ReplyFormData>({ content: '' });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Load reviews
  useEffect(() => {
    loadReviews();
  }, [tourId, page, sortBy, filterRating]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const response = await toursService.getReviews(tourId, page, 10, {
        sortBy,
        rating: filterRating,
      });
      
      setReviews(response.reviews);
      setTotalPages(response.totalPages);
      
      // Calculate stats
      const total = response.totalCount;
      const distribution = response.distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      const average = response.averageRating || 0;
      const verified = response.reviews.filter(r => r.isVerified).length;
      
      setStats({
        averageRating: average,
        totalReviews: total,
        distribution,
        verifiedPercentage: total > 0 ? (verified / total) * 100 : 0,
      });
    } catch (error) {
      console.error('Failed to load reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  // Handle helpful vote
  const handleHelpful = async (reviewId: string) => {
    try {
      await toursService.markReviewHelpful(tourId, reviewId);
      
      setReviews(reviews.map(review =>
        review.id === reviewId
          ? { ...review, helpfulCount: (review.helpfulCount || 0) + 1 }
          : review
      ));
      
      toast.success('Thank you for your feedback!');
    } catch (error) {
      console.error('Failed to mark review as helpful:', error);
      toast.error('Failed to submit feedback');
    }
  };

  // Handle reply
  const handleReply = (review: Review) => {
    setReplyingTo(review);
    setReplyForm({ content: review.response?.content || '' });
    setReplyDialogOpen(true);
  };

  const handleSubmitReply = async () => {
    if (!replyingTo) return;

    try {
      await toursService.replyToReview(tourId, replyingTo.id, replyForm.content);
      
      setReviews(reviews.map(review =>
        review.id === replyingTo.id
          ? {
              ...review,
              response: {
                id: `response_${Date.now()}`,
                content: replyForm.content,
                author: 'Tour Operator',
                createdAt: new Date().toISOString(),
              },
            }
          : review
      ));
      
      toast.success('Reply posted successfully');
      setReplyDialogOpen(false);
      setReplyingTo(null);
      setReplyForm({ content: '' });
    } catch (error) {
      console.error('Failed to post reply:', error);
      toast.error('Failed to post reply');
    }
  };

  // Handle flag review
  const handleFlagReview = async (reviewId: string) => {
    try {
      await toursService.flagReview(tourId, reviewId);
      toast.success('Review flagged for moderation');
      handleMenuClose();
    } catch (error) {
      console.error('Failed to flag review:', error);
      toast.error('Failed to flag review');
    }
  };

  // Handle delete review
  const handleDeleteReview = async () => {
    if (!selectedReview) return;

    try {
      await toursService.deleteReview(tourId, selectedReview.id);
      setReviews(reviews.filter(r => r.id !== selectedReview.id));
      toast.success('Review deleted successfully');
      setDeleteConfirmOpen(false);
      setSelectedReview(null);
    } catch (error) {
      console.error('Failed to delete review:', error);
      toast.error('Failed to delete review');
    }
  };

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, review: Review) => {
    setAnchorEl(event.currentTarget);
    setSelectedReview(review);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedReview(null);
  };

  // Render rating distribution
  const renderRatingDistribution = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h2" fontWeight="bold">
                {stats.averageRating.toFixed(1)}
              </Typography>
              <Rating value={stats.averageRating} precision={0.1} readOnly size="large" />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Based on {stats.totalReviews} reviews
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 1 }}>
                <VerifiedUserIcon color="success" fontSize="small" />
                <Typography variant="caption" color="text.secondary">
                  {stats.verifiedPercentage.toFixed(0)}% verified bookings
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Stack spacing={1}>
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.distribution[rating as keyof typeof stats.distribution];
                const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                
                return (
                  <Box key={rating} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" sx={{ minWidth: 60 }}>
                      {rating} star{rating !== 1 && 's'}
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={percentage}
                        sx={{ height: 8, borderRadius: 1 }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 40 }}>
                      {count}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  // Render filters
  const renderFilters = () => (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              label="Sort By"
            >
              <MenuItem value="recent">Most Recent</MenuItem>
              <MenuItem value="highest">Highest Rated</MenuItem>
              <MenuItem value="lowest">Lowest Rated</MenuItem>
              <MenuItem value="helpful">Most Helpful</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Filter Rating</InputLabel>
            <Select
              value={filterRating || ''}
              onChange={(e) => setFilterRating(e.target.value ? Number(e.target.value) : null)}
              label="Filter Rating"
            >
              <MenuItem value="">All Ratings</MenuItem>
              <MenuItem value={5}>5 Stars</MenuItem>
              <MenuItem value={4}>4 Stars</MenuItem>
              <MenuItem value={3}>3 Stars</MenuItem>
              <MenuItem value={2}>2 Stars</MenuItem>
              <MenuItem value={1}>1 Star</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={12} md={6}>
          <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
            <Chip
              label={`Total: ${stats.totalReviews}`}
              variant="outlined"
            />
            <Chip
              icon={<VerifiedUserIcon />}
              label="Verified"
              color="success"
              variant="outlined"
            />
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );

  // Render single review
  const renderReview = (review: Review) => (
    <Card key={review.id} sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Avatar src={review.user.avatar} alt={review.user.name}>
              {review.user.name.charAt(0)}
            </Avatar>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {review.user.name}
                </Typography>
                {review.isVerified && (
                  <Tooltip title="Verified Booking">
                    <VerifiedUserIcon color="success" fontSize="small" />
                  </Tooltip>
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Rating value={review.rating} size="small" readOnly />
                <Typography variant="caption" color="text.secondary">
                  {format(new Date(review.createdAt), 'MMM dd, yyyy')}
                </Typography>
              </Box>
            </Box>
          </Box>
          
          <IconButton size="small" onClick={(e) => handleMenuOpen(e, review)}>
            <MoreVertIcon />
          </IconButton>
        </Box>
        
        {review.title && (
          <Typography variant="subtitle2" gutterBottom fontWeight="medium">
            {review.title}
          </Typography>
        )}
        
        <Typography variant="body2" paragraph>
          {review.content}
        </Typography>
        
        {review.photos && review.photos.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {review.photos.map((photo, index) => (
              <Box
                key={index}
                component="img"
                src={photo}
                alt={`Review photo ${index + 1}`}
                sx={{
                  width: 80,
                  height: 80,
                  objectFit: 'cover',
                  borderRadius: 1,
                  cursor: 'pointer',
                }}
              />
            ))}
          </Box>
        )}
        
        {review.tags && review.tags.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
            {review.tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
          </Stack>
        )}
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" spacing={2}>
            <Button
              size="small"
              startIcon={<ThumbUpOutlinedIcon />}
              onClick={() => handleHelpful(review.id)}
            >
              Helpful ({review.helpfulCount || 0})
            </Button>
            {canManage && !review.response && (
              <Button
                size="small"
                startIcon={<ReplyIcon />}
                onClick={() => handleReply(review)}
              >
                Reply
              </Button>
            )}
          </Stack>
          
          {review.travelDate && (
            <Chip
              icon={<ScheduleIcon />}
              label={`Traveled: ${format(new Date(review.travelDate), 'MMM yyyy')}`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
        
        {review.response && (
          <Paper sx={{ p: 2, mt: 2, backgroundColor: 'action.hover' }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                T
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="medium">
                      {review.response.author}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(review.response.createdAt), 'MMM dd, yyyy')}
                    </Typography>
                  </Box>
                  {canManage && (
                    <IconButton size="small" onClick={() => handleReply(review)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
                <Typography variant="body2">
                  {review.response.content}
                </Typography>
              </Box>
            </Box>
          </Paper>
        )}
      </CardContent>
    </Card>
  );

  // Render reply dialog
  const renderReplyDialog = () => (
    <Dialog open={replyDialogOpen} onClose={() => setReplyDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        {replyingTo?.response ? 'Edit Reply' : 'Reply to Review'}
      </DialogTitle>
      <DialogContent dividers>
        {replyingTo && (
          <Box sx={{ mb: 3, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle2">{replyingTo.user.name}</Typography>
              <Rating value={replyingTo.rating} size="small" readOnly />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {replyingTo.content}
            </Typography>
          </Box>
        )}
        
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Your Response"
          value={replyForm.content}
          onChange={(e) => setReplyForm({ content: e.target.value })}
          placeholder="Thank the customer and address their feedback..."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setReplyDialogOpen(false)}>Cancel</Button>
        <Button onClick={handleSubmitReply} variant="contained" disabled={!replyForm.content.trim()}>
          {replyingTo?.response ? 'Update Reply' : 'Post Reply'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Render context menu
  const renderContextMenu = () => (
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
      {canManage ? (
        <>
          <MenuItem onClick={() => {
            if (selectedReview) handleReply(selectedReview);
            handleMenuClose();
          }}>
            <ReplyIcon fontSize="small" sx={{ mr: 1 }} />
            Reply
          </MenuItem>
          <MenuItem onClick={() => {
            setDeleteConfirmOpen(true);
            handleMenuClose();
          }}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </>
      ) : (
        <MenuItem onClick={() => {
          if (selectedReview) handleFlagReview(selectedReview.id);
        }}>
          <FlagIcon fontSize="small" sx={{ mr: 1 }} />
          Report
        </MenuItem>
      )}
    </Menu>
  );

  // Render delete confirmation
  const renderDeleteConfirm = () => (
    <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
      <DialogTitle>Confirm Delete</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete this review? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
        <Button onClick={handleDeleteReview} color="error" variant="contained">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      {renderRatingDistribution()}
      {renderFilters()}
      
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography>Loading reviews...</Typography>
        </Box>
      ) : reviews.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No Reviews Yet
          </Typography>
          <Typography color="text.secondary">
            Be the first to share your experience with this tour!
          </Typography>
        </Paper>
      ) : (
        <>
          {reviews.map(review => renderReview(review))}
          
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
      
      {renderReplyDialog()}
      {renderContextMenu()}
      {renderDeleteConfirm()}
    </Box>
  );
};

export default TourReviews;
