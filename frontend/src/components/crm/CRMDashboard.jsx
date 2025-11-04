/**
 * CRMDashboard Component
 * 
 * Main dashboard integrating all CRM components.
 * Provides unified navigation and workspace management.
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  ViewKanban as KanbanIcon,
  People as PeopleIcon,
  Timeline as TimelineIcon,
  ViewModule as BoardIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountIcon,
  Business as WorkspaceIcon,
} from '@mui/icons-material';

// Import CRM components
import DealKanban from './DealKanban';
import ContactManager from './ContactManager';
import PipelineManager from './PipelineManager';
import BoardView from './BoardView';
import WorkspaceSettings from './WorkspaceSettings';

const drawerWidth = 240;

const CRMDashboard = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [workspaceMenuAnchor, setWorkspaceMenuAnchor] = useState(null);

  // Load workspaces on mount
  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const response = await axios.get('/api/crm/workspaces');
      const workspacesList = response.data.data;
      setWorkspaces(workspacesList);
      
      if (workspacesList.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(workspacesList[0]);
      }
    } catch (error) {
      console.error('Error loading workspaces:', error);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleViewChange = (view, payload = {}) => {
    setCurrentView(view);
    if (payload.pipeline) setSelectedPipeline(payload.pipeline);
    if (payload.board) setSelectedBoard(payload.board);
  };

  const handleWorkspaceChange = (workspace) => {
    setSelectedWorkspace(workspace);
    setWorkspaceMenuAnchor(null);
    setCurrentView('dashboard');
  };

  // Navigation items
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'deals', label: 'Deals', icon: <KanbanIcon /> },
    { id: 'contacts', label: 'Contacts', icon: <PeopleIcon /> },
    { id: 'pipelines', label: 'Pipelines', icon: <TimelineIcon /> },
    { id: 'boards', label: 'Boards', icon: <BoardIcon /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
  ];

  // Drawer content
  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Spirit Tours CRM
        </Typography>
      </Toolbar>
      <Divider />
      
      {/* Workspace Selector */}
      <Box sx={{ p: 2 }}>
        <ListItemButton
          onClick={(e) => setWorkspaceMenuAnchor(e.currentTarget)}
          sx={{
            bgcolor: 'action.hover',
            borderRadius: 1,
          }}
        >
          <ListItemIcon>
            <WorkspaceIcon />
          </ListItemIcon>
          <ListItemText
            primary={selectedWorkspace?.name || 'Select Workspace'}
            secondary={selectedWorkspace?.slug}
          />
        </ListItemButton>
      </Box>

      <Divider />

      {/* Navigation */}
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              selected={currentView === item.id}
              onClick={() => handleViewChange(item.id)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  // Render current view
  const renderView = () => {
    if (!selectedWorkspace) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h5" color="text.secondary">
            Please select a workspace to continue
          </Typography>
        </Box>
      );
    }

    switch (currentView) {
      case 'dashboard':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Welcome to Spirit Tours CRM! Select an option from the sidebar to get started.
            </Typography>
            
            {/* Quick Stats */}
            <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Box sx={{ p: 3, bgcolor: 'primary.light', borderRadius: 2 }}>
                <Typography variant="h3">0</Typography>
                <Typography variant="body2">Active Deals</Typography>
              </Box>
              <Box sx={{ p: 3, bgcolor: 'success.light', borderRadius: 2 }}>
                <Typography variant="h3">0</Typography>
                <Typography variant="body2">Contacts</Typography>
              </Box>
              <Box sx={{ p: 3, bgcolor: 'warning.light', borderRadius: 2 }}>
                <Typography variant="h3">$0</Typography>
                <Typography variant="body2">Pipeline Value</Typography>
              </Box>
              <Box sx={{ p: 3, bgcolor: 'info.light', borderRadius: 2 }}>
                <Typography variant="h3">0%</Typography>
                <Typography variant="body2">Win Rate</Typography>
              </Box>
            </Box>
          </Box>
        );

      case 'deals':
        return selectedPipeline ? (
          <DealKanban
            workspaceId={selectedWorkspace._id}
            pipelineId={selectedPipeline}
          />
        ) : (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" color="text.secondary">
              Please select a pipeline from Pipeline Manager
            </Typography>
          </Box>
        );

      case 'contacts':
        return <ContactManager workspaceId={selectedWorkspace._id} />;

      case 'pipelines':
        return <PipelineManager workspaceId={selectedWorkspace._id} />;

      case 'boards':
        return selectedBoard ? (
          <BoardView
            workspaceId={selectedWorkspace._id}
            boardId={selectedBoard}
          />
        ) : (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" color="text.secondary">
              Please select a board
            </Typography>
          </Box>
        );

      case 'settings':
        return <WorkspaceSettings workspaceId={selectedWorkspace._id} />;

      default:
        return <Typography>View not found</Typography>;
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {navigationItems.find(i => i.id === currentView)?.label || 'CRM'}
          </Typography>

          {/* Notifications */}
          <IconButton color="inherit" sx={{ mr: 1 }}>
            <Badge badgeContent={0} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* User Menu */}
          <IconButton
            color="inherit"
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <Avatar sx={{ width: 32, height: 32 }}>
              <AccountIcon />
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={() => setAnchorEl(null)}>Profile</MenuItem>
            <MenuItem onClick={() => setAnchorEl(null)}>My Account</MenuItem>
            <Divider />
            <MenuItem onClick={() => setAnchorEl(null)}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          height: 'calc(100vh - 64px)',
          overflow: 'auto',
        }}
      >
        {renderView()}
      </Box>

      {/* Workspace Selector Menu */}
      <Menu
        anchorEl={workspaceMenuAnchor}
        open={Boolean(workspaceMenuAnchor)}
        onClose={() => setWorkspaceMenuAnchor(null)}
      >
        {workspaces.map((workspace) => (
          <MenuItem
            key={workspace._id}
            onClick={() => handleWorkspaceChange(workspace)}
            selected={selectedWorkspace?._id === workspace._id}
          >
            <ListItemIcon>
              <WorkspaceIcon />
            </ListItemIcon>
            <ListItemText
              primary={workspace.name}
              secondary={workspace.slug}
            />
            {workspace.subscription && (
              <Chip
                label={workspace.subscription.plan}
                size="small"
                sx={{ ml: 1 }}
              />
            )}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => setWorkspaceMenuAnchor(null)}>
          <ListItemText primary="Create New Workspace" />
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default CRMDashboard;
