import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Smartphone as PhoneIcon,
  Email as EmailIcon,
  VpnKey as KeyIcon,
  Delete as DeleteIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import apiClient from '../../services/apiClient';
import { TwoFactorMethod, TwoFactorSetup, TwoFactorStatus } from '../../types/auth.types';

interface TwoFactorAuthProps {
  userId: string;
  onSuccess?: () => void;
}

const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({ userId, onSuccess }) => {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [setupData, setSetupData] = useState<TwoFactorSetup | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  useEffect(() => {
    fetchTwoFactorStatus();
  }, [userId]);

  const fetchTwoFactorStatus = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/auth/2fa/status`);
      setStatus(response.data);
    } catch (err: any) {
      toast.error('Failed to load 2FA status');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableTOTP = async () => {
    try {
      setProcessing(true);
      const response = await apiClient.post('/api/auth/2fa/setup/totp');
      setSetupData(response.data);
      toast.success('Scan QR code with your authenticator app');
    } catch (err: any) {
      toast.error('Failed to setup 2FA');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyTOTP = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    try {
      setProcessing(true);
      await apiClient.post('/api/auth/2fa/verify/totp', {
        code: verificationCode,
        secret: setupData?.secret,
      });
      toast.success('Two-factor authentication enabled!');
      setShowBackupCodes(true);
      fetchTwoFactorStatus();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error('Invalid verification code');
    } finally {
      setProcessing(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!window.confirm('Are you sure you want to disable two-factor authentication?')) {
      return;
    }

    try {
      setProcessing(true);
      await apiClient.post('/api/auth/2fa/disable');
      toast.success('Two-factor authentication disabled');
      fetchTwoFactorStatus();
    } catch (err: any) {
      toast.error('Failed to disable 2FA');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          <SecurityIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Two-Factor Authentication
        </Typography>

        {status?.enabled ? (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              Two-factor authentication is enabled
            </Alert>
            <Button
              variant="outlined"
              color="error"
              onClick={handleDisable2FA}
              disabled={processing}
            >
              Disable 2FA
            </Button>
          </Box>
        ) : (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Add an extra layer of security to your account
            </Alert>

            {!setupData ? (
              <Button
                variant="contained"
                onClick={handleEnableTOTP}
                disabled={processing}
                startIcon={<KeyIcon />}
              >
                Enable 2FA with Authenticator App
              </Button>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  {setupData.qrCode && (
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <img
                        src={setupData.qrCode}
                        alt="QR Code"
                        style={{ maxWidth: '100%', height: 'auto' }}
                      />
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Scan with Google Authenticator or Authy
                      </Typography>
                    </Box>
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Verification Code"
                    fullWidth
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    inputProps={{ maxLength: 6 }}
                    helperText="Enter the 6-digit code from your app"
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleVerifyTOTP}
                    disabled={processing || verificationCode.length !== 6}
                  >
                    Verify & Enable
                  </Button>
                </Grid>
              </Grid>
            )}
          </Box>
        )}

        {/* Backup Codes Dialog */}
        <Dialog open={showBackupCodes} onClose={() => setShowBackupCodes(false)}>
          <DialogTitle>Backup Codes</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Save these backup codes in a safe place. Each code can only be used once.
            </Alert>
            <List>
              {setupData?.backupCodes?.map((code, index) => (
                <ListItem key={index}>
                  <ListItemText primary={code} />
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowBackupCodes(false)} variant="contained">
              I've Saved My Codes
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};

export default TwoFactorAuth;