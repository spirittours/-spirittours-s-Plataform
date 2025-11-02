import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import apiClient from '../../services/apiClient';

const EmailVerification: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      verifyEmail();
    } else {
      setLoading(false);
    }
  }, [token]);

  const verifyEmail = async () => {
    try {
      setLoading(true);
      await apiClient.post('/api/auth/verify-email', { token });
      setSuccess(true);
      toast.success('Email verified successfully!');
      setTimeout(() => navigate('/dashboard'), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to verify email';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    try {
      setLoading(true);
      await apiClient.post('/api/auth/resend-verification');
      toast.success('Verification email sent!');
    } catch (err: any) {
      toast.error('Failed to resend email');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', p: 3 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        {success ? (
          <>
            <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Email Verified!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your email has been successfully verified. Redirecting...
            </Typography>
          </>
        ) : error ? (
          <>
            <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Verification Failed
            </Typography>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Button variant="contained" onClick={handleResendEmail}>
              Resend Verification Email
            </Button>
          </>
        ) : (
          <>
            <EmailIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Verify Your Email
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              We've sent a verification link to your email address.
            </Typography>
            <Button variant="contained" onClick={handleResendEmail}>
              Resend Verification Email
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default EmailVerification;