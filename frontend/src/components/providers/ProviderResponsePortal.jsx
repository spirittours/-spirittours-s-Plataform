import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  AlertTitle,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Tooltip,
  Badge,
  Avatar,
  Collapse,
  Switch,
  FormControlLabel,
  InputAdornment,
  Tabs,
  Tab,
  CircularProgress,
  LinearProgress,
  Snackbar,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Rating,
  Slider,
  FormGroup,
  Checkbox,
  Radio,
  RadioGroup,
  Container,
  CssBaseline,
  AppBar,
  Toolbar,
  Countdown,
  ToggleButton,
  ToggleButtonGroup,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent
} from '@mui/material';

import {
  Hotel as HotelIcon,
  DirectionsBus as BusIcon,
  Restaurant as RestaurantIcon,
  AttachMoney as AttachMoneyIcon,
  Send as SendIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  People as PeopleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Timer as TimerIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CompareArrows as CompareArrowsIcon,
  LocalOffer as LocalOfferIcon,
  Loyalty as LoyaltyIcon,
  Stars as StarsIcon,
  Bed as BedIcon,
  SingleBed as SingleBedIcon,
  KingBed as KingBedIcon,
  FreeBreakfast as FreeBreakfastIcon,
  Dinner as DinnerIcon,
  RoomService as RoomServiceIcon,
  Wifi as WifiIcon,
  Pool as PoolIcon,
  Spa as SpaIcon,
  FitnessCenter as FitnessCenterIcon,
  LocalParking as LocalParkingIcon,
  AcUnit as AcUnitIcon,
  Kitchen as KitchenIcon,
  Balcony as BalconyIcon,
  BeachAccess as BeachAccessIcon,
  BusinessCenter as BusinessCenterIcon,
  MeetingRoom as MeetingRoomIcon,
  EmojiEvents as EmojiEventsIcon,
  WorkspacePremium as WorkspacePremiumIcon,
  Verified as VerifiedIcon,
  NewReleases as NewReleasesIcon,
  Whatshot as WhatshotIcon,
  FlashOn as FlashOnIcon,
  AutoAwesome as AutoAwesomeIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  MoneyOff as MoneyOffIcon,
  Calculate as CalculateIcon,
  Speed as SpeedIcon,
  HighQuality as HighQualityIcon
} from '@mui/icons-material';

// Room types available
const ROOM_TYPES = {
  SINGLE: { name: 'Single Room', icon: <SingleBedIcon />, occupancy: 1 },
  DOUBLE: { name: 'Double Room', icon: <BedIcon />, occupancy: 2 },
  TWIN: { name: 'Twin Room', icon: <BedIcon />, occupancy: 2 },
  TRIPLE: { name: 'Triple Room', icon: <KingBedIcon />, occupancy: 3 },
  QUAD: { name: 'Quad Room', icon: <KingBedIcon />, occupancy: 4 },
  SUITE: { name: 'Suite', icon: <StarsIcon />, occupancy: 2 },
  FAMILY: { name: 'Family Room', icon: <PeopleIcon />, occupancy: 4 }
};

// Meal plans
const MEAL_PLANS = {
  RO: { name: 'Room Only', icon: <HotelIcon />, included: [] },
  BB: { name: 'Bed & Breakfast', icon: <FreeBreakfastIcon />, included: ['breakfast'] },
  HB: { name: 'Half Board', icon: <RestaurantIcon />, included: ['breakfast', 'dinner'] },
  FB: { name: 'Full Board', icon: <RoomServiceIcon />, included: ['breakfast', 'lunch', 'dinner'] },
  AI: { name: 'All Inclusive', icon: <StarsIcon />, included: ['all meals', 'drinks', 'snacks'] }
};

// Competition indicators
const COMPETITION_LEVELS = {
  LOW: { color: 'success', label: 'Low Competition', icon: <TrendingDownIcon /> },
  MEDIUM: { color: 'warning', label: 'Medium Competition', icon: <TrendingFlatIcon /> },
  HIGH: { color: 'error', label: 'High Competition', icon: <TrendingUpIcon /> },
  VERY_HIGH: { color: 'error', label: 'Very High Competition', icon: <WhatshotIcon /> }
};

