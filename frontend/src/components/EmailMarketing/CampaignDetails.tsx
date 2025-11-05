/**
 * Campaign Details Component - SPRINT 2.2
 * 
 * Displays detailed information about an email campaign with integrated CommentThread
 * for team collaboration on campaign strategy, results analysis, and optimization.
 * 
 * Features:
 * - Campaign overview with key metrics
 * - Performance analytics
 * - Recipient list management
 * - Team comments and collaboration (NEW - Sprint 2.2)
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  Chip,
  Stack,
  Divider,
  Paper,
  Tabs,
  Tab,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Email as EmailIcon,
  Send as SendIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  Visibility as VisibilityIcon,
  TouchApp as TouchAppIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import CommentThread from '../crm/CommentThread';
import AIAssistantButton from '../shared/AIAssistantButton';

interface Campaign {
  _id: string;
  name: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  totalRecipients: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  deliveryRate: number;
  scheduledAt?: Date;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
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

const CampaignDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  const fetchCampaign = async () => {
    try {
      // In production, replace with actual API call
      // const response = await fetch(`/api/email-campaigns/${id}`);
      // const data = await response.json();
      // setCampaign(data.campaign);
      
      // Mock data for demonstration
      setCampaign({
        _id: id || '',
        name: 'Summer Destinations 2024',
        subject: '🏖️ Discover Amazing Summer Destinations - Special Offers Inside!',
        status: 'sent',
        totalRecipients: 15000,
        sent: 15000,
        delivered: 14850,
        opened: 7425,
        clicked: 1485,
        bounced: 150,
        unsubscribed: 45,
        openRate: 50,
        clickRate: 10,
        deliveryRate: 99,
        sentAt: new Date('2024-06-01'),
        createdAt: new Date('2024-05-25'),
        updatedAt: new Date('2024-06-01'),
      });
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'success';
      case 'scheduled':
        return 'info';
      case 'draft':
        return 'default';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (!campaign) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Campaign not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <IconButton onClick={() => navigate('/email-campaigns')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            {campaign.name}
          </Typography>
          <Chip label={campaign.status.toUpperCase()} color={getStatusColor(campaign.status)} />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {campaign.subject}
        </Typography>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Recipients
                  </Typography>
                  <Typography variant="h4">{campaign.totalRecipients.toLocaleString()}</Typography>
                </Box>
                <PeopleIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.5 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Open Rate
                  </Typography>
                  <Typography variant="h4">{campaign.openRate}%</Typography>
                  <Typography variant="caption" color="success.main">
                    {campaign.opened.toLocaleString()} opens
                  </Typography>
                </Box>
                <VisibilityIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.5 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Click Rate
                  </Typography>
                  <Typography variant="h4">{campaign.clickRate}%</Typography>
                  <Typography variant="caption" color="info.main">
                    {campaign.clicked.toLocaleString()} clicks
                  </Typography>
                </Box>
                <TouchAppIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.5 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Delivery Rate
                  </Typography>
                  <Typography variant="h4">{campaign.deliveryRate}%</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {campaign.delivered.toLocaleString()} delivered
                  </Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.5 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content with Tabs */}
      <Card>
        <CardContent>
          <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
            <Tab label="Overview" />
            <Tab label="Performance" />
            <Tab label="Recipients" />
            <Tab label="Comments" />
          </Tabs>

          {/* Overview Tab */}
          <TabPanel value={activeTab} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    Campaign Information
                  </Typography>
                  <Stack spacing={1.5} sx={{ mt: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Campaign Name
                      </Typography>
                      <Typography variant="body2">{campaign.name}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Subject Line
                      </Typography>
                      <Typography variant="body2">{campaign.subject}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Status
                      </Typography>
                      <Box>
                        <Chip
                          label={campaign.status.toUpperCase()}
                          size="small"
                          color={getStatusColor(campaign.status)}
                        />
                      </Box>
                    </Box>
                    {campaign.sentAt && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Sent At
                        </Typography>
                        <Typography variant="body2">
                          {new Date(campaign.sentAt).toLocaleString()}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    Engagement Summary
                  </Typography>
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <Box>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2">Delivered</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {campaign.deliveryRate}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={campaign.deliveryRate}
                        color="success"
                      />
                    </Box>
                    <Box>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2">Opened</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {campaign.openRate}%
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={campaign.openRate} />
                    </Box>
                    <Box>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2">Clicked</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {campaign.clickRate}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={campaign.clickRate}
                        color="info"
                      />
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Performance Tab */}
          <TabPanel value={activeTab} index={1}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Metric</TableCell>
                    <TableCell align="right">Count</TableCell>
                    <TableCell align="right">Percentage</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Sent</TableCell>
                    <TableCell align="right">{campaign.sent.toLocaleString()}</TableCell>
                    <TableCell align="right">100%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Delivered</TableCell>
                    <TableCell align="right">{campaign.delivered.toLocaleString()}</TableCell>
                    <TableCell align="right">{campaign.deliveryRate}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Opened</TableCell>
                    <TableCell align="right">{campaign.opened.toLocaleString()}</TableCell>
                    <TableCell align="right">{campaign.openRate}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Clicked</TableCell>
                    <TableCell align="right">{campaign.clicked.toLocaleString()}</TableCell>
                    <TableCell align="right">{campaign.clickRate}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Bounced</TableCell>
                    <TableCell align="right">{campaign.bounced.toLocaleString()}</TableCell>
                    <TableCell align="right">
                      {((campaign.bounced / campaign.sent) * 100).toFixed(2)}%
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Unsubscribed</TableCell>
                    <TableCell align="right">{campaign.unsubscribed.toLocaleString()}</TableCell>
                    <TableCell align="right">
                      {((campaign.unsubscribed / campaign.sent) * 100).toFixed(2)}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Recipients Tab */}
          <TabPanel value={activeTab} index={2}>
            <Alert severity="info">
              Recipient list management coming soon. This will show all recipients with their
              engagement status (opened, clicked, bounced, etc.)
            </Alert>
          </TabPanel>

          {/* Comments Tab - SPRINT 2.2 */}
          <TabPanel value={activeTab} index={3}>
            <CommentThread
              workspaceId="default"
              entityType="campaign"
              entityId={id || ''}
              showTitle={false}
            />
          </TabPanel>
        </CardContent>
      </Card>

      {/* AI Assistant Button - SPRINT 2.3 */}
      <AIAssistantButton
        module="campaign"
        entityType="email-campaign"
        entityId={id}
        contextData={{
          campaignName: campaign.name,
          subject: campaign.subject,
          status: campaign.status,
          totalRecipients: campaign.totalRecipients,
          performance: {
            openRate: campaign.openRate,
            clickRate: campaign.clickRate,
            deliveryRate: campaign.deliveryRate,
          },
          sentAt: campaign.sentAt,
        }}
        color="secondary"
      />
    </Box>
  );
};

export default CampaignDetails;
