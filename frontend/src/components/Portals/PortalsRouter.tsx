/**
 * Portals Router
 * Navigation for B2B, B2C, and B2B2C portals
 */

import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper, Breadcrumbs, Link, Typography } from '@mui/material';
import { Business, Person, Group, NavigateNext } from '@mui/icons-material';
import B2BDashboard from './B2B/B2BDashboard';
import B2CDashboard from './B2C/B2CDashboard';
import B2B2CDashboard from './B2B2C/B2B2CDashboard';

function TabPanel({ children, value, index }: any) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const PortalsRouter: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const tabs = [
    { label: 'B2C Consumer', icon: <Person />, component: <B2CDashboard /> },
    { label: 'B2B Partner', icon: <Business />, component: <B2BDashboard /> },
    { label: 'B2B2C Hybrid', icon: <Group />, component: <B2B2CDashboard /> },
  ];

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.default', minHeight: '100vh' }}>
      <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
          <Link underline="hover" color="inherit" href="/">
            Home
          </Link>
          <Link underline="hover" color="inherit" href="/portals">
            Portals
          </Link>
          <Typography color="text.primary">{tabs[currentTab].label}</Typography>
        </Breadcrumbs>
      </Box>

      <Paper sx={{ mb: 0 }} elevation={1}>
        <Tabs
          value={currentTab}
          onChange={(e, v) => setCurrentTab(v)}
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
            <Tab key={index} icon={tab.icon} iconPosition="start" label={tab.label} />
          ))}
        </Tabs>
      </Paper>

      {tabs.map((tab, index) => (
        <TabPanel key={index} value={currentTab} index={index}>
          {tab.component}
        </TabPanel>
      ))}
    </Box>
  );
};

export default PortalsRouter;
