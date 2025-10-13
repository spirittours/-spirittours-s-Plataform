import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  Container,
  useTheme,
  useMediaQuery,
  Button,
  Chip
} from '@mui/material';

import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Receipt as ReceiptIcon,
  Calculate as CalculateIcon,
  Percent as PercentIcon,
  Assessment as AssessmentIcon,
  Language as LanguageIcon,
  Payment as PaymentIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
  ExitToApp as ExitToAppIcon,
  ChevronLeft as ChevronLeftIcon,
  Store as StoreIcon,
  Public as PublicIcon
} from '@mui/icons-material';

// Import the components we created
import ProductVATConfiguration from './ProductVATConfiguration';
import VATInvoiceIntegration from './VATInvoiceIntegration';
import LanguageCountrySelector from '../LanguageCountrySelector';
import PaymentGatewayConfig from './PaymentGatewayConfig';
import InvoicePage from '../pages/InvoicePage';
import AccountingDashboard from '../pages/AccountingDashboard';

const drawerWidth = 280;

const menuItems = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: <DashboardIcon />,
    description: 'Overview and statistics'
  },
  {
    id: 'vat-config',
    title: 'VAT/IVA Configuration',
    icon: <PercentIcon />,
    description: 'Configure tax exemptions per product/service',
    badge: 'NEW'
  },
  {
    id: 'vat-testing',
    title: 'VAT Testing',
    icon: <CalculateIcon />,
    description: 'Test VAT calculations and invoice generation'
  },
  {
    id: 'invoice-management',
    title: 'Invoice Management',
    icon: <ReceiptIcon />,
    description: 'Multi-country invoice system'
  },
  {
    id: 'payment-gateways',
    title: 'Payment Gateways',
    icon: <PaymentIcon />,
    description: 'Configure payment gateway priorities'
  },
  {
    id: 'accounting',
    title: 'Accounting Dashboard',
    icon: <AssessmentIcon />,
    description: 'Consolidated financial reports'
  },
  {
    id: 'language-country',
    title: 'Language & Country',
    icon: <LanguageIcon />,
    description: 'User preferences and localization',
    badge: 'UPDATED'
  }
];

const AdminVATDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [selectedView, setSelectedView] = useState('dashboard');
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [notifications, setNotifications] = useState(3);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleMenuClick = (viewId) => {
    setSelectedView(viewId);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const renderContent = () => {
    switch (selectedView) {
      case 'vat-config':
        return <ProductVATConfiguration />;
      case 'vat-testing':
        return <VATInvoiceIntegration />;
      case 'invoice-management':
        return <InvoicePage />;
      case 'payment-gateways':
        return <PaymentGatewayConfig />;
      case 'accounting':
        return <AccountingDashboard />;
      case 'language-country':
        return <LanguageCountrySelector />;
      case 'dashboard':
      default:
        return <DashboardOverview onNavigate={handleMenuClick} />;
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerOpen ? drawerWidth : 0}px)` },
          ml: { md: `${drawerOpen ? drawerWidth : 0}px` },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Spirit Tours Admin - VAT & Invoice Management
          </Typography>

          <IconButton color="inherit" sx={{ mr: 2 }}>
            <Badge badgeContent={notifications} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <IconButton color="inherit" onClick={handleOpenUserMenu}>
            <AccountCircleIcon />
          </IconButton>
          
          <Menu
            sx={{ mt: '45px' }}
            id="menu-appbar"
            anchorEl={anchorElUser}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorElUser)}
            onClose={handleCloseUserMenu}
          >
            <MenuItem onClick={handleCloseUserMenu}>
              <ListItemIcon>
                <AccountCircleIcon fontSize="small" />
              </ListItemIcon>
              <Typography textAlign="center">Profile</Typography>
            </MenuItem>
            <MenuItem onClick={handleCloseUserMenu}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <Typography textAlign="center">Settings</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleCloseUserMenu}>
              <ListItemIcon>
                <ExitToAppIcon fontSize="small" />
              </ListItemIcon>
              <Typography textAlign="center">Logout</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            background: 'linear-gradient(180deg, #f5f7fa 0%, #c3cfe2 100%)'
          },
        }}
        variant={isMobile ? "temporary" : "persistent"}
        anchor="left"
        open={drawerOpen}
        onClose={handleDrawerToggle}
      >
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <StoreIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6" color="primary">
              Admin Panel
            </Typography>
            {!isMobile && (
              <IconButton onClick={handleDrawerToggle} sx={{ ml: 'auto' }}>
                <ChevronLeftIcon />
              </IconButton>
            )}
          </Box>
        </Toolbar>
        <Divider />
        
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton
                selected={selectedView === item.id}
                onClick={() => handleMenuClick(item.id)}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderLeft: '4px solid',
                    borderLeftColor: 'primary.main'
                  }
                }}
              >
                <ListItemIcon sx={{ color: selectedView === item.id ? 'primary.main' : 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {item.title}
                      {item.badge && (
                        <Chip 
                          label={item.badge} 
                          size="small" 
                          color={item.badge === 'NEW' ? 'error' : 'warning'}
                          sx={{ height: 20 }}
                        />
                      )}
                    </Box>
                  }
                  secondary={item.description}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 3,
          width: { md: `calc(100% - ${drawerOpen ? drawerWidth : 0}px)` },
          ml: { md: drawerOpen ? 0 : `-${drawerWidth}px` },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          mt: 8
        }}
      >
        {renderContent()}
      </Box>
    </Box>
  );
};

// Dashboard Overview Component
const DashboardOverview = ({ onNavigate }) => {
  const theme = useTheme();
  
  const stats = [
    {
      title: 'Products Configured',
      value: '127',
      change: '+12%',
      color: 'primary'
    },
    {
      title: 'VAT Exempt Items',
      value: '34',
      change: '26.8%',
      color: 'success'
    },
    {
      title: 'Active VAT Rules',
      value: '15',
      change: '+3',
      color: 'info'
    },
    {
      title: 'Countries Active',
      value: '5',
      change: 'All',
      color: 'warning'
    }
  ];

  const quickActions = [
    {
      id: 'vat-config',
      title: 'Configure VAT/IVA',
      description: 'Set up product tax exemptions',
      icon: <PercentIcon sx={{ fontSize: 40 }} />,
      color: '#667eea'
    },
    {
      id: 'vat-testing',
      title: 'Test Calculations',
      description: 'Verify VAT calculations',
      icon: <CalculateIcon sx={{ fontSize: 40 }} />,
      color: '#764ba2'
    },
    {
      id: 'invoice-management',
      title: 'Manage Invoices',
      description: 'View and manage invoices',
      icon: <ReceiptIcon sx={{ fontSize: 40 }} />,
      color: '#f093fb'
    },
    {
      id: 'payment-gateways',
      title: 'Payment Settings',
      description: 'Configure payment gateways',
      icon: <PaymentIcon sx={{ fontSize: 40 }} />,
      color: '#4facfe'
    }
  ];

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 3 }}>
        VAT & Invoice Management Dashboard
      </Typography>

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', mb: 4 }}>
        {stats.map((stat, index) => (
          <Box
            key={index}
            sx={{
              p: 3,
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 2,
              border: '1px solid',
              borderColor: 'divider',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4
              }
            }}
          >
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              {stat.title}
            </Typography>
            <Typography variant="h4" sx={{ mb: 1, color: `${stat.color}.main` }}>
              {stat.value}
            </Typography>
            <Chip label={stat.change} size="small" color={stat.color} />
          </Box>
        ))}
      </Box>

      {/* Quick Actions */}
      <Typography variant="h5" sx={{ mb: 2 }}>
        Quick Actions
      </Typography>
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', mb: 4 }}>
        {quickActions.map((action) => (
          <Box
            key={action.id}
            onClick={() => onNavigate(action.id)}
            sx={{
              p: 3,
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 1,
              cursor: 'pointer',
              transition: 'all 0.3s',
              border: '2px solid transparent',
              '&:hover': {
                boxShadow: 4,
                borderColor: action.color,
                transform: 'translateY(-4px)'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box sx={{ 
                p: 2, 
                borderRadius: 2, 
                bgcolor: action.color,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {action.icon}
              </Box>
              <Box sx={{ ml: 2, flex: 1 }}>
                <Typography variant="h6">{action.title}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {action.description}
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Recent Activity */}
      <Typography variant="h5" sx={{ mb: 2 }}>
        Recent Configuration Changes
      </Typography>
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 2 }}>
        <List>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="Barcelona City Tour - VAT rate updated to 21%"
              secondary="2 minutes ago • Spain configuration"
            />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="Travel Insurance category marked as VAT exempt"
              secondary="15 minutes ago • Global rule applied"
            />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="B2B customers VAT exemption rule activated"
              secondary="1 hour ago • All countries"
            />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="Mexico CFDI invoice format configured"
              secondary="2 hours ago • Payment gateway mapping"
            />
          </ListItem>
        </List>
      </Box>

      {/* Countries Overview */}
      <Typography variant="h5" sx={{ mb: 2, mt: 4 }}>
        Active Countries
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {[
          { flag: '🇺🇸', name: 'United States', invoices: 342 },
          { flag: '🇲🇽', name: 'Mexico', invoices: 256 },
          { flag: '🇪🇸', name: 'Spain', invoices: 189 },
          { flag: '🇮🇱', name: 'Israel', invoices: 124 },
          { flag: '🇦🇪', name: 'Dubai (UAE)', invoices: 98 }
        ].map((country) => (
          <Box
            key={country.name}
            sx={{
              p: 2,
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              minWidth: 200
            }}
          >
            <Typography variant="h4">{country.flag}</Typography>
            <Box>
              <Typography variant="subtitle2">{country.name}</Typography>
              <Typography variant="caption" color="textSecondary">
                {country.invoices} invoices
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Container>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, icon, color, trend }) => {
  return (
    <Box
      sx={{
        p: 3,
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <Box>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4">{value}</Typography>
        {trend && (
          <Typography variant="caption" color={trend > 0 ? 'success.main' : 'error.main'}>
            {trend > 0 ? '+' : ''}{trend}%
          </Typography>
        )}
      </Box>
      <Avatar sx={{ bgcolor: `${color}.light`, width: 56, height: 56 }}>
        {icon}
      </Avatar>
    </Box>
  );
};

export default AdminVATDashboard;