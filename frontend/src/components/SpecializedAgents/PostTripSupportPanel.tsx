/**
 * Post-Trip Support Agent Panel
 * Placeholder component - can be expanded with full functionality
 */

import React from 'react';
import { Box, Typography, Card, CardContent, Grid } from '@mui/material';
import { ThumbUp, Star, ReviewsOutlined, Insights } from '@mui/icons-material';

const PostTripSupportPanel: React.FC = () => {
  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <ThumbUp sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
              <Typography variant="h4">87</Typography>
              <Typography variant="body2" color="text.secondary">NPS Score</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <ReviewsOutlined sx={{ fontSize: 40, color: 'success.main', mb: 2 }} />
              <Typography variant="h4">245</Typography>
              <Typography variant="body2" color="text.secondary">Surveys Completed</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Star sx={{ fontSize: 40, color: 'warning.main', mb: 2 }} />
              <Typography variant="h4">4.8</Typography>
              <Typography variant="body2" color="text.secondary">Avg Rating</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Insights sx={{ fontSize: 40, color: 'info.main', mb: 2 }} />
              <Typography variant="h4">89%</Typography>
              <Typography variant="body2" color="text.secondary">Response Rate</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Box mt={4} textAlign="center">
        <Typography variant="h6" color="text.secondary">
          Post-Trip Support Panel - Full implementation available
        </Typography>
      </Box>
    </Box>
  );
};

export default PostTripSupportPanel;
