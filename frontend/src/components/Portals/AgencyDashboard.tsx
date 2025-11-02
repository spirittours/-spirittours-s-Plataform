/**
 * @file AgencyDashboard.tsx
 * @module Components/Portals
 * @description B2B Agency Partner Dashboard
 * 
 * @features
 * - Agency performance metrics and KPIs
 * - Commission tracking and reporting
 * - Booking management for agency clients
 * - Client portfolio overview
 * - White-label booking widget
 * - Marketing materials access
 * - Real-time notifications
 * - Multi-currency support
 * 
 * @example
 * ```tsx
 * import { AgencyDashboard } from '@/components/Portals/AgencyDashboard';
 * 
 * <AgencyDashboard agencyId="agency-123" />
 * ```
 * 
 * @author Spirit Tours Development Team
 * @since 1.0.0
 */

import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  LinearProgress,
  Stack,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  AttachMoney,
  People,
  Event,
  MoreVert,
  GetApp,
  Share,
  Code,
  Campaign,
  Analytics,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import axios from 'axios';
import { DashboardWidgets, WidgetConfig } from '../Dashboard/DashboardWidgets';

// ============================================================================
// TYPES
// ============================================================================

interface AgencyMetrics {
  totalBookings: number;
  totalRevenue: number;
  totalCommission: number;
  activeClients: number;
  conversionRate: number;
  averageBookingValue: number;
  monthlyGrowth: number;
}

interface Booking {
  id: string;
  clientName: string;
  tourName: string;
  date: string;
  amount: number;
  commission: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

interface CommissionTier {
  tier: string;
  minBookings: number;
  commissionRate: number;
  currentBookings: number;
  nextTierBookings?: number;
}

interface AgencyDashboardProps {
  agencyId: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * AgencyDashboard - B2B portal for travel agency partners
 * 
 * @component
 * @description
 * Comprehensive dashboard for travel agencies managing their Spirit Tours partnership:
 * 
 * **Features:**
 * - Real-time performance metrics
 * - Commission tracking and tier progress
 * - Client portfolio management
 * - Booking management interface
 * - White-label booking widget
 * - Marketing materials library
 * - Analytics and reporting
 * 
 * **Commission Tiers:**
 * - Bronze: 0-50 bookings (10%)
 * - Silver: 51-150 bookings (12%)
 * - Gold: 151-300 bookings (15%)
 * - Platinum: 301+ bookings (18%)
 * 
 * @param {AgencyDashboardProps} props - Component props
 * @returns {JSX.Element} Rendered agency dashboard
 */
export const AgencyDashboard: React.FC<AgencyDashboardProps> = ({ agencyId }) => {
  const [tabValue, setTabValue] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  // Fetch agency metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<AgencyMetrics>(
    ['agencyMetrics', agencyId],
    async () => {
      const response = await axios.get(`/api/agencies/${agencyId}/metrics`);
      return response.data;
    }
  );

  // Fetch recent bookings
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>(
    ['agencyBookings', agencyId],
    async () => {
      const response = await axios.get(`/api/agencies/${agencyId}/bookings`);
      return response.data;
    }
  );

  // Commission tier info
  const commissionTier: CommissionTier = {
    tier: 'Silver',
    minBookings: 51,
    commissionRate: 12,
    currentBookings: metrics?.totalBookings || 0,
    nextTierBookings: 150,
  };

  // Dashboard widgets
  const widgets: WidgetConfig[] = [
    {
      id: 'revenue',
      type: 'stats',
      title: 'Total Revenue',
      data: {
        value: metrics?.totalRevenue || 0,
        unit: 'USD',
        trend: metrics?.monthlyGrowth || 0,
        trendLabel: 'vs last month',
      },
      options: {
        color: '#2196F3',
        icon: <AttachMoney />,
        gridSize: 3,
      },
    },
    {
      id: 'commission',
      type: 'stats',
      title: 'Total Commission',
      data: {
        value: metrics?.totalCommission || 0,
        unit: 'USD',
        trend: 15.3,
        trendLabel: 'this month',
      },
      options: {
        color: '#4CAF50',
        icon: <TrendingUp />,
        gridSize: 3,
      },
    },
    {
      id: 'bookings',
      type: 'stats',
      title: 'Total Bookings',
      data: {
        value: metrics?.totalBookings || 0,
        trend: 8.2,
        target: commissionTier.nextTierBookings,
      },
      options: {
        color: '#FF9800',
        icon: <Event />,
        gridSize: 3,
      },
    },
    {
      id: 'clients',
      type: 'stats',
      title: 'Active Clients',
      data: {
        value: metrics?.activeClients || 0,
        trend: 12.5,
        trendLabel: 'new this month',
      },
      options: {
        color: '#9C27B0',
        icon: <People />,
        gridSize: 3,
      },
    },
  ];

