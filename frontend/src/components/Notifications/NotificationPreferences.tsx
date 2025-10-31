import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControlLabel,
  Switch,
  Divider,
  Button,
  Grid,
  Card,
  CardContent,
  TextField,
  Alert,
  Chip,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Email,
  Smartphone,
  Sms,
  Save,
  Refresh,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import notificationsService, { NotificationPreferences } from '../../services/notificationsService';

const NotificationPreferencesComponent: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_enabled: true,
    push_enabled: true,
    sms_enabled: false,
    notification_types: {
      booking: true,
      payment: true,
      system: true,
      marketing: false,
    },
    quiet_hours: {
      enabled: true,
      start_time: '22:00',
      end_time: '08:00',
    },
  });
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      // In production, use: const data = await notificationsService.getPreferences();
      const mockPreferences = notificationsService.getMockPreferences();
      setPreferences(mockPreferences);
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await notificationsService.updatePreferences(preferences);
      toast.success('Preferences saved successfully!');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await notificationsService.testNotification('info');
      toast.success('Test notification sent!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    }
  };

  const updatePreference = (path: string[], value: any) => {
    setPreferences((prev) => {
      const updated = { ...prev };
      let current: any = updated;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return updated;
    });
    setHasChanges(true);
  };

  return (
    <Box>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SettingsIcon sx={{ fontSize: 32, color: '#1976d2' }} />
            <Box>
              <Typography variant="h5" fontWeight="600">
                Notification Preferences
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Customize how you receive notifications
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<NotificationsIcon />}
              onClick={handleTestNotification}
              variant="outlined"
              size="small"
            >
              Test Notification
            </Button>
            <Button
              startIcon={<Refresh />}
              onClick={loadPreferences}
              variant="outlined"
              size="small"
            >
              Reset
            </Button>
            <Button
              startIcon={<Save />}
              onClick={handleSave}
              variant="contained"
              disabled={!hasChanges || loading}
              size="small"
            >
              Save Changes
            </Button>
          </Box>
        </Box>
      </Paper>

      {hasChanges && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          You have unsaved changes. Click "Save Changes" to apply your preferences.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Delivery Channels */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Email color="primary" />
                <Typography variant="h6" fontWeight="600">
                  Delivery Channels
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Choose how you want to receive notifications
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.email_enabled}
                        onChange={(e) => updatePreference(['email_enabled'], e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" fontWeight="600">
                          Email Notifications
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Receive notifications via email
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>

                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.push_enabled}
                        onChange={(e) => updatePreference(['push_enabled'], e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" fontWeight="600">
                          Push Notifications
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Receive browser push notifications
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>

                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.sms_enabled}
                        onChange={(e) => updatePreference(['sms_enabled'], e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" fontWeight="600">
                          SMS Notifications
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Receive notifications via SMS
                        </Typography>
                      </Box>
                    }
                  />
                  <Chip label="Premium Feature" size="small" color="primary" sx={{ mt: 1 }} />
                </Paper>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Types */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <NotificationsIcon color="primary" />
                <Typography variant="h6" fontWeight="600">
                  Notification Types
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Select which types of notifications you want to receive
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.notification_types.booking}
                        onChange={(e) =>
                          updatePreference(['notification_types', 'booking'], e.target.checked)
                        }
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" fontWeight="600">
                          Booking Notifications
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          New bookings, cancellations, modifications
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>

                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.notification_types.payment}
                        onChange={(e) =>
                          updatePreference(['notification_types', 'payment'], e.target.checked)
                        }
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" fontWeight="600">
                          Payment Notifications
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Payments received, refunds, payment failures
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>

                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.notification_types.system}
                        onChange={(e) =>
                          updatePreference(['notification_types', 'system'], e.target.checked)
                        }
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" fontWeight="600">
                          System Notifications
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          System updates, maintenance, important alerts
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>

                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.notification_types.marketing}
                        onChange={(e) =>
                          updatePreference(['notification_types', 'marketing'], e.target.checked)
                        }
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" fontWeight="600">
                          Marketing Notifications
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Promotional offers, newsletters, tips
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quiet Hours */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Smartphone color="primary" />
                <Typography variant="h6" fontWeight="600">
                  Quiet Hours
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Set a time range when you don't want to receive non-urgent notifications
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.quiet_hours.enabled}
                      onChange={(e) =>
                        updatePreference(['quiet_hours', 'enabled'], e.target.checked)
                      }
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="subtitle2" fontWeight="600">
                        Enable Quiet Hours
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Pause non-urgent notifications during specific hours
                      </Typography>
                    </Box>
                  }
                />

                {preferences.quiet_hours.enabled && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Start Time"
                        type="time"
                        value={preferences.quiet_hours.start_time}
                        onChange={(e) =>
                          updatePreference(['quiet_hours', 'start_time'], e.target.value)
                        }
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="End Time"
                        type="time"
                        value={preferences.quiet_hours.end_time}
                        onChange={(e) =>
                          updatePreference(['quiet_hours', 'end_time'], e.target.value)
                        }
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </Grid>
                )}

                {preferences.quiet_hours.enabled && (
                  <Alert severity="info">
                    Quiet hours are active from {preferences.quiet_hours.start_time} to{' '}
                    {preferences.quiet_hours.end_time}. Urgent notifications will still be
                    delivered.
                  </Alert>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default NotificationPreferencesComponent;
