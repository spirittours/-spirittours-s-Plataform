import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Badge,
  Chip,
  Button,
  Divider,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Info,
  BookOnline,
  Payment,
  Settings as SettingsIcon,
  MoreVert,
  Delete,
  DoneAll,
  Circle,
  Wifi,
  WifiOff,
  Refresh,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import notificationsService, {
  Notification,
  NotificationType,
  NotificationPriority,
} from '../../services/notificationsService';

const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
    loadStats();
    connectWebSocket();

    return () => {
      notificationsService.disconnectWebSocket();
    };
  }, []);

  const connectWebSocket = () => {
    notificationsService.connectWebSocket();

    // Listen for connection status changes
    const unsubscribeConnection = notificationsService.onConnectionChange((connected) => {
      setWsConnected(connected);
      if (connected) {
        toast.success('Real-time notifications connected');
      } else {
        toast.error('Real-time notifications disconnected');
      }
    });

    // Listen for new notifications
    const unsubscribeNotification = notificationsService.onNotification((notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setStats((prev: any) => ({
        ...prev,
        total: prev.total + 1,
        unread: prev.unread + 1,
      }));
      
      // Show toast notification
      toast.custom(
        (t) => (
          <Alert
            severity={getNotificationSeverity(notification.type)}
            sx={{ cursor: 'pointer' }}
            onClick={() => {
              toast.dismiss(t.id);
              handleNotificationClick(notification);
            }}
          >
            <strong>{notification.title}</strong>
            <br />
            {notification.message}
          </Alert>
        ),
        { duration: 5000 }
      );
    });

    return () => {
      unsubscribeConnection();
      unsubscribeNotification();
    };
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      // In production, use: const data = await notificationsService.getNotifications();
      const mockNotifications = notificationsService.getMockNotifications();
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // In production, use: const data = await notificationsService.getStats();
      const mockStats = notificationsService.getMockStats();
      setStats(mockStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    try {
      await notificationsService.markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setStats((prev: any) => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1),
      }));
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setStats((prev: any) => ({ ...prev, unread: 0 }));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationsService.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setStats((prev: any) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));
      toast.success('Notification deleted');
      setAnchorEl(null);
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const handleDeleteAllRead = async () => {
    try {
      await notificationsService.deleteAllRead();
      setNotifications((prev) => prev.filter((n) => !n.read));
      loadStats();
      toast.success('All read notifications deleted');
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      toast.error('Failed to delete read notifications');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification);
    }
    setSelectedNotification(notification);
    setDetailsOpen(true);
  };

  const handleAction = (notification: Notification) => {
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle sx={{ color: '#4caf50' }} />;
      case 'warning':
        return <Warning sx={{ color: '#ff9800' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#f44336' }} />;
      case 'booking':
        return <BookOnline sx={{ color: '#2196f3' }} />;
      case 'payment':
        return <Payment sx={{ color: '#4caf50' }} />;
      case 'system':
        return <SettingsIcon sx={{ color: '#9c27b0' }} />;
      default:
        return <Info sx={{ color: '#2196f3' }} />;
    }
  };

  const getNotificationSeverity = (type: NotificationType): 'success' | 'warning' | 'error' | 'info' => {
    switch (type) {
      case 'success':
      case 'payment':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterType !== 'all' && n.type !== filterType) return false;
    if (filterRead === 'read' && !n.read) return false;
    if (filterRead === 'unread' && n.read) return false;
    return true;
  });

  return (
    <Box>
      {/* Header with Stats */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <NotificationsIcon sx={{ fontSize: 32, color: '#1976d2' }} />
            <Typography variant="h5" fontWeight="600">
              Notification Center
            </Typography>
            {wsConnected ? (
              <Chip icon={<Wifi />} label="Live" color="success" size="small" />
            ) : (
              <Chip icon={<WifiOff />} label="Offline" color="error" size="small" />
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button startIcon={<Refresh />} onClick={loadNotifications} size="small">
              Refresh
            </Button>
            <Button startIcon={<DoneAll />} onClick={handleMarkAllAsRead} size="small">
              Mark All Read
            </Button>
            <Button
              startIcon={<Delete />}
              onClick={handleDeleteAllRead}
              size="small"
              color="error"
            >
              Clear Read
            </Button>
          </Box>
        </Box>

        {stats && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Total Notifications
                  </Typography>
                  <Typography variant="h4" fontWeight="600">
                    {stats.total}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: '#fff3e0' }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Unread
                  </Typography>
                  <Typography variant="h4" fontWeight="600" color="#f57c00">
                    {stats.unread}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: '#e3f2fd' }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Bookings
                  </Typography>
                  <Typography variant="h4" fontWeight="600" color="#1976d2">
                    {stats.by_type.booking}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: '#e8f5e9' }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Payments
                  </Typography>
                  <Typography variant="h4" fontWeight="600" color="#4caf50">
                    {stats.by_type.payment}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Filters */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={filterType}
                label="Type"
                onChange={(e) => setFilterType(e.target.value as any)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="booking">Bookings</MenuItem>
                <MenuItem value="payment">Payments</MenuItem>
                <MenuItem value="system">System</MenuItem>
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="success">Success</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="error">Error</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filterRead}
                label="Status"
                onChange={(e) => setFilterRead(e.target.value as any)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="unread">Unread Only</MenuItem>
                <MenuItem value="read">Read Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Notifications List */}
      <Paper elevation={1}>
        <List sx={{ maxHeight: 600, overflow: 'auto' }}>
          {filteredNotifications.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="No notifications"
                secondary="You're all caught up!"
                sx={{ textAlign: 'center' }}
              />
            </ListItem>
          ) : (
            filteredNotifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                {index > 0 && <Divider />}
                <ListItem
                  sx={{
                    bgcolor: notification.read ? 'transparent' : '#f5f5f5',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#e3f2fd' },
                  }}
                  onClick={() => handleNotificationClick(notification)}
                  secondaryAction={
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnchorEl(e.currentTarget);
                        setSelectedNotification(notification);
                      }}
                    >
                      <MoreVert />
                    </IconButton>
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'transparent' }}>
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {!notification.read && (
                          <Circle sx={{ fontSize: 8, color: '#1976d2' }} />
                        )}
                        <Typography variant="subtitle2" fontWeight="600">
                          {notification.title}
                        </Typography>
                        <Chip
                          label={notification.priority}
                          size="small"
                          color={getPriorityColor(notification.priority)}
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="text.secondary">
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatTimestamp(notification.timestamp)}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))
          )}
        </List>
      </Paper>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {selectedNotification && !selectedNotification.read && (
          <MenuItem
            onClick={() => {
              handleMarkAsRead(selectedNotification);
              setAnchorEl(null);
            }}
          >
            <DoneAll sx={{ mr: 1 }} fontSize="small" />
            Mark as Read
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            if (selectedNotification) {
              handleDelete(selectedNotification.id);
            }
          }}
        >
          <Delete sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      {/* Notification Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedNotification && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getNotificationIcon(selectedNotification.type)}
                <Typography variant="h6">{selectedNotification.title}</Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" paragraph>
                {selectedNotification.message}
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Chip
                  label={selectedNotification.type}
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Chip
                  label={selectedNotification.priority}
                  size="small"
                  color={getPriorityColor(selectedNotification.priority)}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {new Date(selectedNotification.timestamp).toLocaleString()}
              </Typography>
              {selectedNotification.metadata && (
                <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Additional Details:
                  </Typography>
                  <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                    {JSON.stringify(selectedNotification.metadata, null, 2)}
                  </pre>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>Close</Button>
              {selectedNotification.action_url && (
                <Button
                  variant="contained"
                  onClick={() => handleAction(selectedNotification)}
                >
                  {selectedNotification.action_label || 'View'}
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default NotificationCenter;
