/**
 * Customer Profile Component
 * Comprehensive customer profile management with editing capabilities
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
  TextField,
  Avatar,
  IconButton,
  Divider,
  Chip,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tab,
  Tabs,
  Paper,
  CircularProgress,
  LinearProgress,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PhotoCamera,
  Delete as DeleteIcon,
  Email,
  Phone,
  LocationOn,
  Language,
  Shield,
  Notifications,
  History,
  Star,
  Verified,
  Lock,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Customer data interface representing the complete customer profile
 * 
 * @interface CustomerData
 * @property {string} id - Unique customer identifier (UUID)
 * @property {string} firstName - Customer's first name
 * @property {string} lastName - Customer's last name
 * @property {string} email - Customer's email address (unique)
 * @property {string} phone - Customer's phone number with country code
 * @property {string} dateOfBirth - Customer's date of birth (ISO 8601 format)
 * @property {Object} address - Customer's mailing address
 * @property {string} address.street - Street address
 * @property {string} address.city - City name
 * @property {string} address.state - State/Province name
 * @property {string} address.country - Country name
 * @property {string} address.postalCode - Postal/ZIP code
 * @property {Object} preferences - Customer preferences and settings
 * @property {string} preferences.language - Preferred language code (en/es/he/ar)
 * @property {string} preferences.currency - Preferred currency code (USD/EUR/ILS)
 * @property {Object} preferences.notifications - Notification preferences
 * @property {boolean} preferences.notifications.email - Email notifications enabled
 * @property {boolean} preferences.notifications.sms - SMS notifications enabled
 * @property {boolean} preferences.notifications.push - Push notifications enabled
 * @property {Object} preferences.privacy - Privacy settings
 * @property {boolean} preferences.privacy.showProfile - Public profile visibility
 * @property {boolean} preferences.privacy.showBookingHistory - Booking history visibility
 * @property {string} [avatar] - Avatar image URL (optional)
 * @property {string} memberSince - Membership start date (ISO 8601 format)
 * @property {'bronze' | 'silver' | 'gold' | 'platinum'} tier - Customer tier/loyalty level
 * @property {number} points - Loyalty points balance
 * @property {number} totalBookings - Total number of completed bookings
 * @property {number} totalSpent - Total amount spent (in USD)
 * @property {boolean} verified - Email/phone verification status
 */
interface CustomerData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  preferences: {
    language: string;
    currency: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    privacy: {
      showProfile: boolean;
      showBookingHistory: boolean;
    };
  };
  avatar?: string;
  memberSince: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
  totalBookings: number;
  totalSpent: number;
  verified: boolean;
}

/**
 * Props for TabPanel component
 * 
 * @interface TabPanelProps
 * @property {React.ReactNode} [children] - Content to display in the tab panel
 * @property {number} value - Currently active tab index
 * @property {number} index - This tab panel's index
 */
interface TabPanelProps {
  children?: React.ReactNode;
  value: number;
  index: number;
}

