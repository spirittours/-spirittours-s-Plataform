import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Chip,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  FormGroup,
  CircularProgress,
  Alert,
  Collapse,
  IconButton,
  Tooltip,
  Fab,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Paper,
  Container,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Rating,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Flight,
  Hotel,
  Restaurant,
  LocalActivity,
  Map,
  DateRange,
  AttachMoney,
  Person,
  Interests,
  Settings,
  AutoAwesome,
  Refresh,
  Save,
  Share,
  Print,
  Download,
  Edit,
  Delete,
  Add,
  Remove,
  ExpandMore,
  ExpandLess,
  CheckCircle,
  Error,
  Warning,
  Info,
  NavigateNext,
  NavigateBefore,
  LocationOn,
  AccessTime,
  DirectionsWalk,
  DirectionsCar,
  DirectionsBus,
  Train,
  LocalTaxi,
  TwoWheeler,
  Sailing,
  EmojiTransportation,
  WbSunny,
  Cloud,
  Thunderstorm,
  AcUnit,
  Favorite,
  FavoriteBorder,
  StarRate,
  PhotoCamera,
  Nature,
  Museum,
  ShoppingBag,
  Nightlife,
  FitnessCenter,
  Spa,
  BeachAccess,
  Terrain,
  Castle,
  TheaterComedy,
  MusicNote,
  Palette,
  MenuBook,
  Groups,
  FamilyRestroom,
  Accessible,
  ChildCare,
  Pets,
  Luggage,
  LocalHospital,
  Language,
  Euro,
  AttachMoneyOutlined,
  CreditCard,
  AccountBalance,
  TrendingUp,
  EmojiEmotions,
  Speed,
  Timer,
  EventAvailable,
  EventBusy,
  Celebration,
  CardGiftcard,
  LocalOffer,
  Loyalty,
  EmojiObjects,
  Psychology,
  AutoFixHigh,
  Insights,
  Analytics,
  SupportAgent,
  Forum,
  RateReview,
  ThumbUp,
  ThumbDown,
  BookmarkBorder,
  Bookmark,
  ShareLocation,
  MyLocation,
  ExploreOutlined,
  TravelExplore,
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

// Types
interface UserProfile {
  userId: string;
  age: number;
  nationality: string;
  languages: string[];
  interests: string[];
  travelHistory: any[];
  dietaryRestrictions: string[];
  accessibilityNeeds: string[];
  travelCompanions: number;
  companionAges: number[];
  fitnessLevel: number;
  culturalPreferences: Record<string, any>;
  shoppingPreferences: string[];
  photographyInterests: boolean;
}

interface TourPreferences {
  destination: string;
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  travelStyle: string[];
  preferredActivities: string[];
  avoidedActivities: string[];
  accommodationType: string;
  mealPreferences: string[];
  transportPreference: string;
  pace: string;
  mustSeeAttractions: string[];
  avoidAttractions: string[];
  specialOccasions: string;
  weatherPreference: string;
}

interface BudgetRange {
  totalBudget: number;
  currency: string;
  dailyBudget: number;
  accommodationBudget: number;
  foodBudget: number;
  activitiesBudget: number;
  transportBudget: number;
  shoppingBudget: number;
  emergencyFund: number;
  budgetFlexibility: number;
}

interface DayActivity {
  time: string;
  durationMinutes: number;
  activityName: string;
  activityType: string;
  description: string;
  location: {
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
    googleMapsUrl: string;
  };
  costEstimate: number;
  bookingRequired: boolean;
  bookingUrl?: string;
  tips: string[];
  alternatives: any[];
  weatherDependent: boolean;
  accessibilityInfo?: string;
  photoOpportunity: boolean;
  localInsights?: string;
}

interface DayItinerary {
  dayNumber: number;
  date: string;
  dayTitle: string;
  dayTheme: string;
  activities: DayActivity[];
  meals: any[];
  accommodation: any;
  transportDetails: any[];
  totalCostEstimate: number;
  walkingDistanceKm: number;
  highlights: string[];
  insiderTips: string[];
  emergencyContacts: Record<string, string>;
  weatherForecast?: any;
}

