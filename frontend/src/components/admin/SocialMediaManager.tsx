/**
 * Social Media Manager - Admin Dashboard
 * 
 * Main component for managing social media platform credentials
 * Displays platform cards with connection status and configuration options
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Paper,
  Snackbar
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// Import sub-components
import PlatformCard from './SocialMedia/PlatformCard';
import CredentialsDialog from './SocialMedia/CredentialsDialog';
import PostsPanel from './SocialMedia/PostsPanel';
import InteractionsPanel from './SocialMedia/InteractionsPanel';
import AnalyticsPanel from './SocialMedia/AnalyticsPanel';
import AIConfigPanel from './SocialMedia/AIConfigPanel';
import AIContentGenerator from './AIContentGenerator';

// Import new dashboard components
import SchedulerDashboard from './Scheduler/SchedulerDashboard';
import AnalyticsDashboard from './Analytics/AnalyticsDashboard';
import SentimentViewer from './Sentiment/SentimentViewer';

// Types
interface PlatformStatus {
  platform: string;
  platform_display_name: string;
  is_active: boolean;
  is_connected: boolean;
  connection_status: string;
  last_connection_test: string | null;
  account_name: string | null;
  account_username: string | null;
  error_message: string | null;
  token_expires_at: string | null;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

// API functions
const api = {
  getPlatformsStatus: async (): Promise<PlatformStatus[]> => {
    const response = await axios.get('/api/admin/social-media/credentials/status');
    return response.data;
  },
  
  testConnection: async (platform: string) => {
    const response = await axios.post(`/api/admin/social-media/credentials/${platform}/test`);
    return response.data;
  },
  
  togglePlatform: async ({ platform, isActive }: { platform: string; isActive: boolean }) => {
    const response = await axios.put(
      `/api/admin/social-media/credentials/${platform}/toggle?is_active=${isActive}`
    );
    return response.data;
  },
  
  deletePlatform: async (platform: string) => {
    const response = await axios.delete(`/api/admin/social-media/credentials/${platform}`);
    return response.data;
  }
};

/**
 * Main Social Media Manager Component
 */
