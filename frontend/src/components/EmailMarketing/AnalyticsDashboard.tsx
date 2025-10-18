/**
 * 📊 Email Marketing Analytics Dashboard
 * Dashboard completo de analytics y reportes
 * 
 * Características:
 * - Métricas en tiempo real
 * - Gráficos interactivos
 * - Comparativas históricas
 * - Export de reportes
 * - Segmentación de datos
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Select,
  MenuItem,
  Button,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Email as EmailIcon,
  OpenInNew as OpenIcon,
  TouchApp as ClickIcon,
  Cancel as BounceIcon,
  Unsubscribe as UnsubscribeIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Code as JsonIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';

// Types
interface CampaignStats {
  id: number;
  name: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  unsubscribe_rate: number;
  revenue: number;
  sent_at: string;
}

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
}

interface TimeSeriesData {
  date: string;
  sent: number;
  opened: number;
  clicked: number;
  revenue: number;
}

const AnalyticsDashboard: React.FC = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [tabValue, setTabValue] = useState(0);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Data
  const [overviewMetrics, setOverviewMetrics] = useState<MetricCard[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [campaignStats, setCampaignStats] = useState<CampaignStats[]>([]);
  const [segmentPerformance, setSegmentPerformance] = useState<any[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<any[]>([]);

  // Colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Simular carga de datos
      // En producción, reemplazar con llamadas API reales
      
      // Overview Metrics
      setOverviewMetrics([
        {
          title: 'Total Sent',
          value: '125,847',
          change: 12.5,
          icon: <EmailIcon />,
          color: '#0088FE'
        },
        {
          title: 'Open Rate',
          value: '24.3%',
          change: 3.2,
          icon: <OpenIcon />,
          color: '#00C49F'
        },
        {
          title: 'Click Rate',
          value: '4.8%',
          change: 1.5,
          icon: <ClickIcon />,
          color: '#FFBB28'
        },
        {
          title: 'Bounce Rate',
          value: '1.2%',
          change: -0.3,
          icon: <BounceIcon />,
          color: '#FF8042'
        },
        {
          title: 'Unsubscribe Rate',
          value: '0.5%',
          change: -0.1,
          icon: <UnsubscribeIcon />,
          color: '#8884D8'
        },
        {
          title: 'Total Revenue',
          value: '$45,892',
          change: 18.7,
          icon: <TrendingUpIcon />,
          color: '#00C49F'
        }
      ]);

      // Time Series Data
      const mockTimeSeries: TimeSeriesData[] = [];
      for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        mockTimeSeries.push({
          date: date.toISOString().split('T')[0],
          sent: Math.floor(Math.random() * 5000) + 3000,
          opened: Math.floor(Math.random() * 1200) + 800,
          clicked: Math.floor(Math.random() * 200) + 100,
          revenue: Math.floor(Math.random() * 2000) + 1000
        });
      }
      setTimeSeriesData(mockTimeSeries);

      // Campaign Stats
      const mockCampaigns: CampaignStats[] = [
        {
          id: 1,
          name: 'Summer Vacation Sale',
          sent: 15420,
          delivered: 15287,
          opened: 4215,
          clicked: 892,
          bounced: 133,
          unsubscribed: 45,
          open_rate: 27.6,
          click_rate: 5.8,
          bounce_rate: 0.9,
          unsubscribe_rate: 0.3,
          revenue: 12450,
          sent_at: '2024-06-15T10:00:00Z'
        },
        {
          id: 2,
          name: 'Newsletter June 2024',
          sent: 28934,
          delivered: 28567,
          opened: 6890,
          clicked: 1245,
          bounced: 367,
          unsubscribed: 89,
          open_rate: 24.1,
          click_rate: 4.3,
          bounce_rate: 1.3,
          unsubscribe_rate: 0.3,
          revenue: 8920,
          sent_at: '2024-06-10T09:00:00Z'
        },
        {
          id: 3,
          name: 'Abandoned Cart Recovery',
          sent: 5678,
          delivered: 5621,
          opened: 1893,
          clicked: 567,
          bounced: 57,
          unsubscribed: 12,
          open_rate: 33.7,
          click_rate: 10.0,
          bounce_rate: 1.0,
          unsubscribe_rate: 0.2,
          revenue: 15680,
          sent_at: '2024-06-12T14:30:00Z'
        }
      ];
      setCampaignStats(mockCampaigns);

      // Segment Performance
      setSegmentPerformance([
        { name: 'VIP Customers', value: 35 },
        { name: 'Loyal Fans', value: 28 },
        { name: 'Recent Customers', value: 22 },
        { name: 'At Risk', value: 10 },
        { name: 'Others', value: 5 }
      ]);

      // Device Breakdown
      setDeviceBreakdown([
        { name: 'Desktop', value: 45, opens: 12500 },
        { name: 'Mobile', value: 42, opens: 11700 },
        { name: 'Tablet', value: 10, opens: 2800 },
        { name: 'Other', value: 3, opens: 840 }
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setLoading(false);
    }
  };

  const handleExportClick = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExport = (format: 'pdf' | 'excel' | 'json') => {
    console.log(`Exporting as ${format}...`);
    // Implementar lógica de exportación
    handleExportClose();
  };

  const renderMetricCard = (metric: MetricCard) => (
    <Grid item xs={12} sm={6} md={4} lg={2} key={metric.title}>
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: `${metric.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: metric.color
              }}
            >
              {metric.icon}
            </Box>
            {metric.change > 0 ? (
              <Chip
                icon={<TrendingUpIcon />}
                label={`+${metric.change}%`}
                color="success"
                size="small"
              />
            ) : (
              <Chip
                icon={<TrendingDownIcon />}
                label={`${metric.change}%`}
                color="error"
                size="small"
              />
            )}
          </Box>
          <Typography variant="h4" sx={{ mt: 2, fontWeight: 'bold' }}>
            {metric.value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {metric.title}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );

  const renderOverviewTab = () => (
    <Box>
      {/* Time Series Chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Email Performance Over Time
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeSeriesData}>
              <defs>
                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0088FE" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#0088FE" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00C49F" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#00C49F" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="sent"
                stroke="#0088FE"
                fillOpacity={1}
                fill="url(#colorSent)"
                name="Sent"
              />
              <Area
                type="monotone"
                dataKey="opened"
                stroke="#00C49F"
                fillOpacity={1}
                fill="url(#colorOpened)"
                name="Opened"
              />
              <Area
                type="monotone"
                dataKey="clicked"
                stroke="#FFBB28"
                fill="#FFBB28"
                name="Clicked"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Device & Segment Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Device Breakdown
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={deviceBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {deviceBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Segment Performance
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={segmentPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderCampaignsTab = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Campaign Performance
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Campaign</TableCell>
                <TableCell align="right">Sent</TableCell>
                <TableCell align="right">Open Rate</TableCell>
                <TableCell align="right">Click Rate</TableCell>
                <TableCell align="right">Bounce Rate</TableCell>
                <TableCell align="right">Revenue</TableCell>
                <TableCell align="right">Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaignStats.map((campaign) => (
                <TableRow key={campaign.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {campaign.name}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{campaign.sent.toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${campaign.open_rate}%`}
                      color={campaign.open_rate > 25 ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${campaign.click_rate}%`}
                      color={campaign.click_rate > 5 ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${campaign.bounce_rate}%`}
                      color={campaign.bounce_rate < 2 ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="medium" color="success.main">
                      ${campaign.revenue.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {new Date(campaign.sent_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          📊 Email Marketing Analytics
        </Typography>
        <Box display="flex" gap={2}>
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            size="small"
          >
            <MenuItem value="7d">Last 7 days</MenuItem>
            <MenuItem value="30d">Last 30 days</MenuItem>
            <MenuItem value="90d">Last 90 days</MenuItem>
            <MenuItem value="1y">Last year</MenuItem>
          </Select>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportClick}
          >
            Export
          </Button>
          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={handleExportClose}
          >
            <MenuItem onClick={() => handleExport('pdf')}>
              <ListItemIcon><PdfIcon /></ListItemIcon>
              <ListItemText>Export as PDF</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleExport('excel')}>
              <ListItemIcon><ExcelIcon /></ListItemIcon>
              <ListItemText>Export as Excel</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleExport('json')}>
              <ListItemIcon><JsonIcon /></ListItemIcon>
              <ListItemText>Export as JSON</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Metrics Cards */}
      <Grid container spacing={2} mb={3}>
        {overviewMetrics.map(renderMetricCard)}
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Overview" />
          <Tab label="Campaigns" />
          <Tab label="Segments" />
          <Tab label="Automation" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabValue === 0 && renderOverviewTab()}
      {tabValue === 1 && renderCampaignsTab()}
      {tabValue === 2 && (
        <Alert severity="info">
          Segment analytics coming soon
        </Alert>
      )}
      {tabValue === 3 && (
        <Alert severity="info">
          Automation analytics coming soon
        </Alert>
      )}
    </Box>
  );
};

export default AnalyticsDashboard;
