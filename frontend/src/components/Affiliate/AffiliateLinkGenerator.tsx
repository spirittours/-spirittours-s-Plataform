/**
 * Affiliate Link Generator Component
 * Allows affiliates to generate trackable links and embeddable widgets
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
  Tabs,
  Tab,
  Alert,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Slider,
  Radio,
  RadioGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Link as LinkIcon,
  ContentCopy,
  QrCode,
  Code,
  Widgets,
  Language,
  Share,
  CheckCircle,
  ExpandMore,
  Preview,
  Settings,
  Palette,
  TextFields,
  Image,
  AspectRatio,
  FormatColorFill,
  BorderColor,
  Visibility,
  Download,
  Email,
  WhatsApp,
  Facebook,
  Twitter,
  Instagram,
  LinkedIn,
  YouTube,
  Pinterest,
  Telegram,
  Reddit,
  Campaign,
  LocalOffer,
  FlightTakeoff,
  Hotel,
  DirectionsCar,
  Restaurant,
  Explore,
  AttachMoney,
  DateRange,
  People,
  LocationOn,
  Star,
  TrendingUp,
  AutoAwesome,
  Smartphone,
  Computer,
  Tablet,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import copy from 'copy-to-clipboard';
import axios from 'axios';
import { ColorPicker } from 'material-ui-color';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';

interface LinkGeneratorProps {
  affiliateCode?: string;
  apiKey?: string;
}

interface GeneratedLink {
  url: string;
  short_url?: string;
  qr_code?: string;
  tracking_id: string;
  expires?: string;
}

interface WidgetConfig {
  type: 'banner' | 'search' | 'deals' | 'reviews' | 'booking' | 'carousel' | 'popup';
  size: string;
  style: {
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
    backgroundColor: string;
    borderRadius: number;
    borderWidth: number;
    borderColor: string;
    fontFamily: string;
    fontSize: number;
    showLogo: boolean;
    showPrices: boolean;
    showRatings: boolean;
    showDiscounts: boolean;
    responsive: boolean;
  };
  content: {
    title?: string;
    subtitle?: string;
    categories?: string[];
    destinations?: string[];
    priceRange?: [number, number];
    language: string;
    currency: string;
    maxItems?: number;
    autoRotate?: boolean;
    rotationSpeed?: number;
  };
  behavior: {
    openInNewTab: boolean;
    trackClicks: boolean;
    trackImpressions: boolean;
    cookieDuration: number;
    attribution: 'first-click' | 'last-click' | 'linear' | 'time-decay';
    showOnMobile: boolean;
    showOnDesktop: boolean;
    delayedLoad?: number;
    exitIntent?: boolean;
  };
}

const AffiliateLinkGenerator: React.FC<LinkGeneratorProps> = ({ affiliateCode, apiKey }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [generatedLink, setGeneratedLink] = useState<GeneratedLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [embedCode, setEmbedCode] = useState('');
  
  // Link configuration
  const [linkConfig, setLinkConfig] = useState({
    destination_url: '',
    product_type: 'tours',
    product_id: '',
    campaign: '',
    source: '',
    medium: '',
    content: '',
    term: '',
    custom_params: {} as Record<string, string>,
    use_short_url: true,
    generate_qr: true,
    track_conversions: true,
  });
  
  // Widget configuration
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>({
    type: 'banner',
    size: '728x90',
    style: {
      primaryColor: '#1976d2',
      secondaryColor: '#f50057',
      textColor: '#333333',
      backgroundColor: '#ffffff',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#e0e0e0',
      fontFamily: 'Roboto, sans-serif',
      fontSize: 14,
      showLogo: true,
      showPrices: true,
      showRatings: true,
      showDiscounts: true,
      responsive: true,
    },
    content: {
      title: 'Discover Amazing Tours',
      subtitle: 'Book your adventure with Spirit Tours',
      categories: ['tours', 'hotels'],
      destinations: [],
      priceRange: [0, 5000],
      language: 'en',
      currency: 'USD',
      maxItems: 6,
      autoRotate: true,
      rotationSpeed: 5000,
    },
    behavior: {
      openInNewTab: true,
      trackClicks: true,
      trackImpressions: true,
      cookieDuration: 30,
      attribution: 'last-click',
      showOnMobile: true,
      showOnDesktop: true,
      delayedLoad: 0,
      exitIntent: false,
    },
  });
  
  // Predefined templates
  const linkTemplates = [
    { name: 'Homepage', url: 'https://spirittours.com', icon: <Language /> },
    { name: 'Tours', url: 'https://spirittours.com/tours', icon: <Explore /> },
    { name: 'Hotels', url: 'https://spirittours.com/hotels', icon: <Hotel /> },
    { name: 'Flights', url: 'https://spirittours.com/flights', icon: <FlightTakeoff /> },
    { name: 'Car Rentals', url: 'https://spirittours.com/cars', icon: <DirectionsCar /> },
    { name: 'Restaurants', url: 'https://spirittours.com/dining', icon: <Restaurant /> },
  ];
  
  const widgetSizes = {
    banner: ['728x90', '468x60', '320x50', '970x90', '970x250'],
    square: ['250x250', '200x200', '336x280', '300x250'],
    skyscraper: ['120x600', '160x600', '300x600', '300x1050'],
    mobile: ['320x50', '320x100', '300x250', '336x280'],
    responsive: ['fluid', 'auto'],
  };
  
  const socialPlatforms = [
    { name: 'WhatsApp', icon: <WhatsApp />, color: '#25D366' },
    { name: 'Facebook', icon: <Facebook />, color: '#1877F2' },
    { name: 'Twitter', icon: <Twitter />, color: '#1DA1F2' },
    { name: 'Instagram', icon: <Instagram />, color: '#E4405F' },
    { name: 'LinkedIn', icon: <LinkedIn />, color: '#0A66C2' },
    { name: 'YouTube', icon: <YouTube />, color: '#FF0000' },
    { name: 'Pinterest', icon: <Pinterest />, color: '#BD081C' },
    { name: 'Telegram', icon: <Telegram />, color: '#0088CC' },
    { name: 'Reddit', icon: <Reddit />, color: '#FF4500' },
    { name: 'Email', icon: <Email />, color: '#EA4335' },
  ];

  const generateLink = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        '/api/affiliates/generate-link',
        {
          ...linkConfig,
          affiliate_code: affiliateCode,
        },
        {
          headers: {
            'X-API-Key': apiKey,
          },
        }
      );
      
      setGeneratedLink(response.data);
      
      // Generate QR code if requested
      if (linkConfig.generate_qr) {
        const qrDataUrl = await QRCode.toDataURL(response.data.url, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
        setGeneratedLink((prev) => ({ ...prev!, qr_code: qrDataUrl }));
      }
    } catch (error) {
      console.error('Error generating link:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateEmbedCode = () => {
    const config = JSON.stringify(widgetConfig);
    const code = `
<!-- Spirit Tours Affiliate Widget -->
<div id="spirit-tours-widget-${affiliateCode}"></div>
<script>
  (function() {
    var config = ${JSON.stringify(widgetConfig, null, 2)};
    config.affiliateCode = '${affiliateCode}';
    
    var script = document.createElement('script');
    script.src = 'https://cdn.spirittours.com/affiliate/widget.js';
    script.async = true;
    script.onload = function() {
      if (window.SpiritToursWidget) {
        window.SpiritToursWidget.init('spirit-tours-widget-${affiliateCode}', config);
      }
    };
    document.head.appendChild(script);
  })();
</script>
<!-- End Spirit Tours Affiliate Widget -->`;
    
    setEmbedCode(code);
    return code;
  };

  const copyToClipboard = (text: string) => {
    copy(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform: string) => {
    if (!generatedLink) return;
    
    const url = generatedLink.short_url || generatedLink.url;
    const text = `Check out these amazing tours from Spirit Tours!`;
    
    const shareUrls: Record<string, string> = {
      WhatsApp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
      Facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      Twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      Pinterest: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(text)}`,
      Telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      Reddit: `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
      Email: `mailto:?subject=${encodeURIComponent('Amazing Tours from Spirit Tours')}&body=${encodeURIComponent(text + '\n\n' + url)}`,
    };
    
    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank');
    }
  };

  const downloadQRCode = () => {
    if (!generatedLink?.qr_code) return;
    
    const link = document.createElement('a');
    link.download = `spirit-tours-qr-${affiliateCode}.png`;
    link.href = generatedLink.qr_code;
    link.click();
  };

  const renderLinkTab = () => (
    <Box>
      <Grid container spacing={3}>
        {/* Quick Templates */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            {t('affiliate.link_generator.quick_templates')}
          </Typography>
          <Grid container spacing={1}>
            {linkTemplates.map((template) => (
              <Grid item key={template.name}>
                <Chip
                  icon={template.icon}
                  label={template.name}
                  onClick={() => setLinkConfig({ ...linkConfig, destination_url: template.url })}
                  color={linkConfig.destination_url === template.url ? 'primary' : 'default'}
                  variant={linkConfig.destination_url === template.url ? 'filled' : 'outlined'}
                />
              </Grid>
            ))}
          </Grid>
        </Grid>
        
        {/* URL Input */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label={t('affiliate.link_generator.destination_url')}
            value={linkConfig.destination_url}
            onChange={(e) => setLinkConfig({ ...linkConfig, destination_url: e.target.value })}
            placeholder="https://spirittours.com/tours/machu-picchu"
            helperText={t('affiliate.link_generator.url_help')}
            InputProps={{
              startAdornment: <LinkIcon sx={{ mr: 1, color: 'action.active' }} />,
            }}
          />
        </Grid>
        
        {/* Campaign Parameters */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>{t('affiliate.link_generator.campaign_parameters')}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('affiliate.link_generator.campaign_name')}
                    value={linkConfig.campaign}
                    onChange={(e) => setLinkConfig({ ...linkConfig, campaign: e.target.value })}
                    placeholder="summer-2024"
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('affiliate.link_generator.source')}
                    value={linkConfig.source}
                    onChange={(e) => setLinkConfig({ ...linkConfig, source: e.target.value })}
                    placeholder="facebook, google, newsletter"
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('affiliate.link_generator.medium')}
                    value={linkConfig.medium}
                    onChange={(e) => setLinkConfig({ ...linkConfig, medium: e.target.value })}
                    placeholder="social, email, cpc"
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('affiliate.link_generator.content')}
                    value={linkConfig.content}
                    onChange={(e) => setLinkConfig({ ...linkConfig, content: e.target.value })}
                    placeholder="banner-top, sidebar"
                    size="small"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>
        
        {/* Options */}
        <Grid item xs={12}>
          <Box display="flex" flexWrap="wrap" gap={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={linkConfig.use_short_url}
                  onChange={(e) => setLinkConfig({ ...linkConfig, use_short_url: e.target.checked })}
                />
              }
              label={t('affiliate.link_generator.use_short_url')}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={linkConfig.generate_qr}
                  onChange={(e) => setLinkConfig({ ...linkConfig, generate_qr: e.target.checked })}
                />
              }
              label={t('affiliate.link_generator.generate_qr')}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={linkConfig.track_conversions}
                  onChange={(e) => setLinkConfig({ ...linkConfig, track_conversions: e.target.checked })}
                />
              }
              label={t('affiliate.link_generator.track_conversions')}
            />
          </Box>
        </Grid>
        
        {/* Generate Button */}
        <Grid item xs={12}>
          <Button
            variant="contained"
            size="medium"
            fullWidth
            startIcon={loading ? <LinearProgress /> : <AutoAwesome />}
            onClick={generateLink}
            disabled={!linkConfig.destination_url || loading}
          >
            {loading ? t('common.generating') : t('affiliate.link_generator.generate_link')}
          </Button>
        </Grid>
        
        {/* Generated Link Display */}
        {generatedLink && (
          <Grid item xs={12}>
            <Alert severity="success" sx={{ mb: 2 }}>
              {t('affiliate.link_generator.link_generated_success')}
            </Alert>
            
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('affiliate.link_generator.your_link')}:
              </Typography>
              
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                    flex: 1,
                  }}
                >
                  {generatedLink.short_url || generatedLink.url}
                </Typography>
                <Box display="flex" gap={1}>
                  <Tooltip title={copied ? t('common.copied') : t('common.copy')}>
                    <IconButton
                      onClick={() => copyToClipboard(generatedLink.short_url || generatedLink.url)}
                    >
                      {copied ? <CheckCircle color="success" /> : <ContentCopy />}
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              
              {generatedLink.qr_code && (
                <Box textAlign="center" mb={2}>
                  <img
                    src={generatedLink.qr_code}
                    alt="QR Code"
                    style={{ maxWidth: 200, width: '100%' }}
                  />
                  <Box mt={1}>
                    <Button
                      size="small"
                      startIcon={<Download />}
                      onClick={downloadQRCode}
                    >
                      {t('affiliate.link_generator.download_qr')}
                    </Button>
                  </Box>
                </Box>
              )}
              
              {/* Social Sharing */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                {t('affiliate.link_generator.share_on')}:
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {socialPlatforms.map((platform) => (
                  <IconButton
                    key={platform.name}
                    onClick={() => handleShare(platform.name)}
                    sx={{
                      color: platform.color,
                      border: 1,
                      borderColor: platform.color,
                      '&:hover': {
                        bgcolor: platform.color,
                        color: 'white',
                      },
                    }}
                  >
                    {platform.icon}
                  </IconButton>
                ))}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  const renderWidgetTab = () => (
    <Box>
      <Grid container spacing={3}>
        {/* Widget Type Selection */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            {t('affiliate.link_generator.widget_type')}
          </Typography>
          <RadioGroup
            row
            value={widgetConfig.type}
            onChange={(e) => setWidgetConfig({ ...widgetConfig, type: e.target.value as any })}
          >
            <FormControlLabel value="banner" control={<Radio />} label="Banner" />
            <FormControlLabel value="search" control={<Radio />} label="Search Box" />
            <FormControlLabel value="deals" control={<Radio />} label="Deals Grid" />
            <FormControlLabel value="reviews" control={<Radio />} label="Reviews" />
            <FormControlLabel value="booking" control={<Radio />} label="Booking Form" />
            <FormControlLabel value="carousel" control={<Radio />} label="Carousel" />
            <FormControlLabel value="popup" control={<Radio />} label="Popup" />
          </RadioGroup>
        </Grid>
        
        {/* Size Selection */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>{t('affiliate.link_generator.widget_size')}</InputLabel>
            <Select
              value={widgetConfig.size}
              onChange={(e) => setWidgetConfig({ ...widgetConfig, size: e.target.value })}
            >
              {Object.entries(widgetSizes).map(([category, sizes]) => [
                <ListItem key={`header-${category}`} disabled>
                  <Typography variant="caption" color="textSecondary">
                    {category.toUpperCase()}
                  </Typography>
                </ListItem>,
                ...sizes.map((size) => (
                  <MenuItem key={size} value={size}>
                    {size}
                  </MenuItem>
                )),
              ])}
            </Select>
          </FormControl>
        </Grid>
        
        {/* Language & Currency */}
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>{t('common.language')}</InputLabel>
            <Select
              value={widgetConfig.content.language}
              onChange={(e) =>
                setWidgetConfig({
                  ...widgetConfig,
                  content: { ...widgetConfig.content, language: e.target.value },
                })
              }
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="es">Español</MenuItem>
              <MenuItem value="pt">Português</MenuItem>
              <MenuItem value="fr">Français</MenuItem>
              <MenuItem value="de">Deutsch</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>{t('common.currency')}</InputLabel>
            <Select
              value={widgetConfig.content.currency}
              onChange={(e) =>
                setWidgetConfig({
                  ...widgetConfig,
                  content: { ...widgetConfig.content, currency: e.target.value },
                })
              }
            >
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="EUR">EUR</MenuItem>
              <MenuItem value="GBP">GBP</MenuItem>
              <MenuItem value="PEN">PEN</MenuItem>
              <MenuItem value="BRL">BRL</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        {/* Style Configuration */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>{t('affiliate.link_generator.style_settings')}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Typography gutterBottom>{t('affiliate.link_generator.primary_color')}</Typography>
                  <TextField
                    fullWidth
                    type="color"
                    value={widgetConfig.style.primaryColor}
                    onChange={(e) =>
                      setWidgetConfig({
                        ...widgetConfig,
                        style: { ...widgetConfig.style, primaryColor: e.target.value },
                      })
                    }
                    size="small"
                  />
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <Typography gutterBottom>{t('affiliate.link_generator.background_color')}</Typography>
                  <TextField
                    fullWidth
                    type="color"
                    value={widgetConfig.style.backgroundColor}
                    onChange={(e) =>
                      setWidgetConfig({
                        ...widgetConfig,
                        style: { ...widgetConfig.style, backgroundColor: e.target.value },
                      })
                    }
                    size="small"
                  />
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <Typography gutterBottom>{t('affiliate.link_generator.border_radius')}</Typography>
                  <Slider
                    value={widgetConfig.style.borderRadius}
                    onChange={(e, value) =>
                      setWidgetConfig({
                        ...widgetConfig,
                        style: { ...widgetConfig.style, borderRadius: value as number },
                      })
                    }
                    min={0}
                    max={50}
                    valueLabelDisplay="auto"
                  />
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <Typography gutterBottom>{t('affiliate.link_generator.font_size')}</Typography>
                  <Slider
                    value={widgetConfig.style.fontSize}
                    onChange={(e, value) =>
                      setWidgetConfig({
                        ...widgetConfig,
                        style: { ...widgetConfig.style, fontSize: value as number },
                      })
                    }
                    min={10}
                    max={24}
                    valueLabelDisplay="auto"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Box display="flex" flexWrap="wrap" gap={2}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={widgetConfig.style.showLogo}
                          onChange={(e) =>
                            setWidgetConfig({
                              ...widgetConfig,
                              style: { ...widgetConfig.style, showLogo: e.target.checked },
                            })
                          }
                        />
                      }
                      label={t('affiliate.link_generator.show_logo')}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={widgetConfig.style.showPrices}
                          onChange={(e) =>
                            setWidgetConfig({
                              ...widgetConfig,
                              style: { ...widgetConfig.style, showPrices: e.target.checked },
                            })
                          }
                        />
                      }
                      label={t('affiliate.link_generator.show_prices')}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={widgetConfig.style.showRatings}
                          onChange={(e) =>
                            setWidgetConfig({
                              ...widgetConfig,
                              style: { ...widgetConfig.style, showRatings: e.target.checked },
                            })
                          }
                        />
                      }
                      label={t('affiliate.link_generator.show_ratings')}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={widgetConfig.style.responsive}
                          onChange={(e) =>
                            setWidgetConfig({
                              ...widgetConfig,
                              style: { ...widgetConfig.style, responsive: e.target.checked },
                            })
                          }
                        />
                      }
                      label={t('affiliate.link_generator.responsive')}
                    />
                  </Box>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>
        
        {/* Generate Embed Code */}
        <Grid item xs={12}>
          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<Code />}
              onClick={generateEmbedCode}
            >
              {t('affiliate.link_generator.generate_embed_code')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Preview />}
              onClick={() => setPreviewOpen(true)}
            >
              {t('common.preview')}
            </Button>
          </Box>
        </Grid>
        
        {/* Embed Code Display */}
        {embedCode && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">{t('affiliate.link_generator.embed_code')}</Typography>
                <Button
                  startIcon={copied ? <CheckCircle /> : <ContentCopy />}
                  onClick={() => copyToClipboard(embedCode)}
                  color={copied ? 'success' : 'primary'}
                >
                  {copied ? t('common.copied') : t('common.copy')}
                </Button>
              </Box>
              
              <Box
                sx={{
                  maxHeight: 400,
                  overflow: 'auto',
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                }}
              >
                <SyntaxHighlighter
                  language="html"
                  style={docco}
                  customStyle={{
                    margin: 0,
                    padding: 16,
                    background: 'transparent',
                  }}
                >
                  {embedCode}
                </SyntaxHighlighter>
              </Box>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                {t('affiliate.link_generator.embed_instructions')}
              </Alert>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  const renderBannersTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('affiliate.link_generator.ready_banners')}
      </Typography>
      
      <Grid container spacing={3}>
        {['728x90', '300x250', '160x600', '320x50', '468x60', '250x250'].map((size) => (
          <Grid item xs={12} md={6} lg={4} key={size}>
            <Card>
              <Box
                sx={{
                  height: 200,
                  bgcolor: 'grey.200',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Typography variant="h6" color="textSecondary">
                  {size}
                </Typography>
                <Chip
                  label="Preview"
                  size="small"
                  sx={{ position: 'absolute', top: 8, right: 8 }}
                />
              </Box>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Banner {size}
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  {t('affiliate.link_generator.banner_description')}
                </Typography>
                <Box display="flex" gap={1}>
                  <Button size="small" variant="outlined" startIcon={<Download />}>
                    PNG
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<Download />}>
                    JPG
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<Code />}>
                    HTML
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {t('affiliate.link_generator.title')}
      </Typography>
      
      <Tabs
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
      >
        <Tab label={t('affiliate.link_generator.links')} icon={<LinkIcon />} iconPosition="start" />
        <Tab label={t('affiliate.link_generator.widgets')} icon={<Widgets />} iconPosition="start" />
        <Tab label={t('affiliate.link_generator.banners')} icon={<Image />} iconPosition="start" />
      </Tabs>
      
      {activeTab === 0 && renderLinkTab()}
      {activeTab === 1 && renderWidgetTab()}
      {activeTab === 2 && renderBannersTab()}
      
      {/* Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('affiliate.link_generator.widget_preview')}</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              height: 400,
              bgcolor: 'grey.100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 1,
            }}
          >
            <Typography color="textSecondary">
              {t('affiliate.link_generator.widget_preview_placeholder')}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default AffiliateLinkGenerator;