interface GeneratedTour {
  tourId: string;
  generatedAt: string;
  userId: string;
  destination: string;
  title: string;
  description: string;
  durationDays: number;
  startDate: string;
  endDate: string;
  totalBudgetEstimate: number;
  itinerary: DayItinerary[];
  packingList: string[];
  visaRequirements: any;
  healthSafetyInfo: any;
  culturalEtiquette: string[];
  languagePhrases: Record<string, string>;
  emergencyNumbers: Record<string, string>;
  weatherSummary: any;
  sustainabilityScore: number;
  personalizationScore: number;
  alternativeVersions: any[];
  bookingLinks: Record<string, string>;
  travelInsuranceRecommendation?: any;
  carbonFootprintEstimate?: number;
}

// Constants
const TRAVEL_STYLES = [
  { value: 'adventure', label: 'Adventure', icon: <Terrain /> },
  { value: 'cultural', label: 'Cultural', icon: <Museum /> },
  { value: 'luxury', label: 'Luxury', icon: <StarRate /> },
  { value: 'budget', label: 'Budget', icon: <AttachMoneyOutlined /> },
  { value: 'family', label: 'Family', icon: <FamilyRestroom /> },
  { value: 'romantic', label: 'Romantic', icon: <Favorite /> },
  { value: 'solo', label: 'Solo', icon: <Person /> },
  { value: 'business', label: 'Business', icon: <AccountBalance /> },
  { value: 'wellness', label: 'Wellness', icon: <Spa /> },
  { value: 'gastronomy', label: 'Gastronomy', icon: <Restaurant /> },
  { value: 'photography', label: 'Photography', icon: <PhotoCamera /> },
  { value: 'eco_friendly', label: 'Eco-Friendly', icon: <Nature /> },
];

const ACTIVITY_TYPES = [
  { value: 'sightseeing', label: 'Sightseeing', icon: <LocationOn /> },
  { value: 'dining', label: 'Dining', icon: <Restaurant /> },
  { value: 'shopping', label: 'Shopping', icon: <ShoppingBag /> },
  { value: 'entertainment', label: 'Entertainment', icon: <TheaterComedy /> },
  { value: 'sports', label: 'Sports', icon: <FitnessCenter /> },
  { value: 'relaxation', label: 'Relaxation', icon: <Spa /> },
  { value: 'nightlife', label: 'Nightlife', icon: <Nightlife /> },
  { value: 'education', label: 'Education', icon: <MenuBook /> },
  { value: 'nature', label: 'Nature', icon: <Nature /> },
  { value: 'cultural', label: 'Cultural', icon: <Museum /> },
];

const TRANSPORT_MODES = [
  { value: 'walking', label: 'Walking', icon: <DirectionsWalk /> },
  { value: 'public_transport', label: 'Public Transport', icon: <DirectionsBus /> },
  { value: 'taxi', label: 'Taxi', icon: <LocalTaxi /> },
  { value: 'rental_car', label: 'Rental Car', icon: <DirectionsCar /> },
  { value: 'bicycle', label: 'Bicycle', icon: <TwoWheeler /> },
  { value: 'private_driver', label: 'Private Driver', icon: <DirectionsCar /> },
  { value: 'boat', label: 'Boat', icon: <Sailing /> },
];

const ACCOMMODATION_TYPES = [
  'Hotel', 'Hostel', 'Airbnb', 'Resort', 'Boutique Hotel',
  'Vacation Rental', 'Bed & Breakfast', 'Camping', 'Glamping'
];

const PACE_OPTIONS = [
  { value: 'relaxed', label: 'Relaxed (3-4 activities/day)', icon: <Timer /> },
  { value: 'moderate', label: 'Moderate (5-6 activities/day)', icon: <Speed /> },
  { value: 'fast', label: 'Fast (7+ activities/day)', icon: <TrendingUp /> },
];

const INTERESTS = [
  'History', 'Art', 'Architecture', 'Food', 'Wine', 'Music', 'Dance',
  'Sports', 'Adventure', 'Nature', 'Wildlife', 'Beach', 'Mountains',
  'Photography', 'Shopping', 'Nightlife', 'Literature', 'Film',
  'Technology', 'Science', 'Religion', 'Spirituality', 'Wellness'
];

const DIETARY_RESTRICTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Halal',
  'Kosher', 'Nut Allergy', 'Seafood Allergy', 'Low Sodium', 'Diabetic'
];

