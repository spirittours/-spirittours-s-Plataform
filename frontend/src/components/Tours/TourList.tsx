/**
 * Tour List Component
 * 
 * Displays a paginated, filterable list of tours with search and actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Pagination,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  Visibility as ViewIcon,
  Public as PublishIcon,
  Archive as ArchiveIcon,
  Download as ExportIcon,
  Upload as ImportIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import toursService from '../../services/toursService';
import { useDebounce } from '../../hooks/useDebounce';
import type { Tour, TourFilters, TourStatus, TourCategory, TourDifficulty } from '../../types/tour.types';

// ============================================================================
// TYPES
// ============================================================================

interface TourListProps {
  embedded?: boolean;
  onTourSelect?: (tour: Tour) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

const TourList: React.FC<TourListProps> = ({ embedded = false, onTourSelect }) => {
  const navigate = useNavigate();
  
  // State
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [filters, setFilters] = useState<TourFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Actions
  const [selectedTours, setSelectedTours] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [actionTour, setActionTour] = useState<Tour | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchTours = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const searchFilters: TourFilters = {
        ...filters,
        search: debouncedSearch || undefined,
      };
      
      const response = await toursService.getTours(page, pageSize, searchFilters);
      
      setTours(response.tours);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load tours');
      toast.error('Failed to load tours');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, filters]);

  useEffect(() => {
    fetchTours();
  }, [fetchTours]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(1); // Reset to first page on search
  };

  const handleFilterChange = (key: keyof TourFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setPage(1);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTourClick = (tour: Tour) => {
    if (onTourSelect) {
      onTourSelect(tour);
    } else {
      navigate(`/tours/${tour.id}`);
    }
  };

  const handleCreateTour = () => {
    navigate('/tours/new');
  };

  const handleEditTour = (tour: Tour) => {
    navigate(`/tours/${tour.id}/edit`);
  };

  const handleViewTour = (tour: Tour) => {
    navigate(`/tours/${tour.id}`);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, tour: Tour) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setActionTour(tour);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setActionTour(null);
  };

  const handleDeleteClick = (tour: Tour) => {
    setActionTour(tour);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!actionTour) return;
    
    try {
      await toursService.deleteTour(actionTour.id);
      toast.success('Tour deleted successfully');
      fetchTours();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete tour');
    } finally {
      setDeleteDialogOpen(false);
      setActionTour(null);
    }
  };

  const handleDuplicateTour = async (tour: Tour) => {
    try {
      const duplicated = await toursService.duplicateTour(tour.id);
      toast.success('Tour duplicated successfully');
      navigate(`/tours/${duplicated.id}/edit`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to duplicate tour');
    }
    handleMenuClose();
  };

  const handlePublishTour = async (tour: Tour) => {
    try {
      await toursService.publishTour(tour.id);
      toast.success('Tour published successfully');
      fetchTours();
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish tour');
    }
    handleMenuClose();
  };

  const handleArchiveTour = async (tour: Tour) => {
    try {
      await toursService.archiveTour(tour.id);
      toast.success('Tour archived successfully');
      fetchTours();
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive tour');
    }
    handleMenuClose();
  };

  const handleSelectTour = (tourId: string) => {
    setSelectedTours(prev =>
      prev.includes(tourId)
        ? prev.filter(id => id !== tourId)
        : [...prev, tourId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTours.length === tours.length) {
      setSelectedTours([]);
    } else {
      setSelectedTours(tours.map(t => t.id));
    }
  };

  const handleBulkDelete = async () => {
    try {
      const result = await toursService.bulkDelete(selectedTours);
      toast.success(`${result.deleted} tours deleted successfully`);
      setSelectedTours([]);
      fetchTours();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete tours');
    } finally {
      setBulkDeleteDialogOpen(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await toursService.exportTours(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tours-${new Date().toISOString()}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Tours exported successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export tours');
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderTourCard = (tour: Tour) => (
    <Card
      key={tour.id}
      sx={{
        height: '100%',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
        position: 'relative',
      }}
      onClick={() => handleTourClick(tour)}
    >
      {/* Selection Checkbox */}
      {!embedded && (
        <Checkbox
          checked={selectedTours.includes(tour.id)}
          onChange={(e) => {
            e.stopPropagation();
            handleSelectTour(tour.id);
          }}
          sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }}
        />
      )}

      {/* Tour Image */}
      <Box
        sx={{
          height: 200,
          backgroundImage: `url(${tour.images[0]?.url || '/placeholder-tour.jpg'})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      >
        {/* Featured Badge */}
        {tour.featured && (
          <Chip
            label="Featured"
            color="primary"
            size="small"
            sx={{ position: 'absolute', top: 8, right: 8 }}
          />
        )}
        
        {/* Actions Menu */}
        {!embedded && (
          <IconButton
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              backgroundColor: 'rgba(255,255,255,0.9)',
              '&:hover': { backgroundColor: 'white' },
            }}
            onClick={(e) => handleMenuOpen(e, tour)}
          >
            <MoreIcon />
          </IconButton>
        )}
      </Box>

      <CardContent>
        {/* Title */}
        <Typography variant="h6" gutterBottom noWrap>
          {tour.title}
        </Typography>

        {/* Short Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            height: '3em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {tour.shortDescription}
        </Typography>

        {/* Details */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <Chip label={tour.category} size="small" variant="outlined" />
          <Chip label={tour.difficulty} size="small" variant="outlined" color="warning" />
          <Chip
            label={`${tour.duration.days}D/${tour.duration.nights}N`}
            size="small"
            variant="outlined"
          />
        </Box>

        {/* Location */}
        <Typography variant="body2" color="text.secondary" gutterBottom>
          📍 {tour.location.city}, {tour.location.country}
        </Typography>

        {/* Rating */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            ⭐ {tour.rating.toFixed(1)} ({tour.totalReviews} reviews)
          </Typography>
        </Box>

        {/* Price */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Box>
            <Typography variant="h6" color="primary">
              {tour.basePrice.currency} {tour.basePrice.amount.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              per person
            </Typography>
          </Box>

          {/* Status Badge */}
          <Chip
            label={tour.status}
            size="small"
            color={
              tour.status === 'active' ? 'success' :
              tour.status === 'draft' ? 'default' :
              tour.status === 'inactive' ? 'warning' : 'error'
            }
          />
        </Box>
      </CardContent>
    </Card>
  );

  const renderSkeleton = () => (
    <Card sx={{ height: '100%' }}>
      <Skeleton variant="rectangular" height={200} />
      <CardContent>
        <Skeleton variant="text" height={32} width="80%" />
        <Skeleton variant="text" height={20} width="100%" />
        <Skeleton variant="text" height={20} width="100%" />
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Skeleton variant="rounded" width={80} height={24} />
          <Skeleton variant="rounded" width={80} height={24} />
          <Skeleton variant="rounded" width={60} height={24} />
        </Box>
      </CardContent>
    </Card>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Box sx={{ p: embedded ? 0 : 3 }}>
      {/* Header */}
      {!embedded && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Tours Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {total} tours found
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={handleExport}
            >
              Export
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateTour}
            >
              Create Tour
            </Button>
          </Box>
        </Box>
      )}

      {/* Search and Filters */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search tours..."
              value={searchQuery}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={6} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
            {Object.keys(filters).length > 0 && (
              <Button onClick={handleClearFilters}>
                Clear Filters
              </Button>
            )}
          </Grid>
        </Grid>

        {/* Filter Panel */}
        {showFilters && (
          <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status?.[0] || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value ? [e.target.value] : undefined)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="archived">Archived</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {/* Add more filter controls as needed */}
            </Grid>
          </Box>
        )}
      </Box>

      {/* Bulk Actions */}
      {selectedTours.length > 0 && !embedded && (
        <Box sx={{ mb: 2, p: 2, backgroundColor: 'primary.50', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography>
              {selectedTours.length} tour(s) selected
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                onClick={handleSelectAll}
              >
                {selectedTours.length === tours.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button
                size="small"
                color="error"
                onClick={() => setBulkDeleteDialogOpen(true)}
              >
                Delete Selected
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tours Grid */}
      <Grid container spacing={3}>
        {loading ? (
          // Loading Skeletons
          Array.from({ length: pageSize }).map((_, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              {renderSkeleton()}
            </Grid>
          ))
        ) : tours.length === 0 ? (
          // Empty State
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No tours found
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {searchQuery || Object.keys(filters).length > 0
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first tour'}
              </Typography>
              {!embedded && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateTour}
                  sx={{ mt: 2 }}
                >
                  Create Tour
                </Button>
              )}
            </Box>
          </Grid>
        ) : (
          // Tours
          tours.map((tour) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={tour.id}>
              {renderTourCard(tour)}
            </Grid>
          ))
        )}
      </Grid>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            size="medium"
          />
        </Box>
      )}

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => actionTour && handleViewTour(actionTour)}>
          <ViewIcon sx={{ mr: 1 }} fontSize="small" />
          View
        </MenuItem>
        <MenuItem onClick={() => actionTour && handleEditTour(actionTour)}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        <MenuItem onClick={() => actionTour && handleDuplicateTour(actionTour)}>
          <DuplicateIcon sx={{ mr: 1 }} fontSize="small" />
          Duplicate
        </MenuItem>
        {actionTour?.status === 'draft' && (
          <MenuItem onClick={() => actionTour && handlePublishTour(actionTour)}>
            <PublishIcon sx={{ mr: 1 }} fontSize="small" />
            Publish
          </MenuItem>
        )}
        <MenuItem onClick={() => actionTour && handleArchiveTour(actionTour)}>
          <ArchiveIcon sx={{ mr: 1 }} fontSize="small" />
          Archive
        </MenuItem>
        <MenuItem onClick={() => actionTour && handleDeleteClick(actionTour)} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Tour</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{actionTour?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onClose={() => setBulkDeleteDialogOpen(false)}>
        <DialogTitle>Delete Multiple Tours</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedTours.length} tour(s)? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleBulkDelete} color="error" variant="contained">
            Delete All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TourList;
