import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Stack,
  Tooltip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as ContentCopyIcon,
  ExpandMore as ExpandMoreIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Group as GroupIcon,
  CalendarMonth as CalendarMonthIcon,
  LocalOffer as LocalOfferIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { toursService } from '../../services/toursService';
import { PricingRule, PricingModifier, GroupDiscount, SeasonalPrice } from '../../types/tour.types';

interface TourPricingProps {
  tourId: string;
  basePrice: number;
  currency: string;
  onPricingUpdate?: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const TourPricing: React.FC<TourPricingProps> = ({
  tourId,
  basePrice: initialBasePrice,
  currency: initialCurrency,
  onPricingUpdate,
}) => {
  // State
  const [activeTab, setActiveTab] = useState(0);
  const [basePrice, setBasePrice] = useState(initialBasePrice);
  const [currency, setCurrency] = useState(initialCurrency);
  const [loading, setLoading] = useState(false);
  
  // Pricing rules
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [groupDiscounts, setGroupDiscounts] = useState<GroupDiscount[]>([]);
  const [seasonalPrices, setSeasonalPrices] = useState<SeasonalPrice[]>([]);
  const [modifiers, setModifiers] = useState<PricingModifier[]>([]);
  
  // Dialog states
  const [groupDiscountDialogOpen, setGroupDiscountDialogOpen] = useState(false);
  const [seasonalPriceDialogOpen, setSeasonalPriceDialogOpen] = useState(false);
  const [modifierDialogOpen, setModifierDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  // Editing states
  const [editingGroupDiscount, setEditingGroupDiscount] = useState<GroupDiscount | null>(null);
  const [editingSeasonalPrice, setEditingSeasonalPrice] = useState<SeasonalPrice | null>(null);
  const [editingModifier, setEditingModifier] = useState<PricingModifier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string } | null>(null);
  
  // Form states
  const [groupDiscountForm, setGroupDiscountForm] = useState({
    minParticipants: 5,
    maxParticipants: 10,
    discountPercentage: 10,
    discountType: 'percentage' as 'percentage' | 'fixed',
  });
  
  const [seasonalPriceForm, setSeasonalPriceForm] = useState({
    name: '',
    startDate: new Date(),
    endDate: new Date(),
    priceAdjustment: 0,
    adjustmentType: 'percentage' as 'percentage' | 'fixed',
    priority: 1,
  });
  
  const [modifierForm, setModifierForm] = useState({
    name: '',
    type: 'surcharge' as 'surcharge' | 'discount',
    value: 0,
    valueType: 'percentage' as 'percentage' | 'fixed',
    applicableOn: 'per_person' as 'per_person' | 'per_booking',
    isActive: true,
  });

  // Load pricing data
  useEffect(() => {
    loadPricingData();
  }, [tourId]);

  const loadPricingData = async () => {
    try {
      setLoading(true);
      const data = await toursService.getPricing(tourId);
      
      setPricingRules(data.rules || []);
      setGroupDiscounts(data.groupDiscounts || []);
      setSeasonalPrices(data.seasonalPrices || []);
      setModifiers(data.modifiers || []);
    } catch (error) {
      console.error('Failed to load pricing data:', error);
      toast.error('Failed to load pricing configuration');
    } finally {
      setLoading(false);
    }
  };

  // Handle base price update
  const handleUpdateBasePrice = async () => {
    try {
      await toursService.updateTour(tourId, {
        basePrice: { amount: basePrice, currency },
      });
      toast.success('Base price updated successfully');
      onPricingUpdate?.();
    } catch (error) {
      console.error('Failed to update base price:', error);
      toast.error('Failed to update base price');
    }
  };

  // Group Discount handlers
  const handleSaveGroupDiscount = async () => {
    try {
      if (editingGroupDiscount) {
        await toursService.updateGroupDiscount(tourId, editingGroupDiscount.id, groupDiscountForm);
        toast.success('Group discount updated');
      } else {
        await toursService.createGroupDiscount(tourId, groupDiscountForm);
        toast.success('Group discount created');
      }
      
      setGroupDiscountDialogOpen(false);
      loadPricingData();
      onPricingUpdate?.();
    } catch (error) {
      console.error('Failed to save group discount:', error);
      toast.error('Failed to save group discount');
    }
  };

  const handleEditGroupDiscount = (discount: GroupDiscount) => {
    setEditingGroupDiscount(discount);
    setGroupDiscountForm({
      minParticipants: discount.minParticipants,
      maxParticipants: discount.maxParticipants || 999,
      discountPercentage: discount.discountPercentage,
      discountType: discount.discountType || 'percentage',
    });
    setGroupDiscountDialogOpen(true);
  };

  const handleDeleteGroupDiscount = async () => {
    if (!deleteTarget || deleteTarget.type !== 'groupDiscount') return;
    
    try {
      await toursService.deleteGroupDiscount(tourId, deleteTarget.id);
      toast.success('Group discount deleted');
      setDeleteConfirmOpen(false);
      loadPricingData();
      onPricingUpdate?.();
    } catch (error) {
      console.error('Failed to delete group discount:', error);
      toast.error('Failed to delete group discount');
    }
  };

  // Seasonal Price handlers
  const handleSaveSeasonalPrice = async () => {
    try {
      const data = {
        ...seasonalPriceForm,
        startDate: format(seasonalPriceForm.startDate, 'yyyy-MM-dd'),
        endDate: format(seasonalPriceForm.endDate, 'yyyy-MM-dd'),
      };
      
      if (editingSeasonalPrice) {
        await toursService.updateSeasonalPrice(tourId, editingSeasonalPrice.id, data);
        toast.success('Seasonal price updated');
      } else {
        await toursService.createSeasonalPrice(tourId, data);
        toast.success('Seasonal price created');
      }
      
      setSeasonalPriceDialogOpen(false);
      loadPricingData();
      onPricingUpdate?.();
    } catch (error) {
      console.error('Failed to save seasonal price:', error);
      toast.error('Failed to save seasonal price');
    }
  };

  const handleEditSeasonalPrice = (price: SeasonalPrice) => {
    setEditingSeasonalPrice(price);
    setSeasonalPriceForm({
      name: price.name,
      startDate: new Date(price.startDate),
      endDate: new Date(price.endDate),
      priceAdjustment: price.priceAdjustment,
      adjustmentType: price.adjustmentType || 'percentage',
      priority: price.priority || 1,
    });
    setSeasonalPriceDialogOpen(true);
  };

  // Modifier handlers
  const handleSaveModifier = async () => {
    try {
      if (editingModifier) {
        await toursService.updatePricingModifier(tourId, editingModifier.id, modifierForm);
        toast.success('Pricing modifier updated');
      } else {
        await toursService.createPricingModifier(tourId, modifierForm);
        toast.success('Pricing modifier created');
      }
      
      setModifierDialogOpen(false);
      loadPricingData();
      onPricingUpdate?.();
    } catch (error) {
      console.error('Failed to save modifier:', error);
      toast.error('Failed to save modifier');
    }
  };

  const handleEditModifier = (modifier: PricingModifier) => {
    setEditingModifier(modifier);
    setModifierForm({
      name: modifier.name,
      type: modifier.type,
      value: modifier.value,
      valueType: modifier.valueType,
      applicableOn: modifier.applicableOn,
      isActive: modifier.isActive,
    });
    setModifierDialogOpen(true);
  };

  // Calculate example prices
  const calculateExamplePrice = (participants: number): number => {
    let price = basePrice * participants;
    
    // Apply group discounts
    const applicableDiscount = groupDiscounts.find(
      d => participants >= d.minParticipants && (!d.maxParticipants || participants <= d.maxParticipants)
    );
    
    if (applicableDiscount) {
      if (applicableDiscount.discountType === 'percentage') {
        price = price * (1 - applicableDiscount.discountPercentage / 100);
      } else {
        price = price - applicableDiscount.discountPercentage;
      }
    }
    
    // Apply modifiers
    modifiers.filter(m => m.isActive).forEach(modifier => {
      const modifierValue = modifier.valueType === 'percentage'
        ? price * (modifier.value / 100)
        : modifier.value;
      
      if (modifier.type === 'surcharge') {
        price += modifier.applicableOn === 'per_person' ? modifierValue * participants : modifierValue;
      } else {
        price -= modifier.applicableOn === 'per_person' ? modifierValue * participants : modifierValue;
      }
    });
    
    return Math.max(price, 0);
  };

  // Render base price section
  const renderBasePriceSection = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Base Price Configuration
        </Typography>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Base Price"
              type="number"
              value={basePrice}
              onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>{currency}</Typography>,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Currency</InputLabel>
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                label="Currency"
              >
                <MenuItem value="USD">USD - US Dollar</MenuItem>
                <MenuItem value="EUR">EUR - Euro</MenuItem>
                <MenuItem value="GBP">GBP - British Pound</MenuItem>
                <MenuItem value="JPY">JPY - Japanese Yen</MenuItem>
                <MenuItem value="CAD">CAD - Canadian Dollar</MenuItem>
                <MenuItem value="AUD">AUD - Australian Dollar</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleUpdateBasePrice}
            >
              Update
            </Button>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="subtitle1" gutterBottom>
          Price Examples
        </Typography>
        <Grid container spacing={2}>
          {[1, 2, 5, 10].map(participants => (
            <Grid item xs={6} sm={3} key={participants}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6">
                  {currency} {calculateExamplePrice(participants).toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {participants} {participants === 1 ? 'person' : 'people'}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );

  // Render group discounts section
  const renderGroupDiscountsSection = () => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupIcon color="primary" />
            <Typography variant="h6">Group Discounts</Typography>
          </Box>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => {
              setEditingGroupDiscount(null);
              setGroupDiscountForm({
                minParticipants: 5,
                maxParticipants: 10,
                discountPercentage: 10,
                discountType: 'percentage',
              });
              setGroupDiscountDialogOpen(true);
            }}
          >
            Add Discount
          </Button>
        </Box>
        
        {groupDiscounts.length === 0 ? (
          <Alert severity="info">
            No group discounts configured. Add discounts to encourage larger bookings.
          </Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Group Size</TableCell>
                  <TableCell>Discount</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupDiscounts.map(discount => (
                  <TableRow key={discount.id}>
                    <TableCell>
                      {discount.minParticipants} - {discount.maxParticipants || '∞'} people
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<TrendingDownIcon />}
                        label={`${discount.discountPercentage}${discount.discountType === 'percentage' ? '%' : ` ${currency}`}`}
                        color="success"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={discount.discountType} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEditGroupDiscount(discount)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setDeleteTarget({ type: 'groupDiscount', id: discount.id });
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );

  // Render seasonal prices section
  const renderSeasonalPricesSection = () => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarMonthIcon color="primary" />
            <Typography variant="h6">Seasonal Pricing</Typography>
          </Box>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => {
              setEditingSeasonalPrice(null);
              setSeasonalPriceForm({
                name: '',
                startDate: new Date(),
                endDate: new Date(),
                priceAdjustment: 0,
                adjustmentType: 'percentage',
                priority: 1,
              });
              setSeasonalPriceDialogOpen(true);
            }}
          >
            Add Season
          </Button>
        </Box>
        
        {seasonalPrices.length === 0 ? (
          <Alert severity="info">
            No seasonal prices configured. Add seasonal pricing to adjust rates during peak/off-peak periods.
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {seasonalPrices.map(price => (
              <Grid item xs={12} md={6} key={price.id}>
                <Paper sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                    <Typography variant="h6">{price.name}</Typography>
                    <Stack direction="row">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEditSeasonalPrice(price)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setDeleteTarget({ type: 'seasonalPrice', id: price.id });
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {format(new Date(price.startDate), 'MMM dd, yyyy')} -{' '}
                    {format(new Date(price.endDate), 'MMM dd, yyyy')}
                  </Typography>
                  <Chip
                    icon={price.priceAdjustment >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                    label={`${price.priceAdjustment >= 0 ? '+' : ''}${price.priceAdjustment}${price.adjustmentType === 'percentage' ? '%' : ` ${currency}`}`}
                    color={price.priceAdjustment >= 0 ? 'error' : 'success'}
                    size="small"
                  />
                  <Chip
                    label={`Priority: ${price.priority}`}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </CardContent>
    </Card>
  );

  // Render modifiers section
  const renderModifiersSection = () => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalOfferIcon color="primary" />
            <Typography variant="h6">Pricing Modifiers</Typography>
          </Box>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => {
              setEditingModifier(null);
              setModifierForm({
                name: '',
                type: 'surcharge',
                value: 0,
                valueType: 'percentage',
                applicableOn: 'per_person',
                isActive: true,
              });
              setModifierDialogOpen(true);
            }}
          >
            Add Modifier
          </Button>
        </Box>
        
        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
          Modifiers are additional charges or discounts applied to the final price (e.g., taxes, service fees, special promotions).
        </Alert>
        
        {modifiers.length === 0 ? (
          <Alert severity="info">
            No pricing modifiers configured.
          </Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Applied On</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {modifiers.map(modifier => (
                  <TableRow key={modifier.id}>
                    <TableCell>{modifier.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={modifier.type}
                        color={modifier.type === 'surcharge' ? 'error' : 'success'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {modifier.value}{modifier.valueType === 'percentage' ? '%' : ` ${currency}`}
                    </TableCell>
                    <TableCell>
                      <Chip label={modifier.applicableOn.replace('_', ' ')} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={modifier.isActive ? 'Active' : 'Inactive'}
                        color={modifier.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEditModifier(modifier)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setDeleteTarget({ type: 'modifier', id: modifier.id });
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );

  // Render dialogs
  const renderGroupDiscountDialog = () => (
    <Dialog
      open={groupDiscountDialogOpen}
      onClose={() => setGroupDiscountDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {editingGroupDiscount ? 'Edit Group Discount' : 'Add Group Discount'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Min Participants"
              type="number"
              value={groupDiscountForm.minParticipants}
              onChange={(e) =>
                setGroupDiscountForm({
                  ...groupDiscountForm,
                  minParticipants: parseInt(e.target.value) || 0,
                })
              }
              InputProps={{ inputProps: { min: 1 } }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Max Participants"
              type="number"
              value={groupDiscountForm.maxParticipants}
              onChange={(e) =>
                setGroupDiscountForm({
                  ...groupDiscountForm,
                  maxParticipants: parseInt(e.target.value) || 0,
                })
              }
              InputProps={{ inputProps: { min: 1 } }}
              helperText="Leave 999 for unlimited"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Discount Value"
              type="number"
              value={groupDiscountForm.discountPercentage}
              onChange={(e) =>
                setGroupDiscountForm({
                  ...groupDiscountForm,
                  discountPercentage: parseFloat(e.target.value) || 0,
                })
              }
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Discount Type</InputLabel>
              <Select
                value={groupDiscountForm.discountType}
                onChange={(e) =>
                  setGroupDiscountForm({
                    ...groupDiscountForm,
                    discountType: e.target.value as 'percentage' | 'fixed',
                  })
                }
                label="Discount Type"
              >
                <MenuItem value="percentage">Percentage (%)</MenuItem>
                <MenuItem value="fixed">Fixed ({currency})</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setGroupDiscountDialogOpen(false)}>Cancel</Button>
        <Button onClick={handleSaveGroupDiscount} variant="contained">
          {editingGroupDiscount ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderSeasonalPriceDialog = () => (
    <Dialog
      open={seasonalPriceDialogOpen}
      onClose={() => setSeasonalPriceDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {editingSeasonalPrice ? 'Edit Seasonal Price' : 'Add Seasonal Price'}
      </DialogTitle>
      <DialogContent dividers>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Season Name"
                value={seasonalPriceForm.name}
                onChange={(e) =>
                  setSeasonalPriceForm({ ...seasonalPriceForm, name: e.target.value })
                }
                placeholder="e.g., Summer Peak, Winter Off-Season"
              />
            </Grid>
            <Grid item xs={6}>
              <DatePicker
                label="Start Date"
                value={seasonalPriceForm.startDate}
                onChange={(date) =>
                  date && setSeasonalPriceForm({ ...seasonalPriceForm, startDate: date })
                }
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={6}>
              <DatePicker
                label="End Date"
                value={seasonalPriceForm.endDate}
                onChange={(date) =>
                  date && setSeasonalPriceForm({ ...seasonalPriceForm, endDate: date })
                }
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Price Adjustment"
                type="number"
                value={seasonalPriceForm.priceAdjustment}
                onChange={(e) =>
                  setSeasonalPriceForm({
                    ...seasonalPriceForm,
                    priceAdjustment: parseFloat(e.target.value) || 0,
                  })
                }
                helperText="Positive for increase, negative for decrease"
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Adjustment Type</InputLabel>
                <Select
                  value={seasonalPriceForm.adjustmentType}
                  onChange={(e) =>
                    setSeasonalPriceForm({
                      ...seasonalPriceForm,
                      adjustmentType: e.target.value as 'percentage' | 'fixed',
                    })
                  }
                  label="Adjustment Type"
                >
                  <MenuItem value="percentage">Percentage (%)</MenuItem>
                  <MenuItem value="fixed">Fixed ({currency})</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Priority"
                type="number"
                value={seasonalPriceForm.priority}
                onChange={(e) =>
                  setSeasonalPriceForm({
                    ...seasonalPriceForm,
                    priority: parseInt(e.target.value) || 1,
                  })
                }
                InputProps={{ inputProps: { min: 1 } }}
                helperText="Higher priority overrides lower priority seasons"
              />
            </Grid>
          </Grid>
        </LocalizationProvider>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setSeasonalPriceDialogOpen(false)}>Cancel</Button>
        <Button onClick={handleSaveSeasonalPrice} variant="contained">
          {editingSeasonalPrice ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderModifierDialog = () => (
    <Dialog
      open={modifierDialogOpen}
      onClose={() => setModifierDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {editingModifier ? 'Edit Pricing Modifier' : 'Add Pricing Modifier'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Modifier Name"
              value={modifierForm.name}
              onChange={(e) => setModifierForm({ ...modifierForm, name: e.target.value })}
              placeholder="e.g., Service Fee, Tax, Early Bird Discount"
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={modifierForm.type}
                onChange={(e) =>
                  setModifierForm({
                    ...modifierForm,
                    type: e.target.value as 'surcharge' | 'discount',
                  })
                }
                label="Type"
              >
                <MenuItem value="surcharge">Surcharge (+)</MenuItem>
                <MenuItem value="discount">Discount (-)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Value"
              type="number"
              value={modifierForm.value}
              onChange={(e) =>
                setModifierForm({ ...modifierForm, value: parseFloat(e.target.value) || 0 })
              }
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Value Type</InputLabel>
              <Select
                value={modifierForm.valueType}
                onChange={(e) =>
                  setModifierForm({
                    ...modifierForm,
                    valueType: e.target.value as 'percentage' | 'fixed',
                  })
                }
                label="Value Type"
              >
                <MenuItem value="percentage">Percentage (%)</MenuItem>
                <MenuItem value="fixed">Fixed ({currency})</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Applicable On</InputLabel>
              <Select
                value={modifierForm.applicableOn}
                onChange={(e) =>
                  setModifierForm({
                    ...modifierForm,
                    applicableOn: e.target.value as 'per_person' | 'per_booking',
                  })
                }
                label="Applicable On"
              >
                <MenuItem value="per_person">Per Person</MenuItem>
                <MenuItem value="per_booking">Per Booking</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={modifierForm.isActive}
                  onChange={(e) =>
                    setModifierForm({ ...modifierForm, isActive: e.target.checked })
                  }
                />
              }
              label="Active"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setModifierDialogOpen(false)}>Cancel</Button>
        <Button onClick={handleSaveModifier} variant="contained">
          {editingModifier ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderDeleteConfirmDialog = () => (
    <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
      <DialogTitle>Confirm Delete</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete this {deleteTarget?.type}? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
        <Button
          onClick={() => {
            if (deleteTarget?.type === 'groupDiscount') handleDeleteGroupDiscount();
            // Add handlers for other types
          }}
          color="error"
          variant="contained"
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Pricing Configuration
      </Typography>
      
      <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)} sx={{ mb: 3 }}>
        <Tab label="Base Price" />
        <Tab label="Group Discounts" />
        <Tab label="Seasonal Pricing" />
        <Tab label="Modifiers" />
      </Tabs>
      
      <TabPanel value={activeTab} index={0}>
        {renderBasePriceSection()}
      </TabPanel>
      
      <TabPanel value={activeTab} index={1}>
        {renderGroupDiscountsSection()}
      </TabPanel>
      
      <TabPanel value={activeTab} index={2}>
        {renderSeasonalPricesSection()}
      </TabPanel>
      
      <TabPanel value={activeTab} index={3}>
        {renderModifiersSection()}
      </TabPanel>
      
      {/* Dialogs */}
      {renderGroupDiscountDialog()}
      {renderSeasonalPriceDialog()}
      {renderModifierDialog()}
      {renderDeleteConfirmDialog()}
    </Box>
  );
};

export default TourPricing;
