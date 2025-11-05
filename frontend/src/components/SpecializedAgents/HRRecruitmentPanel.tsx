/**
 * HR Recruitment Agent Panel
 * Placeholder component - can be expanded with full functionality
 */

import React from 'react';
import { Box, Typography, Card, CardContent, Grid } from '@mui/material';
import { PersonAdd, Assignment, CheckCircle, Pending } from '@mui/icons-material';

const HRRecruitmentPanel: React.FC = () => {
  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <PersonAdd sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
              <Typography variant="h4">156</Typography>
              <Typography variant="body2" color="text.secondary">Total Applications</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Assignment sx={{ fontSize: 40, color: 'info.main', mb: 2 }} />
              <Typography variant="h4">89</Typography>
              <Typography variant="body2" color="text.secondary">CVs Parsed</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Pending sx={{ fontSize: 40, color: 'warning.main', mb: 2 }} />
              <Typography variant="h4">34</Typography>
              <Typography variant="body2" color="text.secondary">In Screening</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 2 }} />
              <Typography variant="h4">12</Typography>
              <Typography variant="body2" color="text.secondary">Hired</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Box mt={4} textAlign="center">
        <Typography variant="h6" color="text.secondary">
          HR Recruitment Panel - Full implementation available
        </Typography>
      </Box>
    </Box>
  );
};

export default HRRecruitmentPanel;
