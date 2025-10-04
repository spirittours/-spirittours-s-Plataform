/**
 * Credentials Dialog Component
 * 
 * Modal dialog for adding/editing platform credentials
 * with platform-specific form fields
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
  Typography,
  Link,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  ExpandMore as ExpandMoreIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

interface CredentialsDialogProps {
  open: boolean;
  platform: string | null;
  onClose: () => void;
  onSave: () => void;
}

interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'password';
  required: boolean;
  placeholder?: string;
  helperText?: string;
}

const CredentialsDialog: React.FC<CredentialsDialogProps> = ({
  open,
  platform,
  onClose,
  onSave
}) => {
  const queryClient = useQueryClient();
  
  // State
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Platform configurations
  const platformConfigs: Record<string, { fields: FieldConfig[]; guideUrl: string }> = {
    facebook: {
      fields: [
        { name: 'app_id', label: 'App ID', type: 'text', required: true, placeholder: '123456789012345' },
        { name: 'app_secret', label: 'App Secret', type: 'password', required: true, placeholder: 'abc123def456...' },
        { name: 'access_token', label: 'Page Access Token', type: 'password', required: true, placeholder: 'EAAxxxxxxxxxx...' },
        { name: 'page_id', label: 'Page ID', type: 'text', required: true, placeholder: '987654321098765' }
      ],
      guideUrl: 'https://developers.facebook.com/docs/pages/getting-started'
    },
    instagram: {
      fields: [
        { name: 'app_id', label: 'App ID', type: 'text', required: true, placeholder: '123456789012345' },
        { name: 'app_secret', label: 'App Secret', type: 'password', required: true, placeholder: 'abc123def456...' },
        { name: 'access_token', label: 'Access Token', type: 'password', required: true, placeholder: 'EAAxxxxxxxxxx...' },
        { name: 'instagram_business_account_id', label: 'Instagram Business Account ID', type: 'text', required: true, placeholder: '17841400123456789' }
      ],
      guideUrl: 'https://developers.facebook.com/docs/instagram-api'
    },
    twitter_x: {
      fields: [
        { name: 'api_key', label: 'API Key', type: 'text', required: true, placeholder: 'xxxxxxxxxxxxxx' },
        { name: 'api_secret', label: 'API Secret', type: 'password', required: true, placeholder: 'xxxxxxxxxxxxxx' },
        { name: 'bearer_token', label: 'Bearer Token', type: 'password', required: true, placeholder: 'AAAAAAAAAxxxx...' },
        { name: 'access_token', label: 'Access Token', type: 'password', required: false, placeholder: 'Optional for v2 API' },
        { name: 'access_token_secret', label: 'Access Token Secret', type: 'password', required: false, placeholder: 'Optional' }
      ],
      guideUrl: 'https://developer.twitter.com/en/docs/authentication'
    },
    linkedin: {
      fields: [
        { name: 'client_id', label: 'Client ID', type: 'text', required: true, placeholder: '78xxxxxxxxxx' },
        { name: 'client_secret', label: 'Client Secret', type: 'password', required: true, placeholder: 'xxxxxxxxxxxxx' },
        { name: 'access_token', label: 'Access Token', type: 'password', required: false, placeholder: 'Optional - will be generated' }
      ],
      guideUrl: 'https://learn.microsoft.com/en-us/linkedin/shared/authentication/'
    },
    tiktok: {
      fields: [
        { name: 'client_key', label: 'Client Key (App ID)', type: 'text', required: true, placeholder: 'aw1234567890' },
        { name: 'client_secret', label: 'Client Secret', type: 'password', required: true, placeholder: 'secret_abc123' },
        { name: 'access_token', label: 'Access Token', type: 'password', required: true, placeholder: 'act.xxxxxx...' }
      ],
      guideUrl: 'https://developers.tiktok.com/doc/getting-started-create-an-app'
    },
    youtube: {
      fields: [
        { name: 'client_id', label: 'Client ID', type: 'text', required: true, placeholder: 'xxxxx.apps.googleusercontent.com' },
        { name: 'client_secret', label: 'Client Secret', type: 'password', required: true, placeholder: 'GOCSPX-xxxx' },
        { name: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'AIzaSyxxxx...' },
        { name: 'refresh_token', label: 'Refresh Token', type: 'password', required: false, placeholder: 'Optional - will be generated' }
      ],
      guideUrl: 'https://developers.google.com/youtube/v3/getting-started'
    }
  };
  
  // Get current platform config
  const config = platform ? platformConfigs[platform] : null;
  
  // Reset form when platform changes
  useEffect(() => {
    if (platform) {
      setFormData({});
      setErrors({});
    }
  }, [platform]);
  
  // Mutation for saving credentials
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.post('/api/admin/social-media/credentials/add', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms-status'] });
      onSave();
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.detail || 'Failed to save credentials';
      setErrors({ general: errorMsg });
    }
  });
  
  // Handlers
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  const togglePasswordVisibility = (field: string) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };
  
  const validateForm = (): boolean => {
    if (!config) return false;
    
    const newErrors: Record<string, string> = {};
    
    config.fields.forEach(field => {
      if (field.required && !formData[field.name]?.trim()) {
        newErrors[field.name] = `${field.label} is required`;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = () => {
    if (!validateForm() || !platform) return;
    
    saveMutation.mutate({
      platform,
      ...formData
    });
  };
  
  const handleClose = () => {
    if (!saveMutation.isPending) {
      onClose();
    }
  };
  
  if (!platform || !config) return null;
  
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle>
        <Typography variant="h5" component="div">
          Configure {platformConfigs[platform]?.fields ? platform.replace('_', ' ').toUpperCase() : platform}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Add your API credentials to connect this platform
        </Typography>
      </DialogTitle>
      
      <DialogContent dividers>
        {/* Security Notice */}
        <Alert severity="info" sx={{ mb: 3 }}>
          🔐 All credentials are encrypted with Fernet encryption before storage. 
          Your API keys are secure and never exposed in plain text.
        </Alert>
        
        {/* General Error */}
        {errors.general && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errors.general}
          </Alert>
        )}
        
        {/* Form Fields */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {config.fields.map((field) => (
            <TextField
              key={field.name}
              fullWidth
              label={field.label}
              type={field.type === 'password' && !showPassword[field.name] ? 'password' : 'text'}
              value={formData[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              required={field.required}
              error={!!errors[field.name]}
              helperText={errors[field.name] || field.helperText}
              placeholder={field.placeholder}
              InputProps={field.type === 'password' ? {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility(field.name)}
                      edge="end"
                    >
                      {showPassword[field.name] ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              } : undefined}
            />
          ))}
        </Box>
        
        {/* Help Section */}
        <Accordion sx={{ mt: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HelpIcon color="primary" />
              <Typography>How to get these credentials?</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>
              Follow these steps to obtain your API credentials:
            </Typography>
            
            <Box component="ol" sx={{ pl: 2 }}>
              <Typography component="li" variant="body2" paragraph>
                Visit the developer portal for {platform}
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                Create a new app or use an existing one
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                Generate the required API credentials
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                Copy and paste them into the fields above
              </Typography>
            </Box>
            
            <Button
              variant="outlined"
              size="small"
              href={config.guideUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ mt: 1 }}
            >
              📖 View Official Guide
            </Button>
            
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
              💡 Tip: For detailed step-by-step instructions, check the{' '}
              <Link href="/admin/social-media/guide" target="_blank">
                API Keys Acquisition Guide
              </Link>
            </Typography>
          </AccordionDetails>
        </Accordion>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleClose}
          disabled={saveMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saveMutation.isPending}
          startIcon={saveMutation.isPending && <CircularProgress size={20} />}
        >
          {saveMutation.isPending ? 'Saving...' : 'Save Credentials'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CredentialsDialog;