const SocialMediaManager: React.FC = () => {
  const queryClient = useQueryClient();
  
  // State
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [credentialsDialog, setCredentialsDialog] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Fetch platforms status
  const {
    data: platforms,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['platforms-status'],
    queryFn: api.getPlatformsStatus,
    refetchInterval: 30000 // Refetch every 30 seconds
  });
  
  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: api.testConnection,
    onSuccess: (data, platform) => {
      if (data.connected) {
        showSnackbar(`✅ Successfully connected to ${platform}!`, 'success');
      } else {
        showSnackbar(`❌ Connection failed: ${data.error}`, 'error');
      }
      queryClient.invalidateQueries({ queryKey: ['platforms-status'] });
    },
    onError: (error: any, platform) => {
      showSnackbar(`❌ Connection test failed for ${platform}`, 'error');
    }
  });
  
  // Toggle platform mutation
  const togglePlatformMutation = useMutation({
    mutationFn: api.togglePlatform,
    onSuccess: (data) => {
      const action = data.is_active ? 'enabled' : 'disabled';
      showSnackbar(`✅ Platform ${action} successfully`, 'success');
      queryClient.invalidateQueries({ queryKey: ['platforms-status'] });
    },
    onError: () => {
      showSnackbar('❌ Failed to toggle platform', 'error');
    }
  });
  
  // Delete platform mutation
  const deletePlatformMutation = useMutation({
    mutationFn: api.deletePlatform,
    onSuccess: (data) => {
      showSnackbar(`✅ ${data.message}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['platforms-status'] });
    },
    onError: () => {
      showSnackbar('❌ Failed to delete credentials', 'error');
    }
  });
  
  // Handlers
  const handleAddCredentials = (platform: string) => {
    setSelectedPlatform(platform);
    setCredentialsDialog(true);
  };
  
  const handleEditCredentials = (platform: string) => {
    setSelectedPlatform(platform);
    setCredentialsDialog(true);
  };
  
  const handleTestConnection = async (platform: string) => {
    testConnectionMutation.mutate(platform);
  };
  
  const handleTogglePlatform = (platform: string, isActive: boolean) => {
    togglePlatformMutation.mutate({ platform, isActive });
  };
  
  const handleDeleteCredentials = (platform: string) => {
    if (window.confirm(`Are you sure you want to delete credentials for ${platform}? This action cannot be undone.`)) {
      deletePlatformMutation.mutate(platform);
    }
  };
  
  const handleCredentialsSaved = () => {
    setCredentialsDialog(false);
    setSelectedPlatform(null);
    queryClient.invalidateQueries({ queryKey: ['platforms-status'] });
    showSnackbar('✅ Credentials saved successfully', 'success');
  };
  
  const showSnackbar = (message: string, severity: SnackbarState['severity']) => {
    setSnackbar({ open: true, message, severity });
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Loading state
  if (isLoading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Container>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">
          Failed to load platforms status. Please try again later.
        </Alert>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          🌐 Social Media Management with AI
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage all your social media platforms from one centralized dashboard
        </Typography>
      </Box>
      
      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        💡 <strong>Tip:</strong> All credentials are encrypted with Fernet encryption. 
        Test connections after adding credentials to ensure they work properly.
      </Alert>
      
      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(e, v) => setCurrentTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Platforms" />
          <Tab label="🤖 AI Content" />
          <Tab label="📅 Scheduler" />
          <Tab label="📊 Analytics" />
          <Tab label="💭 Sentiment" />
          <Tab label="Publications" />
          <Tab label="Interactions" />
          <Tab label="Old Analytics" />
          <Tab label="AI Configuration" />
        </Tabs>
      </Paper>
      
      {/* Tab Content */}
      <Box>
        {/* Platforms Tab */}
        {currentTab === 0 && (
          <Grid container spacing={3}>
            {platforms?.map((platform) => (
              <Grid item xs={12} sm={6} md={4} key={platform.platform}>
                <PlatformCard
                  platform={platform}
                  onAddCredentials={() => handleAddCredentials(platform.platform)}
                  onEditCredentials={() => handleEditCredentials(platform.platform)}
                  onTestConnection={() => handleTestConnection(platform.platform)}
                  onToggle={(isActive) => handleTogglePlatform(platform.platform, isActive)}
                  onDelete={() => handleDeleteCredentials(platform.platform)}
                  isTestingConnection={testConnectionMutation.isPending}
                />
              </Grid>
            ))}
          </Grid>
        )}
        
        {/* AI Content Generator Tab */}
        {currentTab === 1 && <AIContentGenerator />}
        
        {/* Scheduler Tab - NEW */}
        {currentTab === 2 && <SchedulerDashboard />}
        
        {/* Analytics Dashboard Tab - NEW */}
        {currentTab === 3 && <AnalyticsDashboard />}
        
        {/* Sentiment Viewer Tab - NEW */}
        {currentTab === 4 && <SentimentViewer />}
        
        {/* Publications Tab */}
        {currentTab === 5 && <PostsPanel />}
        
        {/* Interactions Tab */}
        {currentTab === 6 && <InteractionsPanel />}
        
        {/* Old Analytics Tab */}
        {currentTab === 7 && <AnalyticsPanel />}
        
        {/* AI Configuration Tab */}
        {currentTab === 8 && <AIConfigPanel />}
      </Box>
      
      {/* Credentials Dialog */}
      <CredentialsDialog
        open={credentialsDialog}
        platform={selectedPlatform}
        onClose={() => {
          setCredentialsDialog(false);
          setSelectedPlatform(null);
        }}
        onSave={handleCredentialsSaved}
      />
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SocialMediaManager;
