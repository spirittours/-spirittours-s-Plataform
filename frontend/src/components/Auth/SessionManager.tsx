import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Computer as DesktopIcon,
  PhoneAndroid as MobileIcon,
  Tablet as TabletIcon,
  Delete as DeleteIcon,
  CheckCircle as ActiveIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import apiClient from '../../services/apiClient';
import { Session, SessionsList } from '../../types/auth.types';

const SessionManager: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<Session | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<SessionsList>('/api/auth/sessions');
      setSessions(response.data.sessions);
      setCurrentSessionId(response.data.currentSessionId);
    } catch (err: any) {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeClick = (session: Session) => {
    setSessionToRevoke(session);
    setRevokeDialogOpen(true);
  };

  const handleRevokeConfirm = async () => {
    if (!sessionToRevoke) return;

    try {
      await apiClient.delete(`/api/auth/sessions/${sessionToRevoke.id}`);
      toast.success('Session revoked successfully');
      setRevokeDialogOpen(false);
      setSessionToRevoke(null);
      fetchSessions();
    } catch (err: any) {
      toast.error('Failed to revoke session');
    }
  };

  const handleRevokeAllOthers = async () => {
    if (!window.confirm('Revoke all other sessions except this one?')) return;

    try {
      await apiClient.post('/api/auth/sessions/revoke-all-others');
      toast.success('All other sessions revoked');
      fetchSessions();
    } catch (err: any) {
      toast.error('Failed to revoke sessions');
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile': return <MobileIcon />;
      case 'tablet': return <TabletIcon />;
      default: return <DesktopIcon />;
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Active Sessions</Typography>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={handleRevokeAllOthers}
            disabled={sessions.length <= 1}
          >
            Revoke All Others
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          These are the devices currently logged into your account. Revoke any sessions you don't recognize.
        </Alert>

        <List>
          {sessions.map((session) => (
            <ListItem
              key={session.id}
              secondaryAction={
                !session.isCurrentSession && (
                  <IconButton
                    edge="end"
                    onClick={() => handleRevokeClick(session)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                )
              }
              sx={{
                border: 1,
                borderColor: session.isCurrentSession ? 'primary.main' : 'divider',
                borderRadius: 1,
                mb: 1,
              }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: session.isCurrentSession ? 'primary.main' : 'grey.400' }}>
                  {getDeviceIcon(session.deviceType)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1">
                      {session.deviceName || `${session.browser} on ${session.os}`}
                    </Typography>
                    {session.isCurrentSession && (
                      <Chip label="Current" color="primary" size="small" icon={<ActiveIcon />} />
                    )}
                    {session.isTrusted && (
                      <Chip label="Trusted" size="small" variant="outlined" />
                    )}
                  </Box>
                }
                secondary={
                  <>
                    <Typography variant="caption" display="block">
                      {session.location?.city}, {session.location?.country} • {session.ipAddress}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Last active: {format(new Date(session.lastActivityAt), 'MMM dd, yyyy HH:mm')}
                    </Typography>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Revoke Dialog */}
      <Dialog open={revokeDialogOpen} onClose={() => setRevokeDialogOpen(false)}>
        <DialogTitle>Revoke Session</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to revoke this session? The device will be logged out immediately.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRevokeConfirm} color="error" variant="contained">
            Revoke Session
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionManager;