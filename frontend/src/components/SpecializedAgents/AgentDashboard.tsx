/**
 * Specialized Agents Dashboard
 * Main dashboard for managing all 5 specialized AI agents
 */

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Tabs, 
  Tab,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Psychology as PsychologyIcon,
  ThumbUp as ThumbUpIcon,
  Work as WorkIcon,
  PersonAdd as PersonAddIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';

import TravelPreferencesPanel from './TravelPreferencesPanel';
import PostTripSupportPanel from './PostTripSupportPanel';
import HRRecruitmentPanel from './HRRecruitmentPanel';
import CustomerFollowupPanel from './CustomerFollowupPanel';
import EmployeeAnalyticsPanel from './EmployeeAnalyticsPanel';
import AgentMetricsOverview from './AgentMetricsOverview';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`agent-tabpanel-${index}`}
      aria-labelledby={`agent-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AgentDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentStats, setAgentStats] = useState({
    travelPreferences: { analyzed: 0, confidence: 0 },
    postTrip: { surveys: 0, nps: 0 },
    hrRecruitment: { applications: 0, screened: 0 },
    customerFollowup: { interactions: 0, engagement: 0 },
    employeeAnalytics: { tracked: 0, performance: 0 }
  });

  useEffect(() => {
    fetchAgentStats();
  }, []);

  const fetchAgentStats = async () => {
    try {
      setLoading(true);
      // Fetch stats from all agents
      const [travel, postTrip, hr, followup, analytics] = await Promise.all([
        fetch('/api/agents/workspace123/travel-preferences/stats'),
        fetch('/api/agents/workspace123/post-trip/stats'),
        fetch('/api/agents/workspace123/hr/stats'),
        fetch('/api/agents/workspace123/followup/stats'),
        fetch('/api/agents/workspace123/analytics/stats')
      ]);

      const stats = {
        travelPreferences: await travel.json(),
        postTrip: await postTrip.json(),
        hrRecruitment: await hr.json(),
        customerFollowup: await followup.json(),
        employeeAnalytics: await analytics.json()
      };

      setAgentStats(stats);
      setError(null);
    } catch (err) {
      setError('Failed to load agent statistics');
      console.error('Error fetching agent stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const agentCards = [
    {
      title: 'Travel Preferences',
      icon: <TrendingUpIcon fontSize="large" />,
      color: '#4CAF50',
      stats: agentStats.travelPreferences,
      description: 'Analyze booking patterns and recommend personalized packages'
    },
    {
      title: 'Post-Trip Support',
      icon: <ThumbUpIcon fontSize="large" />,
      color: '#2196F3',
      stats: agentStats.postTrip,
      description: 'Survey management, NPS tracking, and review collection'
    },
    {
      title: 'HR Recruitment',
      icon: <PersonAddIcon fontSize="large" />,
      color: '#FF9800',
      stats: agentStats.hrRecruitment,
      description: 'CV parsing, candidate screening, and interview automation'
    },
    {
      title: 'Customer Follow-up',
      icon: <WorkIcon fontSize="large" />,
      color: '#9C27B0',
      stats: agentStats.customerFollowup,
      description: 'Interaction tracking, engagement scoring, and checklist management'
    },
    {
      title: 'Employee Analytics',
      icon: <AnalyticsIcon fontSize="large" />,
      color: '#F44336',
      stats: agentStats.employeeAnalytics,
      description: 'Comprehensive performance tracking and insights'
    }
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Specialized AI Agents Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage and monitor your 5 specialized AI agents
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Agent Cards Overview */}
      <Grid container spacing={3} mb={4}>
        {agentCards.map((agent, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                },
                borderTop: `4px solid ${agent.color}`
              }}
              onClick={() => setActiveTab(index)}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box sx={{ color: agent.color }}>
                    {agent.icon}
                  </Box>
                  <Typography variant="h5" fontWeight="bold">
                    {Object.values(agent.stats)[0] || 0}
                  </Typography>
                </Box>
                <Typography variant="h6" gutterBottom>
                  {agent.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {agent.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Metrics Overview */}
      <AgentMetricsOverview stats={agentStats} />

      {/* Agent Tabs */}
      <Card sx={{ mt: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Travel Preferences" />
            <Tab label="Post-Trip Support" />
            <Tab label="HR Recruitment" />
            <Tab label="Customer Follow-up" />
            <Tab label="Employee Analytics" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <TravelPreferencesPanel />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <PostTripSupportPanel />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <HRRecruitmentPanel />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <CustomerFollowupPanel />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <EmployeeAnalyticsPanel />
        </TabPanel>
      </Card>
    </Box>
  );
};

export default AgentDashboard;
