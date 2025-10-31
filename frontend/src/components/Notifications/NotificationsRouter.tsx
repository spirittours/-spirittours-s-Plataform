import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Paper, Breadcrumbs, Link, Tabs, Tab } from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Inbox,
} from '@mui/icons-material';
import NotificationCenter from './NotificationCenter';
import NotificationPreferences from './NotificationPreferences';

const NotificationsRouter: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    switch (newValue) {
      case 0:
        navigate('/notifications');
        break;
      case 1:
        navigate('/notifications/preferences');
        break;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Paper
          elevation={2}
          sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <NotificationsIcon sx={{ fontSize: 40, color: 'white' }} />
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>
              Notifications
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
            Stay informed with real-time notifications and custom preferences
          </Typography>
        </Paper>

        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link underline="hover" color="inherit" href="/">
            Home
          </Link>
          <Typography color="text.primary">Notifications</Typography>
        </Breadcrumbs>

        {/* Navigation Tabs */}
        <Paper elevation={1} sx={{ mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
            <Tab icon={<Inbox />} label="Notification Center" iconPosition="start" />
            <Tab icon={<SettingsIcon />} label="Preferences" iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<NotificationCenter />} />
          <Route path="/preferences" element={<NotificationPreferences />} />
          <Route path="*" element={<Navigate to="/notifications" replace />} />
        </Routes>
      </Container>
    </Box>
  );
};

export default NotificationsRouter;
