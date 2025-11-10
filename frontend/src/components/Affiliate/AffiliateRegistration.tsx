/**
 * Affiliate Registration Component
 * Allows new affiliates to register for the Spirit Tours TAAP program
 * Auto-approval for individuals, review for agencies
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Card,
  CardContent,
  Link,
  RadioGroup,
  Radio,
  InputAdornment,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Person,
  Business,
  Email,
  Phone,
  Language,
  LocationOn,
  Check,
  MonetizationOn,
  Group,
  TrendingUp,
  Visibility,
  VisibilityOff,
  ExpandMore,
  Info,
  Security,
  Speed,
  Support,
  EmojiEvents,
  Code,
  CreditCard,
  AccountBalance,
  LocalAtm,
  CurrencyBitcoin,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface RegistrationData {
  // Personal/Company Information
  type: 'INDIVIDUAL' | 'PROFESSIONAL_AGENT' | 'AGENCY_PARTNER' | 'ENTERPRISE' | 'TECHNOLOGY_PARTNER';
  company_name?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  state?: string;
  city: string;
  address?: string;
  postal_code?: string;
  
  // Business Information
  website?: string;
  business_type?: string;
  tax_id?: string;
  monthly_sales_estimate?: number;
  marketing_channels?: string[];
  target_markets?: string[];
  years_in_business?: number;
  number_of_employees?: string;
  
  // Banking Information
  payment_method: 'STRIPE' | 'PAYPAL' | 'BANK_TRANSFER' | 'CRYPTO';
  paypal_email?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_routing_number?: string;
  crypto_wallet_address?: string;
  crypto_type?: string;
  
  // Marketing Information
  traffic_sources?: string[];
  social_media_accounts?: {
    platform: string;
    url: string;
    followers: number;
  }[];
  marketing_budget?: number;
  preferred_commission_structure?: string;
  
  // Agreement
  agree_terms: boolean;
  agree_privacy: boolean;
  agree_marketing: boolean;
  
  // Additional
  referral_code?: string;
  notes?: string;
  password: string;
  confirm_password: string;
}

const AffiliateRegistration: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [codeAvailable, setCodeAvailable] = useState<boolean | null>(null);
  const [suggestedCode, setSuggestedCode] = useState('');
  
  const [formData, setFormData] = useState<RegistrationData>({
    type: 'INDIVIDUAL',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    payment_method: 'STRIPE',
    agree_terms: false,
    agree_privacy: false,
    agree_marketing: false,
    password: '',
    confirm_password: '',
    marketing_channels: [],
    target_markets: [],
    traffic_sources: [],
    social_media_accounts: [],
  });

  const steps = [
    t('affiliate.registration.steps.account_type'),
    t('affiliate.registration.steps.personal_info'),
    t('affiliate.registration.steps.business_info'),
    t('affiliate.registration.steps.payment_info'),
    t('affiliate.registration.steps.review_submit'),
  ];

  const affiliateTypes = [
    {
      value: 'INDIVIDUAL',
      label: t('affiliate.types.individual'),
      description: t('affiliate.types.individual_desc'),
      icon: <Person />,
      commission: '8%',
      benefits: ['Instant approval', 'Basic marketing materials', 'Monthly payments'],
    },
    {
      value: 'PROFESSIONAL_AGENT',
      label: t('affiliate.types.professional'),
      description: t('affiliate.types.professional_desc'),
      icon: <Business />,
      commission: '10%',
      benefits: ['Priority support', 'Advanced analytics', 'Custom landing pages'],
    },
    {
      value: 'AGENCY_PARTNER',
      label: t('affiliate.types.agency'),
      description: t('affiliate.types.agency_desc'),
      icon: <Group />,
      commission: '12%',
      benefits: ['Dedicated account manager', 'API access', 'White-label options'],
    },
    {
      value: 'ENTERPRISE',
      label: t('affiliate.types.enterprise'),
      description: t('affiliate.types.enterprise_desc'),
      icon: <TrendingUp />,
      commission: '15%',
      benefits: ['Custom integration', 'Volume bonuses', 'Co-branding opportunities'],
    },
    {
      value: 'TECHNOLOGY_PARTNER',
      label: t('affiliate.types.technology'),
      description: t('affiliate.types.technology_desc'),
      icon: <Code />,
      commission: 'Custom',
      benefits: ['Full API access', 'Technical support', 'Revenue sharing'],
    },
  ];

  const paymentMethods = [
    { value: 'STRIPE', label: 'Stripe', icon: <CreditCard />, min_payout: 100 },
    { value: 'PAYPAL', label: 'PayPal', icon: <LocalAtm />, min_payout: 50 },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: <AccountBalance />, min_payout: 500 },
    { value: 'CRYPTO', label: 'Cryptocurrency', icon: <CurrencyBitcoin />, min_payout: 200 },
  ];

  const countries = [
    'United States', 'Canada', 'Mexico', 'United Kingdom', 'Germany',
    'France', 'Spain', 'Italy', 'Brazil', 'Argentina', 'Colombia',
    'Peru', 'Chile', 'Ecuador', 'Bolivia', 'Venezuela', 'Costa Rica',
    'Panama', 'Dominican Republic', 'Puerto Rico', 'Guatemala',
  ];

  const marketingChannels = [
    'Website/Blog', 'Social Media', 'Email Marketing', 'PPC Advertising',
    'SEO', 'YouTube', 'Podcast', 'Influencer Marketing', 'Offline Events',
    'Print Media', 'Radio', 'TV', 'Mobile App', 'WhatsApp Groups',
  ];

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleInputChange = (field: keyof RegistrationData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const checkCodeAvailability = async () => {
    if (!suggestedCode) return;
    
    setCheckingAvailability(true);
    try {
      const response = await axios.post('/api/affiliates/check-availability', {
        affiliate_code: suggestedCode,
      });
      setCodeAvailable(response.data.available);
      if (!response.data.available && response.data.suggestions) {
        // Show suggestions if code is taken
        setSuggestedCode(response.data.suggestions[0]);
      }
    } catch (error) {
      console.error('Error checking code availability:', error);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate passwords match
      if (formData.password !== formData.confirm_password) {
        throw new Error(t('affiliate.registration.errors.password_mismatch'));
      }
      
      // Validate required fields
      if (!formData.email || !formData.first_name || !formData.last_name) {
        throw new Error(t('affiliate.registration.errors.required_fields'));
      }
      
      // Submit registration
      const response = await axios.post('/api/affiliates/register', {
        ...formData,
        preferred_affiliate_code: suggestedCode,
      });
      
      if (response.data.success) {
        setAffiliateCode(response.data.affiliate_code);
        setApiKey(response.data.api_key);
        setSuccess(true);
        
        // Auto-redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/affiliate/dashboard');
        }, 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateAffiliateCode = () => {
    const base = formData.company_name || 
                 `${formData.first_name}${formData.last_name}`;
    const cleaned = base.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const random = Math.floor(Math.random() * 1000);
    setSuggestedCode(`${cleaned}${random}`);
  };

  useEffect(() => {
    if (formData.first_name && formData.last_name && !suggestedCode) {
      generateAffiliateCode();
    }
  }, [formData.first_name, formData.last_name, formData.company_name]);

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Account Type Selection
        return (
          <Box>
            <Typography variant="h5" gutterBottom>
              {t('affiliate.registration.choose_account_type')}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {t('affiliate.registration.account_type_description')}
            </Typography>
            
            <Grid container spacing={3}>
              {affiliateTypes.map((type) => (
                <Grid item xs={12} md={6} lg={4} key={type.value}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: formData.type === type.value ? 2 : 1,
                      borderColor: formData.type === type.value ? 'primary.main' : 'grey.300',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                    onClick={() => handleInputChange('type', type.value)}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                          {type.icon}
                        </Avatar>
                        <Box>
                          <Typography variant="h6">{type.label}</Typography>
                          <Chip label={`${type.commission} Commission`} size="small" color="success" />
                        </Box>
                      </Box>
                      <Typography variant="body2" color="textSecondary" paragraph>
                        {type.description}
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" gutterBottom>
                        {t('affiliate.registration.benefits')}:
                      </Typography>
                      <List dense>
                        {type.benefits.map((benefit, index) => (
                          <ListItem key={index} disableGutters>
                            <ListItemIcon sx={{ minWidth: 30 }}>
                              <Check fontSize="small" color="success" />
                            </ListItemIcon>
                            <ListItemText primary={benefit} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        );

      case 1: // Personal Information
        return (
          <Box>
            <Typography variant="h5" gutterBottom>
              {t('affiliate.registration.personal_information')}
            </Typography>
            
            {formData.type !== 'INDIVIDUAL' && (
              <TextField
                fullWidth
                label={t('affiliate.registration.company_name')}
                value={formData.company_name || ''}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                margin="normal"
                required
                InputProps={{
                  startAdornment: <Business sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
            )}
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('affiliate.registration.first_name')}
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  margin="normal"
                  required
                  InputProps={{
                    startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('affiliate.registration.last_name')}
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  margin="normal"
                  required
                />
              </Grid>
            </Grid>
            
            <TextField
              fullWidth
              label={t('affiliate.registration.email')}
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              margin="normal"
              required
              InputProps={{
                startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
            
            <TextField
              fullWidth
              label={t('affiliate.registration.phone')}
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              margin="normal"
              required
              InputProps={{
                startAdornment: <Phone sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>{t('affiliate.registration.country')}</InputLabel>
                  <Select
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    required
                  >
                    {countries.map((country) => (
                      <MenuItem key={country} value={country}>
                        {country}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('affiliate.registration.city')}
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  margin="normal"
                  required
                  InputProps={{
                    startAdornment: <LocationOn sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              </Grid>
            </Grid>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('affiliate.registration.password')}
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  margin="normal"
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('affiliate.registration.confirm_password')}
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirm_password}
                  onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                  margin="normal"
                  required
                  error={formData.password !== formData.confirm_password && formData.confirm_password !== ''}
                  helperText={
                    formData.password !== formData.confirm_password && formData.confirm_password !== ''
                      ? t('affiliate.registration.errors.password_mismatch')
                      : ''
                  }
                />
              </Grid>
            </Grid>
            
            {/* Affiliate Code Selection */}
            <Box mt={3}>
              <Typography variant="subtitle1" gutterBottom>
                {t('affiliate.registration.choose_affiliate_code')}
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('affiliate.registration.affiliate_code')}
                    value={suggestedCode}
                    onChange={(e) => setSuggestedCode(e.target.value)}
                    helperText={t('affiliate.registration.affiliate_code_help')}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          {checkingAvailability && <LinearProgress />}
                          {codeAvailable === true && <Check color="success" />}
                          {codeAvailable === false && (
                            <Tooltip title={t('affiliate.registration.code_taken')}>
                              <Info color="error" />
                            </Tooltip>
                          )}
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Button
                    variant="outlined"
                    onClick={checkCodeAvailability}
                    disabled={!suggestedCode || checkingAvailability}
                  >
                    {t('affiliate.registration.check_availability')}
                  </Button>
                  <Button
                    variant="text"
                    onClick={generateAffiliateCode}
                    sx={{ ml: 1 }}
                  >
                    {t('affiliate.registration.generate_new')}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Box>
        );

      case 2: // Business Information
        return (
          <Box>
            <Typography variant="h5" gutterBottom>
              {t('affiliate.registration.business_information')}
            </Typography>
            
            <TextField
              fullWidth
              label={t('affiliate.registration.website')}
              value={formData.website || ''}
              onChange={(e) => handleInputChange('website', e.target.value)}
              margin="normal"
              InputProps={{
                startAdornment: <Language sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
            
            {formData.type !== 'INDIVIDUAL' && (
              <>
                <TextField
                  fullWidth
                  label={t('affiliate.registration.tax_id')}
                  value={formData.tax_id || ''}
                  onChange={(e) => handleInputChange('tax_id', e.target.value)}
                  margin="normal"
                />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label={t('affiliate.registration.years_in_business')}
                      type="number"
                      value={formData.years_in_business || ''}
                      onChange={(e) => handleInputChange('years_in_business', parseInt(e.target.value))}
                      margin="normal"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel>{t('affiliate.registration.number_of_employees')}</InputLabel>
                      <Select
                        value={formData.number_of_employees || ''}
                        onChange={(e) => handleInputChange('number_of_employees', e.target.value)}
                      >
                        <MenuItem value="1-5">1-5</MenuItem>
                        <MenuItem value="6-20">6-20</MenuItem>
                        <MenuItem value="21-50">21-50</MenuItem>
                        <MenuItem value="51-200">51-200</MenuItem>
                        <MenuItem value="200+">200+</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </>
            )}
            
            <TextField
              fullWidth
              label={t('affiliate.registration.monthly_sales_estimate')}
              type="number"
              value={formData.monthly_sales_estimate || ''}
              onChange={(e) => handleInputChange('monthly_sales_estimate', parseFloat(e.target.value))}
              margin="normal"
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              helperText={t('affiliate.registration.sales_estimate_help')}
            />
            
            <Box mt={3}>
              <Typography variant="subtitle1" gutterBottom>
                {t('affiliate.registration.marketing_channels')}
              </Typography>
              <Grid container spacing={1}>
                {marketingChannels.map((channel) => (
                  <Grid item key={channel}>
                    <Chip
                      label={channel}
                      onClick={() => {
                        const channels = formData.marketing_channels || [];
                        if (channels.includes(channel)) {
                          handleInputChange(
                            'marketing_channels',
                            channels.filter((c) => c !== channel)
                          );
                        } else {
                          handleInputChange('marketing_channels', [...channels, channel]);
                        }
                      }}
                      color={formData.marketing_channels?.includes(channel) ? 'primary' : 'default'}
                      variant={formData.marketing_channels?.includes(channel) ? 'filled' : 'outlined'}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
            
            <TextField
              fullWidth
              label={t('affiliate.registration.referral_code')}
              value={formData.referral_code || ''}
              onChange={(e) => handleInputChange('referral_code', e.target.value)}
              margin="normal"
              helperText={t('affiliate.registration.referral_code_help')}
            />
            
            <TextField
              fullWidth
              label={t('affiliate.registration.additional_notes')}
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              margin="normal"
              multiline
              rows={4}
              helperText={t('affiliate.registration.notes_help')}
            />
          </Box>
        );

      case 3: // Payment Information
        return (
          <Box>
            <Typography variant="h5" gutterBottom>
              {t('affiliate.registration.payment_information')}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {t('affiliate.registration.payment_description')}
            </Typography>
            
            <FormControl component="fieldset" margin="normal">
              <Typography variant="subtitle1" gutterBottom>
                {t('affiliate.registration.payment_method')}
              </Typography>
              <RadioGroup
                value={formData.payment_method}
                onChange={(e) => handleInputChange('payment_method', e.target.value)}
              >
                {paymentMethods.map((method) => (
                  <Box key={method.value} mb={2}>
                    <FormControlLabel
                      value={method.value}
                      control={<Radio />}
                      label={
                        <Box display="flex" alignItems="center">
                          {method.icon}
                          <Box ml={2}>
                            <Typography variant="body1">{method.label}</Typography>
                            <Typography variant="caption" color="textSecondary">
                              {t('affiliate.registration.min_payout')}: ${method.min_payout}
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                    
                    {formData.payment_method === method.value && (
                      <Box ml={4} mt={1}>
                        {method.value === 'PAYPAL' && (
                          <TextField
                            fullWidth
                            label={t('affiliate.registration.paypal_email')}
                            type="email"
                            value={formData.paypal_email || ''}
                            onChange={(e) => handleInputChange('paypal_email', e.target.value)}
                            margin="normal"
                            required
                          />
                        )}
                        
                        {method.value === 'BANK_TRANSFER' && (
                          <>
                            <TextField
                              fullWidth
                              label={t('affiliate.registration.bank_name')}
                              value={formData.bank_name || ''}
                              onChange={(e) => handleInputChange('bank_name', e.target.value)}
                              margin="normal"
                              required
                            />
                            <TextField
                              fullWidth
                              label={t('affiliate.registration.bank_account')}
                              value={formData.bank_account_number || ''}
                              onChange={(e) => handleInputChange('bank_account_number', e.target.value)}
                              margin="normal"
                              required
                            />
                            <TextField
                              fullWidth
                              label={t('affiliate.registration.bank_routing')}
                              value={formData.bank_routing_number || ''}
                              onChange={(e) => handleInputChange('bank_routing_number', e.target.value)}
                              margin="normal"
                              required
                            />
                          </>
                        )}
                        
                        {method.value === 'CRYPTO' && (
                          <>
                            <FormControl fullWidth margin="normal">
                              <InputLabel>{t('affiliate.registration.crypto_type')}</InputLabel>
                              <Select
                                value={formData.crypto_type || ''}
                                onChange={(e) => handleInputChange('crypto_type', e.target.value)}
                                required
                              >
                                <MenuItem value="BTC">Bitcoin (BTC)</MenuItem>
                                <MenuItem value="ETH">Ethereum (ETH)</MenuItem>
                                <MenuItem value="USDT">Tether (USDT)</MenuItem>
                                <MenuItem value="USDC">USD Coin (USDC)</MenuItem>
                              </Select>
                            </FormControl>
                            <TextField
                              fullWidth
                              label={t('affiliate.registration.wallet_address')}
                              value={formData.crypto_wallet_address || ''}
                              onChange={(e) => handleInputChange('crypto_wallet_address', e.target.value)}
                              margin="normal"
                              required
                            />
                          </>
                        )}
                      </Box>
                    )}
                  </Box>
                ))}
              </RadioGroup>
            </FormControl>
          </Box>
        );

      case 4: // Review and Submit
        return (
          <Box>
            <Typography variant="h5" gutterBottom>
              {t('affiliate.registration.review_submit')}
            </Typography>
            
            <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {t('affiliate.registration.account_summary')}
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    {t('affiliate.registration.account_type')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {affiliateTypes.find((t) => t.value === formData.type)?.label}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    {t('affiliate.registration.affiliate_code')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {suggestedCode}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    {t('affiliate.registration.name')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formData.first_name} {formData.last_name}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    {t('affiliate.registration.email')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formData.email}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    {t('affiliate.registration.payment_method')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {paymentMethods.find((m) => m.value === formData.payment_method)?.label}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    {t('affiliate.registration.commission_rate')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {affiliateTypes.find((t) => t.value === formData.type)?.commission}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
            
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.agree_terms}
                    onChange={(e) => handleInputChange('agree_terms', e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2">
                    {t('affiliate.registration.agree_terms')}{' '}
                    <Link href="/affiliate/terms" target="_blank">
                      {t('affiliate.registration.terms_conditions')}
                    </Link>
                  </Typography>
                }
              />
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.agree_privacy}
                    onChange={(e) => handleInputChange('agree_privacy', e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2">
                    {t('affiliate.registration.agree_privacy')}{' '}
                    <Link href="/affiliate/privacy" target="_blank">
                      {t('affiliate.registration.privacy_policy')}
                    </Link>
                  </Typography>
                }
              />
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.agree_marketing}
                    onChange={(e) => handleInputChange('agree_marketing', e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2">
                    {t('affiliate.registration.agree_marketing')}
                  </Typography>
                }
              />
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: 'auto', p: 3 }}>
      {/* Header */}
      <Box textAlign="center" mb={5}>
        <Typography variant="h3" gutterBottom>
          {t('affiliate.registration.title')}
        </Typography>
        <Typography variant="h5" color="textSecondary" gutterBottom>
          {t('affiliate.registration.subtitle')}
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          {t('affiliate.registration.description')}
        </Typography>
        
        {/* Benefits Banner */}
        <Grid container spacing={2} justifyContent="center" sx={{ mt: 3 }}>
          <Grid item>
            <Chip
              icon={<MonetizationOn />}
              label={t('affiliate.registration.benefit_commission')}
              color="success"
              size="medium"
            />
          </Grid>
          <Grid item>
            <Chip
              icon={<Speed />}
              label={t('affiliate.registration.benefit_instant')}
              color="primary"
              size="medium"
            />
          </Grid>
          <Grid item>
            <Chip
              icon={<Support />}
              label={t('affiliate.registration.benefit_support')}
              color="secondary"
              size="medium"
            />
          </Grid>
          <Grid item>
            <Chip
              icon={<EmojiEvents />}
              label={t('affiliate.registration.benefit_rewards')}
              color="warning"
              size="medium"
            />
          </Grid>
        </Grid>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Form Content */}
      <Paper elevation={3} sx={{ p: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {renderStepContent(activeStep)}

        {/* Navigation Buttons */}
        <Box display="flex" justifyContent="space-between" mt={4}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            variant="outlined"
          >
            {t('common.back')}
          </Button>
          
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={
                loading ||
                !formData.agree_terms ||
                !formData.agree_privacy ||
                formData.password !== formData.confirm_password
              }
              startIcon={loading && <LinearProgress />}
            >
              {loading ? t('common.submitting') : t('affiliate.registration.submit')}
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={handleNext}
            >
              {t('common.next')}
            </Button>
          )}
        </Box>
      </Paper>

      {/* Success Dialog */}
      <Dialog open={success} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <Check color="success" sx={{ mr: 2 }} />
            {t('affiliate.registration.success_title')}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            {t('affiliate.registration.success_message')}
          </Alert>
          
          <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.100' }}>
            <Typography variant="subtitle2" gutterBottom>
              {t('affiliate.registration.your_affiliate_code')}:
            </Typography>
            <Typography variant="h6" gutterBottom>
              {affiliateCode}
            </Typography>
            
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              {t('affiliate.registration.your_api_key')}:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {apiKey}
            </Typography>
          </Paper>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            {t('affiliate.registration.save_credentials')}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/affiliate/dashboard')} variant="contained">
            {t('affiliate.registration.go_to_dashboard')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* FAQ Section */}
      <Box mt={5}>
        <Typography variant="h4" gutterBottom>
          {t('affiliate.registration.faq_title')}
        </Typography>
        
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>{t('affiliate.registration.faq_1_question')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>{t('affiliate.registration.faq_1_answer')}</Typography>
          </AccordionDetails>
        </Accordion>
        
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>{t('affiliate.registration.faq_2_question')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>{t('affiliate.registration.faq_2_answer')}</Typography>
          </AccordionDetails>
        </Accordion>
        
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>{t('affiliate.registration.faq_3_question')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>{t('affiliate.registration.faq_3_answer')}</Typography>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  );
};

export default AffiliateRegistration;