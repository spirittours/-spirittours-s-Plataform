/**
 * Posts Panel Component
 * Placeholder for social media posts management
 */

import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const PostsPanel: React.FC = () => {
  return (
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h5" gutterBottom>
        📝 Publications Management
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Create, schedule, and manage your social media posts across all platforms.
      </Typography>
      <Button variant="contained" startIcon={<AddIcon />} sx={{ mt: 2 }}>
        Create New Post
      </Button>
      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2 }}>
        Coming soon: AI-powered content generation, scheduling, and multi-platform publishing
      </Typography>
    </Paper>
  );
};

export default PostsPanel;
