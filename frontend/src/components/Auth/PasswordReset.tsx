import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import apiClient from '../../services/apiClient';

const PasswordReset: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token?: string }>();
  const [activeStep, setActiveStep] = useState(token ? 1 : 0);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const steps = ['Request Reset', 'Set New Password', 'Complete'];

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await apiClient.post('/api/auth/password-reset/request', { email });
      toast.success('Password reset link sent to your email');
      setActiveStep(1);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to send reset link';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await apiClient.post('/api/auth/password-reset/confirm', {
        token,
        newPassword,
        confirmPassword,
      });
      toast.success('Password reset successful');
      setSuccess(true);
      setActiveStep(2);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to reset password';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom textAlign="center">
          Password Reset
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {activeStep === 0 && (
          <Box component="form" onSubmit={handleRequestReset}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Enter your email address and we'll send you a link to reset your password.
            </Typography>
            <TextField
              label="Email Address"
              type="email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={{ mt: 2, mb: 3 }}
              InputProps={{
                startAdornment: <EmailIcon sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </Box>
        )}

        {activeStep === 1 && !token && (
          <Alert severity="info">
            Check your email for the password reset link.
          </Alert>
        )}

        {activeStep === 1 && token && (
          <Box component="form" onSubmit={handleResetPassword}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Enter your new password below.
            </Typography>
            <TextField
              label="New Password"
              type="password"
              fullWidth
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              sx={{ mt: 2, mb: 2 }}
              InputProps={{
                startAdornment: <LockIcon sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
            <TextField
              label="Confirm Password"
              type="password"
              fullWidth
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: <LockIcon sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </Box>
        )}

        {activeStep === 2 && success && (
          <Box sx={{ textAlign: 'center' }}>
            <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Password Reset Successful
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Redirecting to login page...
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default PasswordReset;