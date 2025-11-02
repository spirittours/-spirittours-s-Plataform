import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  CreditCard as CardIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import stripeService from '../../services/stripeService';
import {
  SavedPaymentMethod,
  PaymentMethod,
  CardBrand,
} from '../../types/payment.types';

// ============================================================================
// Props Interface
// ============================================================================

interface PaymentMethodsProps {
  customerId: string;
  onMethodSelected?: (method: SavedPaymentMethod) => void;
}

// ============================================================================
// Component
// ============================================================================

const PaymentMethods: React.FC<PaymentMethodsProps> = ({ customerId, onMethodSelected }) => {
  // ==========================================================================
  // State Management
  // ==========================================================================

  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState<SavedPaymentMethod | null>(null);

  // Selected method
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');

  // ==========================================================================
  // Fetch Payment Methods
  // ==========================================================================

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      setError(null);

      const methods = await stripeService.getCustomerPaymentMethods(customerId);
      setPaymentMethods(methods);

      // Set default as selected
      const defaultMethod = methods.find((m) => m.isDefault);
      if (defaultMethod) {
        setSelectedMethodId(defaultMethod.id);
      }
    } catch (err: any) {
      console.error('Error fetching payment methods:', err);
      setError(err.message || 'Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, [customerId]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleSetDefault = async (methodId: string) => {
    try {
      await stripeService.setDefaultPaymentMethod(customerId, methodId);
      toast.success('Default payment method updated');
      fetchPaymentMethods();
    } catch (err: any) {
      console.error('Error setting default:', err);
      toast.error(err.message || 'Failed to update default payment method');
    }
  };

  const handleDeleteClick = (method: SavedPaymentMethod) => {
    setMethodToDelete(method);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!methodToDelete) return;

    try {
      await stripeService.deletePaymentMethod(methodToDelete.id);
      toast.success('Payment method deleted');
      setDeleteDialogOpen(false);
      setMethodToDelete(null);
      fetchPaymentMethods();
    } catch (err: any) {
      console.error('Error deleting payment method:', err);
      toast.error(err.message || 'Failed to delete payment method');
    }
  };

  const handleSelectMethod = (methodId: string) => {
    setSelectedMethodId(methodId);
    const method = paymentMethods.find((m) => m.id === methodId);
    if (method && onMethodSelected) {
      onMethodSelected(method);
    }
  };

  // ==========================================================================
  // Utility Functions
  // ==========================================================================

  const getCardBrandIcon = (brand: CardBrand): string => {
    switch (brand) {
      case CardBrand.VISA:
        return '💳 Visa';
      case CardBrand.MASTERCARD:
        return '💳 Mastercard';
      case CardBrand.AMEX:
        return '💳 Amex';
      case CardBrand.DISCOVER:
        return '💳 Discover';
      default:
        return '💳 Card';
    }
  };

  const getPaymentMethodIcon = (type: PaymentMethod) => {
    switch (type) {
      case PaymentMethod.CREDIT_CARD:
      case PaymentMethod.DEBIT_CARD:
        return <CardIcon />;
      case PaymentMethod.BANK_TRANSFER:
        return <BankIcon />;
      default:
        return <CardIcon />;
    }
  };

  // ==========================================================================
  // Render Loading State
  // ==========================================================================

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
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
  // Render
  // ==========================================================================

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Payment Methods</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
        >
          Add Payment Method
        </Button>
      </Box>

      {/* Payment Methods List */}
      {paymentMethods.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: 'center' }}>
          <CardIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No payment methods saved
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Add a payment method to make checkout faster
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
            sx={{ mt: 2 }}
          >
            Add Payment Method
          </Button>
        </Paper>
      ) : (
        <RadioGroup value={selectedMethodId} onChange={(e) => handleSelectMethod(e.target.value)}>
          <Grid container spacing={2}>
            {paymentMethods.map((method) => (
              <Grid item xs={12} key={method.id}>
                <Card
                  variant="outlined"
                  sx={{
                    border: selectedMethodId === method.id ? 2 : 1,
                    borderColor: selectedMethodId === method.id ? 'primary.main' : 'divider',
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {/* Radio button */}
                      <FormControlLabel
                        value={method.id}
                        control={<Radio />}
                        label=""
                        sx={{ m: 0 }}
                      />

                      {/* Icon */}
                      <Box sx={{ color: 'primary.main' }}>
                        {getPaymentMethodIcon(method.type)}
                      </Box>

                      {/* Details */}
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="body1" fontWeight="medium">
                            {method.details.card
                              ? `${getCardBrandIcon(method.details.card.brand)} •••• ${method.details.card.last4}`
                              : method.nickname || 'Payment Method'}
                          </Typography>
                          {method.isDefault && (
                            <Chip label="Default" color="primary" size="small" />
                          )}
                        </Box>

                        {method.details.card && (
                          <Typography variant="body2" color="text.secondary">
                            Expires {method.details.card.expMonth}/{method.details.card.expYear}
                          </Typography>
                        )}

                        {method.details.bankAccount && (
                          <Typography variant="body2" color="text.secondary">
                            {method.details.bankAccount.bankName} ••••{' '}
                            {method.details.bankAccount.accountNumberLast4}
                          </Typography>
                        )}
                      </Box>

                      {/* Actions */}
                      <Box>
                        {!method.isDefault && (
                          <IconButton
                            size="small"
                            onClick={() => handleSetDefault(method.id)}
                            title="Set as default"
                          >
                            <StarBorderIcon />
                          </IconButton>
                        )}
                        {method.isDefault && (
                          <IconButton size="small" disabled title="Default method">
                            <StarIcon color="primary" />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(method)}
                          color="error"
                          title="Delete"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </RadioGroup>
      )}

      {/* Add Payment Method Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Payment Method</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Payment method setup will be integrated with Stripe Elements or PayPal in the checkout flow.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Click "Add Payment Method" button during checkout to securely add a new payment method.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Payment Method</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this payment method?
            {methodToDelete?.isDefault && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                This is your default payment method. Another method will be set as default.
              </Alert>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentMethods;
