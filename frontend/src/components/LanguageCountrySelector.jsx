import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Chip,
  Avatar,
  Tooltip,
  Paper,
  Grid,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import {
  Language as LanguageIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  LocationOn as LocationIcon,
  Settings as SettingsIcon,
  Save as SaveIcon,
  Public as PublicIcon,
} from '@mui/icons-material';
import { styled } from '@mui/system';
import toast from 'react-hot-toast';

// Styled Components
const LanguageButton = styled(Button)(({ theme }) => ({
  borderRadius: 20,
  textTransform: 'none',
  padding: '6px 16px',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 1)',
  },
}));

const FlagAvatar = styled(Avatar)(({ theme }) => ({
  width: 24,
  height: 24,
  fontSize: '1.2rem',
  marginRight: theme.spacing(1),
}));

// Language Configuration
const LANGUAGES = {
  es: { 
    code: 'es', 
    name: 'Español', 
    nativeName: 'Español',
    flag: '🇪🇸',
    rtl: false,
  },
  en: { 
    code: 'en', 
    name: 'English', 
    nativeName: 'English',
    flag: '🇬🇧',
    rtl: false,
  },
  fr: { 
    code: 'fr', 
    name: 'French', 
    nativeName: 'Français',
    flag: '🇫🇷',
    rtl: false,
  },
  de: { 
    code: 'de', 
    name: 'German', 
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    rtl: false,
  },
  it: { 
    code: 'it', 
    name: 'Italian', 
    nativeName: 'Italiano',
    flag: '🇮🇹',
    rtl: false,
  },
  pt: { 
    code: 'pt', 
    name: 'Portuguese', 
    nativeName: 'Português',
    flag: '🇵🇹',
    rtl: false,
  },
  pt_BR: { 
    code: 'pt-BR', 
    name: 'Portuguese (Brazil)', 
    nativeName: 'Português (Brasil)',
    flag: '🇧🇷',
    rtl: false,
  },
  ru: { 
    code: 'ru', 
    name: 'Russian', 
    nativeName: 'Русский',
    flag: '🇷🇺',
    rtl: false,
  },
  zh: { 
    code: 'zh', 
    name: 'Chinese', 
    nativeName: '中文',
    flag: '🇨🇳',
    rtl: false,
  },
  ja: { 
    code: 'ja', 
    name: 'Japanese', 
    nativeName: '日本語',
    flag: '🇯🇵',
    rtl: false,
  },
  ko: { 
    code: 'ko', 
    name: 'Korean', 
    nativeName: '한국어',
    flag: '🇰🇷',
    rtl: false,
  },
  ar: { 
    code: 'ar', 
    name: 'Arabic', 
    nativeName: 'العربية',
    flag: '🇦🇪',
    rtl: true,
  },
  he: { 
    code: 'he', 
    name: 'Hebrew', 
    nativeName: 'עברית',
    flag: '🇮🇱',
    rtl: true,
  },
  hi: { 
    code: 'hi', 
    name: 'Hindi', 
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    rtl: false,
  },
};

