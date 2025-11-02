/**
 * Social Login Buttons
 * 
 * Google and Facebook OAuth login buttons.
 */

import React, { useState } from 'react';
import { Button, Stack, Divider, Typography, Box } from '@mui/material';
import { Google as GoogleIcon, Facebook as FacebookIcon } from '@mui/icons-material';

interface SocialLoginButtonsProps {
  onSuccess?: (tokens: any) => void;
  onError?: (error: string) => void;
  showDivider?: boolean;
}

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  onSuccess,
  onError,
  showDivider = true
}) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/oauth/google/login');
      const data = await response.json();
      window.location.href = data.authorization_url;
    } catch (error) {
      if (onError) onError('Failed to initiate Google login');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/oauth/facebook/login');
      const data = await response.json();
      window.location.href = data.authorization_url;
    } catch (error) {
      if (onError) onError('Failed to initiate Facebook login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {showDivider && (
        <Divider sx={{ my: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Or continue with
          </Typography>
        </Divider>
      )}
      
      <Stack spacing={2}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<GoogleIcon />}
          onClick={handleGoogleLogin}
          disabled={loading}
          sx={{
            borderColor: '#DB4437',
            color: '#DB4437',
            '&:hover': {
              borderColor: '#DB4437',
              backgroundColor: 'rgba(219, 68, 55, 0.04)'
            }
          }}
        >
          Continue with Google
        </Button>

        <Button
          fullWidth
          variant="outlined"
          startIcon={<FacebookIcon />}
          onClick={handleFacebookLogin}
          disabled={loading}
          sx={{
            borderColor: '#1877F2',
            color: '#1877F2',
            '&:hover': {
              borderColor: '#1877F2',
              backgroundColor: 'rgba(24, 119, 242, 0.04)'
            }
          }}
        >
          Continue with Facebook
        </Button>
      </Stack>
    </Box>
  );
};

export default SocialLoginButtons;
