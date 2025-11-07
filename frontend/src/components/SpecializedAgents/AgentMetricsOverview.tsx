/**
 * Agent Metrics Overview
 * Summary metrics for all specialized agents
 */

import React from 'react';
import { Grid, Card, CardContent, Typography, Box, LinearProgress } from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';

interface AgentStats {
  travelPreferences: { analyzed: number; confidence: number };
  postTrip: { surveys: number; nps: number };
  hrRecruitment: { applications: number; screened: number };
  customerFollowup: { interactions: number; engagement: number };
  employeeAnalytics: { tracked: number; performance: number };
}

interface Props {
  stats: AgentStats;
}

const AgentMetricsOverview: React.FC<Props> = ({ stats }) => {
  const metrics = [
    {
      title: 'Travel Analysis',
      value: stats.travelPreferences.analyzed,
      subValue: `${stats.travelPreferences.confidence}% confidence`,
      trend: 'up',
      color: '#4CAF50'
    },
    {
      title: 'NPS Score',
      value: stats.postTrip.nps || 0,
      subValue: `${stats.postTrip.surveys} surveys`,
      trend: stats.postTrip.nps >= 50 ? 'up' : 'down',
      color: '#2196F3'
    },
    {
      title: 'Applications',
      value: stats.hrRecruitment.applications,
      subValue: `${stats.hrRecruitment.screened} screened`,
      trend: 'up',
      color: '#FF9800'
    },
    {
      title: 'Engagement',
      value: `${stats.customerFollowup.engagement}%`,
      subValue: `${stats.customerFollowup.interactions} interactions`,
      trend: stats.customerFollowup.engagement >= 60 ? 'up' : 'flat',
      color: '#9C27B0'
    },
    {
      title: 'Performance',
      value: stats.employeeAnalytics.performance || 0,
      subValue: `${stats.employeeAnalytics.tracked} employees`,
      trend: stats.employeeAnalytics.performance >= 75 ? 'up' : 'flat',
      color: '#F44336'
    }
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp sx={{ color: 'success.main' }} />;
      case 'down':
        return <TrendingDown sx={{ color: 'error.main' }} />;
      default:
        return <TrendingFlat sx={{ color: 'warning.main' }} />;
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Agent Performance Overview
        </Typography>
        <Grid container spacing={3}>
          {metrics.map((metric, index) => (
            <Grid item xs={12} sm={6} md={2.4} key={index}>
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    {metric.title}
                  </Typography>
                  {getTrendIcon(metric.trend)}
                </Box>
                <Typography variant="h4" fontWeight="bold" sx={{ color: metric.color }}>
                  {metric.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {metric.subValue}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={typeof metric.value === 'number' ? Math.min(metric.value, 100) : 70}
                  sx={{ mt: 1, height: 4, borderRadius: 2, backgroundColor: 'grey.200' }}
                  style={{ backgroundColor: `${metric.color}20` }}
                />
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default AgentMetricsOverview;