// Country Configuration with Currency and Tax Settings
const COUNTRIES = {
  USA: {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    currency: 'USD',
    currencySymbol: '$',
    languages: ['en', 'es'],
    defaultLanguage: 'en',
    taxName: 'Sales Tax',
    defaultTaxRate: 0.08,
    priceDisplay: 'before_tax',
    phoneCode: '+1',
  },
  MEX: {
    code: 'MX',
    name: 'México',
    flag: '🇲🇽',
    currency: 'MXN',
    currencySymbol: '$',
    languages: ['es', 'en'],
    defaultLanguage: 'es',
    taxName: 'IVA',
    defaultTaxRate: 0.16,
    priceDisplay: 'with_tax',
    phoneCode: '+52',
  },
  ESP: {
    code: 'ES',
    name: 'España',
    flag: '🇪🇸',
    currency: 'EUR',
    currencySymbol: '€',
    languages: ['es', 'en', 'fr', 'de'],
    defaultLanguage: 'es',
    taxName: 'IVA',
    defaultTaxRate: 0.21,
    priceDisplay: 'with_tax',
    phoneCode: '+34',
  },
  GBR: {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    currency: 'GBP',
    currencySymbol: '£',
    languages: ['en'],
    defaultLanguage: 'en',
    taxName: 'VAT',
    defaultTaxRate: 0.20,
    priceDisplay: 'with_tax',
    phoneCode: '+44',
  },
  FRA: {
    code: 'FR',
    name: 'France',
    flag: '🇫🇷',
    currency: 'EUR',
    currencySymbol: '€',
    languages: ['fr', 'en'],
    defaultLanguage: 'fr',
    taxName: 'TVA',
    defaultTaxRate: 0.20,
    priceDisplay: 'with_tax',
    phoneCode: '+33',
  },
  DEU: {
    code: 'DE',
    name: 'Deutschland',
    flag: '🇩🇪',
    currency: 'EUR',
    currencySymbol: '€',
    languages: ['de', 'en'],
    defaultLanguage: 'de',
    taxName: 'MwSt',
    defaultTaxRate: 0.19,
    priceDisplay: 'with_tax',
    phoneCode: '+49',
  },
  ITA: {
    code: 'IT',
    name: 'Italia',
    flag: '🇮🇹',
    currency: 'EUR',
    currencySymbol: '€',
    languages: ['it', 'en'],
    defaultLanguage: 'it',
    taxName: 'IVA',
    defaultTaxRate: 0.22,
    priceDisplay: 'with_tax',
    phoneCode: '+39',
  },
  DXB: {
    code: 'AE',
    name: 'Dubai / UAE',
    flag: '🇦🇪',
    currency: 'AED',
    currencySymbol: 'د.إ',
    languages: ['ar', 'en'],
    defaultLanguage: 'en',
    taxName: 'VAT',
    defaultTaxRate: 0.05,
    priceDisplay: 'with_tax',
    phoneCode: '+971',
  },
  ISR: {
    code: 'IL',
    name: 'Israel',
    flag: '🇮🇱',
    currency: 'ILS',
    currencySymbol: '₪',
    languages: ['he', 'en', 'ar'],
    defaultLanguage: 'he',
    taxName: 'VAT',
    defaultTaxRate: 0.17,
    priceDisplay: 'with_tax',
    phoneCode: '+972',
  },
  BRA: {
    code: 'BR',
    name: 'Brasil',
    flag: '🇧🇷',
    currency: 'BRL',
    currencySymbol: 'R$',
    languages: ['pt_BR', 'en', 'es'],
    defaultLanguage: 'pt_BR',
    taxName: 'ICMS',
    defaultTaxRate: 0.18,
    priceDisplay: 'with_tax',
    phoneCode: '+55',
  },
  JPN: {
    code: 'JP',
    name: '日本',
    flag: '🇯🇵',
    currency: 'JPY',
    currencySymbol: '¥',
    languages: ['ja', 'en'],
    defaultLanguage: 'ja',
    taxName: '消費税',
    defaultTaxRate: 0.10,
    priceDisplay: 'with_tax',
    phoneCode: '+81',
  },
  CHN: {
    code: 'CN',
    name: '中国',
    flag: '🇨🇳',
    currency: 'CNY',
    currencySymbol: '¥',
    languages: ['zh', 'en'],
    defaultLanguage: 'zh',
    taxName: 'VAT',
    defaultTaxRate: 0.13,
    priceDisplay: 'with_tax',
    phoneCode: '+86',
  },
  IND: {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    currency: 'INR',
    currencySymbol: '₹',
    languages: ['hi', 'en'],
    defaultLanguage: 'en',
    taxName: 'GST',
    defaultTaxRate: 0.18,
    priceDisplay: 'with_tax',
    phoneCode: '+91',
  },
};

