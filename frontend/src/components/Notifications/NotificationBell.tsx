/**
 * NotificationBell Component
 * 
 * Bell icon with badge showing unread notification count.
 * Displays notification list in a popover.
 */

import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  Button,
  Divider,
  Chip,
} from '@mui/material';
import {
  Notifications,
  NotificationsActive,
  Info,
  CheckCircle,
  Warning,
  Error,
  Clear,
} from '@mui/icons-material';
import { useWebSocket } from '../../hooks/useWebSocket';
import { NotificationData } from '../../services/websocket.service';

interface NotificationBellProps {
  userId: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ userId }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const {
    isConnected,
    notifications,
    clearNotifications,
    markAsRead,
  } = useWebSocket(userId, {
    onNotification: (notification) => {
      console.log('New notification:', notification);
    },
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (index: number, actionUrl?: string) => {
    markAsRead(index);
    if (actionUrl) {
      window.location.href = actionUrl;
    }
  };

  const handleClearAll = () => {
    clearNotifications();
    handleClose();
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

  const getNotificationIcon = (type: string, priority: string) => {
    if (priority === 'urgent') return <Error color="error" />;
    if (priority === 'high') return <Warning color="warning" />;
    
    switch (type) {
      case 'booking_confirmed':
      case 'payment_received':
        return <CheckCircle color="success" />;
      case 'system_alert':
      case 'tour_starting_soon':
        return <Warning color="warning" />;
      default:
        return <Info color="info" />;
    }
  };

  const getPriorityColor = (priority: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        aria-describedby={id}
      >
        <Badge badgeContent={unreadCount} color="error">
          {isConnected ? (
            <NotificationsActive />
          ) : (
            <Notifications />
          )}
        </Badge>
      </IconButton>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { width: 400, maxHeight: 600 }
        }}
      >
        <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Notifications
            {unreadCount > 0 && (
              <Chip
                label={unreadCount}
                size="small"
                color="error"
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
          <Box display="flex" gap={1}>
            <Chip
              label={isConnected ? 'Connected' : 'Disconnected'}
              size="small"
              color={isConnected ? 'success' : 'default'}
            />
            {notifications.length > 0 && (
              <IconButton size="small" onClick={handleClearAll}>
                <Clear fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>

        <Divider />

        {notifications.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography variant="body2" color="text.secondary">
              No notifications
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: 500, overflow: 'auto' }}>
            {notifications.map((notification, index) => (
              <React.Fragment key={index}>
                <ListItem
                  button
                  onClick={() => handleNotificationClick(index, notification.action_url)}
                  sx={{
                    bgcolor: notification.read ? 'transparent' : 'action.hover',
                    '&:hover': {
                      bgcolor: 'action.selected',
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar>
                      {getNotificationIcon(notification.notification_type, notification.priority)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography
                          variant="subtitle2"
                          fontWeight={notification.read ? 'normal' : 'bold'}
                        >
                          {notification.title}
                        </Typography>
                        <Chip
                          label={notification.priority}
                          size="small"
                          color={getPriorityColor(notification.priority)}
                          sx={{ ml: 1 }}
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="text.primary">
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatTimestamp(notification.timestamp)}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}

        {notifications.length > 0 && (
          <>
            <Divider />
            <Box p={1} textAlign="center">
              <Button
                size="small"
                onClick={handleClearAll}
                fullWidth
              >
                Clear All
              </Button>
            </Box>
          </>
        )}
      </Popover>
    </>
  );
};

export default NotificationBell;
