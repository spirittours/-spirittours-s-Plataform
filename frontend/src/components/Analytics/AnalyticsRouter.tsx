/**
 * Analytics Router
 * Navigation and routing for Analytics components
 */

import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Breadcrumbs,
  Link,
  Typography,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  BusinessCenter as BusinessIcon,
  Speed as SpeedIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import AnalyticsDashboard from './AnalyticsDashboard';
import ExecutiveDashboard from './ExecutiveDashboard';
import RealtimeDashboard from './RealtimeDashboard';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const AnalyticsRouter: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const tabs = [
    {
      label: 'Overview',
      icon: <DashboardIcon />,
      component: <AnalyticsDashboard />,
    },
    {
      label: 'Executive',
      icon: <BusinessIcon />,
      component: <ExecutiveDashboard />,
    },
    {
      label: 'Real-Time',
      icon: <SpeedIcon />,
      component: <RealtimeDashboard />,
    },
  ];

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Breadcrumbs */}
      <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          aria-label="breadcrumb"
        >
          <Link underline="hover" color="inherit" href="/">
            Home
          </Link>
          <Link underline="hover" color="inherit" href="/analytics">
            Analytics
          </Link>
          <Typography color="text.primary">{tabs[currentTab].label}</Typography>
        </Breadcrumbs>
      </Box>

      {/* Tabs Navigation */}
      <Paper sx={{ mb: 0 }} elevation={1}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="analytics dashboard tabs"
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 64,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 500,
            },
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              icon={tab.icon}
              iconPosition="start"
              label={tab.label}
              id={`analytics-tab-${index}`}
              aria-controls={`analytics-tabpanel-${index}`}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      {tabs.map((tab, index) => (
        <TabPanel key={index} value={currentTab} index={index}>
          {tab.component}
        </TabPanel>
      ))}
    </Box>
  );
};

export default AnalyticsRouter;
