import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  Autocomplete,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Save as SaveIcon,
  Restaurant as DietIcon,
  Accessible as AccessibilityIcon,
  Hotel as RoomIcon,
  Notifications as NotificationIcon,
  Language as LanguageIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import customersService from '../../services/customersService';
import { CustomerPreferences as PreferencesType } from '../../types/customer.types';

// ============================================================================
// Props Interface
// ============================================================================

interface CustomerPreferencesProps {
  customerId: string;
  preferences: PreferencesType;
  onUpdate?: () => void;
}

// ============================================================================
// Component
// ============================================================================

const CustomerPreferences: React.FC<CustomerPreferencesProps> = ({
  customerId,
  preferences: initialPreferences,
  onUpdate,
}) => {
  // ==========================================================================
  // State Management
  // ==========================================================================

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Autocomplete options
  const [tourCategories] = useState<string[]>([
    'Adventure',
    'Cultural',
    'Wildlife',
    'Beach',
    'Mountain',
    'City Tours',
    'Food & Wine',
    'Historical',
  ]);

  const [dietaryOptions] = useState<string[]>([
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Dairy-Free',
    'Nut Allergy',
    'Seafood Allergy',
    'Halal',
    'Kosher',
    'Low Sodium',
    'Diabetic',
  ]);

  const [accessibilityOptions] = useState<string[]>([
    'Wheelchair Access',
    'Hearing Impaired',
    'Visual Impaired',
    'Mobility Issues',
    'Service Animal',
    'Special Equipment Required',
  ]);

  const [languages] = useState<string[]>([
    'English',
    'Spanish',
    'French',
    'German',
    'Italian',
    'Portuguese',
    'Chinese',
    'Japanese',
    'Arabic',
  ]);

  const [timezones] = useState<string[]>([
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Australia/Sydney',
  ]);

  // ==========================================================================
  // React Hook Form
  // ==========================================================================

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<PreferencesType>({
    defaultValues: initialPreferences,
  });

  // Reset form when preferences change
  useEffect(() => {
    reset(initialPreferences);
  }, [initialPreferences, reset]);

  // ==========================================================================
  // Form Submission
  // ==========================================================================

  const onSubmit = async (data: PreferencesType) => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      await customersService.updateCustomer(customerId, {
        preferences: data,
      } as any);

      setSuccessMessage('Preferences updated successfully');
      toast.success('Preferences updated successfully');

      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      console.error('Error updating preferences:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update preferences';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <Box>
      {/* Success Message */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          {/* Travel Preferences */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DietIcon /> Travel Preferences
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Controller
                    name="preferredTourCategories"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        {...field}
                        multiple
                        options={tourCategories}
                        value={field.value || []}
                        onChange={(_, newValue) => field.onChange(newValue)}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip label={option} {...getTagProps({ index })} key={option} />
                          ))
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Preferred Tour Categories"
                            placeholder="Select categories"
                          />
                        )}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="dietaryRestrictions"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        {...field}
                        multiple
                        freeSolo
                        options={dietaryOptions}
                        value={field.value || []}
                        onChange={(_, newValue) => field.onChange(newValue)}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              label={option}
                              {...getTagProps({ index })}
                              key={option}
                              color="warning"
                            />
                          ))
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Dietary Restrictions"
                            placeholder="Add restrictions"
                            helperText="Important for meal planning during tours"
                          />
                        )}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="accessibilityNeeds"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        {...field}
                        multiple
                        freeSolo
                        options={accessibilityOptions}
                        value={field.value || []}
                        onChange={(_, newValue) => field.onChange(newValue)}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              label={option}
                              {...getTagProps({ index })}
                              key={option}
                              icon={<AccessibilityIcon />}
                            />
                          ))
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Accessibility Needs"
                            placeholder="Add accessibility requirements"
                            helperText="Helps us provide appropriate accommodations"
                          />
                        )}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="roomPreference"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Room Preference</InputLabel>
                        <Select {...field} label="Room Preference">
                          <MenuItem value="">None</MenuItem>
                          <MenuItem value="single">Single</MenuItem>
                          <MenuItem value="double">Double</MenuItem>
                          <MenuItem value="twin">Twin</MenuItem>
                          <MenuItem value="suite">Suite</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="bedPreference"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Bed Preference</InputLabel>
                        <Select {...field} label="Bed Preference">
                          <MenuItem value="">None</MenuItem>
                          <MenuItem value="single">Single</MenuItem>
                          <MenuItem value="double">Double</MenuItem>
                          <MenuItem value="king">King</MenuItem>
                          <MenuItem value="queen">Queen</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="smokingPreference"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Smoking Preference</InputLabel>
                        <Select {...field} label="Smoking Preference">
                          <MenuItem value="">None</MenuItem>
                          <MenuItem value="smoking">Smoking</MenuItem>
                          <MenuItem value="non-smoking">Non-Smoking</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Communication Preferences */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LanguageIcon /> Communication Preferences
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="language"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Preferred Language</InputLabel>
                        <Select {...field} label="Preferred Language">
                          {languages.map((lang) => (
                            <MenuItem key={lang} value={lang}>
                              {lang}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="timezone"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Timezone</InputLabel>
                        <Select {...field} label="Timezone">
                          {timezones.map((tz) => (
                            <MenuItem key={tz} value={tz}>
                              {tz.replace('_', ' ')}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="receiveNewsletter"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="Receive Newsletter"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="receivePromotions"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="Receive Promotions & Special Offers"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="receiveBookingReminders"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="Receive Booking Reminders"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Notification Settings */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <NotificationIcon /> Notification Settings
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="emailNotifications"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="Email Notifications"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="smsNotifications"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="SMS Notifications"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="whatsappNotifications"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="WhatsApp Notifications"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="pushNotifications"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="Push Notifications"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Frequent Special Requests */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Frequent Special Requests
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Controller
                name="frequentSpecialRequests"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    {...field}
                    multiple
                    freeSolo
                    options={[]}
                    value={field.value || []}
                    onChange={(_, newValue) => field.onChange(newValue)}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip label={option} {...getTagProps({ index })} key={option} />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Special Requests"
                        placeholder="Add common requests"
                        helperText="e.g., 'Extra pillows', 'Ground floor room', 'Window seat'"
                      />
                    )}
                  />
                )}
              />
            </Paper>
          </Grid>

          {/* Form Actions */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                disabled={loading || !isDirty}
              >
                {loading ? 'Saving...' : 'Save Preferences'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};

export default CustomerPreferences;
