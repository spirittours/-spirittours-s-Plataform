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
  Avatar,
  Chip,
  Stack,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Paper,
  Divider,
  Badge,
  Tooltip,
  Alert,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Language as LanguageIcon,
  Star as StarIcon,
  Verified as VerifiedIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { toursService } from '../../services/toursService';
import { TourGuide, Guide } from '../../types/tour.types';

interface TourGuidesProps {
  tourId: string;
  guides: TourGuide[];
  editable?: boolean;
  onGuidesChange?: (guides: TourGuide[]) => void;
}

interface GuideFormData {
  guideId: string;
  isPrimary: boolean;
  role: string;
  availability: string[];
}

const TourGuides: React.FC<TourGuidesProps> = ({
  tourId,
  guides: initialGuides,
  editable = false,
  onGuidesChange,
}) => {
  // State
  const [guides, setGuides] = useState<TourGuide[]>(initialGuides);
  const [availableGuides, setAvailableGuides] = useState<Guide[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [guideDetailsOpen, setGuideDetailsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<TourGuide | null>(null);
  const [selectedGuideDetails, setSelectedGuideDetails] = useState<Guide | null>(null);
  const [guideToDelete, setGuideToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<GuideFormData>({
    guideId: '',
    isPrimary: false,
    role: 'Tour Guide',
    availability: [],
  });

  // Load available guides
  useEffect(() => {
    loadAvailableGuides();
  }, []);

  const loadAvailableGuides = async () => {
    try {
      setLoading(true);
      const data = await toursService.getAvailableGuides();
      setAvailableGuides(data);
    } catch (error) {
      console.error('Failed to load available guides:', error);
      toast.error('Failed to load guides');
    } finally {
      setLoading(false);
    }
  };

  // Handle add guide
  const handleAddGuide = () => {
    setEditingGuide(null);
    setFormData({
      guideId: '',
      isPrimary: guides.length === 0, // First guide is primary by default
      role: 'Tour Guide',
      availability: [],
    });
    setDialogOpen(true);
  };

  // Handle edit guide
  const handleEditGuide = (guide: TourGuide) => {
    setEditingGuide(guide);
    setFormData({
      guideId: guide.id,
      isPrimary: guide.isPrimary || false,
      role: guide.role || 'Tour Guide',
      availability: guide.availability || [],
    });
    setDialogOpen(true);
  };

  // Handle save guide
  const handleSaveGuide = async () => {
    try {
      if (!formData.guideId) {
        toast.error('Please select a guide');
        return;
      }

      const selectedGuide = availableGuides.find(g => g.id === formData.guideId);
      if (!selectedGuide) {
        toast.error('Selected guide not found');
        return;
      }

      const guideData: TourGuide = {
        id: selectedGuide.id,
        name: selectedGuide.name,
        avatar: selectedGuide.avatar,
        bio: selectedGuide.bio,
        languages: selectedGuide.languages,
        rating: selectedGuide.rating,
        totalReviews: selectedGuide.totalReviews,
        isVerified: selectedGuide.isVerified,
        isPrimary: formData.isPrimary,
        role: formData.role,
        availability: formData.availability,
      };

      let updatedGuides: TourGuide[];

      if (editingGuide) {
        updatedGuides = guides.map(g =>
          g.id === editingGuide.id ? guideData : { ...g, isPrimary: formData.isPrimary ? false : g.isPrimary }
        );
      } else {
        // If new guide is primary, set all others to non-primary
        updatedGuides = formData.isPrimary
          ? [...guides.map(g => ({ ...g, isPrimary: false })), guideData]
          : [...guides, guideData];
      }

      setGuides(updatedGuides);
      onGuidesChange?.(updatedGuides);

      await toursService.updateTourGuides(tourId, updatedGuides);
      toast.success(editingGuide ? 'Guide updated successfully' : 'Guide added successfully');
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to save guide:', error);
      toast.error('Failed to save guide');
    }
  };

  // Handle delete guide
  const handleDeleteGuide = async () => {
    if (!guideToDelete) return;

    try {
      const updatedGuides = guides.filter(g => g.id !== guideToDelete);
      
      // If deleted guide was primary, make first remaining guide primary
      if (updatedGuides.length > 0 && !updatedGuides.some(g => g.isPrimary)) {
        updatedGuides[0].isPrimary = true;
      }

      setGuides(updatedGuides);
      onGuidesChange?.(updatedGuides);

      await toursService.updateTourGuides(tourId, updatedGuides);
      toast.success('Guide removed successfully');
      setDeleteConfirmOpen(false);
      setGuideToDelete(null);
    } catch (error) {
      console.error('Failed to delete guide:', error);
      toast.error('Failed to remove guide');
    }
  };

  // Handle set primary
  const handleSetPrimary = async (guideId: string) => {
    try {
      const updatedGuides = guides.map(g => ({
        ...g,
        isPrimary: g.id === guideId,
      }));

      setGuides(updatedGuides);
      onGuidesChange?.(updatedGuides);

      await toursService.updateTourGuides(tourId, updatedGuides);
      toast.success('Primary guide updated');
    } catch (error) {
      console.error('Failed to set primary guide:', error);
      toast.error('Failed to update primary guide');
    }
  };

  // Handle view guide details
  const handleViewDetails = async (guideId: string) => {
    try {
      const guide = availableGuides.find(g => g.id === guideId);
      if (!guide) {
        const fullGuide = await toursService.getGuide(guideId);
        setSelectedGuideDetails(fullGuide);
      } else {
        setSelectedGuideDetails(guide);
      }
      setGuideDetailsOpen(true);
    } catch (error) {
      console.error('Failed to load guide details:', error);
      toast.error('Failed to load guide details');
    }
  };

  // Render guide card
  const renderGuideCard = (guide: TourGuide) => (
    <Grid item xs={12} sm={6} md={4} key={guide.id}>
      <Card sx={{ height: '100%', position: 'relative' }}>
        {guide.isPrimary && (
          <Chip
            label="Primary Guide"
            color="primary"
            size="small"
            icon={<CheckCircleIcon />}
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 1,
            }}
          />
        )}
        
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                guide.isVerified ? (
                  <VerifiedIcon sx={{ color: 'success.main', fontSize: 20 }} />
                ) : null
              }
            >
              <Avatar
                src={guide.avatar}
                alt={guide.name}
                sx={{ width: 80, height: 80, mb: 1 }}
              />
            </Badge>
            
            <Typography variant="h6" align="center">
              {guide.name}
            </Typography>
            
            {guide.role && (
              <Typography variant="caption" color="text.secondary" align="center">
                {guide.role}
              </Typography>
            )}
            
            {guide.rating && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                <Rating value={guide.rating} size="small" readOnly precision={0.1} />
                <Typography variant="caption" color="text.secondary">
                  ({guide.totalReviews || 0})
                </Typography>
              </Box>
            )}
          </Box>
          
          {guide.bio && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} noWrap>
              {guide.bio}
            </Typography>
          )}
          
          {guide.languages && guide.languages.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                {guide.languages.slice(0, 3).map((lang) => (
                  <Chip
                    key={lang}
                    label={lang}
                    size="small"
                    icon={<LanguageIcon />}
                    variant="outlined"
                  />
                ))}
                {guide.languages.length > 3 && (
                  <Chip
                    label={`+${guide.languages.length - 3}`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>
            </Box>
          )}
          
          <Stack spacing={1}>
            <Button
              size="small"
              variant="outlined"
              fullWidth
              onClick={() => handleViewDetails(guide.id)}
            >
              View Details
            </Button>
            
            {editable && (
              <Stack direction="row" spacing={1}>
                {!guide.isPrimary && (
                  <Button
                    size="small"
                    variant="outlined"
                    fullWidth
                    startIcon={<StarIcon />}
                    onClick={() => handleSetPrimary(guide.id)}
                  >
                    Set Primary
                  </Button>
                )}
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => handleEditGuide(guide)}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    setGuideToDelete(guide.id);
                    setDeleteConfirmOpen(true);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );

  // Render guide dialog
  const renderGuideDialog = () => (
    <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        {editingGuide ? 'Edit Guide Assignment' : 'Assign Guide'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Autocomplete
              options={availableGuides.filter(g => !guides.some(tg => tg.id === g.id) || editingGuide?.id === g.id)}
              getOptionLabel={(option) => option.name}
              value={availableGuides.find(g => g.id === formData.guideId) || null}
              onChange={(e, value) => setFormData({ ...formData, guideId: value?.id || '' })}
              renderInput={(params) => (
                <TextField {...params} label="Select Guide" required />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Avatar src={option.avatar} sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="body2">{option.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.languages?.join(', ')}
                    </Typography>
                  </Box>
                </Box>
              )}
              disabled={!!editingGuide}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="e.g., Tour Guide, Assistant Guide, Driver Guide"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Checkbox
              checked={formData.isPrimary}
              onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
            />
            <Typography component="span" variant="body2">
              Set as Primary Guide
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
              Primary guide will be displayed prominently and handle main tour responsibilities
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Alert severity="info">
              You can assign multiple guides to a tour. The primary guide will be the main point of contact.
            </Alert>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
        <Button onClick={handleSaveGuide} variant="contained">
          {editingGuide ? 'Update' : 'Assign'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Render guide details dialog
  const renderGuideDetailsDialog = () => (
    <Dialog
      open={guideDetailsOpen}
      onClose={() => setGuideDetailsOpen(false)}
      maxWidth="md"
      fullWidth
    >
      {selectedGuideDetails && (
        <>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar src={selectedGuideDetails.avatar} sx={{ width: 60, height: 60 }} />
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6">{selectedGuideDetails.name}</Typography>
                  {selectedGuideDetails.isVerified && (
                    <Tooltip title="Verified Guide">
                      <VerifiedIcon color="success" />
                    </Tooltip>
                  )}
                </Box>
                {selectedGuideDetails.rating && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Rating value={selectedGuideDetails.rating} size="small" readOnly precision={0.1} />
                    <Typography variant="caption" color="text.secondary">
                      ({selectedGuideDetails.totalReviews || 0} reviews)
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  About
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedGuideDetails.bio || 'No bio available'}
                </Typography>
              </Grid>
              
              {selectedGuideDetails.languages && selectedGuideDetails.languages.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Languages
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {selectedGuideDetails.languages.map((lang) => (
                      <Chip key={lang} label={lang} icon={<LanguageIcon />} />
                    ))}
                  </Stack>
                </Grid>
              )}
              
              {selectedGuideDetails.specialties && selectedGuideDetails.specialties.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Specialties
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {selectedGuideDetails.specialties.map((specialty) => (
                      <Chip key={specialty} label={specialty} color="primary" variant="outlined" />
                    ))}
                  </Stack>
                </Grid>
              )}
              
              {selectedGuideDetails.certifications && selectedGuideDetails.certifications.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Certifications
                  </Typography>
                  <List>
                    {selectedGuideDetails.certifications.map((cert, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <CheckCircleIcon color="success" />
                        </ListItemIcon>
                        <ListItemText primary={cert} />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              )}
              
              <Grid item xs={12}>
                <Divider />
              </Grid>
              
              {selectedGuideDetails.email && (
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmailIcon color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Email
                      </Typography>
                      <Typography variant="body2">{selectedGuideDetails.email}</Typography>
                    </Box>
                  </Box>
                </Grid>
              )}
              
              {selectedGuideDetails.phone && (
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhoneIcon color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Phone
                      </Typography>
                      <Typography variant="body2">{selectedGuideDetails.phone}</Typography>
                    </Box>
                  </Box>
                </Grid>
              )}
              
              {selectedGuideDetails.experience && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Experience
                      </Typography>
                      <Typography variant="body2">
                        {selectedGuideDetails.experience} years
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGuideDetailsOpen(false)}>Close</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );

  // Render delete confirmation
  const renderDeleteConfirm = () => (
    <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
      <DialogTitle>Confirm Remove Guide</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to remove this guide from the tour? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
        <Button onClick={handleDeleteGuide} color="error" variant="contained">
          Remove
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      {editable && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">
            Tour Guides ({guides.length})
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddGuide}>
            Assign Guide
          </Button>
        </Box>
      )}

      {guides.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <PersonIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Guides Assigned
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {editable
              ? 'Assign professional guides to this tour to provide expert guidance and enhance the experience.'
              : 'No guides have been assigned to this tour yet.'}
          </Typography>
          {editable && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddGuide}>
              Assign First Guide
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {guides.map((guide) => renderGuideCard(guide))}
        </Grid>
      )}

      {renderGuideDialog()}
      {renderGuideDetailsDialog()}
      {renderDeleteConfirm()}
    </Box>
  );
};

export default TourGuides;