const LanguageCountrySelector = ({ onSettingsChange }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userSettings, setUserSettings] = useState({
    language: 'es',
    country: 'ESP',
    currency: 'EUR',
    autoDetect: false,
    savePreferences: true,
    showPricesWithTax: true,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  // Load user preferences on mount
  useEffect(() => {
    loadUserPreferences();
  }, []);

  // Save preferences when they change
  useEffect(() => {
    if (userSettings.savePreferences) {
      saveUserPreferences();
    }
  }, [userSettings]);

  const loadUserPreferences = () => {
    try {
      // Check localStorage for saved preferences
      const savedPrefs = localStorage.getItem('userLanguageCountryPrefs');
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        setUserSettings(prefs);
        applySettings(prefs);
        return;
      }

      // Check sessionStorage for current session
      const sessionPrefs = sessionStorage.getItem('userLanguageCountryPrefs');
      if (sessionPrefs) {
        const prefs = JSON.parse(sessionPrefs);
        setUserSettings(prefs);
        applySettings(prefs);
        return;
      }

      // Auto-detect if no saved preferences
      if (userSettings.autoDetect) {
        autoDetectSettings();
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const saveUserPreferences = () => {
    try {
      const prefsToSave = {
        ...userSettings,
        lastUpdated: new Date().toISOString(),
      };

      // Save to localStorage for permanent storage
      if (userSettings.savePreferences) {
        localStorage.setItem('userLanguageCountryPrefs', JSON.stringify(prefsToSave));
      }

      // Always save to sessionStorage for current session
      sessionStorage.setItem('userLanguageCountryPrefs', JSON.stringify(prefsToSave));

      // If user is logged in, save to their profile
      const userData = sessionStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        const updatedUser = {
          ...user,
          preferences: {
            ...user.preferences,
            language: userSettings.language,
            country: userSettings.country,
            currency: userSettings.currency,
          },
        };
        sessionStorage.setItem('userData', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const autoDetectSettings = () => {
    try {
      // Detect language from browser
      const browserLang = navigator.language.toLowerCase();
      const detectedLang = browserLang.split('-')[0];
      
      // Detect country from timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      let detectedCountry = 'USA';
      
      if (timezone.includes('Mexico')) detectedCountry = 'MEX';
      else if (timezone.includes('Madrid') || timezone.includes('Barcelona')) detectedCountry = 'ESP';
      else if (timezone.includes('London')) detectedCountry = 'GBR';
      else if (timezone.includes('Paris')) detectedCountry = 'FRA';
      else if (timezone.includes('Berlin')) detectedCountry = 'DEU';
      else if (timezone.includes('Rome')) detectedCountry = 'ITA';
      else if (timezone.includes('Dubai')) detectedCountry = 'DXB';
      else if (timezone.includes('Jerusalem') || timezone.includes('Tel_Aviv')) detectedCountry = 'ISR';
      else if (timezone.includes('Sao_Paulo') || timezone.includes('Brasilia')) detectedCountry = 'BRA';
      else if (timezone.includes('Tokyo')) detectedCountry = 'JPN';
      else if (timezone.includes('Shanghai') || timezone.includes('Beijing')) detectedCountry = 'CHN';
      else if (timezone.includes('Kolkata') || timezone.includes('Delhi')) detectedCountry = 'IND';
      
      const newSettings = {
        ...userSettings,
        language: LANGUAGES[detectedLang] ? detectedLang : 'en',
        country: detectedCountry,
        currency: COUNTRIES[detectedCountry].currency,
        timezone,
      };
      
      setUserSettings(newSettings);
      applySettings(newSettings);
      
      toast.success(`Detectado: ${COUNTRIES[detectedCountry].flag} ${COUNTRIES[detectedCountry].name}`);
    } catch (error) {
      console.error('Error auto-detecting settings:', error);
    }
  };

  const applySettings = (settings) => {
    // Apply language to HTML
    document.documentElement.lang = settings.language;
    
    // Apply RTL if needed
    const langConfig = LANGUAGES[settings.language];
    if (langConfig?.rtl) {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
    
    // Notify parent component
    if (onSettingsChange) {
      onSettingsChange(settings);
    }
    
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('languageCountryChange', {
      detail: settings,
    }));
  };

  const handleLanguageChange = (langCode) => {
    const newSettings = { ...userSettings, language: langCode };
    setUserSettings(newSettings);
    applySettings(newSettings);
    setAnchorEl(null);
    
    toast.success(`Idioma cambiado a ${LANGUAGES[langCode].nativeName}`);
  };

  const handleCountryChange = (countryCode) => {
    const country = COUNTRIES[countryCode];
    const newSettings = {
      ...userSettings,
      country: countryCode,
      currency: country.currency,
      language: country.languages.includes(userSettings.language) 
        ? userSettings.language 
        : country.defaultLanguage,
    };
    setUserSettings(newSettings);
    applySettings(newSettings);
    
    toast.success(`País cambiado a ${country.flag} ${country.name}`);
  };

  const handleSaveSettings = () => {
    saveUserPreferences();
    setSettingsOpen(false);
    toast.success('Preferencias guardadas correctamente');
  };

  const currentLanguage = LANGUAGES[userSettings.language];
  const currentCountry = COUNTRIES[userSettings.country];

  return (
    <>
      {/* Language/Country Button */}
      <LanguageButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        endIcon={<ExpandMoreIcon />}
        startIcon={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '1.2rem', marginRight: 4 }}>{currentCountry.flag}</span>
            <span style={{ fontSize: '1.2rem' }}>{currentLanguage.flag}</span>
          </Box>
        }
      >
        <Typography variant="body2" sx={{ mx: 1 }}>
          {currentLanguage.code.toUpperCase()} | {currentCountry.code}
        </Typography>
      </LanguageButton>

      {/* Language Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          sx: { mt: 1.5, minWidth: 280 },
        }}
      >
        <MenuItem onClick={() => { setSettingsOpen(true); setAnchorEl(null); }}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Configuración completa</ListItemText>
        </MenuItem>
        <Divider />
        
        <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
          Idiomas disponibles
        </Typography>
        {Object.entries(LANGUAGES)
          .filter(([code]) => currentCountry.languages.includes(code))
          .map(([code, lang]) => (
            <MenuItem
              key={code}
              onClick={() => handleLanguageChange(code)}
              selected={userSettings.language === code}
            >
              <ListItemIcon>
                <span style={{ fontSize: '1.2rem' }}>{lang.flag}</span>
              </ListItemIcon>
              <ListItemText>
                {lang.nativeName}
                {userSettings.language === code && (
                  <CheckIcon sx={{ ml: 1, fontSize: 16, color: 'primary.main' }} />
                )}
              </ListItemText>
            </MenuItem>
          ))}
        
        <Divider />
        
        <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
          Cambiar país
        </Typography>
        {Object.entries(COUNTRIES).slice(0, 5).map(([code, country]) => (
          <MenuItem
            key={code}
            onClick={() => handleCountryChange(code)}
            selected={userSettings.country === code}
          >
            <ListItemIcon>
              <span style={{ fontSize: '1.2rem' }}>{country.flag}</span>
            </ListItemIcon>
            <ListItemText>
              {country.name}
              {userSettings.country === code && (
                <CheckIcon sx={{ ml: 1, fontSize: 16, color: 'primary.main' }} />
              )}
            </ListItemText>
            <Typography variant="caption" color="text.secondary">
              {country.currencySymbol}
            </Typography>
          </MenuItem>
        ))}
      </Menu>

      {/* Settings Dialog */}
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PublicIcon sx={{ mr: 2 }} />
            Configuración de Idioma y País
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            Esta configuración se guardará en tu perfil y se aplicará automáticamente en tus próximas visitas.
          </Alert>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>País / Región</InputLabel>
                <Select
                  value={userSettings.country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  label="País / Región"
                >
                  {Object.entries(COUNTRIES).map(([code, country]) => (
                    <MenuItem key={code} value={code}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: 8, fontSize: '1.2rem' }}>{country.flag}</span>
                        {country.name}
                        <Chip
                          label={country.currencySymbol}
                          size="small"
                          sx={{ ml: 'auto' }}
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Idioma</InputLabel>
                <Select
                  value={userSettings.language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  label="Idioma"
                >
                  {currentCountry.languages.map(langCode => {
                    const lang = LANGUAGES[langCode];
                    return (
                      <MenuItem key={langCode} value={langCode}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ marginRight: 8, fontSize: '1.2rem' }}>{lang.flag}</span>
                          {lang.nativeName} ({lang.name})
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Configuración actual:
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Chip
                    icon={<LocationIcon />}
                    label={`${currentCountry.flag} ${currentCountry.name}`}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    icon={<LanguageIcon />}
                    label={`${currentLanguage.flag} ${currentLanguage.nativeName}`}
                    color="secondary"
                    variant="outlined"
                  />
                  <Chip
                    label={`${currentCountry.currencySymbol} ${currentCountry.currency}`}
                    variant="outlined"
                  />
                </Stack>
              </Paper>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={userSettings.savePreferences}
                    onChange={(e) => setUserSettings({
                      ...userSettings,
                      savePreferences: e.target.checked
                    })}
                  />
                }
                label="Guardar mis preferencias para futuras visitas"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={userSettings.showPricesWithTax}
                    onChange={(e) => setUserSettings({
                      ...userSettings,
                      showPricesWithTax: e.target.checked
                    })}
                  />
                }
                label={`Mostrar precios con ${currentCountry.taxName} incluido`}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={userSettings.autoDetect}
                    onChange={(e) => setUserSettings({
                      ...userSettings,
                      autoDetect: e.target.checked
                    })}
                  />
                }
                label="Detectar automáticamente mi ubicación"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Alert severity="success">
                <Typography variant="body2">
                  <strong>Beneficios de tu configuración:</strong>
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>Precios en {currentCountry.currency} ({currentCountry.currencySymbol})</li>
                  <li>Contenido en {currentLanguage.nativeName}</li>
                  <li>Impuestos ({currentCountry.taxName}) calculados automáticamente</li>
                  <li>Formato de fecha y hora local</li>
                  <li>Soporte telefónico: {currentCountry.phoneCode}</li>
                </ul>
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={() => autoDetectSettings()} startIcon={<PublicIcon />}>
            Auto-detectar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveSettings}
            startIcon={<SaveIcon />}
          >
            Guardar Configuración
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LanguageCountrySelector;