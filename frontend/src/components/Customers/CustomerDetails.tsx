import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Avatar,
  Chip,
  Divider,
  Card,
  CardContent,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingIcon,
  Star as StarIcon,
  Person as PersonIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Assignment as BookingIcon,
  LocalOffer as TagIcon,
  Flag as FlagIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import customersService from '../../services/customersService';
import {
  Customer,
  CustomerStatus,
  CustomerTier,
} from '../../types/customer.types';

// ============================================================================
// Tab Panel Component
// ============================================================================

interface TabPanelProps {
  children?: React.ReactNode;
  value: number;
  index: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

// ============================================================================
// Component
// ============================================================================

const CustomerDetails: React.FC = () => {
  const navigate = useNavigate();
  const { customerId } = useParams<{ customerId: string }>();

  // ==========================================================================
  // State Management
  // ==========================================================================

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // ==========================================================================
  // Fetch Customer Data
  // ==========================================================================

  const fetchCustomer = async () => {
    if (!customerId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await customersService.getCustomerById(customerId);
      setCustomer(response.customer);
    } catch (err: any) {
      console.error('Error fetching customer:', err);
      setError(err.message || 'Failed to load customer');
      toast.error('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleEdit = () => {
    navigate(`/customers/${customerId}/edit`);
  };

  const handleDelete = async () => {
    if (!customerId) return;

    try {
      await customersService.deleteCustomer(customerId);
      toast.success('Customer deleted successfully');
      navigate('/customers');
    } catch (err: any) {
      console.error('Error deleting customer:', err);
      toast.error(err.message || 'Failed to delete customer');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleChangeStatus = async (newStatus: CustomerStatus) => {
    if (!customerId) return;

    try {
      await customersService.changeCustomerStatus(customerId, newStatus);
      toast.success('Customer status updated');
      fetchCustomer();
      handleMenuClose();
    } catch (err: any) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    }
  };

  const handleChangeTier = async (newTier: CustomerTier) => {
    if (!customerId) return;

    try {
      await customersService.changeCustomerTier(customerId, newTier);
      toast.success('Customer tier updated');
      fetchCustomer();
      handleMenuClose();
    } catch (err: any) {
      console.error('Error updating tier:', err);
      toast.error('Failed to update tier');
    }
  };

  // ==========================================================================
  // Utility Functions
  // ==========================================================================

  const getStatusColor = (status: CustomerStatus): "default" | "primary" | "success" | "error" | "warning" => {
    switch (status) {
      case CustomerStatus.ACTIVE: return 'success';
      case CustomerStatus.VIP: return 'primary';
      case CustomerStatus.INACTIVE: return 'default';
      case CustomerStatus.BLOCKED: return 'error';
      case CustomerStatus.PENDING: return 'warning';
      default: return 'default';
    }
  };

  const getTierColor = (tier: CustomerTier): "default" | "primary" | "secondary" | "warning" | "info" => {
    switch (tier) {
      case CustomerTier.DIAMOND: return 'primary';
      case CustomerTier.PLATINUM: return 'secondary';
      case CustomerTier.GOLD: return 'warning';
      case CustomerTier.SILVER: return 'info';
      case CustomerTier.BRONZE: return 'default';
      default: return 'default';
    }
  };

  // ==========================================================================
  // Render Loading State
  // ==========================================================================

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // ==========================================================================
  // Render Error State
  // ==========================================================================

  if (error || !customer) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'Customer not found'}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/customers')}>
          Back to Customers
        </Button>
      </Box>
    );
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with Customer Info */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                fontSize: '2rem',
                bgcolor: 'primary.main',
              }}
            >
              {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
            </Avatar>
          </Grid>

          <Grid item xs>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="h4">
                {customer.fullName}
              </Typography>
              {customer.status === CustomerStatus.VIP && (
                <StarIcon sx={{ color: 'gold', fontSize: 28 }} />
              )}
            </Box>

            <Typography variant="body2" color="text.secondary" gutterBottom>
              {customer.customerNumber}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Chip
                label={customer.status}
                color={getStatusColor(customer.status)}
                size="small"
              />
              <Chip
                label={customer.tier}
                color={getTierColor(customer.tier)}
                size="small"
                variant="outlined"
              />
              {customer.tags.map((tag) => (
                <Chip key={tag} label={tag} size="small" icon={<TagIcon />} />
              ))}
            </Box>
          </Grid>

          <Grid item>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={handleEdit}
              >
                Edit
              </Button>
              <IconButton onClick={handleMenuOpen}>
                <MoreVertIcon />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Spent
                  </Typography>
                  <Typography variant="h5">
                    ${customer.totalSpent.toLocaleString()}
                  </Typography>
                </Box>
                <MoneyIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Bookings
                  </Typography>
                  <Typography variant="h5">
                    {customer.stats.totalBookings}
                  </Typography>
                </Box>
                <BookingIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Loyalty Points
                  </Typography>
                  <Typography variant="h5">
                    {customer.loyaltyPoints.toLocaleString()}
                  </Typography>
                </Box>
                <StarIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Average Rating
                  </Typography>
                  <Typography variant="h5">
                    {customer.stats.averageRating?.toFixed(1) || 'N/A'}
                  </Typography>
                </Box>
                <TrendingIcon sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Overview" icon={<InfoIcon />} iconPosition="start" />
          <Tab label="Booking History" icon={<BookingIcon />} iconPosition="start" />
          <Tab label="Preferences" icon={<StarIcon />} iconPosition="start" />
          <Tab label="Notes" icon={<PersonIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        {/* Overview Tab */}
        <Grid container spacing={3}>
          {/* Contact Information */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Contact Information
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <List>
                <ListItem>
                  <ListItemIcon>
                    <EmailIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email"
                    secondary={customer.email}
                  />
                  {customer.emailVerified && (
                    <CheckCircleIcon color="success" />
                  )}
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <PhoneIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Phone"
                    secondary={customer.phone}
                  />
                  {customer.phoneVerified && (
                    <CheckCircleIcon color="success" />
                  )}
                </ListItem>

                {customer.secondaryPhone && (
                  <ListItem>
                    <ListItemIcon>
                      <PhoneIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Secondary Phone"
                      secondary={customer.secondaryPhone}
                    />
                  </ListItem>
                )}

                {customer.nationality && (
                  <ListItem>
                    <ListItemIcon>
                      <FlagIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Nationality"
                      secondary={customer.nationality}
                    />
                  </ListItem>
                )}

                {customer.dateOfBirth && (
                  <ListItem>
                    <ListItemIcon>
                      <CalendarIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Date of Birth"
                      secondary={format(new Date(customer.dateOfBirth), 'MMMM dd, yyyy')}
                    />
                  </ListItem>
                )}
              </List>
            </Paper>
          </Grid>

          {/* Address Information */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Address
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {customer.address.formatted ? (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <LocationIcon sx={{ mt: 0.5 }} />
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                    {customer.address.formatted}
                  </Typography>
                </Box>
              ) : (
                <List>
                  {customer.address.street && (
                    <ListItem>
                      <ListItemText primary="Street" secondary={customer.address.street} />
                    </ListItem>
                  )}
                  {customer.address.city && (
                    <ListItem>
                      <ListItemText primary="City" secondary={customer.address.city} />
                    </ListItem>
                  )}
                  {customer.address.state && (
                    <ListItem>
                      <ListItemText primary="State" secondary={customer.address.state} />
                    </ListItem>
                  )}
                  {customer.address.country && (
                    <ListItem>
                      <ListItemText primary="Country" secondary={customer.address.country} />
                    </ListItem>
                  )}
                </List>
              )}
            </Paper>
          </Grid>

          {/* Statistics */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Booking Statistics
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <List>
                <ListItem>
                  <ListItemText
                    primary="Completed Bookings"
                    secondary={`${customer.stats.completedBookings} of ${customer.stats.totalBookings}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Cancelled Bookings"
                    secondary={customer.stats.cancelledBookings}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="No-Shows"
                    secondary={customer.stats.noShowCount}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Average Booking Value"
                    secondary={`$${customer.stats.averageBookingValue.toLocaleString()}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Lifetime Value"
                    secondary={`$${customer.stats.lifetimeValue.toLocaleString()}`}
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>

          {/* Emergency Contact */}
          {customer.emergencyContact && customer.emergencyContact.name && (
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Emergency Contact
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <List>
                  <ListItem>
                    <ListItemText
                      primary="Name"
                      secondary={customer.emergencyContact.name}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Relationship"
                      secondary={customer.emergencyContact.relationship}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <PhoneIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Phone"
                      secondary={customer.emergencyContact.phone}
                    />
                  </ListItem>
                  {customer.emergencyContact.email && (
                    <ListItem>
                      <ListItemIcon>
                        <EmailIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Email"
                        secondary={customer.emergencyContact.email}
                      />
                    </ListItem>
                  )}
                </List>
              </Paper>
            </Grid>
          )}

          {/* Member Info */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Membership Information
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Member Since
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(customer.memberSince), 'MMMM dd, yyyy')}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Source
                  </Typography>
                  <Typography variant="body1">
                    {customer.source.replace('_', ' ').toUpperCase()}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Preferred Contact Method
                  </Typography>
                  <Typography variant="body1">
                    {customer.preferredContactMethod.charAt(0).toUpperCase() + customer.preferredContactMethod.slice(1)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {/* Booking History Tab - Placeholder */}
        <Alert severity="info">
          Booking history will be displayed here. This connects to the CustomerHistory component.
        </Alert>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {/* Preferences Tab - Placeholder */}
        <Alert severity="info">
          Customer preferences will be managed here. This connects to the CustomerPreferences component.
        </Alert>
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        {/* Notes Tab - Placeholder */}
        <Alert severity="info">
          Customer notes will be displayed and managed here. This connects to the CustomerNotes component.
        </Alert>
      </TabPanel>

      {/* Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem disabled>
          <Typography variant="subtitle2" color="text.secondary">
            Change Status
          </Typography>
        </MenuItem>
        {Object.values(CustomerStatus).map((status) => (
          <MenuItem
            key={status}
            onClick={() => handleChangeStatus(status)}
            selected={customer.status === status}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </MenuItem>
        ))}

        <Divider />

        <MenuItem disabled>
          <Typography variant="subtitle2" color="text.secondary">
            Change Tier
          </Typography>
        </MenuItem>
        {Object.values(CustomerTier).map((tier) => (
          <MenuItem
            key={tier}
            onClick={() => handleChangeTier(tier)}
            selected={customer.tier === tier}
          >
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </MenuItem>
        ))}

        <Divider />

        <MenuItem onClick={() => setDeleteDialogOpen(true)} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} /> Delete Customer
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Customer</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{customer.fullName}</strong>?
            This action cannot be undone and will permanently remove all customer data.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerDetails;
