import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  Button,
  TextField,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  Save,
  Email,
  Sms,
  Notifications as NotificationsIcon,
  PhoneAndroid,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { NotificationSettings as NotificationSettingsType } from '../../types/settings.types';
import apiClient from '../../services/apiClient';

const NotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, reset, formState: { isDirty } } = useForm();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<NotificationSettingsType>('/api/settings/notifications');
      setSettings(response.data);
      reset(response.data);
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError(err.response?.data?.message || 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      setSaving(true);
      setError(null);
      await apiClient.put('/api/settings/notifications', data);
      await fetchSettings();
      toast.success('Notification settings updated successfully!');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      const errorMessage = err.response?.data?.message || 'Failed to save settings';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !settings) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Notification Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure how you want to receive notifications
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          {/* Email Notifications */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Email sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight="bold">
                    Email Notifications
                  </Typography>
                </Box>

                <Controller
                  name="email.enabled"
                  control={control}
                  defaultValue={settings?.email.enabled || false}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Enable Email Notifications"
                      sx={{ mb: 2 }}
                    />
                  )}
                />

                <Divider sx={{ my: 2 }} />

                <List dense>
                  {[
                    { key: 'bookingConfirmation', label: 'Booking Confirmations' },
                    { key: 'bookingReminder', label: 'Booking Reminders' },
                    { key: 'bookingCancellation', label: 'Booking Cancellations' },
                    { key: 'paymentReceipt', label: 'Payment Receipts' },
                    { key: 'paymentReminder', label: 'Payment Reminders' },
                    { key: 'refundConfirmation', label: 'Refund Confirmations' },
                    { key: 'reviewRequest', label: 'Review Requests' },
                    { key: 'promotional', label: 'Promotional Offers' },
                    { key: 'newsletter', label: 'Newsletter' },
                    { key: 'systemUpdates', label: 'System Updates' },
                  ].map((item) => (
                    <ListItem key={item.key}>
                      <ListItemText primary={item.label} />
                      <ListItemSecondaryAction>
                        <Controller
                          name={`email.${item.key}`}
                          control={control}
                          defaultValue={
                            settings?.email[item.key as keyof typeof settings.email] || false
                          }
                          render={({ field }) => (
                            <Switch {...field} checked={field.value} size="small" />
                          )}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* SMS Notifications */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Sms sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="h6" fontWeight="bold">
                    SMS Notifications
                  </Typography>
                </Box>

                <Controller
                  name="sms.enabled"
                  control={control}
                  defaultValue={settings?.sms.enabled || false}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Enable SMS Notifications"
                      sx={{ mb: 2 }}
                    />
                  )}
                />

                <Controller
                  name="sms.phoneNumber"
                  control={control}
                  defaultValue={settings?.sms.phoneNumber || ''}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Phone Number"
                      fullWidth
                      placeholder="+1 (555) 123-4567"
                      sx={{ mb: 2 }}
                    />
                  )}
                />

                <Divider sx={{ my: 2 }} />

                <List dense>
                  {[
                    { key: 'bookingConfirmation', label: 'Booking Confirmations' },
                    { key: 'bookingReminder', label: 'Booking Reminders' },
                    { key: 'paymentReminder', label: 'Payment Reminders' },
                    { key: 'emergencyAlerts', label: 'Emergency Alerts' },
                  ].map((item) => (
                    <ListItem key={item.key}>
                      <ListItemText primary={item.label} />
                      <ListItemSecondaryAction>
                        <Controller
                          name={`sms.${item.key}`}
                          control={control}
                          defaultValue={
                            settings?.sms[item.key as keyof typeof settings.sms] || false
                          }
                          render={({ field }) => (
                            <Switch {...field} checked={field.value} size="small" />
                          )}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Push Notifications */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <PhoneAndroid sx={{ mr: 1, color: 'warning.main' }} />
                  <Typography variant="h6" fontWeight="bold">
                    Push Notifications
                  </Typography>
                </Box>

                <Controller
                  name="push.enabled"
                  control={control}
                  defaultValue={settings?.push.enabled || false}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Enable Push Notifications"
                      sx={{ mb: 2 }}
                    />
                  )}
                />

                <Divider sx={{ my: 2 }} />

                <List dense>
                  {[
                    { key: 'bookingUpdates', label: 'Booking Updates' },
                    { key: 'paymentUpdates', label: 'Payment Updates' },
                    { key: 'promotional', label: 'Promotional Offers' },
                    { key: 'inAppMessages', label: 'In-App Messages' },
                  ].map((item) => (
                    <ListItem key={item.key}>
                      <ListItemText primary={item.label} />
                      <ListItemSecondaryAction>
                        <Controller
                          name={`push.${item.key}`}
                          control={control}
                          defaultValue={
                            settings?.push[item.key as keyof typeof settings.push] || false
                          }
                          render={({ field }) => (
                            <Switch {...field} checked={field.value} size="small" />
                          )}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* In-App Notifications */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <NotificationsIcon sx={{ mr: 1, color: 'info.main' }} />
                  <Typography variant="h6" fontWeight="bold">
                    In-App Notifications
                  </Typography>
                </Box>

                <Controller
                  name="inApp.enabled"
                  control={control}
                  defaultValue={settings?.inApp.enabled || false}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Enable In-App Notifications"
                      sx={{ mb: 2 }}
                    />
                  )}
                />

                <Divider sx={{ my: 2 }} />

                <List dense>
                  {[
                    { key: 'sound', label: 'Notification Sound' },
                    { key: 'desktop', label: 'Desktop Notifications' },
                    { key: 'autoMarkRead', label: 'Auto-mark as Read' },
                  ].map((item) => (
                    <ListItem key={item.key}>
                      <ListItemText primary={item.label} />
                      <ListItemSecondaryAction>
                        <Controller
                          name={`inApp.${item.key}`}
                          control={control}
                          defaultValue={
                            settings?.inApp[item.key as keyof typeof settings.inApp] || false
                          }
                          render={({ field }) => (
                            <Switch {...field} checked={field.value} size="small" />
                          )}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>

                <Box mt={2}>
                  <Controller
                    name="inApp.readTimeout"
                    control={control}
                    defaultValue={settings?.inApp.readTimeout || 30}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Auto-read Timeout (seconds)"
                        type="number"
                        fullWidth
                        size="small"
                      />
                    )}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Notification Channels */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" mb={2}>
                  Active Notification Channels
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {settings?.channels.map((channel, index) => (
                    <Chip
                      key={index}
                      label={channel.type.replace('_', ' ')}
                      color={channel.enabled ? 'primary' : 'default'}
                      variant={channel.enabled ? 'filled' : 'outlined'}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
          <Button
            variant="outlined"
            onClick={() => reset(settings)}
            disabled={!isDirty || saving}
          >
            Reset
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
            disabled={saving || !isDirty}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default NotificationSettings;
