import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  Card,
  CardContent,
  Chip,
  Button,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
} from '@mui/material';
import {
  BookOnline as BookingIcon,
  Payment as PaymentIcon,
  Cancel as CancelIcon,
  CheckCircle as CompletedIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  PersonAdd as AccountIcon,
  Star as ReviewIcon,
  LocalOffer as PromotionIcon,
  TrendingUp as UpgradeIcon,
  Description as NoteIcon,
  AttachFile as DocumentIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import customersService from '../../services/customersService';
import {
  CustomerActivity,
  ActivityType,
} from '../../types/customer.types';

// ============================================================================
// Props Interface
// ============================================================================

interface CustomerHistoryProps {
  customerId: string;
  limit?: number;
}

// ============================================================================
// Component
// ============================================================================

const CustomerHistory: React.FC<CustomerHistoryProps> = ({ customerId, limit = 50 }) => {
  const navigate = useNavigate();

  // ==========================================================================
  // State Management
  // ==========================================================================

  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filterType, setFilterType] = useState<ActivityType | 'all'>('all');

  // ==========================================================================
  // Fetch Activity Data
  // ==========================================================================

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await customersService.getCustomerActivity(customerId, limit);
        setActivities(data);
      } catch (err: any) {
        console.error('Error fetching activity:', err);
        setError(err.message || 'Failed to load activity history');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [customerId, limit]);

  // ==========================================================================
  // Filter Activities
  // ==========================================================================

  const filteredActivities = activities.filter((activity) =>
    filterType === 'all' ? true : activity.type === filterType
  );

  // ==========================================================================
  // Utility Functions
  // ==========================================================================

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      // Booking Activities
      case ActivityType.BOOKING_CREATED:
        return <BookingIcon />;
      case ActivityType.BOOKING_MODIFIED:
        return <EditIcon />;
      case ActivityType.BOOKING_CANCELLED:
        return <CancelIcon />;
      case ActivityType.BOOKING_COMPLETED:
        return <CompletedIcon />;

      // Payment Activities
      case ActivityType.PAYMENT_RECEIVED:
        return <PaymentIcon />;
      case ActivityType.REFUND_ISSUED:
        return <PaymentIcon />;

      // Communication Activities
      case ActivityType.EMAIL_SENT:
        return <EmailIcon />;
      case ActivityType.SMS_SENT:
        return <PhoneIcon />;
      case ActivityType.CALL_MADE:
        return <PhoneIcon />;

      // Account Activities
      case ActivityType.ACCOUNT_CREATED:
        return <AccountIcon />;
      case ActivityType.ACCOUNT_UPDATED:
        return <EditIcon />;
      case ActivityType.TIER_UPGRADED:
        return <UpgradeIcon />;

      // Engagement Activities
      case ActivityType.REVIEW_SUBMITTED:
        return <ReviewIcon />;
      case ActivityType.PROMOTION_CLAIMED:
        return <PromotionIcon />;

      // Other
      case ActivityType.NOTE_ADDED:
        return <NoteIcon />;
      case ActivityType.DOCUMENT_UPLOADED:
        return <DocumentIcon />;

      default:
        return <BookingIcon />;
    }
  };

  const getActivityColor = (type: ActivityType): "primary" | "success" | "error" | "warning" | "info" | "grey" => {
    switch (type) {
      // Booking Activities
      case ActivityType.BOOKING_CREATED:
        return 'primary';
      case ActivityType.BOOKING_MODIFIED:
        return 'info';
      case ActivityType.BOOKING_CANCELLED:
        return 'error';
      case ActivityType.BOOKING_COMPLETED:
        return 'success';

      // Payment Activities
      case ActivityType.PAYMENT_RECEIVED:
        return 'success';
      case ActivityType.REFUND_ISSUED:
        return 'warning';

      // Communication Activities
      case ActivityType.EMAIL_SENT:
      case ActivityType.SMS_SENT:
      case ActivityType.CALL_MADE:
        return 'info';

      // Account Activities
      case ActivityType.ACCOUNT_CREATED:
        return 'primary';
      case ActivityType.ACCOUNT_UPDATED:
        return 'info';
      case ActivityType.TIER_UPGRADED:
        return 'success';

      // Engagement Activities
      case ActivityType.REVIEW_SUBMITTED:
        return 'warning';
      case ActivityType.PROMOTION_CLAIMED:
        return 'success';

      // Other
      case ActivityType.NOTE_ADDED:
      case ActivityType.DOCUMENT_UPLOADED:
        return 'grey';

      default:
        return 'primary';
    }
  };

  const formatActivityType = (type: ActivityType): string => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // ==========================================================================
  // Activity Statistics
  // ==========================================================================

  const activityStats = {
    total: activities.length,
    bookings: activities.filter((a) => a.type.includes('BOOKING')).length,
    payments: activities.filter((a) => a.type.includes('PAYMENT') || a.type.includes('REFUND')).length,
    communications: activities.filter((a) =>
      [ActivityType.EMAIL_SENT, ActivityType.SMS_SENT, ActivityType.CALL_MADE].includes(a.type)
    ).length,
    engagement: activities.filter((a) =>
      [ActivityType.REVIEW_SUBMITTED, ActivityType.PROMOTION_CLAIMED, ActivityType.REFERRAL_MADE].includes(a.type)
    ).length,
  };

  // ==========================================================================
  // Render Loading State
  // ==========================================================================

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // ==========================================================================
  // Render Error State
  // ==========================================================================

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  // ==========================================================================
  // Render Empty State
  // ==========================================================================

  if (activities.length === 0) {
    return (
      <Paper sx={{ p: 8, textAlign: 'center' }}>
        <BookingIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No activity history yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Customer activity will appear here as they interact with your business
        </Typography>
      </Paper>
    );
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <Box>
      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Total Activity
              </Typography>
              <Typography variant="h5">{activityStats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Bookings
              </Typography>
              <Typography variant="h5">{activityStats.bookings}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Payments
              </Typography>
              <Typography variant="h5">{activityStats.payments}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Communications
              </Typography>
              <Typography variant="h5">{activityStats.communications}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Engagement
              </Typography>
              <Typography variant="h5">{activityStats.engagement}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter Activity</InputLabel>
          <Select
            value={filterType}
            label="Filter Activity"
            onChange={(e) => setFilterType(e.target.value as ActivityType | 'all')}
          >
            <MenuItem value="all">All Activities</MenuItem>
            <Divider />
            <MenuItem disabled>
              <Typography variant="caption" color="text.secondary">
                BOOKINGS
              </Typography>
            </MenuItem>
            <MenuItem value={ActivityType.BOOKING_CREATED}>Booking Created</MenuItem>
            <MenuItem value={ActivityType.BOOKING_MODIFIED}>Booking Modified</MenuItem>
            <MenuItem value={ActivityType.BOOKING_CANCELLED}>Booking Cancelled</MenuItem>
            <MenuItem value={ActivityType.BOOKING_COMPLETED}>Booking Completed</MenuItem>
            <Divider />
            <MenuItem disabled>
              <Typography variant="caption" color="text.secondary">
                PAYMENTS
              </Typography>
            </MenuItem>
            <MenuItem value={ActivityType.PAYMENT_RECEIVED}>Payment Received</MenuItem>
            <MenuItem value={ActivityType.REFUND_ISSUED}>Refund Issued</MenuItem>
            <Divider />
            <MenuItem disabled>
              <Typography variant="caption" color="text.secondary">
                COMMUNICATIONS
              </Typography>
            </MenuItem>
            <MenuItem value={ActivityType.EMAIL_SENT}>Email Sent</MenuItem>
            <MenuItem value={ActivityType.SMS_SENT}>SMS Sent</MenuItem>
            <MenuItem value={ActivityType.CALL_MADE}>Call Made</MenuItem>
            <Divider />
            <MenuItem disabled>
              <Typography variant="caption" color="text.secondary">
                ENGAGEMENT
              </Typography>
            </MenuItem>
            <MenuItem value={ActivityType.REVIEW_SUBMITTED}>Review Submitted</MenuItem>
            <MenuItem value={ActivityType.PROMOTION_CLAIMED}>Promotion Claimed</MenuItem>
          </Select>
        </FormControl>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Showing {filteredActivities.length} of {activities.length} activities
        </Typography>
      </Paper>

      {/* Timeline */}
      <Paper sx={{ p: 3 }}>
        <Timeline position="right">
          {filteredActivities.map((activity, index) => (
            <TimelineItem key={activity.id}>
              <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.3 }}>
                <Typography variant="body2">
                  {format(new Date(activity.timestamp), 'MMM dd, yyyy')}
                </Typography>
                <Typography variant="caption">
                  {format(new Date(activity.timestamp), 'HH:mm')}
                </Typography>
              </TimelineOppositeContent>

              <TimelineSeparator>
                <TimelineDot color={getActivityColor(activity.type)}>
                  {getActivityIcon(activity.type)}
                </TimelineDot>
                {index < filteredActivities.length - 1 && <TimelineConnector />}
              </TimelineSeparator>

              <TimelineContent>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Chip
                        label={formatActivityType(activity.type)}
                        size="small"
                        color={getActivityColor(activity.type)}
                      />
                      {activity.performedByName && (
                        <Typography variant="caption" color="text.secondary">
                          by {activity.performedByName}
                        </Typography>
                      )}
                    </Box>

                    <Typography variant="body1" gutterBottom>
                      {activity.description}
                    </Typography>

                    {/* Metadata (if present) */}
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                        {Object.entries(activity.metadata).map(([key, value]) => (
                          <Box key={key} sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight="medium">
                              {key}:
                            </Typography>
                            <Typography variant="caption">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}

                    {/* Action button for bookings */}
                    {activity.type.includes('BOOKING') && activity.metadata?.bookingId && (
                      <Button
                        size="small"
                        sx={{ mt: 1 }}
                        onClick={() => navigate(`/bookings/${activity.metadata?.bookingId}`)}
                      >
                        View Booking
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </Paper>
    </Box>
  );
};

export default CustomerHistory;