const ACCESSIBILITY_NEEDS = [
  'Wheelchair Accessible', 'Step-Free Access', 'Visual Impairment Support',
  'Hearing Impairment Support', 'Mobility Assistance', 'Service Animal Friendly'
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'MXN', 'BRL'];

interface AITourDesignerProps {
  userId: string;
  onTourGenerated?: (tour: GeneratedTour) => void;
}

const AITourDesigner: React.FC<AITourDesignerProps> = ({ userId, onTourGenerated }) => {
  // State Management
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedTour, setGeneratedTour] = useState<GeneratedTour | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [favoriteActivities, setFavoriteActivities] = useState<Set<string>>(new Set());
  
  // Form State
  const [profile, setProfile] = useState<UserProfile>({
    userId,
    age: 30,
    nationality: '',
    languages: ['English'],
    interests: [],
    travelHistory: [],
    dietaryRestrictions: [],
    accessibilityNeeds: [],
    travelCompanions: 1,
    companionAges: [],
    fitnessLevel: 3,
    culturalPreferences: {},
    shoppingPreferences: [],
    photographyInterests: false,
  });

  const [preferences, setPreferences] = useState<TourPreferences>({
    destination: '',
    startDate: null,
    endDate: null,
    travelStyle: [],
    preferredActivities: [],
    avoidedActivities: [],
    accommodationType: 'Hotel',
    mealPreferences: [],
    transportPreference: 'public_transport',
    pace: 'moderate',
    mustSeeAttractions: [],
    avoidAttractions: [],
    specialOccasions: '',
    weatherPreference: 'any',
  });

  const [budget, setBudget] = useState<BudgetRange>({
    totalBudget: 2000,
    currency: 'USD',
    dailyBudget: 200,
    accommodationBudget: 80,
    foodBudget: 50,
    activitiesBudget: 50,
    transportBudget: 20,
    shoppingBudget: 0,
    emergencyFund: 200,
    budgetFlexibility: 0.1,
  });

  // Steps configuration
  const steps = [
    'Profile & Interests',
    'Destination & Dates',
    'Travel Style',
    'Budget',
    'Review & Generate'
  ];

  // Step validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Profile
        return profile.age > 0 && profile.nationality !== '' && profile.interests.length > 0;
      case 1: // Destination
        return preferences.destination !== '' && preferences.startDate !== null && preferences.endDate !== null;
      case 2: // Travel Style
        return preferences.travelStyle.length > 0;
      case 3: // Budget
        return budget.totalBudget > 0;
      case 4: // Review
        return true;
      default:
        return false;
    }
  };

  // Navigation handlers
  const handleNext = () => {
    if (isStepValid(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
      setError(null);
    } else {
      setError('Please complete all required fields before proceeding.');
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
    setError(null);
  };

  const handleReset = () => {
    setActiveStep(0);
    setGeneratedTour(null);
    setError(null);
    setSuccess(null);
  };

  // Generate tour
  const generateTour = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/tour-designer/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile,
          preferences: {
            ...preferences,
            startDate: preferences.startDate?.toISOString(),
            endDate: preferences.endDate?.toISOString(),
          },
          budget,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate tour');
      }

      const data = await response.json();
      setGeneratedTour(data.tour);
      setSuccess('Your personalized tour has been generated successfully!');
      
      if (onTourGenerated) {
        onTourGenerated(data.tour);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred generating your tour');
    } finally {
      setLoading(false);
    }
  };

  // Regenerate section
  const regenerateSection = async (section: string, feedback: string) => {
    if (!generatedTour) return;
    
    setRegenerating(true);
    try {
      const response = await fetch('/api/ai/tour-designer/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tourId: generatedTour.tourId,
          section,
          feedback,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate section');
      }

      const data = await response.json();
      setGeneratedTour(data.tour);
      setSuccess(`${section} has been updated based on your feedback!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred regenerating the section');
    } finally {
      setRegenerating(false);
    }
  };

  // Toggle favorite activity
  const toggleFavorite = (activityId: string) => {
    setFavoriteActivities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  // Export tour
  const exportTour = (format: 'pdf' | 'json' | 'ics') => {
    if (!generatedTour) return;
    
    // Implementation would handle different export formats
    console.log(`Exporting tour as ${format}`);
  };

  // Share tour
  const shareTour = () => {
    if (!generatedTour) return;
    
    const shareUrl = `${window.location.origin}/tours/${generatedTour.tourId}`;
    navigator.clipboard.writeText(shareUrl);
    setSuccess('Tour link copied to clipboard!');
  };

  // Render step content
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Profile & Interests
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                <Person /> Tell us about yourself
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Age"
                type="number"
                value={profile.age}
                onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) })}
                InputProps={{
                  inputProps: { min: 1, max: 120 }
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nationality"
                value={profile.nationality}
                onChange={(e) => setProfile({ ...profile, nationality: e.target.value })}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={INTERESTS}
                value={profile.interests}
                onChange={(_, value) => setProfile({ ...profile, interests: value })}
                renderInput={(params) => (
                  <TextField {...params} label="Interests" placeholder="Select your interests" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip label={option} {...getTagProps({ index })} />
                  ))
                }
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Autocomplete
                multiple
                options={DIETARY_RESTRICTIONS}
                value={profile.dietaryRestrictions}
                onChange={(_, value) => setProfile({ ...profile, dietaryRestrictions: value })}
                renderInput={(params) => (
                  <TextField {...params} label="Dietary Restrictions" />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Autocomplete
                multiple
                options={ACCESSIBILITY_NEEDS}
                value={profile.accessibilityNeeds}
                onChange={(_, value) => setProfile({ ...profile, accessibilityNeeds: value })}
                renderInput={(params) => (
                  <TextField {...params} label="Accessibility Needs" />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Number of Travel Companions"
                type="number"
                value={profile.travelCompanions}
                onChange={(e) => setProfile({ ...profile, travelCompanions: parseInt(e.target.value) })}
                InputProps={{
                  inputProps: { min: 1, max: 20 }
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Fitness Level</Typography>
              <Slider
                value={profile.fitnessLevel}
                onChange={(_, value) => setProfile({ ...profile, fitnessLevel: value as number })}
                min={1}
                max={5}
                step={1}
                marks={[
                  { value: 1, label: 'Low' },
                  { value: 3, label: 'Moderate' },
                  { value: 5, label: 'High' }
                ]}
                valueLabelDisplay="auto"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={profile.photographyInterests}
                    onChange={(e) => setProfile({ ...profile, photographyInterests: e.target.checked })}
                  />
                }
                label="I'm interested in photography opportunities"
              />
            </Grid>
          </Grid>
        );

      case 1: // Destination & Dates
        return (
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  <LocationOn /> Where and when?
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Destination"
                  value={preferences.destination}
                  onChange={(e) => setPreferences({ ...preferences, destination: e.target.value })}
                  placeholder="e.g., Paris, France"
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Start Date"
                  value={preferences.startDate}
                  onChange={(value) => setPreferences({ ...preferences, startDate: value })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="End Date"
                  value={preferences.endDate}
                  onChange={(value) => setPreferences({ ...preferences, endDate: value })}
                  minDate={preferences.startDate || undefined}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Must-See Attractions"
                  placeholder="Enter attractions separated by commas"
                  value={preferences.mustSeeAttractions.join(', ')}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    mustSeeAttractions: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Special Occasions"
                  placeholder="e.g., Anniversary, Birthday"
                  value={preferences.specialOccasions}
                  onChange={(e) => setPreferences({ ...preferences, specialOccasions: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Weather Preference</InputLabel>
                  <Select
                    value={preferences.weatherPreference}
                    onChange={(e) => setPreferences({ ...preferences, weatherPreference: e.target.value })}
                  >
                    <MenuItem value="any">Any Weather</MenuItem>
                    <MenuItem value="sunny">Prefer Sunny</MenuItem>
                    <MenuItem value="mild">Prefer Mild</MenuItem>
                    <MenuItem value="avoid_rain">Avoid Rain</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </LocalizationProvider>
        );

      case 2: // Travel Style
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                <AutoAwesome /> Your travel style
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>Select your travel styles:</Typography>
              <Grid container spacing={1}>
                {TRAVEL_STYLES.map((style) => (
                  <Grid item key={style.value}>
                    <Chip
                      icon={style.icon}
                      label={style.label}
                      onClick={() => {
                        const newStyles = preferences.travelStyle.includes(style.value)
                          ? preferences.travelStyle.filter(s => s !== style.value)
                          : [...preferences.travelStyle, style.value];
                        setPreferences({ ...preferences, travelStyle: newStyles });
                      }}
                      color={preferences.travelStyle.includes(style.value) ? 'primary' : 'default'}
                      variant={preferences.travelStyle.includes(style.value) ? 'filled' : 'outlined'}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>Preferred activities:</Typography>
              <Grid container spacing={1}>
                {ACTIVITY_TYPES.map((activity) => (
                  <Grid item key={activity.value}>
                    <Chip
                      icon={activity.icon}
                      label={activity.label}
                      onClick={() => {
                        const newActivities = preferences.preferredActivities.includes(activity.value)
                          ? preferences.preferredActivities.filter(a => a !== activity.value)
                          : [...preferences.preferredActivities, activity.value];
                        setPreferences({ ...preferences, preferredActivities: newActivities });
                      }}
                      color={preferences.preferredActivities.includes(activity.value) ? 'primary' : 'default'}
                      variant={preferences.preferredActivities.includes(activity.value) ? 'filled' : 'outlined'}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Accommodation Type</InputLabel>
                <Select
                  value={preferences.accommodationType}
                  onChange={(e) => setPreferences({ ...preferences, accommodationType: e.target.value })}
                >
                  {ACCOMMODATION_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Transport Preference</InputLabel>
                <Select
                  value={preferences.transportPreference}
                  onChange={(e) => setPreferences({ ...preferences, transportPreference: e.target.value })}
                >
                  {TRANSPORT_MODES.map((mode) => (
                    <MenuItem key={mode.value} value={mode.value}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {mode.icon}
                        {mode.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>Travel Pace:</Typography>
              <ToggleButtonGroup
                exclusive
                value={preferences.pace}
                onChange={(_, value) => value && setPreferences({ ...preferences, pace: value })}
              >
                {PACE_OPTIONS.map((pace) => (
                  <ToggleButton key={pace.value} value={pace.value}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {pace.icon}
                      {pace.label}
                    </Box>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        );

      case 3: // Budget
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                <AttachMoney /> Budget planning
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Total Budget"
                type="number"
                value={budget.totalBudget}
                onChange={(e) => setBudget({ ...budget, totalBudget: parseFloat(e.target.value) })}
                InputProps={{
                  startAdornment: budget.currency,
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={budget.currency}
                  onChange={(e) => setBudget({ ...budget, currency: e.target.value })}
                >
                  {CURRENCIES.map((currency) => (
                    <MenuItem key={currency} value={currency}>{currency}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>Budget Breakdown (per day):</Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Accommodation"
                type="number"
                value={budget.accommodationBudget}
                onChange={(e) => setBudget({ ...budget, accommodationBudget: parseFloat(e.target.value) })}
                InputProps={{
                  startAdornment: budget.currency,
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Food & Dining"
                type="number"
                value={budget.foodBudget}
                onChange={(e) => setBudget({ ...budget, foodBudget: parseFloat(e.target.value) })}
                InputProps={{
                  startAdornment: budget.currency,
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Activities"
                type="number"
                value={budget.activitiesBudget}
                onChange={(e) => setBudget({ ...budget, activitiesBudget: parseFloat(e.target.value) })}
                InputProps={{
                  startAdornment: budget.currency,
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Transportation"
                type="number"
                value={budget.transportBudget}
                onChange={(e) => setBudget({ ...budget, transportBudget: parseFloat(e.target.value) })}
                InputProps={{
                  startAdornment: budget.currency,
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography gutterBottom>Budget Flexibility</Typography>
              <Slider
                value={budget.budgetFlexibility * 100}
                onChange={(_, value) => setBudget({ ...budget, budgetFlexibility: (value as number) / 100 })}
                min={0}
                max={30}
                step={5}
                marks={[
                  { value: 0, label: 'Strict' },
                  { value: 15, label: '15%' },
                  { value: 30, label: '30%' }
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
              />
            </Grid>
          </Grid>
        );

      case 4: // Review & Generate
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                <CheckCircle /> Review your preferences
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Trip Details
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="Destination" 
                        secondary={preferences.destination}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Dates" 
                        secondary={`${preferences.startDate?.format('MMM DD')} - ${preferences.endDate?.format('MMM DD, YYYY')}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Duration" 
                        secondary={`${preferences.endDate?.diff(preferences.startDate, 'day') || 0} days`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Travelers" 
                        secondary={`${profile.travelCompanions} person(s)`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Budget Summary
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="Total Budget" 
                        secondary={`${budget.currency} ${budget.totalBudget}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Daily Budget" 
                        secondary={`${budget.currency} ${(budget.accommodationBudget + budget.foodBudget + budget.activitiesBudget + budget.transportBudget).toFixed(2)}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Flexibility" 
                        secondary={`±${(budget.budgetFlexibility * 100).toFixed(0)}%`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Travel Preferences
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                    {preferences.travelStyle.map((style) => (
                      <Chip key={style} label={style} color="primary" />
                    ))}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {profile.interests.length > 0 && `Interests: ${profile.interests.join(', ')}`}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  Our AI will generate a personalized {preferences.endDate?.diff(preferences.startDate, 'day') || 0}-day 
                  itinerary based on your preferences. This typically takes 30-60 seconds.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  // Render generated tour
  const renderGeneratedTour = () => {
    if (!generatedTour) return null;

    return (
      <Container maxWidth="lg">
        <Box py={4}>
          {/* Tour Header */}
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <Typography variant="h4" gutterBottom>
                  {generatedTour.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  {generatedTour.description}
                </Typography>
                <Box display="flex" gap={2} flexWrap="wrap">
                  <Chip 
                    icon={<DateRange />} 
                    label={`${generatedTour.durationDays} days`}
                  />
                  <Chip 
                    icon={<AttachMoney />} 
                    label={`${budget.currency} ${generatedTour.totalBudgetEstimate.toFixed(0)}`}
                  />
                  <Chip 
                    icon={<EmojiObjects />} 
                    label={`${generatedTour.personalizationScore.toFixed(0)}% Personalized`}
                    color="primary"
                  />
                  <Chip 
                    icon={<Nature />} 
                    label={`${generatedTour.sustainabilityScore.toFixed(0)}% Sustainable`}
                    color="success"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box display="flex" gap={1} justifyContent="flex-end">
                  <IconButton onClick={() => exportTour('pdf')} color="primary">
                    <Download />
                  </IconButton>
                  <IconButton onClick={shareTour} color="primary">
                    <Share />
                  </IconButton>
                  <IconButton onClick={() => window.print()} color="primary">
                    <Print />
                  </IconButton>
                  <Button 
                    variant="contained" 
                    startIcon={<Refresh />}
                    onClick={handleReset}
                  >
                    New Tour
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Day Selector */}
          <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
            <Box display="flex" gap={1} overflow="auto">
              {generatedTour.itinerary.map((day, index) => (
                <Chip
                  key={index}
                  label={`Day ${day.dayNumber}`}
                  onClick={() => setSelectedDay(index)}
                  color={selectedDay === index ? 'primary' : 'default'}
                  variant={selectedDay === index ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </Paper>

          {/* Day Itinerary */}
          {generatedTour.itinerary[selectedDay] && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h5" gutterBottom>
                      {generatedTour.itinerary[selectedDay].dayTitle}
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                      {generatedTour.itinerary[selectedDay].dayTheme}
                    </Typography>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    {/* Activities Timeline */}
                    <List>
                      {generatedTour.itinerary[selectedDay].activities.map((activity, index) => (
                        <React.Fragment key={index}>
                          <ListItem alignItems="flex-start">
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: 'primary.main' }}>
                                <AccessTime />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Typography variant="subtitle1" fontWeight="bold">
                                    {activity.time} - {activity.activityName}
                                  </Typography>
                                  {activity.photoOpportunity && (
                                    <Chip 
                                      icon={<PhotoCamera />} 
                                      label="Photo Op" 
                                      size="small" 
                                      color="secondary"
                                    />
                                  )}
                                </Box>
                              }
                              secondary={
                                <Box mt={1}>
                                  <Typography variant="body2" paragraph>
                                    {activity.description}
                                  </Typography>
                                  <Box display="flex" gap={1} flexWrap="wrap">
                                    <Chip 
                                      size="small" 
                                      icon={<LocationOn />} 
                                      label={activity.location.name}
                                    />
                                    <Chip 
                                      size="small" 
                                      icon={<Timer />} 
                                      label={`${activity.durationMinutes} min`}
                                    />
                                    <Chip 
                                      size="small" 
                                      icon={<AttachMoney />} 
                                      label={`${activity.costEstimate}`}
                                    />
                                  </Box>
                                  {activity.tips.length > 0 && (
                                    <Alert severity="info" sx={{ mt: 2 }}>
                                      <Typography variant="body2">
                                        {activity.tips[0]}
                                      </Typography>
                                    </Alert>
                                  )}
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <IconButton 
                                onClick={() => toggleFavorite(activity.activityName)}
                              >
                                {favoriteActivities.has(activity.activityName) ? 
                                  <Favorite color="error" /> : <FavoriteBorder />
                                }
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                          {index < generatedTour.itinerary[selectedDay].activities.length - 1 && (
                            <Divider variant="inset" component="li" />
                          )}
                        </React.Fragment>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                {/* Day Summary */}
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Day Summary
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText 
                          primary="Total Cost" 
                          secondary={`${budget.currency} ${generatedTour.itinerary[selectedDay].totalCostEstimate}`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Walking Distance" 
                          secondary={`${generatedTour.itinerary[selectedDay].walkingDistanceKm} km`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Activities" 
                          secondary={`${generatedTour.itinerary[selectedDay].activities.length} planned`}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
                
                {/* Insider Tips */}
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <EmojiObjects /> Insider Tips
                    </Typography>
                    <List dense>
                      {generatedTour.itinerary[selectedDay].insiderTips.map((tip, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={tip} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
                
                {/* Alternative Versions */}
                {showAlternatives && generatedTour.alternativeVersions.length > 0 && (
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Alternative Versions
                      </Typography>
                      <List dense>
                        {generatedTour.alternativeVersions.map((alt, index) => (
                          <ListItem key={index} button>
                            <ListItemText 
                              primary={alt.title}
                              secondary={alt.description}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                )}
              </Grid>
            </Grid>
          )}

          {/* Practical Information */}
          <Box mt={4}>
            <Typography variant="h5" gutterBottom>
              Practical Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>Packing List</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {generatedTour.packingList.map((item, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={item} />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>Cultural Etiquette</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {generatedTour.culturalEtiquette.map((tip, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={tip} />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>Essential Phrases</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {Object.entries(generatedTour.languagePhrases).map(([phrase, translation], index) => (
                        <ListItem key={index}>
                          <ListItemText 
                            primary={phrase}
                            secondary={translation}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Container>
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      {!generatedTour ? (
        <>
          {/* Stepper */}
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Content */}
          <Container maxWidth="md">
            {loading ? (
              <Box display="flex" flexDirection="column" alignItems="center" py={8}>
                <CircularProgress size={60} />
                <Typography variant="h6" mt={3}>
                  Generating your personalized tour...
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  This may take 30-60 seconds
                </Typography>
              </Box>
            ) : (
              <>
                {/* Error Alert */}
                {error && (
                  <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                  </Alert>
                )}

                {/* Success Alert */}
                {success && (
                  <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
                    {success}
                  </Alert>
                )}

                {/* Step Content */}
                <Card>
                  <CardContent>
                    {renderStepContent(activeStep)}
                  </CardContent>
                </Card>

                {/* Navigation */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                  <Button
                    disabled={activeStep === 0}
                    onClick={handleBack}
                    startIcon={<NavigateBefore />}
                  >
                    Back
                  </Button>

                  {activeStep === steps.length - 1 ? (
                    <Button
                      variant="contained"
                      onClick={generateTour}
                      disabled={!isStepValid(activeStep)}
                      startIcon={<AutoAwesome />}
                    >
                      Generate Tour
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      disabled={!isStepValid(activeStep)}
                      endIcon={<NavigateNext />}
                    >
                      Next
                    </Button>
                  )}
                </Box>
              </>
            )}
          </Container>
        </>
      ) : (
        renderGeneratedTour()
      )}
    </Box>
  );
};

export default AITourDesigner;