const ProviderResponsePortal = ({ rfqId, providerId }) => {
  // State management
  const [rfqDetails, setRfqDetails] = useState(null);
  const [competitorCount, setCompetitorCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Provider response form
  const [response, setResponse] = useState({
    providerId: providerId || '',
    providerName: '',
    providerType: 'HOTEL',
    contactPerson: '',
    email: '',
    phone: '',
    roomPrices: [],
    transportPrices: [],
    mealPrices: [],
    additionalServices: [],
    totalPrice: 0,
    validUntil: '',
    paymentTerms: '',
    cancellationPolicy: '',
    specialOffers: '',
    notes: '',
    flexibleDates: false,
    bestPriceGuarantee: false,
    includesGuide: false,
    includesEntrances: false
  });
  
  // Competition awareness
  const [competitionMode, setCompetitionMode] = useState('UNKNOWN');
  const [priceStrategy, setPriceStrategy] = useState('COMPETITIVE');
  const [showCompetitorInfo, setShowCompetitorInfo] = useState(false);
  const [estimatedAveragePrice, setEstimatedAveragePrice] = useState(0);
  
  // UI State
  const [activeTab, setActiveTab] = useState(0);
  const [showPricingHelp, setShowPricingHelp] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Load RFQ details on mount
  useEffect(() => {
    loadRFQDetails();
    checkCompetition();
    startCountdown();
  }, [rfqId]);
  
  // Load RFQ details
  const loadRFQDetails = async () => {
    setLoading(true);
    try {
      // Simulated API call
      const mockRFQ = {
        id: rfqId || 'RFQ-2024-001',
        groupName: 'Catholic Pilgrimage November 2025',
        agencyName: 'Faith Tours USA',
        contactPerson: 'John Smith',
        arrivalDate: '2025-11-01',
        departureDate: '2025-11-10',
        nights: 9,
        numberOfPax: 45,
        freePersons: 2,
        location: 'Nazareth',
        requestedNights: 3,
        mealPlan: 'HB',
        specialRequests: 'Quiet rooms, vegetarian options needed',
        deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours from now
        budgetRange: { min: 800, max: 1500 },
        competitionMode: 'OPEN',
        requestedServices: [
          { type: 'ACCOMMODATION', details: 'Standard double rooms' },
          { type: 'MEALS', details: 'Half board with dietary requirements' }
        ]
      };
      
      setRfqDetails(mockRFQ);
      setCompetitionMode(mockRFQ.competitionMode);
      
      // Pre-fill provider info if logged in
      if (providerId) {
        setResponse(prev => ({
          ...prev,
          providerId: providerId,
          providerName: 'Golden Crown Hotel Nazareth', // Mock data
          email: 'sales@goldencrown.com',
          contactPerson: 'Sarah Johnson'
        }));
      }
    } catch (error) {
      console.error('Error loading RFQ:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Check competition
  const checkCompetition = async () => {
    try {
      // Simulated check for how many providers are invited
      const competitorInfo = {
        totalInvited: 8,
        alreadyResponded: 3,
        averageResponseTime: '4.5 hours',
        estimatedPriceRange: { min: 950, max: 1350 }
      };
      
      setCompetitorCount(competitorInfo.totalInvited - 1); // Exclude self
      setEstimatedAveragePrice((competitorInfo.estimatedPriceRange.min + competitorInfo.estimatedPriceRange.max) / 2);
      
      // Show competition alert if high
      if (competitorInfo.totalInvited > 5) {
        showSnackbar(
          `⚡ High Competition Alert: ${competitorInfo.totalInvited - 1} other providers are also quoting for this RFQ. Be competitive!`,
          'warning'
        );
      }
    } catch (error) {
      console.error('Error checking competition:', error);
    }
  };
  
  // Countdown timer
  const startCountdown = () => {
    if (!rfqDetails?.deadline) return;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const deadline = new Date(rfqDetails.deadline).getTime();
      const distance = deadline - now;
      
      if (distance < 0) {
        clearInterval(interval);
        setTimeRemaining('EXPIRED');
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
        
        // Urgency alerts
        if (distance < 2 * 60 * 60 * 1000 && !submitted) { // Less than 2 hours
          showSnackbar('⏰ Less than 2 hours remaining to submit your quote!', 'error');
        }
      }
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  };
  
  // Calculate total price
  const calculateTotalPrice = () => {
    let total = 0;
    
    // Room prices
    response.roomPrices.forEach(room => {
      total += (room.pricePerNight * rfqDetails.requestedNights * room.quantity);
    });
    
    // Meal prices
    response.mealPrices.forEach(meal => {
      total += (meal.pricePerPerson * meal.quantity);
    });
    
    // Additional services
    response.additionalServices.forEach(service => {
      total += service.price;
    });
    
    setResponse(prev => ({ ...prev, totalPrice: total }));
    return total;
  };
  
  // Price recommendation engine
  const getPriceRecommendation = () => {
    if (!rfqDetails) return null;
    
    const budget = rfqDetails.budgetRange;
    const avgCompetitorPrice = estimatedAveragePrice;
    
    let recommendation = {
      suggested: 0,
      strategy: '',
      confidence: 0
    };
    
    if (priceStrategy === 'AGGRESSIVE') {
      recommendation.suggested = avgCompetitorPrice * 0.92; // 8% below average
      recommendation.strategy = 'Aggressive pricing to win the bid';
      recommendation.confidence = 75;
    } else if (priceStrategy === 'COMPETITIVE') {
      recommendation.suggested = avgCompetitorPrice * 0.97; // 3% below average
      recommendation.strategy = 'Competitive pricing with good margin';
      recommendation.confidence = 85;
    } else if (priceStrategy === 'PREMIUM') {
      recommendation.suggested = avgCompetitorPrice * 1.05; // 5% above average
      recommendation.strategy = 'Premium pricing for superior service';
      recommendation.confidence = 60;
    }
    
    // Ensure within budget
    recommendation.suggested = Math.min(recommendation.suggested, budget.max * 0.95);
    recommendation.suggested = Math.max(recommendation.suggested, budget.min * 1.1);
    
    return recommendation;
  };
  
  // Submit response
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Validate required fields
      if (!response.providerName || !response.email || !response.contactPerson) {
        showSnackbar('Please fill all required fields', 'error');
        return;
      }
      
      if (response.roomPrices.length === 0 && response.providerType === 'HOTEL') {
        showSnackbar('Please add at least one room price', 'error');
        return;
      }
      
      // Calculate final price
      const finalPrice = calculateTotalPrice();
      
      // Prepare submission
      const submission = {
        ...response,
        rfqId: rfqDetails.id,
        submittedAt: new Date().toISOString(),
        totalPrice: finalPrice,
        pricePerPerson: finalPrice / (rfqDetails.numberOfPax - rfqDetails.freePersons),
        responseTime: new Date() - new Date(rfqDetails.createdAt),
        competitionAware: competitionMode === 'OPEN',
        winProbability: calculateWinProbability()
      };
      
      // Submit to API
      console.log('Submitting response:', submission);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSubmitted(true);
      showSnackbar('Your quote has been submitted successfully!', 'success');
      
      // Send confirmation email
      sendConfirmationEmail(submission);
      
    } catch (error) {
      console.error('Error submitting response:', error);
      showSnackbar('Error submitting response. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Calculate win probability
  const calculateWinProbability = () => {
    let probability = 50; // Base probability
    
    // Price competitiveness
    const priceRatio = response.totalPrice / estimatedAveragePrice;
    if (priceRatio < 0.95) probability += 20;
    else if (priceRatio < 1) probability += 10;
    else if (priceRatio > 1.1) probability -= 20;
    
    // Response speed
    const hoursToDeadline = (new Date(rfqDetails.deadline) - new Date()) / (1000 * 60 * 60);
    if (hoursToDeadline > 24) probability += 10; // Early response
    
    // Additional factors
    if (response.bestPriceGuarantee) probability += 5;
    if (response.flexibleDates) probability += 5;
    if (response.specialOffers) probability += 5;
    
    return Math.min(Math.max(probability, 10), 90); // Cap between 10-90%
  };
  
  // Send confirmation email
  const sendConfirmationEmail = (submission) => {
    // Simulate email sending
    console.log('Sending confirmation email for submission:', submission);
  };
  
  // Helper functions
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  const getCompetitionLevel = () => {
    if (competitorCount <= 2) return COMPETITION_LEVELS.LOW;
    if (competitorCount <= 4) return COMPETITION_LEVELS.MEDIUM;
    if (competitorCount <= 6) return COMPETITION_LEVELS.HIGH;
    return COMPETITION_LEVELS.VERY_HIGH;
  };
  
  // Add room price
  const addRoomPrice = () => {
    setResponse(prev => ({
      ...prev,
      roomPrices: [...prev.roomPrices, {
        roomType: 'DOUBLE',
        occupancy: 2,
        pricePerNight: 0,
        quantity: 0,
        mealPlan: 'BB',
        singleSupplement: 0,
        tripleReduction: 0,
        childReduction: 0
      }]
    }));
  };
  
  // Update room price
  const updateRoomPrice = (index, field, value) => {
    setResponse(prev => {
      const updated = [...prev.roomPrices];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, roomPrices: updated };
    });
  };
  
  // Remove room price
  const removeRoomPrice = (index) => {
    setResponse(prev => ({
      ...prev,
      roomPrices: prev.roomPrices.filter((_, i) => i !== index)
    }));
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (submitted) {
    return (
      <Container maxWidth="md" sx={{ mt: 5 }}>
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Quote Submitted Successfully!
          </Typography>
          <Typography variant="body1" paragraph>
            Your quote for RFQ {rfqDetails.id} has been submitted.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            You will receive a confirmation email shortly. The agency will review all quotes and contact you if selected.
          </Typography>
          <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
            <Typography variant="h6">Your Submission Summary:</Typography>
            <Typography>Total Price: ${response.totalPrice.toFixed(2)}</Typography>
            <Typography>Price per Person: ${(response.totalPrice / (rfqDetails.numberOfPax - rfqDetails.freePersons)).toFixed(2)}</Typography>
            <Typography>Win Probability: {calculateWinProbability()}%</Typography>
          </Box>
        </Paper>
      </Container>
    );
  }
  
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <CssBaseline />
      
      {/* Header */}
      <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Toolbar>
          <HotelIcon sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Provider Response Portal - Spirit Tours
          </Typography>
          <Chip
            label={timeRemaining === 'EXPIRED' ? 'EXPIRED' : `Time Left: ${timeRemaining}`}
            color={timeRemaining === 'EXPIRED' ? 'error' : 'warning'}
            icon={<TimerIcon />}
          />
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 3, mb: 5 }}>
        {/* RFQ Header Info */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h5" gutterBottom>
                {rfqDetails.groupName}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                RFQ ID: {rfqDetails.id} | Agency: {rfqDetails.agencyName}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              {competitionMode === 'OPEN' && (
                <Alert severity={getCompetitionLevel().color} icon={getCompetitionLevel().icon}>
                  <AlertTitle>{getCompetitionLevel().label}</AlertTitle>
                  {competitorCount} other providers are competing for this RFQ
                </Alert>
              )}
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">Travel Dates</Typography>
              <Typography variant="body1">{rfqDetails.arrivalDate} - {rfqDetails.departureDate}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">Passengers</Typography>
              <Typography variant="body1">{rfqDetails.numberOfPax} pax ({rfqDetails.freePersons} free)</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">Location</Typography>
              <Typography variant="body1">{rfqDetails.location} - {rfqDetails.requestedNights} nights</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">Budget Range</Typography>
              <Typography variant="body1">${rfqDetails.budgetRange.min} - ${rfqDetails.budgetRange.max}</Typography>
            </Grid>
          </Grid>
          
          {rfqDetails.specialRequests && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="body2" color="info.dark">
                <strong>Special Requests:</strong> {rfqDetails.specialRequests}
              </Typography>
            </Box>
          )}
        </Paper>
        
        {/* Pricing Strategy Helper */}
        {competitionMode === 'OPEN' && (
          <Paper sx={{ p: 3, mb: 3, bgcolor: 'warning.light' }}>
            <Typography variant="h6" gutterBottom>
              💡 Pricing Strategy Recommendation
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <ToggleButtonGroup
                  value={priceStrategy}
                  exclusive
                  onChange={(e, value) => value && setPriceStrategy(value)}
                  fullWidth
                >
                  <ToggleButton value="AGGRESSIVE">
                    <TrendingDownIcon sx={{ mr: 1 }} />
                    Aggressive
                  </ToggleButton>
                  <ToggleButton value="COMPETITIVE">
                    <CompareArrowsIcon sx={{ mr: 1 }} />
                    Competitive
                  </ToggleButton>
                  <ToggleButton value="PREMIUM">
                    <TrendingUpIcon sx={{ mr: 1 }} />
                    Premium
                  </ToggleButton>
                </ToggleButtonGroup>
              </Grid>
              <Grid item xs={12} md={6}>
                {getPriceRecommendation() && (
                  <Box>
                    <Typography variant="body1">
                      Suggested Price: <strong>${getPriceRecommendation().suggested.toFixed(2)}</strong> per person
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getPriceRecommendation().strategy} (Confidence: {getPriceRecommendation().confidence}%)
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          </Paper>
        )}
        
        {/* Response Form Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label="Provider Info" icon={<BusinessIcon />} iconPosition="start" />
            <Tab label="Room Prices" icon={<BedIcon />} iconPosition="start" />
            <Tab label="Additional Services" icon={<StarsIcon />} iconPosition="start" />
            <Tab label="Terms & Conditions" icon={<AssignmentIcon />} iconPosition="start" />
          </Tabs>
        </Paper>
        
        {/* Tab Content */}
        <Paper sx={{ p: 3, mb: 3 }}>
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Provider/Hotel Name"
                  value={response.providerName}
                  onChange={(e) => setResponse({ ...response, providerName: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Provider Type</InputLabel>
                  <Select
                    value={response.providerType}
                    onChange={(e) => setResponse({ ...response, providerType: e.target.value })}
                    label="Provider Type"
                  >
                    <MenuItem value="HOTEL">Hotel</MenuItem>
                    <MenuItem value="TRANSPORT">Transport Company</MenuItem>
                    <MenuItem value="RESTAURANT">Restaurant</MenuItem>
                    <MenuItem value="GUIDE">Tour Guide</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Contact Person"
                  value={response.contactPerson}
                  onChange={(e) => setResponse({ ...response, contactPerson: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={response.email}
                  onChange={(e) => setResponse({ ...response, email: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={response.phone}
                  onChange={(e) => setResponse({ ...response, phone: e.target.value })}
                />
              </Grid>
            </Grid>
          )}
          
          {activeTab === 1 && (
            <Box>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Room Pricing</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={addRoomPrice}
                >
                  Add Room Type
                </Button>
              </Box>
              
              {response.roomPrices.map((room, index) => (
                <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Room Type</InputLabel>
                        <Select
                          value={room.roomType}
                          onChange={(e) => updateRoomPrice(index, 'roomType', e.target.value)}
                          label="Room Type"
                        >
                          {Object.entries(ROOM_TYPES).map(([key, type]) => (
                            <MenuItem key={key} value={key}>
                              {type.icon} {type.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Meal Plan</InputLabel>
                        <Select
                          value={room.mealPlan}
                          onChange={(e) => updateRoomPrice(index, 'mealPlan', e.target.value)}
                          label="Meal Plan"
                        >
                          {Object.entries(MEAL_PLANS).map(([key, plan]) => (
                            <MenuItem key={key} value={key}>
                              {plan.icon} {plan.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Price/Night"
                        type="number"
                        value={room.pricePerNight}
                        onChange={(e) => updateRoomPrice(index, 'pricePerNight', parseFloat(e.target.value))}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Quantity"
                        type="number"
                        value={room.quantity}
                        onChange={(e) => updateRoomPrice(index, 'quantity', parseInt(e.target.value))}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Single Supp."
                        type="number"
                        value={room.singleSupplement}
                        onChange={(e) => updateRoomPrice(index, 'singleSupplement', parseFloat(e.target.value))}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">+$</InputAdornment>
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={1}>
                      <TextField
                        fullWidth
                        size="small"
                        label="3rd Person"
                        type="number"
                        value={room.tripleReduction}
                        onChange={(e) => updateRoomPrice(index, 'tripleReduction', parseFloat(e.target.value))}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">-$</InputAdornment>
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={1}>
                      <IconButton
                        color="error"
                        onClick={() => removeRoomPrice(index)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
              
              {response.roomPrices.length === 0 && (
                <Alert severity="info">
                  Click "Add Room Type" to start adding your room prices
                </Alert>
              )}
            </Box>
          )}
          
          {activeTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Additional Services & Offers</Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={response.includesGuide}
                      onChange={(e) => setResponse({ ...response, includesGuide: e.target.checked })}
                    />
                  }
                  label="Includes Tour Guide"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={response.includesEntrances}
                      onChange={(e) => setResponse({ ...response, includesEntrances: e.target.checked })}
                    />
                  }
                  label="Includes Entrance Fees"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Special Offers or Incentives"
                  value={response.specialOffers}
                  onChange={(e) => setResponse({ ...response, specialOffers: e.target.value })}
                  placeholder="e.g., Free room upgrade, Welcome drink, Early check-in..."
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={response.bestPriceGuarantee}
                      onChange={(e) => setResponse({ ...response, bestPriceGuarantee: e.target.checked })}
                    />
                  }
                  label="Best Price Guarantee"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={response.flexibleDates}
                      onChange={(e) => setResponse({ ...response, flexibleDates: e.target.checked })}
                    />
                  }
                  label="Flexible with Dates (+/- 3 days)"
                />
              </Grid>
            </Grid>
          )}
          
          {activeTab === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Payment Terms"
                  multiline
                  rows={3}
                  value={response.paymentTerms}
                  onChange={(e) => setResponse({ ...response, paymentTerms: e.target.value })}
                  placeholder="e.g., 30% deposit, balance 30 days before arrival"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Cancellation Policy"
                  multiline
                  rows={3}
                  value={response.cancellationPolicy}
                  onChange={(e) => setResponse({ ...response, cancellationPolicy: e.target.value })}
                  placeholder="e.g., Free cancellation up to 14 days before arrival"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Valid Until"
                  type="date"
                  value={response.validUntil}
                  onChange={(e) => setResponse({ ...response, validUntil: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  helperText="How long is this quote valid?"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Additional Notes"
                  value={response.notes}
                  onChange={(e) => setResponse({ ...response, notes: e.target.value })}
                  placeholder="Any additional information or conditions..."
                />
              </Grid>
            </Grid>
          )}
        </Paper>
        
        {/* Price Summary */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'success.light' }}>
          <Typography variant="h6" gutterBottom>Price Summary</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="body2">Total Price</Typography>
              <Typography variant="h5">${calculateTotalPrice().toFixed(2)}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2">Price per Person</Typography>
              <Typography variant="h5">
                ${(calculateTotalPrice() / (rfqDetails.numberOfPax - rfqDetails.freePersons)).toFixed(2)}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2">Win Probability</Typography>
              <Typography variant="h5">{calculateWinProbability()}%</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2">Your Position</Typography>
              <Rating value={calculateWinProbability() / 20} readOnly />
            </Grid>
          </Grid>
        </Paper>
        
        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<SaveIcon />}
            onClick={() => showSnackbar('Quote saved as draft', 'info')}
          >
            Save Draft
          </Button>
          <Button
            variant="contained"
            size="large"
            startIcon={<SendIcon />}
            onClick={() => setConfirmDialog(true)}
            disabled={submitting || timeRemaining === 'EXPIRED'}
            sx={{
              background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
              color: 'white'
            }}
          >
            Submit Quote
          </Button>
        </Box>
        
        {/* Confirm Dialog */}
        <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
          <DialogTitle>Confirm Quote Submission</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              Please review your quote before submitting. Once submitted, you cannot modify it.
            </Alert>
            <List>
              <ListItem>
                <ListItemText
                  primary="Total Price"
                  secondary={`$${calculateTotalPrice().toFixed(2)}`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Price per Person"
                  secondary={`$${(calculateTotalPrice() / (rfqDetails.numberOfPax - rfqDetails.freePersons)).toFixed(2)}`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Win Probability"
                  secondary={`${calculateWinProbability()}%`}
                />
              </ListItem>
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => {
                setConfirmDialog(false);
                handleSubmit();
              }}
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={24} /> : 'Confirm & Submit'}
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={snackbar.severity}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default ProviderResponsePortal;