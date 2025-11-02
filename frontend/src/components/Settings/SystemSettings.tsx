import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  SelectChangeEvent,
} from '@mui/material';
import {
  Save,
  Refresh,
  Upload,
  Download,
  Settings as SettingsIcon,
  Business,
  Language,
  Security,
  Flag,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { SystemSettings as SystemSettingsType, SettingsUpdateRequest } from '../../types/settings.types';
import apiClient from '../../services/apiClient';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Madrid',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
];

const languages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh'];
const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'MXN', 'BRL', 'CAD', 'AUD'];

const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState<SystemSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<SystemSettingsType>('/api/settings/system');
      setSettings(response.data);
      reset(response.data);
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError(err.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    if (isDirty) {
      if (
        window.confirm('You have unsaved changes. Are you sure you want to switch tabs?')
      ) {
        setActiveTab(newValue);
      }
    } else {
      setActiveTab(newValue);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      setSaving(true);
      setError(null);

      const category = ['general', 'business', 'regional', 'security', 'features'][
        activeTab
      ] as 'general' | 'business' | 'regional' | 'security' | 'features';

      const updateRequest: SettingsUpdateRequest = {
        category,
        settings: data,
      };

      await apiClient.put('/api/settings/system', updateRequest);
      await fetchSettings();
      toast.success('Settings updated successfully!');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      const errorMessage = err.response?.data?.message || 'Failed to save settings';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await apiClient.get('/api/settings/export', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Settings exported successfully!');
    } catch (err: any) {
      console.error('Error exporting settings:', err);
      toast.error('Failed to export settings');
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importData = JSON.parse(content);

        await apiClient.post('/api/settings/import', importData);
        await fetchSettings();
        toast.success('Settings imported successfully!');
      } catch (err: any) {
        console.error('Error importing settings:', err);
        toast.error('Failed to import settings');
      }
    };
    reader.readAsText(file);
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
            System Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure global system settings and preferences
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Export Settings">
            <IconButton onClick={handleExport} color="primary">
              <Download />
            </IconButton>
          </Tooltip>
          <Tooltip title="Import Settings">
            <IconButton component="label" color="primary">
              <Upload />
              <input type="file" accept=".json" hidden onChange={handleImport} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchSettings} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Card>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="General" icon={<SettingsIcon />} iconPosition="start" />
          <Tab label="Business" icon={<Business />} iconPosition="start" />
          <Tab label="Regional" icon={<Language />} iconPosition="start" />
          <Tab label="Security" icon={<Security />} iconPosition="start" />
          <Tab label="Features" icon={<Flag />} iconPosition="start" />
        </Tabs>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* General Settings Tab */}
            <TabPanel value={activeTab} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="general.companyName"
                    control={control}
                    defaultValue={settings?.general.companyName || ''}
                    rules={{ required: 'Company name is required' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Company Name"
                        fullWidth
                        error={!!errors.general?.companyName}
                        helperText={errors.general?.companyName?.message?.toString()}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="general.supportEmail"
                    control={control}
                    defaultValue={settings?.general.supportEmail || ''}
                    rules={{
                      required: 'Support email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Support Email"
                        fullWidth
                        error={!!errors.general?.supportEmail}
                        helperText={errors.general?.supportEmail?.message?.toString()}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="general.supportPhone"
                    control={control}
                    defaultValue={settings?.general.supportPhone || ''}
                    render={({ field }) => (
                      <TextField {...field} label="Support Phone" fullWidth />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="general.website"
                    control={control}
                    defaultValue={settings?.general.website || ''}
                    render={({ field }) => (
                      <TextField {...field} label="Website" fullWidth />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="general.timezone"
                    control={control}
                    defaultValue={settings?.general.timezone || 'America/New_York'}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Timezone</InputLabel>
                        <Select {...field} label="Timezone">
                          {timezones.map((tz) => (
                            <MenuItem key={tz} value={tz}>
                              {tz}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="general.language"
                    control={control}
                    defaultValue={settings?.general.language || 'en'}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Language</InputLabel>
                        <Select {...field} label="Language">
                          {languages.map((lang) => (
                            <MenuItem key={lang} value={lang}>
                              {lang.toUpperCase()}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="general.currency"
                    control={control}
                    defaultValue={settings?.general.currency || 'USD'}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Currency</InputLabel>
                        <Select {...field} label="Currency">
                          {currencies.map((curr) => (
                            <MenuItem key={curr} value={curr}>
                              {curr}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="general.timeFormat"
                    control={control}
                    defaultValue={settings?.general.timeFormat || '12h'}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Time Format</InputLabel>
                        <Select {...field} label="Time Format">
                          <MenuItem value="12h">12 Hour</MenuItem>
                          <MenuItem value="24h">24 Hour</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
              </Grid>
            </TabPanel>

            {/* Business Settings Tab */}
            <TabPanel value={activeTab} index={1}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" mb={2}>
                    Booking Configuration
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="business.bookingLead"
                    control={control}
                    defaultValue={settings?.business.bookingLead || 1}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Booking Lead Time (Days)"
                        type="number"
                        fullWidth
                        helperText="Minimum days in advance for booking"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="business.cancellationPolicy.freeUntilDays"
                    control={control}
                    defaultValue={settings?.business.cancellationPolicy.freeUntilDays || 7}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Free Cancellation Until (Days)"
                        type="number"
                        fullWidth
                        helperText="Days before tour for free cancellation"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="business.cancellationPolicy.partialRefundDays"
                    control={control}
                    defaultValue={settings?.business.cancellationPolicy.partialRefundDays || 3}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Partial Refund Until (Days)"
                        type="number"
                        fullWidth
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="business.cancellationPolicy.partialRefundPercentage"
                    control={control}
                    defaultValue={
                      settings?.business.cancellationPolicy.partialRefundPercentage || 50
                    }
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Partial Refund Percentage"
                        type="number"
                        fullWidth
                        InputProps={{ endAdornment: '%' }}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </TabPanel>

            {/* Regional Settings Tab */}
            <TabPanel value={activeTab} index={2}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="regional.defaultCountry"
                    control={control}
                    defaultValue={settings?.regional.defaultCountry || 'US'}
                    render={({ field }) => (
                      <TextField {...field} label="Default Country Code" fullWidth />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="regional.taxRate"
                    control={control}
                    defaultValue={settings?.regional.taxRate || 0}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Tax Rate"
                        type="number"
                        fullWidth
                        InputProps={{ endAdornment: '%' }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="regional.distanceUnit"
                    control={control}
                    defaultValue={settings?.regional.distanceUnit || 'km'}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Distance Unit</InputLabel>
                        <Select {...field} label="Distance Unit">
                          <MenuItem value="km">Kilometers (km)</MenuItem>
                          <MenuItem value="mi">Miles (mi)</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="regional.taxInclusive"
                    control={control}
                    defaultValue={settings?.regional.taxInclusive || false}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="Tax Inclusive Pricing"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </TabPanel>

            {/* Security Settings Tab */}
            <TabPanel value={activeTab} index={3}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="security.passwordPolicy.minLength"
                    control={control}
                    defaultValue={settings?.security.passwordPolicy.minLength || 8}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Minimum Password Length"
                        type="number"
                        fullWidth
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="security.sessionTimeout"
                    control={control}
                    defaultValue={settings?.security.sessionTimeout || 30}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Session Timeout (Minutes)"
                        type="number"
                        fullWidth
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="security.maxLoginAttempts"
                    control={control}
                    defaultValue={settings?.security.maxLoginAttempts || 5}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Max Login Attempts"
                        type="number"
                        fullWidth
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="security.lockoutDuration"
                    control={control}
                    defaultValue={settings?.security.lockoutDuration || 15}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Lockout Duration (Minutes)"
                        type="number"
                        fullWidth
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="security.twoFactorRequired"
                    control={control}
                    defaultValue={settings?.security.twoFactorRequired || false}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="Require Two-Factor Authentication"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </TabPanel>

            {/* Features Tab */}
            <TabPanel value={activeTab} index={4}>
              <Grid container spacing={2}>
                {[
                  { key: 'enableAI', label: 'AI Features' },
                  { key: 'enableChat', label: 'Live Chat' },
                  { key: 'enableVideoCall', label: 'Video Calls' },
                  { key: 'enableGPS', label: 'GPS Tracking' },
                  { key: 'enableSocialShare', label: 'Social Sharing' },
                  { key: 'enableReferrals', label: 'Referral Program' },
                  { key: 'enableReviews', label: 'Customer Reviews' },
                  { key: 'enableGiftCards', label: 'Gift Cards' },
                  { key: 'enableSubscriptions', label: 'Subscriptions' },
                  { key: 'enableMemberships', label: 'Memberships' },
                  { key: 'maintenanceMode', label: 'Maintenance Mode' },
                ].map((feature) => (
                  <Grid item xs={12} sm={6} md={4} key={feature.key}>
                    <Controller
                      name={`features.${feature.key}`}
                      control={control}
                      defaultValue={
                        settings?.features[feature.key as keyof typeof settings.features] || false
                      }
                      render={({ field }) => (
                        <Card variant="outlined">
                          <CardContent>
                            <FormControlLabel
                              control={<Switch {...field} checked={field.value} />}
                              label={feature.label}
                            />
                          </CardContent>
                        </Card>
                      )}
                    />
                  </Grid>
                ))}
              </Grid>
            </TabPanel>

            {/* Action Buttons */}
            <Divider sx={{ my: 3 }} />
            <Box display="flex" justifyContent="flex-end" gap={2}>
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
                startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                disabled={saving || !isDirty}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SystemSettings;