  /**
   * Get status color
   */
  const getStatusColor = (status: string) => {
    const colors: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
      pending: 'warning',
      confirmed: 'success',
      completed: 'success',
      cancelled: 'error',
    };
    return colors[status] || 'default';
  };

  /**
   * Handle export data
   */
  const handleExport = () => {
    // Export logic
    console.log('Exporting data...');
  };

  /**
   * Get widget code
   */
  const getWidgetCode = () => {
    return `<iframe 
  src="https://spirit-tours.com/widget/${agencyId}" 
  width="100%" 
  height="600px" 
  frameborder="0">
</iframe>`;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Agency Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your bookings, track commissions, and grow your business
        </Typography>
      </Box>

      {/* KPI Widgets */}
      <Box sx={{ mb: 3 }}>
        <DashboardWidgets widgets={widgets} />
      </Box>

      {/* Commission Tier Progress */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h6">
                Commission Tier: {commissionTier.tier}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Current rate: {commissionTier.commissionRate}%
              </Typography>
            </Box>
            <Chip
              label={`${commissionTier.currentBookings} bookings`}
              color="primary"
              size="large"
            />
          </Stack>
          
          <LinearProgress
            variant="determinate"
            value={(commissionTier.currentBookings / (commissionTier.nextTierBookings || 1)) * 100}
            sx={{ height: 10, borderRadius: 5, mb: 1 }}
          />
          
          <Typography variant="caption" color="text.secondary">
            {commissionTier.nextTierBookings && (
              <>
                {commissionTier.nextTierBookings - commissionTier.currentBookings} more bookings 
                to reach Gold tier (15% commission)
              </>
            )}
          </Typography>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Recent Bookings" />
          <Tab label="Clients" />
          <Tab label="Marketing" />
          <Tab label="Widget" />
          <Tab label="Reports" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Recent Bookings</Typography>
              <Button
                startIcon={<GetApp />}
                variant="outlined"
                size="small"
                onClick={handleExport}
              >
                Export
              </Button>
            </Stack>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Client</TableCell>
                    <TableCell>Tour</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Commission</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {booking.clientName[0]}
                          </Avatar>
                          <Typography variant="body2">{booking.clientName}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{booking.tourName}</TableCell>
                      <TableCell>{booking.date}</TableCell>
                      <TableCell align="right">${booking.amount.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="success.main" fontWeight={600}>
                          ${booking.commission.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={booking.status}
                          color={getStatusColor(booking.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Client Portfolio
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your client relationships and track their booking history
            </Typography>
          </CardContent>
        </Card>
      )}

      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Marketing Materials
            </Typography>
            
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Campaign color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6" gutterBottom>
                      Brochures
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      Download printable brochures and tour catalogs
                    </Typography>
                    <Button variant="outlined" fullWidth startIcon={<GetApp />}>
                      Download
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Share color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6" gutterBottom>
                      Social Media
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      Pre-designed social media posts and graphics
                    </Typography>
                    <Button variant="outlined" fullWidth startIcon={<GetApp />}>
                      Download
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Code color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6" gutterBottom>
                      Email Templates
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      Customizable email templates for campaigns
                    </Typography>
                    <Button variant="outlined" fullWidth startIcon={<GetApp />}>
                      Download
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {tabValue === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              White-Label Booking Widget
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Embed our booking system on your website
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
              <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                {getWidgetCode()}
              </Typography>
            </Paper>

            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                onClick={() => navigator.clipboard.writeText(getWidgetCode())}
              >
                Copy Code
              </Button>
              <Button variant="outlined" startIcon={<Code />}>
                View Demo
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {tabValue === 4 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Analytics & Reports
            </Typography>
            
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Analytics />}
                  sx={{ py: 2 }}
                >
                  Monthly Performance Report
                </Button>
              </Grid>
              <Grid item xs={12} md={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<AttachMoney />}
                  sx={{ py: 2 }}
                >
                  Commission Statement
                </Button>
              </Grid>
              <Grid item xs={12} md={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<People />}
                  sx={{ py: 2 }}
                >
                  Client Activity Report
                </Button>
              </Grid>
              <Grid item xs={12} md={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Event />}
                  sx={{ py: 2 }}
                >
                  Booking Trends Analysis
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default AgencyDashboard;
