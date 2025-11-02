import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Checkbox,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  Autocomplete,
  InputAdornment,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Flag as FlagIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import toast from 'react-hot-toast';
import customersService from '../../services/customersService';
import {
  CustomerFormData,
  CustomerStatus,
  CustomerTier,
  CustomerSource,
  PreferredContactMethod,
} from '../../types/customer.types';

// ============================================================================
// Component
// ============================================================================

const CustomerForm: React.FC = () => {
  const navigate = useNavigate();
  const { customerId } = useParams<{ customerId: string }>();
  const isEditMode = Boolean(customerId);

  // ==========================================================================
  // State Management
  // ==========================================================================

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);

  // Date state
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);

  // Tags state
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // ==========================================================================
  // React Hook Form
  // ==========================================================================

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
    watch,
  } = useForm<CustomerFormData>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      secondaryPhone: '',
      nationality: '',
      status: CustomerStatus.ACTIVE,
      tier: CustomerTier.BRONZE,
      source: CustomerSource.WEBSITE,
      preferredContactMethod: PreferredContactMethod.EMAIL,
      address: {
        street: '',
        street2: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
      },
      emergencyContact: {
        name: '',
        relationship: '',
        phone: '',
        email: '',
        address: '',
      },
      marketingConsent: false,
      smsConsent: false,
      assignedAgent: '',
      initialNote: '',
    },
  });

  // ==========================================================================
  // Fetch Customer Data (Edit Mode)
  // ==========================================================================

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!customerId) return;

      try {
        setFetchLoading(true);
        const response = await customersService.getCustomerById(customerId);
        const customer = response.customer;

        // Populate form with customer data
        reset({
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          secondaryPhone: customer.secondaryPhone || '',
          nationality: customer.nationality || '',
          status: customer.status,
          tier: customer.tier,
          source: customer.source,
          preferredContactMethod: customer.preferredContactMethod,
          address: customer.address || {
            street: '',
            street2: '',
            city: '',
            state: '',
            postalCode: '',
            country: '',
          },
          emergencyContact: customer.emergencyContact || {
            name: '',
            relationship: '',
            phone: '',
            email: '',
            address: '',
          },
          marketingConsent: customer.marketingConsent,
          smsConsent: customer.smsConsent,
          assignedAgent: customer.assignedAgent || '',
        });

        // Set date of birth
        if (customer.dateOfBirth) {
          setDateOfBirth(new Date(customer.dateOfBirth));
        }

        // Set tags
        setSelectedTags(customer.tags || []);
      } catch (err: any) {
        console.error('Error fetching customer:', err);
        setError(err.message || 'Failed to load customer');
        toast.error('Failed to load customer data');
      } finally {
        setFetchLoading(false);
      }
    };

    fetchCustomer();
  }, [customerId, reset]);

  // ==========================================================================
  // Fetch Available Tags
  // ==========================================================================

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await customersService.getAllTags();
        setAvailableTags(tags);
      } catch (err) {
        console.error('Error fetching tags:', err);
      }
    };

    fetchTags();
  }, []);

  // ==========================================================================
  // Form Submission
  // ==========================================================================

  const onSubmit = async (data: CustomerFormData) => {
    try {
      setLoading(true);
      setError(null);

      // Prepare data with date and tags
      const formData: CustomerFormData = {
        ...data,
        dateOfBirth: dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : undefined,
        tags: selectedTags,
      };

      if (isEditMode && customerId) {
        // Update existing customer
        await customersService.updateCustomer(customerId, formData);
        toast.success('Customer updated successfully');
        navigate(`/customers/${customerId}`);
      } else {
        // Create new customer
        const newCustomer = await customersService.createCustomer(formData);
        toast.success('Customer created successfully');
        navigate(`/customers/${newCustomer.id}`);
      }
    } catch (err: any) {
      console.error('Error saving customer:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to save customer';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleCancel = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
      return;
    }
    navigate(isEditMode ? `/customers/${customerId}` : '/customers');
  };

  // ==========================================================================
  // Render Loading State
  // ==========================================================================

  if (fetchLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {isEditMode ? 'Edit Customer' : 'Add New Customer'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isEditMode 
              ? 'Update customer information and preferences'
              : 'Create a new customer profile with contact details'
            }
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            {/* Personal Information */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon /> Personal Information
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="firstName"
                      control={control}
                      rules={{ required: 'First name is required' }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="First Name"
                          fullWidth
                          required
                          error={!!errors.firstName}
                          helperText={errors.firstName?.message}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="lastName"
                      control={control}
                      rules={{ required: 'Last name is required' }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Last Name"
                          fullWidth
                          required
                          error={!!errors.lastName}
                          helperText={errors.lastName?.message}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="email"
                      control={control}
                      rules={{
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address',
                        },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Email"
                          type="email"
                          fullWidth
                          required
                          error={!!errors.email}
                          helperText={errors.email?.message}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <EmailIcon />
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="phone"
                      control={control}
                      rules={{ required: 'Phone number is required' }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Phone"
                          fullWidth
                          required
                          error={!!errors.phone}
                          helperText={errors.phone?.message}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PhoneIcon />
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="secondaryPhone"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Secondary Phone"
                          fullWidth
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PhoneIcon />
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="Date of Birth"
                      value={dateOfBirth}
                      onChange={(newValue) => setDateOfBirth(newValue)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                        },
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="nationality"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Nationality"
                          fullWidth
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <FlagIcon />
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Address Information */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationIcon /> Address Information
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Controller
                      name="address.street"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Street Address"
                          fullWidth
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name="address.street2"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Street Address 2 (Apt, Suite, etc.)"
                          fullWidth
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="address.city"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="City"
                          fullWidth
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="address.state"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="State / Province"
                          fullWidth
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="address.postalCode"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Postal Code"
                          fullWidth
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="address.country"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Country"
                          fullWidth
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Customer Status & Classification */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Status & Classification
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>Status</InputLabel>
                          <Select {...field} label="Status">
                            {Object.values(CustomerStatus).map((status) => (
                              <MenuItem key={status} value={status}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Controller
                      name="tier"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>Tier</InputLabel>
                          <Select {...field} label="Tier">
                            {Object.values(CustomerTier).map((tier) => (
                              <MenuItem key={tier} value={tier}>
                                {tier.charAt(0).toUpperCase() + tier.slice(1)}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Controller
                      name="source"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>Source</InputLabel>
                          <Select {...field} label="Source">
                            {Object.values(CustomerSource).map((source) => (
                              <MenuItem key={source} value={source}>
                                {source.replace('_', ' ').toUpperCase()}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Controller
                      name="preferredContactMethod"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>Preferred Contact</InputLabel>
                          <Select {...field} label="Preferred Contact">
                            {Object.values(PreferredContactMethod).map((method) => (
                              <MenuItem key={method} value={method}>
                                {method.charAt(0).toUpperCase() + method.slice(1)}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Autocomplete
                      multiple
                      freeSolo
                      options={availableTags}
                      value={selectedTags}
                      onChange={(_, newValue) => setSelectedTags(newValue)}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            label={option}
                            {...getTagProps({ index })}
                            key={option}
                          />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Tags"
                          placeholder="Add tags"
                          helperText="Press Enter to add new tags"
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Emergency Contact */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Emergency Contact
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="emergencyContact.name"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Contact Name"
                          fullWidth
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="emergencyContact.relationship"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Relationship"
                          fullWidth
                          placeholder="e.g., Spouse, Parent, Sibling"
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="emergencyContact.phone"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Phone"
                          fullWidth
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PhoneIcon />
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="emergencyContact.email"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Email"
                          type="email"
                          fullWidth
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <EmailIcon />
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name="emergencyContact.address"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Address"
                          fullWidth
                          multiline
                          rows={2}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Communication Preferences */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Communication Preferences
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Controller
                      name="marketingConsent"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Checkbox {...field} checked={field.value} />}
                          label="Send marketing emails and newsletters"
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name="smsConsent"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Checkbox {...field} checked={field.value} />}
                          label="Send SMS notifications and updates"
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Initial Note (Create Mode Only) */}
            {!isEditMode && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Initial Note (Optional)
                  </Typography>
                  <Divider sx={{ mb: 3 }} />

                  <Controller
                    name="initialNote"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Note"
                        fullWidth
                        multiline
                        rows={4}
                        placeholder="Add any relevant notes about this customer..."
                      />
                    )}
                  />
                </Paper>
              </Grid>
            )}

            {/* Form Actions */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : isEditMode ? 'Update Customer' : 'Create Customer'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Box>
    </LocalizationProvider>
  );
};

export default CustomerForm;
