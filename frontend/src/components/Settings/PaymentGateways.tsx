import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  CheckCircle,
  Warning,
  CreditCard,
  Payments as PaymentsIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { PaymentGatewayConfig, PaymentGateway } from '../../types/settings.types';
import apiClient from '../../services/apiClient';

const GATEWAY_INFO = {
  [PaymentGateway.STRIPE]: { name: 'Stripe', icon: '💳', color: '#635BFF' },
  [PaymentGateway.PAYPAL]: { name: 'PayPal', icon: '🅿️', color: '#003087' },
  [PaymentGateway.SQUARE]: { name: 'Square', icon: '⬛', color: '#000000' },
  [PaymentGateway.BRAINTREE]: { name: 'Braintree', icon: '🌳', color: '#00C853' },
  [PaymentGateway.AUTHORIZE_NET]: { name: 'Authorize.Net', icon: '🔐', color: '#0077C5' },
  [PaymentGateway.MERCADO_PAGO]: { name: 'Mercado Pago', icon: '💰', color: '#009EE3' },
  [PaymentGateway.PAYU]: { name: 'PayU', icon: '💵', color: '#7CB342' },
  [PaymentGateway.BANK_TRANSFER]: { name: 'Bank Transfer', icon: '🏦', color: '#607D8B' },
  [PaymentGateway.CASH]: { name: 'Cash', icon: '💵', color: '#4CAF50' },
  [PaymentGateway.CUSTOM]: { name: 'Custom', icon: '⚙️', color: '#9E9E9E' },
};

const PaymentGateways: React.FC = () => {
  const [gateways, setGateways] = useState<PaymentGatewayConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingGateway, setEditingGateway] = useState<PaymentGatewayConfig | null>(null);
  
  const { control, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    fetchGateways();
  }, []);

  const fetchGateways = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<PaymentGatewayConfig[]>('/api/settings/payment-gateways');
      setGateways(response.data);
    } catch (err: any) {
      console.error('Error fetching gateways:', err);
      toast.error('Failed to load payment gateways');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (gateway?: PaymentGatewayConfig) => {
    if (gateway) {
      setEditingGateway(gateway);
      reset(gateway);
    } else {
      setEditingGateway(null);
      reset({ 
        isEnabled: true, 
        isDefault: false,
        credentials: { environment: 'sandbox' },
        settings: { autoCapture: true, requireCVV: true, threeDSecure: false },
        fees: { fixedFee: 0, percentageFee: 0, passFeesToCustomer: false }
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingGateway(null);
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingGateway) {
        await apiClient.put(`/api/settings/payment-gateways/${editingGateway.id}`, data);
        toast.success('Gateway updated successfully!');
      } else {
        await apiClient.post('/api/settings/payment-gateways', data);
        toast.success('Gateway added successfully!');
      }
      await fetchGateways();
      handleCloseDialog();
    } catch (err: any) {
      console.error('Error saving gateway:', err);
      toast.error(err.response?.data?.message || 'Failed to save gateway');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this gateway?')) return;

    try {
      await apiClient.delete(`/api/settings/payment-gateways/${id}`);
      toast.success('Gateway deleted successfully!');
      await fetchGateways();
    } catch (err: any) {
      console.error('Error deleting gateway:', err);
      toast.error('Failed to delete gateway');
    }
  };

  const handleToggle = async (gateway: PaymentGatewayConfig) => {
    try {
      await apiClient.patch(`/api/settings/payment-gateways/${gateway.id}/toggle`, {
        isEnabled: !gateway.isEnabled,
      });
      await fetchGateways();
      toast.success(`Gateway ${!gateway.isEnabled ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      console.error('Error toggling gateway:', err);
      toast.error('Failed to toggle gateway');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Payment Gateways
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure payment processing options
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Add Gateway
        </Button>
      </Box>

      {/* Gateways Grid */}
      <Grid container spacing={3}>
        {gateways.map((gateway) => {
          const info = GATEWAY_INFO[gateway.gateway];
          return (
            <Grid item xs={12} md={6} lg={4} key={gateway.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box display="flex" alignItems="center">
                      <Typography variant="h4" mr={1}>
                        {info.icon}
                      </Typography>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {gateway.displayName || info.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {gateway.gateway}
                        </Typography>
                      </Box>
                    </Box>
                    <Box display="flex" gap={0.5}>
                      <IconButton size="small" onClick={() => handleOpenDialog(gateway)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(gateway.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      {gateway.description}
                    </Typography>
                  </Box>

                  <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                    <Chip
                      label={gateway.isEnabled ? 'Enabled' : 'Disabled'}
                      size="small"
                      color={gateway.isEnabled ? 'success' : 'default'}
                      icon={gateway.isEnabled ? <CheckCircle /> : <Warning />}
                    />
                    {gateway.isDefault && (
                      <Chip label="Default" size="small" color="primary" />
                    )}
                    <Chip
                      label={gateway.credentials.environment}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                      Fees
                    </Typography>
                    <Typography variant="body2">
                      {gateway.fees.fixedFee > 0 && `$${gateway.fees.fixedFee} + `}
                      {gateway.fees.percentageFee}%
                      {gateway.fees.passFeesToCustomer && ' (passed to customer)'}
                    </Typography>
                  </Box>

                  <Box mt={2}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={gateway.isEnabled}
                          onChange={() => handleToggle(gateway)}
                          size="small"
                        />
                      }
                      label={<Typography variant="caption">Active</Typography>}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        {gateways.length === 0 && (
          <Grid item xs={12}>
            <Alert severity="info">
              No payment gateways configured. Click "Add Gateway" to add one.
            </Alert>
          </Grid>
        )}
      </Grid>

      {/* Gateway Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {editingGateway ? 'Edit Payment Gateway' : 'Add Payment Gateway'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="gateway"
                  control={control}
                  rules={{ required: 'Gateway is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.gateway}>
                      <InputLabel>Gateway Type</InputLabel>
                      <Select {...field} label="Gateway Type">
                        {Object.values(PaymentGateway).map((gw) => (
                          <MenuItem key={gw} value={gw}>
                            {GATEWAY_INFO[gw].icon} {GATEWAY_INFO[gw].name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="displayName"
                  control={control}
                  rules={{ required: 'Display name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Display Name"
                      fullWidth
                      error={!!errors.displayName}
                      helperText={errors.displayName?.message?.toString()}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Description" fullWidth multiline rows={2} />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                  Credentials
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="credentials.publicKey"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Public Key / Publishable Key" fullWidth />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="credentials.secretKey"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Secret Key / API Key"
                      type="password"
                      fullWidth
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="credentials.environment"
                  control={control}
                  defaultValue="sandbox"
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Environment</InputLabel>
                      <Select {...field} label="Environment">
                        <MenuItem value="sandbox">Sandbox (Test)</MenuItem>
                        <MenuItem value="production">Production (Live)</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                  Fees
                </Typography>
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="fees.fixedFee"
                  control={control}
                  defaultValue={0}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Fixed Fee"
                      type="number"
                      fullWidth
                      InputProps={{ startAdornment: '$' }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="fees.percentageFee"
                  control={control}
                  defaultValue={0}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Percentage Fee"
                      type="number"
                      fullWidth
                      InputProps={{ endAdornment: '%' }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="fees.passFeesToCustomer"
                  control={control}
                  defaultValue={false}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Pass fees to customer"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="isEnabled"
                  control={control}
                  defaultValue={true}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Enabled"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="isDefault"
                  control={control}
                  defaultValue={false}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Set as Default"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingGateway ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default PaymentGateways;
