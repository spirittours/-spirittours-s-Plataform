import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  GetApp as InstallIcon,
  PhoneAndroid as PhoneIcon,
} from '@mui/icons-material';
import { usePWA } from '../../hooks/usePWA';

interface InstallPromptProps {
  open?: boolean;
  onClose?: () => void;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({
  open: controlledOpen,
  onClose,
}) => {
  const { canInstall, isInstalled, install } = usePWA();
  const [internalOpen, setInternalOpen] = React.useState(false);
  
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  
  React.useEffect(() => {
    if (canInstall && !isInstalled) {
      // Show prompt automatically after 10 seconds
      const timer = setTimeout(() => {
        setInternalOpen(true);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [canInstall, isInstalled]);
  
  const handleInstall = async () => {
    const success = await install();
    
    if (success) {
      setInternalOpen(false);
      onClose?.();
    }
  };
  
  const handleClose = () => {
    setInternalOpen(false);
    onClose?.();
    
    // Don't show again for 7 days
    localStorage.setItem('install-prompt-dismissed', Date.now().toString());
  };
  
  // Don't show if already installed or recently dismissed
  if (isInstalled) {
    return null;
  }
  
  const dismissedTime = localStorage.getItem('install-prompt-dismissed');
  if (dismissedTime) {
    const daysSince = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) {
      return null;
    }
  }
  
  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <PhoneIcon />
            <Typography variant="h6">Install Spirit Tours</Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box>
          <Typography variant="body1" gutterBottom>
            Install our app for a better experience:
          </Typography>
          
          <Box component="ul" sx={{ mt: 2, pl: 2 }}>
            <Typography component="li" variant="body2" gutterBottom>
              ✨ Faster performance
            </Typography>
            <Typography component="li" variant="body2" gutterBottom>
              📱 Works offline
            </Typography>
            <Typography component="li" variant="body2" gutterBottom>
              🔔 Push notifications
            </Typography>
            <Typography component="li" variant="body2" gutterBottom>
              🚀 Quick access from home screen
            </Typography>
            <Typography component="li" variant="body2" gutterBottom>
              💾 Less storage usage
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button
          onClick={handleClose}
          variant="text"
          sx={{ color: 'white' }}
        >
          Maybe Later
        </Button>
        <Button
          onClick={handleInstall}
          variant="contained"
          startIcon={<InstallIcon />}
          sx={{
            bgcolor: 'white',
            color: 'primary.main',
            '&:hover': {
              bgcolor: 'grey.100',
            },
          }}
        >
          Install Now
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InstallPrompt;
