/**
 * Affiliate Dashboard Component
 * Main dashboard for affiliates to track performance, generate links, and manage their account
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Badge,
  Menu,
  Divider,
  InputAdornment,
  Switch,
  FormControlLabel,
  Skeleton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp,
  TrendingDown,
  MonetizationOn,
  Link as LinkIcon,
  ContentCopy,
  Download,
  Share,
  QrCode,
  Analytics,
  People,
  CalendarToday,
  FilterList,
  MoreVert,
  Refresh,
  CheckCircle,
  Warning,
  Error,
  Info,
  EmojiEvents,
  Grade,
  LocalOffer,
  CreditCard,
  AccountBalance,
  Visibility,
  Code,
  Image,
  VideoLibrary,
  Description,
  Email,
  WhatsApp,
  Facebook,
  Twitter,
  Instagram,
  YouTube,
  Language,
  ArrowUpward,
  ArrowDownward,
  AttachMoney,
  ShoppingCart,
  Person,
  Group,
  LocationOn,
  DevicesOther,
  Speed,
  Timeline,
  PieChart,
  BarChart,
  ShowChart,
  DateRange,
  Today,
  NavigateNext,
  NavigateBefore,
  FirstPage,
  LastPage,
  Settings,
  NotificationsActive,
  Help,
  Logout,
  AutoGraph,
  Campaign,
  Paid,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Line, Bar, Doughnut, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import axios from 'axios';
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import QRCode from 'qrcode';
import copy from 'copy-to-clipboard';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

interface AffiliateDashboardData {
  profile: {
    affiliate_code: string;
    type: string;
    tier: string;
    commission_rate: number;
    status: string;
    total_earnings: number;
    pending_balance: number;
    available_balance: number;
    next_payout_date: string;
    lifetime_clicks: number;
    lifetime_conversions: number;
    conversion_rate: number;
    average_order_value: number;
    rank: number;
    badges: string[];
  };
  
  stats: {
    today: {
      clicks: number;
      conversions: number;
      revenue: number;
      commission: number;
    };
    month: {
      clicks: number;
      conversions: number;
      revenue: number;
      commission: number;
    };
    year: {
      clicks: number;
      conversions: number;
      revenue: number;
      commission: number;
    };
  };
  
  recent_conversions: Array<{
    id: string;
    date: string;
    customer_name: string;
    booking_reference: string;
    amount: number;
    commission: number;
    status: string;
    product: string;
  }>;
  
  top_products: Array<{
    id: string;
    name: string;
    conversions: number;
    revenue: number;
    commission: number;
  }>;
  
  traffic_sources: Array<{
    source: string;
    clicks: number;
    conversions: number;
    conversion_rate: number;
  }>;
  
  geographic_data: Array<{
    country: string;
    clicks: number;
    conversions: number;
    revenue: number;
  }>;
}

const AffiliateDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AffiliateDashboardData | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [dateRange, setDateRange] = useState({ start: subDays(new Date(), 30), end: new Date() });
  const [refreshing, setRefreshing] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/affiliates/dashboard', {
        params: {
          start_date: format(dateRange.start, 'yyyy-MM-dd'),
          end_date: format(dateRange.end, 'yyyy-MM-dd'),
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('affiliate_token')}`,
        },
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const generateAffiliateLink = async () => {
    try {
      const response = await axios.post(
        '/api/affiliates/generate-link',
        {
          product_id: selectedProduct,
          campaign: 'dashboard',
          medium: 'web',
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('affiliate_token')}`,
          },
        }
      );
      
      setGeneratedLink(response.data.link);
      
      // Generate QR Code
      const qrDataUrl = await QRCode.toDataURL(response.data.link);
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating link:', error);
    }
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      copy(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'SUSPENDED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'PLATINUM':
        return <EmojiEvents sx={{ color: '#E5E4E2' }} />;
      case 'GOLD':
        return <Grade sx={{ color: '#FFD700' }} />;
      case 'SILVER':
        return <Grade sx={{ color: '#C0C0C0' }} />;
      default:
        return <Grade sx={{ color: '#CD7F32' }} />;
    }
  };

  // Chart configurations
  const revenueChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: t('affiliate.dashboard.revenue'),
        data: [12000, 19000, 15000, 25000, 22000, 30000, 28000, 35000, 32000, 40000, 38000, 45000],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
        fill: true,
      },
      {
        label: t('affiliate.dashboard.commission'),
        data: [1200, 1900, 1500, 2500, 2200, 3000, 2800, 3500, 3200, 4000, 3800, 4500],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const conversionChartData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: t('affiliate.dashboard.clicks'),
        data: [650, 590, 800, 810],
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
      },
      {
        label: t('affiliate.dashboard.conversions'),
        data: [28, 48, 40, 65],
        backgroundColor: 'rgba(255, 206, 86, 0.8)',
      },
    ],
  };

  const trafficSourcesChartData = {
    labels: data?.traffic_sources.map(s => s.source) || [],
    datasets: [
      {
        data: data?.traffic_sources.map(s => s.clicks) || [],
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
        ],
      },
    ],
  };

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      {/* Stats Cards */}
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" variant="subtitle2">
                  {t('affiliate.dashboard.today_revenue')}
                </Typography>
                <Typography variant="h4">
                  {loading ? <Skeleton /> : formatCurrency(data?.stats.today.revenue || 0)}
                </Typography>
                <Box display="flex" alignItems="center" mt={1}>
                  <TrendingUp color="success" fontSize="small" />
                  <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                    +12.5%
                  </Typography>
                </Box>
              </Box>
              <Avatar sx={{ bgcolor: 'success.light' }}>
                <MonetizationOn color="success" />
              </Avatar>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" variant="subtitle2">
                  {t('affiliate.dashboard.today_conversions')}
                </Typography>
                <Typography variant="h4">
                  {loading ? <Skeleton /> : data?.stats.today.conversions || 0}
                </Typography>
                <Box display="flex" alignItems="center" mt={1}>
                  <TrendingUp color="success" fontSize="small" />
                  <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                    +8.2%
                  </Typography>
                </Box>
              </Box>
              <Avatar sx={{ bgcolor: 'primary.light' }}>
                <ShoppingCart color="primary" />
              </Avatar>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" variant="subtitle2">
                  {t('affiliate.dashboard.conversion_rate')}
                </Typography>
                <Typography variant="h4">
                  {loading ? <Skeleton /> : formatPercentage(data?.profile.conversion_rate || 0)}
                </Typography>
                <Box display="flex" alignItems="center" mt={1}>
                  <TrendingDown color="error" fontSize="small" />
                  <Typography variant="body2" color="error.main" sx={{ ml: 0.5 }}>
                    -2.1%
                  </Typography>
                </Box>
              </Box>
              <Avatar sx={{ bgcolor: 'warning.light' }}>
                <AutoGraph color="warning" />
              </Avatar>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" variant="subtitle2">
                  {t('affiliate.dashboard.pending_payout')}
                </Typography>
                <Typography variant="h4">
                  {loading ? <Skeleton /> : formatCurrency(data?.profile.pending_balance || 0)}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {t('affiliate.dashboard.next_payout')}: {data?.profile.next_payout_date}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'info.light' }}>
                <Paid color="info" />
              </Avatar>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Revenue Chart */}
      <Grid item xs={12} lg={8}>
        <Paper sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
            <Typography variant="h6">{t('affiliate.dashboard.revenue_overview')}</Typography>
            <FormControl size="small">
              <Select value="monthly" size="small">
                <MenuItem value="daily">{t('common.daily')}</MenuItem>
                <MenuItem value="weekly">{t('common.weekly')}</MenuItem>
                <MenuItem value="monthly">{t('common.monthly')}</MenuItem>
                <MenuItem value="yearly">{t('common.yearly')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Line data={revenueChartData} options={{ responsive: true, maintainAspectRatio: false }} height={300} />
        </Paper>
      </Grid>

      {/* Affiliate Profile Card */}
      <Grid item xs={12} lg={4}>
        <Paper sx={{ p: 3, height: '100%' }}>
          <Box display="flex" alignItems="center" mb={3}>
            <Avatar sx={{ width: 60, height: 60, mr: 2 }}>
              {data?.profile.affiliate_code.substring(0, 2).toUpperCase()}
            </Avatar>
            <Box flex={1}>
              <Typography variant="h6">{data?.profile.affiliate_code}</Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip
                  label={data?.profile.tier}
                  size="small"
                  icon={getTierIcon(data?.profile.tier || '')}
                />
                <Chip
                  label={data?.profile.status}
                  size="small"
                  color={getStatusColor(data?.profile.status || '')}
                />
              </Box>
            </Box>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <List dense>
            <ListItem>
              <ListItemText
                primary={t('affiliate.dashboard.commission_rate')}
                secondary={`${data?.profile.commission_rate}%`}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary={t('affiliate.dashboard.lifetime_earnings')}
                secondary={formatCurrency(data?.profile.total_earnings || 0)}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary={t('affiliate.dashboard.global_rank')}
                secondary={`#${data?.profile.rank || 'N/A'}`}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary={t('affiliate.dashboard.avg_order_value')}
                secondary={formatCurrency(data?.profile.average_order_value || 0)}
              />
            </ListItem>
          </List>
          
          {data?.profile.badges && data.profile.badges.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                {t('affiliate.dashboard.achievements')}
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {data.profile.badges.map((badge, index) => (
                  <Chip
                    key={index}
                    label={badge}
                    size="small"
                    icon={<EmojiEvents />}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </>
          )}
        </Paper>
      </Grid>

      {/* Recent Conversions */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('affiliate.dashboard.recent_conversions')}
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('affiliate.dashboard.date')}</TableCell>
                  <TableCell>{t('affiliate.dashboard.customer')}</TableCell>
                  <TableCell>{t('affiliate.dashboard.product')}</TableCell>
                  <TableCell>{t('affiliate.dashboard.booking_ref')}</TableCell>
                  <TableCell align="right">{t('affiliate.dashboard.amount')}</TableCell>
                  <TableCell align="right">{t('affiliate.dashboard.commission')}</TableCell>
                  <TableCell>{t('affiliate.dashboard.status')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={7}>
                        <Skeleton />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  data?.recent_conversions
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((conversion) => (
                      <TableRow key={conversion.id}>
                        <TableCell>
                          {format(parseISO(conversion.date), 'MMM dd, yyyy', {
                            locale: i18n.language === 'es' ? es : undefined,
                          })}
                        </TableCell>
                        <TableCell>{conversion.customer_name}</TableCell>
                        <TableCell>{conversion.product}</TableCell>
                        <TableCell>
                          <Chip label={conversion.booking_reference} size="small" />
                        </TableCell>
                        <TableCell align="right">{formatCurrency(conversion.amount)}</TableCell>
                        <TableCell align="right">
                          <Typography color="success.main">
                            {formatCurrency(conversion.commission)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={conversion.status}
                            size="small"
                            color={getStatusColor(conversion.status)}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data?.recent_conversions.length || 0}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </Paper>
      </Grid>
    </Grid>
  );

  const renderLinksTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
            <Typography variant="h6">{t('affiliate.dashboard.link_generator')}</Typography>
            <Button
              variant="contained"
              startIcon={<LinkIcon />}
              onClick={() => setLinkDialogOpen(true)}
            >
              {t('affiliate.dashboard.generate_link')}
            </Button>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('affiliate.dashboard.select_product')}</InputLabel>
                <Select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                >
                  <MenuItem value="tour-cusco">Tour Cusco - Machu Picchu</MenuItem>
                  <MenuItem value="tour-lima">Lima City Tour</MenuItem>
                  <MenuItem value="tour-arequipa">Arequipa - Colca Canyon</MenuItem>
                  <MenuItem value="tour-nazca">Nazca Lines</MenuItem>
                  <MenuItem value="tour-amazon">Amazon Rainforest</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('affiliate.dashboard.campaign_name')}
                placeholder="summer-2024"
                helperText={t('affiliate.dashboard.campaign_help')}
              />
            </Grid>
          </Grid>
          
          {generatedLink && (
            <Box mt={3}>
              <Alert severity="success">
                {t('affiliate.dashboard.link_generated')}
              </Alert>
              
              <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {generatedLink}
                  </Typography>
                  <Box display="flex" gap={1}>
                    <Tooltip title={copied ? t('common.copied') : t('common.copy')}>
                      <IconButton onClick={handleCopyLink}>
                        {copied ? <CheckCircle color="success" /> : <ContentCopy />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('affiliate.dashboard.share')}>
                      <IconButton>
                        <Share />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('affiliate.dashboard.qr_code')}>
                      <IconButton onClick={() => setQrCodeUrl(qrCodeUrl)}>
                        <QrCode />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                
                {qrCodeUrl && (
                  <Box mt={2} textAlign="center">
                    <img src={qrCodeUrl} alt="QR Code" style={{ maxWidth: 200 }} />
                  </Box>
                )}
              </Paper>
              
              {/* Share Buttons */}
              <Box mt={2} display="flex" gap={1}>
                <Button variant="outlined" startIcon={<WhatsApp />} color="success">
                  WhatsApp
                </Button>
                <Button variant="outlined" startIcon={<Facebook />} sx={{ color: '#1877f2' }}>
                  Facebook
                </Button>
                <Button variant="outlined" startIcon={<Twitter />} sx={{ color: '#1da1f2' }}>
                  Twitter
                </Button>
                <Button variant="outlined" startIcon={<Email />}>
                  Email
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Grid>
      
      {/* Link Performance */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('affiliate.dashboard.link_performance')}
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('affiliate.dashboard.link')}</TableCell>
                  <TableCell>{t('affiliate.dashboard.campaign')}</TableCell>
                  <TableCell align="center">{t('affiliate.dashboard.clicks')}</TableCell>
                  <TableCell align="center">{t('affiliate.dashboard.conversions')}</TableCell>
                  <TableCell align="center">{t('affiliate.dashboard.conversion_rate')}</TableCell>
                  <TableCell align="right">{t('affiliate.dashboard.revenue')}</TableCell>
                  <TableCell>{t('affiliate.dashboard.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      spirittours.com/tours/cusco?ref=john123
                    </Typography>
                  </TableCell>
                  <TableCell>Summer 2024</TableCell>
                  <TableCell align="center">1,234</TableCell>
                  <TableCell align="center">45</TableCell>
                  <TableCell align="center">
                    <Chip label="3.65%" size="small" color="success" />
                  </TableCell>
                  <TableCell align="right">{formatCurrency(4500)}</TableCell>
                  <TableCell>
                    <IconButton size="small">
                      <Visibility />
                    </IconButton>
                    <IconButton size="small">
                      <ContentCopy />
                    </IconButton>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderAnalyticsTab = () => (
    <Grid container spacing={3}>
      {/* Conversion Funnel */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('affiliate.dashboard.conversion_funnel')}
          </Typography>
          <Bar data={conversionChartData} options={{ responsive: true }} />
        </Paper>
      </Grid>
      
      {/* Traffic Sources */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('affiliate.dashboard.traffic_sources')}
          </Typography>
          <Doughnut data={trafficSourcesChartData} options={{ responsive: true }} />
        </Paper>
      </Grid>
      
      {/* Top Products */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('affiliate.dashboard.top_products')}
          </Typography>
          <List>
            {data?.top_products.map((product, index) => (
              <ListItem key={product.id}>
                <ListItemAvatar>
                  <Avatar>{index + 1}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={product.name}
                  secondary={`${product.conversions} ${t('affiliate.dashboard.conversions')}`}
                />
                <ListItemSecondaryAction>
                  <Typography color="success.main">
                    {formatCurrency(product.commission)}
                  </Typography>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Grid>
      
      {/* Geographic Performance */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('affiliate.dashboard.geographic_performance')}
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('affiliate.dashboard.country')}</TableCell>
                  <TableCell align="center">{t('affiliate.dashboard.clicks')}</TableCell>
                  <TableCell align="center">{t('affiliate.dashboard.conversions')}</TableCell>
                  <TableCell align="right">{t('affiliate.dashboard.revenue')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.geographic_data.map((geo) => (
                  <TableRow key={geo.country}>
                    <TableCell>{geo.country}</TableCell>
                    <TableCell align="center">{geo.clicks}</TableCell>
                    <TableCell align="center">{geo.conversions}</TableCell>
                    <TableCell align="right">{formatCurrency(geo.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderMaterialsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('affiliate.dashboard.materials_description')}
        </Alert>
      </Grid>
      
      {/* Banners */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('affiliate.dashboard.banners')}
          </Typography>
          <Grid container spacing={2}>
            {['728x90', '300x250', '160x600', '320x50'].map((size) => (
              <Grid item xs={12} md={6} lg={3} key={size}>
                <Card>
                  <CardContent>
                    <Box
                      sx={{
                        height: 150,
                        bgcolor: 'grey.200',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                      }}
                    >
                      <Typography color="textSecondary">{size}</Typography>
                    </Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Banner {size}
                    </Typography>
                    <Box display="flex" gap={1}>
                      <Button size="small" startIcon={<Download />}>
                        PNG
                      </Button>
                      <Button size="small" startIcon={<Code />}>
                        HTML
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Grid>
      
      {/* Email Templates */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('affiliate.dashboard.email_templates')}
          </Typography>
          <List>
            <ListItem>
              <ListItemAvatar>
                <Avatar>
                  <Email />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={t('affiliate.dashboard.welcome_email')}
                secondary={t('affiliate.dashboard.welcome_email_desc')}
              />
              <ListItemSecondaryAction>
                <IconButton>
                  <Download />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
            <ListItem>
              <ListItemAvatar>
                <Avatar>
                  <Campaign />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={t('affiliate.dashboard.promo_email')}
                secondary={t('affiliate.dashboard.promo_email_desc')}
              />
              <ListItemSecondaryAction>
                <IconButton>
                  <Download />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </Paper>
      </Grid>
      
      {/* Social Media Posts */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('affiliate.dashboard.social_posts')}
          </Typography>
          <List>
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: '#1877f2' }}>
                  <Facebook />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary="Facebook Posts"
                secondary="5 ready-to-use posts"
              />
              <ListItemSecondaryAction>
                <IconButton>
                  <Download />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: '#E4405F' }}>
                  <Instagram />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary="Instagram Stories"
                secondary="10 story templates"
              />
              <ListItemSecondaryAction>
                <IconButton>
                  <Download />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderPaymentsTab = () => (
    <Grid container spacing={3}>
      {/* Payment Summary */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('affiliate.dashboard.payment_summary')}
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary={t('affiliate.dashboard.available_balance')}
                  secondary={formatCurrency(data?.profile.available_balance || 0)}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary={t('affiliate.dashboard.pending_balance')}
                  secondary={formatCurrency(data?.profile.pending_balance || 0)}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary={t('affiliate.dashboard.lifetime_earnings')}
                  secondary={formatCurrency(data?.profile.total_earnings || 0)}
                />
              </ListItem>
            </List>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AttachMoney />}
              disabled={(data?.profile.available_balance || 0) < 100}
            >
              {t('affiliate.dashboard.request_payout')}
            </Button>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Payment History */}
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('affiliate.dashboard.payment_history')}
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('affiliate.dashboard.date')}</TableCell>
                  <TableCell>{t('affiliate.dashboard.amount')}</TableCell>
                  <TableCell>{t('affiliate.dashboard.method')}</TableCell>
                  <TableCell>{t('affiliate.dashboard.reference')}</TableCell>
                  <TableCell>{t('affiliate.dashboard.status')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Oct 1, 2024</TableCell>
                  <TableCell>{formatCurrency(1250)}</TableCell>
                  <TableCell>
                    <Chip label="PayPal" size="small" icon={<CreditCard />} />
                  </TableCell>
                  <TableCell>PAY-123456</TableCell>
                  <TableCell>
                    <Chip label="Completed" size="small" color="success" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Sep 1, 2024</TableCell>
                  <TableCell>{formatCurrency(980)}</TableCell>
                  <TableCell>
                    <Chip label="Bank Transfer" size="small" icon={<AccountBalance />} />
                  </TableCell>
                  <TableCell>PAY-123455</TableCell>
                  <TableCell>
                    <Chip label="Completed" size="small" color="success" />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>
    </Grid>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {t('affiliate.dashboard.title')}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {t('affiliate.dashboard.welcome_back')} {data?.profile.affiliate_code}
          </Typography>
        </Box>
        
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={refreshing ? <LinearProgress /> : <Refresh />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {t('common.refresh')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<DateRange />}
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            {format(dateRange.start, 'MMM dd')} - {format(dateRange.end, 'MMM dd, yyyy')}
          </Button>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <MoreVert />
          </IconButton>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={selectedTab}
          onChange={(e, newValue) => setSelectedTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label={t('affiliate.dashboard.overview')} icon={<DashboardIcon />} iconPosition="start" />
          <Tab label={t('affiliate.dashboard.links')} icon={<LinkIcon />} iconPosition="start" />
          <Tab label={t('affiliate.dashboard.analytics')} icon={<Analytics />} iconPosition="start" />
          <Tab label={t('affiliate.dashboard.materials')} icon={<Image />} iconPosition="start" />
          <Tab label={t('affiliate.dashboard.payments')} icon={<AttachMoney />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {selectedTab === 0 && renderOverviewTab()}
      {selectedTab === 1 && renderLinksTab()}
      {selectedTab === 2 && renderAnalyticsTab()}
      {selectedTab === 3 && renderMaterialsTab()}
      {selectedTab === 4 && renderPaymentsTab()}

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('affiliate.dashboard.settings')}</ListItemText>
        </MenuItem>
        <MenuItem>
          <ListItemIcon>
            <Help fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('affiliate.dashboard.help')}</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('common.logout')}</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default AffiliateDashboard;