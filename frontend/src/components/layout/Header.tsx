import React, { useState } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Avatar,
  Button,
  Tooltip,
  MenuItem,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  FlightTakeoff as FlightIcon,
  Explore as ExploreIcon,
  ContactSupport as SupportIcon,
  Language as LanguageIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../common/Logo';
import { brandColors } from '../../config/branding';

interface HeaderProps {
  onToggleTheme?: () => void;
  isDarkMode?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onToggleTheme, isDarkMode = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [anchorElNotif, setAnchorElNotif] = useState<null | HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationCount] = useState(3); // Example notification count

  const navigationItems = [
    { label: 'Home', path: '/', icon: <FlightIcon /> },
    { label: 'Tours', path: '/tours', icon: <ExploreIcon /> },
    { label: 'About', path: '/about', icon: <SupportIcon /> },
    { label: 'Contact', path: '/contact', icon: <SupportIcon /> },
  ];

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleOpenNotifications = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNotif(event.currentTarget);
  };

  const handleCloseNotifications = () => {
    setAnchorElNotif(null);
  };

  const handleLogout = () => {
    logout();
    handleCloseUserMenu();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <AppBar 
      position="sticky" 
      elevation={0}
      sx={{
        background: isDarkMode 
          ? 'rgba(30, 41, 59, 0.95)' 
          : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 80 } }}>
          {/* Logo */}
          <Box sx={{ flexGrow: 0, mr: { xs: 2, md: 4 } }}>
            <Logo 
              variant={isMobile ? 'icon' : 'compact'} 
              width={isMobile ? 48 : undefined}
            />
          </Box>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
              {navigationItems.map((item) => (
                <Button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  sx={{
                    color: isActive(item.path) 
                      ? brandColors.primary.royalBlue 
                      : theme.palette.text.primary,
                    fontWeight: isActive(item.path) ? 600 : 500,
                    position: 'relative',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: isActive(item.path) ? '80%' : '0%',
                      height: 3,
                      background: brandColors.gradients.primary,
                      borderRadius: '3px 3px 0 0',
                      transition: 'width 0.3s ease',
                    },
                    '&:hover': {
                      background: 'transparent',
                      color: brandColors.primary.royalBlue,
                      '&::after': {
                        width: '80%',
                      },
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}

          {/* Mobile Menu Button */}
          {isMobile && (
            <Box sx={{ flexGrow: 1 }}>
              <IconButton
                size="large"
                onClick={() => setMobileMenuOpen(true)}
                sx={{ color: theme.palette.text.primary }}
              >
                <MenuIcon />
              </IconButton>
            </Box>
          )}

          {/* Right Side Actions */}
          <Box sx={{ flexGrow: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Theme Toggle */}
            <Tooltip title="Toggle theme">
              <IconButton onClick={onToggleTheme} sx={{ color: theme.palette.text.primary }}>
                {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            {/* Language Selector */}
            <Tooltip title="Language">
              <IconButton sx={{ color: theme.palette.text.primary }}>
                <LanguageIcon />
              </IconButton>
            </Tooltip>

            {/* Notifications */}
            {user && (
              <Tooltip title="Notifications">
                <IconButton 
                  onClick={handleOpenNotifications}
                  sx={{ color: theme.palette.text.primary }}
                >
                  <Badge badgeContent={notificationCount} color="error">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
            )}

            {/* User Menu */}
            {user ? (
              <>
                <Tooltip title="Account">
                  <IconButton onClick={handleOpenUserMenu} sx={{ p: 0, ml: 1 }}>
                    <Avatar 
                      sx={{ 
                        width: 40, 
                        height: 40,
                        background: brandColors.gradients.accent,
                        fontWeight: 600,
                      }}
                    >
                      {user.name?.charAt(0).toUpperCase()}
                    </Avatar>
                  </IconButton>
                </Tooltip>
                <Menu
                  sx={{ mt: '45px' }}
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
                  PaperProps={{
                    sx: {
                      minWidth: 200,
                      borderRadius: 2,
                      boxShadow: theme.shadows[8],
                    },
                  }}
                >
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {user.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                  <Divider />
                  <MenuItem onClick={() => { navigate('/dashboard'); handleCloseUserMenu(); }}>
                    <ListItemIcon><DashboardIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Dashboard</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => { navigate('/profile'); handleCloseUserMenu(); }}>
                    <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Profile</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => { navigate('/settings'); handleCloseUserMenu(); }}>
                    <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Settings</ListItemText>
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Logout</ListItemText>
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/login')}
                  sx={{
                    borderColor: brandColors.primary.royalBlue,
                    color: brandColors.primary.royalBlue,
                    '&:hover': {
                      borderColor: brandColors.primary.darkBlue,
                      background: 'rgba(37, 99, 235, 0.08)',
                    },
                  }}
                >
                  Sign In
                </Button>
                <Button
                  variant="contained"
                  onClick={() => navigate('/register')}
                  sx={{
                    background: brandColors.gradients.button,
                    color: 'white',
                    '&:hover': {
                      background: brandColors.gradients.button,
                      filter: 'brightness(1.1)',
                    },
                  }}
                >
                  Get Started
                </Button>
              </Box>
            )}
          </Box>

          {/* Notifications Menu */}
          <Menu
            anchorEl={anchorElNotif}
            open={Boolean(anchorElNotif)}
            onClose={handleCloseNotifications}
            PaperProps={{
              sx: {
                minWidth: 320,
                maxHeight: 400,
                borderRadius: 2,
              },
            }}
          >
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">Notifications</Typography>
            </Box>
            <List sx={{ py: 0 }}>
              <ListItem>
                <ListItemText 
                  primary="New booking confirmed"
                  secondary="Your trip to Madrid is confirmed for Dec 15"
                  primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
                  secondaryTypographyProps={{ fontSize: 12 }}
                />
                <Chip label="New" size="small" color="primary" />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText 
                  primary="Special offer for you!"
                  secondary="Get 20% off on Barcelona tours"
                  primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
                  secondaryTypographyProps={{ fontSize: 12 }}
                />
              </ListItem>
            </List>
            <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
              <Button fullWidth size="small">View all notifications</Button>
            </Box>
          </Menu>
        </Toolbar>
      </Container>

      {/* Mobile Menu Drawer */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            background: isDarkMode ? '#1e293b' : '#ffffff',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo variant="compact" width={150} />
          <IconButton onClick={() => setMobileMenuOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        <List>
          {navigationItems.map((item) => (
            <ListItemButton
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setMobileMenuOpen(false);
              }}
              selected={isActive(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
        {!user && (
          <>
            <Divider />
            <Box sx={{ p: 2 }}>
              <Button 
                fullWidth 
                variant="contained" 
                onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}
                sx={{
                  background: brandColors.gradients.button,
                  mb: 1,
                }}
              >
                Get Started
              </Button>
              <Button 
                fullWidth 
                variant="outlined" 
                onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
              >
                Sign In
              </Button>
            </Box>
          </>
        )}
      </Drawer>
    </AppBar>
  );
};

export default Header;