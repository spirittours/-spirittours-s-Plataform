/**
 * Analytics Panel Component
 * Placeholder for analytics and insights
 */

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const AnalyticsPanel: React.FC = () => {
  return (
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h5" gutterBottom>
        📊 Analytics & Insights
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Track performance metrics, engagement rates, and audience growth across all platforms.
      </Typography>
      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2 }}>
        Coming soon: Real-time dashboards, engagement metrics, follower growth tracking, and AI-powered insights
      </Typography>
    </Paper>
  );
};

export default AnalyticsPanel;
