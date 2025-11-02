import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Box,
  Alert,
  Chip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { usePWA } from '../../hooks/usePWA';

export const PushNotificationManager: React.FC = () => {
  const {
    notificationPermission,
    pushSubscription,
    enablePushNotifications,
    requestPermission,
  } = usePWA();
  
  const [loading, setLoading] = React.useState(false);
  
  const isEnabled = notificationPermission === 'granted' && pushSubscription !== null;
  const isDenied = notificationPermission === 'denied';
  const isDefault = notificationPermission === 'default';
  
  const handleToggle = async () => {
    setLoading(true);
    
    try {
      if (!isEnabled) {
        const success = await enablePushNotifications();
        
        if (!success) {
          alert('Failed to enable push notifications. Please check your browser settings.');
        }
      }
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusColor = () => {
    if (isEnabled) return 'success';
    if (isDenied) return 'error';
    return 'default';
  };
  
  const getStatusText = () => {
    if (isEnabled) return 'Enabled';
    if (isDenied) return 'Denied';
    if (isDefault) return 'Not configured';
    return 'Unknown';
  };
  
  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            {isEnabled ? (
              <NotificationsIcon color="primary" />
            ) : (
              <NotificationsOffIcon color="disabled" />
            )}
            <Typography variant="h6">
              Push Notifications
            </Typography>
          </Box>
          
          <Chip
            label={getStatusText()}
            color={getStatusColor()}
            size="small"
            icon={isEnabled ? <CheckIcon /> : undefined}
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Receive real-time notifications about your bookings, tours, and important updates.
        </Typography>
        
        {isDenied && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Notifications are blocked. Please enable them in your browser settings.
          </Alert>
        )}
        
        {isEnabled && (
          <Alert severity="success" sx={{ mb: 2 }} icon={<CheckIcon />}>
            You're subscribed to push notifications!
          </Alert>
        )}
        
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            You'll receive notifications for:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              New booking confirmations
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Booking status changes
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Payment confirmations
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Tour reminders
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Important system updates
            </Typography>
          </Box>
        </Box>
      </CardContent>
      
      <CardActions sx={{ px: 2, pb: 2 }}>
        {!isDenied && (
          <FormControlLabel
            control={
              <Switch
                checked={isEnabled}
                onChange={handleToggle}
                disabled={loading}
              />
            }
            label={isEnabled ? 'Notifications enabled' : 'Enable notifications'}
          />
        )}
        
        {isDenied && (
          <Button
            variant="outlined"
            onClick={() => {
              alert(
                'Please enable notifications in your browser settings:\n\n' +
                '1. Click the lock icon in the address bar\n' +
                '2. Find "Notifications" setting\n' +
                '3. Change to "Allow"\n' +
                '4. Refresh the page'
              );
            }}
          >
            How to Enable
          </Button>
        )}
        
        {isDefault && (
          <Button
            variant="contained"
            startIcon={<NotificationsIcon />}
            onClick={handleToggle}
            disabled={loading}
          >
            Enable Notifications
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

export default PushNotificationManager;