// ============================================================================
// TAB PANEL COMPONENT
// ============================================================================

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * CustomerProfile - Main component for customer profile management
 * 
 * @component
 * @description
 * A comprehensive profile management component with the following features:
 * 
 * **Tabs:**
 * - Personal Information: Basic profile data, address, contact info
 * - Security: Password change, two-factor authentication
 * - Preferences: Language, currency, notification settings, privacy
 * - Activity: Booking history, points balance, recent activities
 * 
 * **Key Features:**
 * - Inline editing with form validation (React Hook Form)
 * - Avatar upload with image preview
 * - Secure password change with confirmation
 * - Real-time preference updates
 * - Tier-based badge system (Bronze/Silver/Gold/Platinum)
 * - Verification badge for verified accounts
 * - Responsive design with mobile optimization
 * - Error handling with user-friendly messages
 * - Loading states and optimistic updates
 * 
 * **API Endpoints:**
 * - GET /api/customers/profile - Fetch profile data
 * - PUT /api/customers/profile - Update profile data
 * - POST /api/customers/avatar - Upload avatar image
 * - POST /api/customers/change-password - Change password
 * 
 * **State Management:**
 * - React Query for server state (caching, refetching)
 * - React Hook Form for form state
 * - Local state for UI interactions (tabs, dialogs)
 * 
 * @returns {JSX.Element} Rendered customer profile component
 * 
 * @example
 * ```tsx
 * import { CustomerProfile } from '@/components/Customer/CustomerProfile';
 * import { QueryClient, QueryClientProvider } from 'react-query';
 * 
 * const queryClient = new QueryClient();
 * 
 * function App() {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <CustomerProfile />
 *     </QueryClientProvider>
 *   );
 * }
 * ```
 * 
 * @see {@link https://react-hook-form.com/} React Hook Form Documentation
 * @see {@link https://react-query.tanstack.com/} React Query Documentation
 */
export const CustomerProfile: React.FC = () => {
  const queryClient = useQueryClient();
  
  // State
  const [tabValue, setTabValue] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  
  // React Hook Form
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<CustomerData>();

  // Password form
  const {
    control: passwordControl,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // API Queries
  const {
    data: customerData,
    isLoading,
    error,
  } = useQuery<CustomerData>('customerProfile', async () => {
    const response = await axios.get('/api/customers/profile');
    return response.data;
  });

  // Mutations
  const updateProfileMutation = useMutation(
    async (data: CustomerData) => {
      const response = await axios.put('/api/customers/profile', data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('customerProfile');
        toast.success('Profile updated successfully!');
        setEditMode(false);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to update profile');
      },
    }
  );

  const updateAvatarMutation = useMutation(
    async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await axios.post('/api/customers/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('customerProfile');
        toast.success('Avatar updated successfully!');
        setAvatarFile(null);
        setAvatarPreview('');
      },
      onError: () => {
        toast.error('Failed to update avatar');
      },
    }
  );

  const changePasswordMutation = useMutation(
    async (passwords: any) => {
      const response = await axios.post('/api/customers/change-password', passwords);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Password changed successfully!');
        setChangePasswordOpen(false);
        resetPassword();
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to change password');
      },
    }
  );

  // Effects
  useEffect(() => {
    if (customerData && !editMode) {
      reset(customerData);
    }
  }, [customerData, editMode, reset]);

  // ====================================================================
  // HANDLERS
  // ====================================================================

  /**
   * Handle tab change event
   * @param {React.SyntheticEvent} event - Tab change event
   * @param {number} newValue - New tab index
   */
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  /**
   * Toggle edit mode on/off
   * Resets form to original data when canceling edit mode
   */
  const handleEditToggle = () => {
    if (editMode) {
      reset(customerData);
    }
    setEditMode(!editMode);
  };

  /**
   * Handle profile form submission
   * @param {CustomerData} data - Updated customer data from form
   */
  const onSubmit = (data: CustomerData) => {
    updateProfileMutation.mutate(data);
  };

  /**
   * Handle avatar file selection
   * Creates a preview of the selected image using FileReader
   * @param {React.ChangeEvent<HTMLInputElement>} event - File input change event
   */
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Upload the selected avatar file to the server
   * Uses FormData to send multipart/form-data request
   */
  const handleAvatarUpload = () => {
    if (avatarFile) {
      updateAvatarMutation.mutate(avatarFile);
    }
  };

  /**
   * Handle password change submission
   * Validates that new password and confirmation match
   * @param {Object} data - Password change form data
   * @param {string} data.currentPassword - Current password
   * @param {string} data.newPassword - New password
   * @param {string} data.confirmPassword - Password confirmation
   */
  const handlePasswordChange = (data: any) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  /**
   * Get the color associated with a customer tier
   * @param {string} tier - Customer tier (bronze/silver/gold/platinum)
   * @returns {string} Hex color code for the tier
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

  // Loading State
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Error State
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Failed to load profile</Alert>
      </Container>
    );
  }

  if (!customerData) return null;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                customerData.verified && (
                  <Tooltip title="Verified">
                    <Verified
                      sx={{ color: 'primary.main', bgcolor: 'white', borderRadius: '50%' }}
                    />
                  </Tooltip>
                )
              }
            >
              <Avatar
                src={avatarPreview || customerData.avatar}
                sx={{
                  width: 120,
                  height: 120,
                  border: `4px solid ${getTierColor(customerData.tier)}`,
                }}
              >
                {customerData.firstName[0]}
                {customerData.lastName[0]}
              </Avatar>
            </Badge>
            {editMode && (
              <Box mt={2} textAlign="center">
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="avatar-upload"
                  type="file"
                  onChange={handleAvatarChange}
                />
                <label htmlFor="avatar-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    size="small"
                    startIcon={<PhotoCamera />}
                  >
                    Change Photo
                  </Button>
                </label>
                {avatarFile && (
                  <Button
                    size="small"
                    onClick={handleAvatarUpload}
                    disabled={updateAvatarMutation.isLoading}
                    sx={{ ml: 1 }}
                  >
                    Upload
                  </Button>
                )}
              </Box>
            )}
          </Grid>

          <Grid item xs>
            <Box display="flex" alignItems="center" gap={2} mb={1}>
              <Typography variant="h4">
                {customerData.firstName} {customerData.lastName}
              </Typography>
              <Chip
                label={customerData.tier.toUpperCase()}
                size="small"
                sx={{
                  bgcolor: getTierColor(customerData.tier),
                  color: 'white',
                  fontWeight: 'bold',
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Member since {new Date(customerData.memberSince).toLocaleDateString()}
            </Typography>
            <Box display="flex" gap={4} mt={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total Bookings
                </Typography>
                <Typography variant="h6">{customerData.totalBookings}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total Spent
                </Typography>
                <Typography variant="h6">
                  ${customerData.totalSpent.toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Loyalty Points
                </Typography>
                <Typography variant="h6">{customerData.points.toLocaleString()}</Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item>
            {!editMode ? (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={handleEditToggle}
              >
                Edit Profile
              </Button>
            ) : (
              <Box display="flex" gap={1}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSubmit(onSubmit)}
                  disabled={!isDirty || updateProfileMutation.isLoading}
                >
                  Save
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={handleEditToggle}
                >
                  Cancel
                </Button>
              </Box>
            )}
          </Grid>
        </Grid>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Personal Info" icon={<Email />} iconPosition="start" />
          <Tab label="Security" icon={<Shield />} iconPosition="start" />
          <Tab label="Preferences" icon={<Notifications />} iconPosition="start" />
          <Tab label="Activity" icon={<History />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Personal Info Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
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
                    disabled={!editMode}
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
                    disabled={!editMode}
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
                    disabled={!editMode}
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    InputProps={{
                      startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="phone"
                control={control}
                rules={{ required: 'Phone is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Phone"
                    fullWidth
                    disabled={!editMode}
                    error={!!errors.phone}
                    helperText={errors.phone?.message}
                    InputProps={{
                      startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="dateOfBirth"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Date of Birth"
                    type="date"
                    fullWidth
                    disabled={!editMode}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Chip label="Address" />
              </Divider>
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="address.street"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Street Address"
                    fullWidth
                    disabled={!editMode}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="address.city"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="City" fullWidth disabled={!editMode} />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="address.state"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="State/Province" fullWidth disabled={!editMode} />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="address.country"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Country" fullWidth disabled={!editMode} />
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
                    disabled={!editMode}
                  />
                )}
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Security Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Password
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Last changed 30 days ago
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      startIcon={<Lock />}
                      onClick={() => setChangePasswordOpen(true)}
                    >
                      Change Password
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Two-Factor Authentication
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Add an extra layer of security to your account
                  </Typography>
                  <Button variant="outlined" startIcon={<Shield />}>
                    Enable 2FA
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Active Sessions
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Current Session"
                        secondary="Chrome on Windows - Last active: Now"
                      />
                      <Chip label="Active" color="success" size="small" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Preferences Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Language & Region
                  </Typography>
                  <Controller
                    name="preferences.language"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Language</InputLabel>
                        <Select {...field} disabled={!editMode}>
                          <MenuItem value="en">English</MenuItem>
                          <MenuItem value="es">Español</MenuItem>
                          <MenuItem value="fr">Français</MenuItem>
                          <MenuItem value="de">Deutsch</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                  <Controller
                    name="preferences.currency"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Currency</InputLabel>
                        <Select {...field} disabled={!editMode}>
                          <MenuItem value="USD">USD ($)</MenuItem>
                          <MenuItem value="EUR">EUR (€)</MenuItem>
                          <MenuItem value="GBP">GBP (£)</MenuItem>
                          <MenuItem value="JPY">JPY (¥)</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Notifications
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText primary="Email Notifications" />
                      <Controller
                        name="preferences.notifications.email"
                        control={control}
                        render={({ field }) => (
                          <Switch {...field} checked={field.value} disabled={!editMode} />
                        )}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="SMS Notifications" />
                      <Controller
                        name="preferences.notifications.sms"
                        control={control}
                        render={({ field }) => (
                          <Switch {...field} checked={field.value} disabled={!editMode} />
                        )}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Push Notifications" />
                      <Controller
                        name="preferences.notifications.push"
                        control={control}
                        render={({ field }) => (
                          <Switch {...field} checked={field.value} disabled={!editMode} />
                        )}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Privacy Settings
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Show Profile Publicly"
                        secondary="Allow others to see your profile"
                      />
                      <Controller
                        name="preferences.privacy.showProfile"
                        control={control}
                        render={({ field }) => (
                          <Switch {...field} checked={field.value} disabled={!editMode} />
                        )}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Show Booking History"
                        secondary="Display your booking history on your profile"
                      />
                      <Controller
                        name="preferences.privacy.showBookingHistory"
                        control={control}
                        render={({ field }) => (
                          <Switch {...field} checked={field.value} disabled={!editMode} />
                        )}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Activity Tab */}
        <TabPanel value={tabValue} index={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Booking Confirmed"
                    secondary="Jerusalem Holy Sites Tour - 2 days ago"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Star color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Review Posted"
                    secondary="Dead Sea & Masada Experience - 5 days ago"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Warning color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Profile Updated"
                    secondary="Changed contact information - 1 week ago"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </TabPanel>
      </form>

      {/* Change Password Dialog */}
      <Dialog
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handlePasswordSubmit(handlePasswordChange)}>
          <DialogTitle>Change Password</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Controller
                name="currentPassword"
                control={passwordControl}
                rules={{ required: 'Current password is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Current Password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    fullWidth
                    margin="normal"
                    error={!!passwordErrors.currentPassword}
                    helperText={passwordErrors.currentPassword?.message}
                    InputProps={{
                      endAdornment: (
                        <IconButton
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          edge="end"
                        >
                          {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      ),
                    }}
                  />
                )}
              />
              <Controller
                name="newPassword"
                control={passwordControl}
                rules={{
                  required: 'New password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="New Password"
                    type={showNewPassword ? 'text' : 'password'}
                    fullWidth
                    margin="normal"
                    error={!!passwordErrors.newPassword}
                    helperText={passwordErrors.newPassword?.message}
                    InputProps={{
                      endAdornment: (
                        <IconButton
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          edge="end"
                        >
                          {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      ),
                    }}
                  />
                )}
              />
              <Controller
                name="confirmPassword"
                control={passwordControl}
                rules={{ required: 'Please confirm your password' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Confirm New Password"
                    type="password"
                    fullWidth
                    margin="normal"
                    error={!!passwordErrors.confirmPassword}
                    helperText={passwordErrors.confirmPassword?.message}
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setChangePasswordOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={changePasswordMutation.isLoading}
            >
              Change Password
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default CustomerProfile;
