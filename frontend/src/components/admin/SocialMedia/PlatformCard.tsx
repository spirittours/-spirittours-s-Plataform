/**
 * Platform Card Component
 * 
 * Displays a social media platform with connection status,
 * account info, and action buttons
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Box,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Tooltip,
  Avatar,
  Divider,
  Stack
} from '@mui/material';
import {
  Facebook,
  Instagram,
  Twitter,
  LinkedIn,
  YouTube,
  CheckCircle,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Edit,
  Delete,
  Refresh,
  Add,
  Info as InfoIcon
} from '@mui/icons-material';

// Custom TikTok icon (Material UI doesn't have one)
const TikTokIcon = () => (
  <Box sx={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  </Box>
);

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

interface PlatformCardProps {
  platform: PlatformStatus;
  onAddCredentials: () => void;
  onEditCredentials: () => void;
  onTestConnection: () => void;
  onToggle: (isActive: boolean) => void;
  onDelete: () => void;
  isTestingConnection?: boolean;
}

const PlatformCard: React.FC<PlatformCardProps> = ({
  platform,
  onAddCredentials,
  onEditCredentials,
  onTestConnection,
  onToggle,
  onDelete,
  isTestingConnection = false
}) => {
  // Platform icons mapping
  const platformIcons: Record<string, React.ReactNode> = {
    facebook: <Facebook sx={{ fontSize: 32, color: '#1877F2' }} />,
    instagram: <Instagram sx={{ fontSize: 32, color: '#E4405F' }} />,
    twitter_x: <Twitter sx={{ fontSize: 32, color: '#1DA1F2' }} />,
    linkedin: <LinkedIn sx={{ fontSize: 32, color: '#0A66C2' }} />,
    youtube: <YouTube sx={{ fontSize: 32, color: '#FF0000' }} />,
    tiktok: <Box sx={{ color: '#000000' }}><TikTokIcon /></Box>
  };
  
  // Platform colors
  const platformColors: Record<string, string> = {
    facebook: '#1877F2',
    instagram: '#E4405F',
    twitter_x: '#1DA1F2',
    linkedin: '#0A66C2',
    youtube: '#FF0000',
    tiktok: '#000000'
  };
  
  // Connection status badge
  const getStatusBadge = () => {
    if (platform.connection_status === 'not_configured') {
      return (
        <Chip
          icon={<InfoIcon />}
          label="Not Configured"
          size="small"
          color="default"
        />
      );
    }
    
    if (platform.is_connected) {
      return (
        <Chip
          icon={<CheckCircle />}
          label="Connected"
          size="small"
          color="success"
        />
      );
    }
    
    if (platform.connection_status === 'error') {
      return (
        <Chip
          icon={<ErrorIcon />}
          label="Error"
          size="small"
          color="error"
        />
      );
    }
    
    return (
      <Chip
        icon={<WarningIcon />}
        label="Disconnected"
        size="small"
        color="warning"
      />
    );
  };
  
  // Check if token is expiring soon (within 7 days)
  const isTokenExpiringSoon = () => {
    if (!platform.token_expires_at) return false;
    
    const expiryDate = new Date(platform.token_expires_at);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };
  
  // Format last connection test time
  const formatLastTest = () => {
    if (!platform.last_connection_test) return 'Never tested';
    
    const testDate = new Date(platform.last_connection_test);
    const now = new Date();
    const diffMs = now.getTime() - testDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };
  
  const isConfigured = platform.connection_status !== 'not_configured';
  
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        border: platform.is_active ? 2 : 1,
        borderColor: platform.is_active ? platformColors[platform.platform] : 'divider',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: 6
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Header with icon and status */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {platformIcons[platform.platform]}
            <Box>
              <Typography variant="h6" component="div" fontWeight="bold">
                {platform.platform_display_name}
              </Typography>
              {getStatusBadge()}
            </Box>
          </Box>
        </Box>
        
        <Divider sx={{ my: 1.5 }} />
        
        {/* Account Information */}
        {isConfigured ? (
          <Stack spacing={1}>
            {/* Account Name */}
            {platform.account_name && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>
                  Account:
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {platform.account_name}
                </Typography>
              </Box>
            )}
            
            {/* Username */}
            {platform.account_username && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>
                  Username:
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  @{platform.account_username}
                </Typography>
              </Box>
            )}
            
            {/* Last Test */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>
                Last Test:
              </Typography>
              <Typography variant="body2">
                {formatLastTest()}
              </Typography>
            </Box>
            
            {/* Error Message */}
            {platform.error_message && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                  ⚠️ {platform.error_message}
                </Typography>
              </Box>
            )}
            
            {/* Token Expiry Warning */}
            {isTokenExpiringSoon() && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                  ⚠️ Token expires soon. Please renew.
                </Typography>
              </Box>
            )}
          </Stack>
        ) : (
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No credentials configured yet
            </Typography>
          </Box>
        )}
      </CardContent>
      
      {/* Actions */}
      <CardActions sx={{ px: 2, pb: 2, flexDirection: 'column', gap: 1 }}>
        {isConfigured ? (
          <>
            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
              <Tooltip title="Edit Credentials">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={onEditCredentials}
                  fullWidth
                >
                  Edit
                </Button>
              </Tooltip>
              
              <Tooltip title="Test Connection">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={onTestConnection}
                  disabled={isTestingConnection}
                  fullWidth
                >
                  {isTestingConnection ? 'Testing...' : 'Test'}
                </Button>
              </Tooltip>
              
              <Tooltip title="Delete Credentials">
                <IconButton
                  size="small"
                  color="error"
                  onClick={onDelete}
                >
                  <Delete />
                </IconButton>
              </Tooltip>
            </Box>
            
            {/* Toggle Switch */}
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={platform.is_active}
                    onChange={(e) => onToggle(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2">
                    {platform.is_active ? 'Active' : 'Inactive'}
                  </Typography>
                }
              />
            </Box>
          </>
        ) : (
          <Button
            variant="contained"
            fullWidth
            startIcon={<Add />}
            onClick={onAddCredentials}
            sx={{
              bgcolor: platformColors[platform.platform],
              '&:hover': {
                bgcolor: platformColors[platform.platform],
                opacity: 0.9
              }
            }}
          >
            Add Credentials
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

export default PlatformCard;
