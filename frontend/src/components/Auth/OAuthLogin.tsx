import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Button,
  Typography,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Google as GoogleIcon,
  Facebook as FacebookIcon,
  Apple as AppleIcon,
  GitHub as GitHubIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import apiClient from '../../services/apiClient';
import { AuthProvider, OAuthResponse } from '../../types/auth.types';

// ============================================================================
// Props Interface
// ============================================================================

interface OAuthLoginProps {
  onSuccess?: (user: any) => void;
  onError?: (error: Error) => void;
  redirectUrl?: string;
}

// ============================================================================
// Component
// ============================================================================

const OAuthLogin: React.FC<OAuthLoginProps> = ({ onSuccess, onError, redirectUrl }) => {
  // ==========================================================================
  // State Management
  // ==========================================================================

  const [loading, setLoading] = useState<AuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ==========================================================================
  // OAuth Configuration
  // ==========================================================================

  const oauthProviders = [
    {
      id: AuthProvider.GOOGLE,
      name: 'Google',
      icon: <GoogleIcon />,
      color: '#DB4437',
      enabled: true,
    },
    {
      id: AuthProvider.FACEBOOK,
      name: 'Facebook',
      icon: <FacebookIcon />,
      color: '#4267B2',
      enabled: true,
    },
    {
      id: AuthProvider.APPLE,
      name: 'Apple',
      icon: <AppleIcon />,
      color: '#000000',
      enabled: false, // Disabled for demo
    },
    {
      id: AuthProvider.GITHUB,
      name: 'GitHub',
      icon: <GitHubIcon />,
      color: '#333333',
      enabled: false, // Disabled for demo
    },
  ];

  // ==========================================================================
  // Handle OAuth Callback
  // ==========================================================================

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const provider = params.get('provider') as AuthProvider;

      if (code && state && provider) {
        try {
          setLoading(provider);
          setError(null);

          // Exchange code for tokens
          const response = await apiClient.post('/api/auth/oauth/callback', {
            provider,
            code,
            state,
          });

          const { user, tokens } = response.data;

          // Store tokens
          localStorage.setItem('accessToken', tokens.accessToken);
          localStorage.setItem('refreshToken', tokens.refreshToken);

          toast.success(`Successfully logged in with ${provider}`);

          if (onSuccess) {
            onSuccess(user);
          }

          // Redirect
          window.location.href = redirectUrl || '/dashboard';
        } catch (err: any) {
          console.error('OAuth callback error:', err);
          const errorMessage = err.response?.data?.message || 'OAuth authentication failed';
          setError(errorMessage);
          toast.error(errorMessage);

          if (onError) {
            onError(err);
          }
        } finally {
          setLoading(null);
        }
      }
    };

    handleOAuthCallback();
  }, []);

  // ==========================================================================
  // Handle OAuth Login
  // ==========================================================================

  const handleOAuthLogin = async (provider: AuthProvider) => {
    try {
      setLoading(provider);
      setError(null);

      // Get OAuth URL from backend
      const response = await apiClient.post('/api/auth/oauth/authorize', {
        provider,
        redirectUri: `${window.location.origin}/auth/oauth/callback`,
      });

      const { authUrl } = response.data;

      // Redirect to OAuth provider
      window.location.href = authUrl;
    } catch (err: any) {
      console.error('OAuth initialization error:', err);
      const errorMessage = err.response?.data?.message || `Failed to initialize ${provider} login`;
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(null);

      if (onError) {
        onError(err);
      }
    }
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <Box>
      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* OAuth Buttons */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {oauthProviders
          .filter((p) => p.enabled)
          .map((provider) => (
            <Button
              key={provider.id}
              variant="outlined"
              size="large"
              fullWidth
              startIcon={
                loading === provider.id ? (
                  <CircularProgress size={20} />
                ) : (
                  provider.icon
                )
              }
              onClick={() => handleOAuthLogin(provider.id)}
              disabled={loading !== null}
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                borderColor: 'divider',
                color: 'text.primary',
                '&:hover': {
                  borderColor: provider.color,
                  bgcolor: `${provider.color}08`,
                },
              }}
            >
              Continue with {provider.name}
            </Button>
          ))}
      </Box>

      {/* Divider */}
      <Box sx={{ display: 'flex', alignItems: 'center', my: 3 }}>
        <Divider sx={{ flex: 1 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mx: 2 }}>
          OR
        </Typography>
        <Divider sx={{ flex: 1 }} />
      </Box>
    </Box>
  );
};

export default OAuthLogin;
