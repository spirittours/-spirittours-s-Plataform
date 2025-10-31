/**
 * Payments Router
 * Navigation for payment components
 */

import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper, Breadcrumbs, Link, Typography } from '@mui/material';
import { Dashboard, Payment, Receipt, NavigateNext } from '@mui/icons-material';
import PaymentsDashboard from './PaymentsDashboard';
import PaymentCheckout from './PaymentCheckout';

function TabPanel({ children, value, index }: any) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const PaymentsRouter: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const tabs = [
    { label: 'Dashboard', icon: <Dashboard />, component: <PaymentsDashboard /> },
    {
      label: 'New Payment',
      icon: <Payment />,
      component: (
        <Box sx={{ p: 3 }}>
          <PaymentCheckout amount={450} currency="EUR" description="Sample Payment" />
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.default', minHeight: '100vh' }}>
      <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
          <Link underline="hover" color="inherit" href="/">
            Home
          </Link>
          <Link underline="hover" color="inherit" href="/payments">
            Payments
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

export default PaymentsRouter;
