/**
 * Tour Form Component
 * 
 * Form for creating and editing tours with validation and image upload
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Alert,
  LinearProgress,
  InputAdornment,
  Autocomplete,
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  ArrowBack as BackIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';

import toursService from '../../services/toursService';
import type { TourFormData, Tour, TourCategory, TourDifficulty, TourStatus } from '../../types/tour.types';

// ============================================================================
// TYPES
// ============================================================================

interface TourFormProps {
  mode?: 'create' | 'edit';
  initialData?: Tour;
  onSuccess?: (tour: Tour) => void;
  onCancel?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FORM_STEPS = ['Basic Info', 'Details', 'Pricing', 'Media', 'Review'];

const CATEGORIES: TourCategory[] = [
  'adventure', 'cultural', 'wildlife', 'beach', 'mountain',
  'city', 'food', 'wellness', 'luxury', 'budget',
  'family', 'couples', 'solo', 'group'
];

const DIFFICULTIES: TourDifficulty[] = ['easy', 'moderate', 'challenging', 'extreme'];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];

const COUNTRIES = [
  'United States', 'Spain', 'France', 'Italy', 'Japan',
  'Thailand', 'Australia', 'Brazil', 'Mexico', 'India'
];

// ============================================================================
// COMPONENT
// ============================================================================

const TourForm: React.FC<TourFormProps> = ({
  mode = 'create',
  initialData,
  onSuccess,
  onCancel,
}) => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // State
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');

  // Form
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TourFormData>({
    defaultValues: initialData ? {
      title: initialData.title,
      shortDescription: initialData.shortDescription,
      description: initialData.description,
      category: initialData.category,
      tags: initialData.tags,
      difficulty: initialData.difficulty,
      location: initialData.location,
      destinations: initialData.destinations,
      duration: initialData.duration,
      minParticipants: initialData.minParticipants,
      maxParticipants: initialData.maxParticipants,
      basePrice: {
        amount: initialData.basePrice.amount,
        currency: initialData.basePrice.currency,
      },
      status: initialData.status,
    } : {
      title: '',
      shortDescription: '',
      description: '',
      category: 'adventure',
      tags: [],
      difficulty: 'moderate',
      location: {
        country: '',
        city: '',
        address: '',
      },
      destinations: [],
      duration: {
        days: 1,
        nights: 0,
      },
      minParticipants: 1,
      maxParticipants: 10,
      basePrice: {
        amount: 0,
        currency: 'USD',
      },
      status: 'draft',
    },
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (mode === 'edit' && id && !initialData) {
      loadTourData();
    }
  }, [mode, id, initialData]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const loadTourData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const tour = await toursService.getTour(id);
      
      // Populate form with tour data
      Object.keys(tour).forEach((key) => {
        if (key in tour) {
          setValue(key as any, (tour as any)[key]);
        }
      });
      
      setTags(tour.tags);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load tour');
      navigate('/tours');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length + images.length > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }

    setImages([...images, ...files]);

    // Create preview URLs
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreview((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      setValue('tags', newTags);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(newTags);
    setValue('tags', newTags);
  };

  const onSubmit = async (data: TourFormData) => {
    try {
      setSubmitting(true);

      let tour: Tour;

      if (mode === 'create') {
        // Create new tour
        tour = await toursService.createTour(data);
        
        // Upload images if any
        if (images.length > 0) {
          setUploadingImages(true);
          await toursService.uploadImages(
            tour.id,
            images,
            (progress) => setUploadProgress(progress)
          );
        }
        
        toast.success('Tour created successfully!');
      } else if (id) {
        // Update existing tour
        tour = await toursService.updateTour(id, data);
        
        // Upload new images if any
        if (images.length > 0) {
          setUploadingImages(true);
          await toursService.uploadImages(
            tour.id,
            images,
            (progress) => setUploadProgress(progress)
          );
        }
        
        toast.success('Tour updated successfully!');
      } else {
        throw new Error('No tour ID for update');
      }

      if (onSuccess) {
        onSuccess(tour);
      } else {
        navigate(`/tours/${tour.id}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save tour');
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/tours');
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderBasicInfo();
      case 1:
        return renderDetails();
      case 2:
        return renderPricing();
      case 3:
        return renderMedia();
      case 4:
        return renderReview();
      default:
        return null;
    }
  };

  const renderBasicInfo = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Controller
          name="title"
          control={control}
          rules={{ required: 'Title is required' }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Tour Title"
              error={!!errors.title}
              helperText={errors.title?.message}
              placeholder="e.g., Amazing 7-Day Adventure in Costa Rica"
            />
          )}
        />
      </Grid>

      <Grid item xs={12}>
        <Controller
          name="shortDescription"
          control={control}
          rules={{ required: 'Short description is required', maxLength: 160 }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              multiline
              rows={2}
              label="Short Description"
              error={!!errors.shortDescription}
              helperText={errors.shortDescription?.message || `${field.value?.length || 0}/160 characters`}
              placeholder="Brief description for listings"
            />
          )}
        />
      </Grid>

      <Grid item xs={12}>
        <Controller
          name="description"
          control={control}
          rules={{ required: 'Description is required' }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              multiline
              rows={6}
              label="Full Description"
              error={!!errors.description}
              helperText={errors.description?.message}
              placeholder="Detailed tour description..."
            />
          )}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <Controller
          name="category"
          control={control}
          rules={{ required: 'Category is required' }}
          render={({ field }) => (
            <FormControl fullWidth error={!!errors.category}>
              <InputLabel>Category</InputLabel>
              <Select {...field} label="Category">
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <Controller
          name="difficulty"
          control={control}
          rules={{ required: 'Difficulty is required' }}
          render={({ field }) => (
            <FormControl fullWidth error={!!errors.difficulty}>
              <InputLabel>Difficulty</InputLabel>
              <Select {...field} label="Difficulty">
                {DIFFICULTIES.map((diff) => (
                  <MenuItem key={diff} value={diff}>
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />
      </Grid>

      <Grid item xs={12}>
        <Box>
          <TextField
            fullWidth
            label="Tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleAddTag} edge="end">
                    <AddIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            placeholder="Add tags and press Enter"
          />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
            {tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onDelete={() => handleRemoveTag(tag)}
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      </Grid>
    </Grid>
  );

  const renderDetails = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Controller
          name="location.country"
          control={control}
          rules={{ required: 'Country is required' }}
          render={({ field }) => (
            <Autocomplete
              {...field}
              options={COUNTRIES}
              value={field.value}
              onChange={(_, value) => field.onChange(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Country"
                  error={!!errors.location?.country}
                  helperText={errors.location?.country?.message}
                />
              )}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <Controller
          name="location.city"
          control={control}
          rules={{ required: 'City is required' }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="City"
              error={!!errors.location?.city}
              helperText={errors.location?.city?.message}
            />
          )}
        />
      </Grid>

      <Grid item xs={12}>
        <Controller
          name="location.address"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Address (Optional)"
              placeholder="Starting point address"
            />
          )}
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <Controller
          name="duration.days"
          control={control}
          rules={{ required: 'Days is required', min: 1 }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="number"
              label="Duration (Days)"
              error={!!errors.duration?.days}
              helperText={errors.duration?.days?.message}
              InputProps={{ inputProps: { min: 1 } }}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <Controller
          name="duration.nights"
          control={control}
          rules={{ required: 'Nights is required', min: 0 }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="number"
              label="Duration (Nights)"
              error={!!errors.duration?.nights}
              helperText={errors.duration?.nights?.message}
              InputProps={{ inputProps: { min: 0 } }}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select {...field} label="Status">
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          )}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <Controller
          name="minParticipants"
          control={control}
          rules={{ required: 'Min participants is required', min: 1 }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="number"
              label="Minimum Participants"
              error={!!errors.minParticipants}
              helperText={errors.minParticipants?.message}
              InputProps={{ inputProps: { min: 1 } }}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <Controller
          name="maxParticipants"
          control={control}
          rules={{ required: 'Max participants is required', min: 1 }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="number"
              label="Maximum Participants"
              error={!!errors.maxParticipants}
              helperText={errors.maxParticipants?.message}
              InputProps={{ inputProps: { min: 1 } }}
            />
          )}
        />
      </Grid>
    </Grid>
  );

  const renderPricing = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Controller
          name="basePrice.amount"
          control={control}
          rules={{ required: 'Price is required', min: 0 }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="number"
              label="Base Price"
              error={!!errors.basePrice?.amount}
              helperText={errors.basePrice?.amount?.message}
              InputProps={{
                inputProps: { min: 0, step: 0.01 },
                startAdornment: (
                  <InputAdornment position="start">
                    {watch('basePrice.currency') || 'USD'}
                  </InputAdornment>
                ),
              }}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <Controller
          name="basePrice.currency"
          control={control}
          rules={{ required: 'Currency is required' }}
          render={({ field }) => (
            <FormControl fullWidth error={!!errors.basePrice?.currency}>
              <InputLabel>Currency</InputLabel>
              <Select {...field} label="Currency">
                {CURRENCIES.map((curr) => (
                  <MenuItem key={curr} value={curr}>
                    {curr}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />
      </Grid>

      <Grid item xs={12}>
        <Alert severity="info">
          Additional pricing options (seasonal pricing, group discounts, etc.) can be configured after creating the tour.
        </Alert>
      </Grid>
    </Grid>
  );

  const renderMedia = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box
          sx={{
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
          }}
        >
          <input
            accept="image/*"
            style={{ display: 'none' }}
            id="image-upload"
            multiple
            type="file"
            onChange={handleImageUpload}
          />
          <label htmlFor="image-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={<UploadIcon />}
              size="large"
            >
              Upload Images
            </Button>
          </label>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Upload up to 10 images (JPG, PNG)
          </Typography>
        </Box>
      </Grid>

      {imagePreview.length > 0 && (
        <Grid item xs={12}>
          <Grid container spacing={2}>
            {imagePreview.map((preview, index) => (
              <Grid item xs={6} sm={4} md={3} key={index}>
                <Box sx={{ position: 'relative' }}>
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '150px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                    }}
                  />
                  <IconButton
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      '&:hover': { backgroundColor: 'white' },
                    }}
                    onClick={() => handleRemoveImage(index)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                  {index === 0 && (
                    <Chip
                      label="Primary"
                      size="small"
                      color="primary"
                      sx={{ position: 'absolute', bottom: 8, left: 8 }}
                    />
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {uploadingImages && (
        <Grid item xs={12}>
          <Box sx={{ width: '100%' }}>
            <Typography variant="body2" gutterBottom>
              Uploading images... {uploadProgress}%
            </Typography>
            <LinearProgress variant="determinate" value={uploadProgress} />
          </Box>
        </Grid>
      )}
    </Grid>
  );

  const renderReview = () => {
    const formData = watch();
    
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Alert severity="info">
            Please review your tour information before submitting.
          </Alert>
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {formData.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {formData.shortDescription}
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Category:</strong> {formData.category}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Difficulty:</strong> {formData.difficulty}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Duration:</strong> {formData.duration.days}D/{formData.duration.nights}N
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Location:</strong> {formData.location.city}, {formData.location.country}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Participants:</strong> {formData.minParticipants}-{formData.maxParticipants}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Price:</strong> {formData.basePrice.currency} {formData.basePrice.amount}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2">
                    <strong>Images:</strong> {imagePreview.length} uploaded
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading tour data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {mode === 'create' ? 'Create New Tour' : 'Edit Tour'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {mode === 'create' 
              ? 'Fill in the details to create a new tour'
              : 'Update tour information'
            }
          </Typography>
        </Box>
        <IconButton onClick={handleCancel}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {FORM_STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardContent sx={{ p: 4 }}>
            {renderStepContent(activeStep)}
          </CardContent>
        </Card>

        {/* Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            startIcon={<BackIcon />}
            onClick={activeStep === 0 ? handleCancel : handleBack}
            disabled={submitting}
          >
            {activeStep === 0 ? 'Cancel' : 'Back'}
          </Button>

          <Box sx={{ display: 'flex', gap: 2 }}>
            {activeStep < FORM_STEPS.length - 1 ? (
              <Button variant="contained" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={submitting || uploadingImages}
              >
                {submitting ? 'Saving...' : mode === 'create' ? 'Create Tour' : 'Update Tour'}
              </Button>
            )}
          </Box>
        </Box>
      </form>
    </Box>
  );
};

export default TourForm;
