/**
 * CRMDashboard Component
 * 
 * Main CRM dashboard integrating all modules.
 * Provides navigation and unified interface for all CRM functionality.
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
  IconButton,
  Divider,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  ViewKanban as KanbanIcon,
  Contacts as ContactsIcon,
  AccountTree as PipelineIcon,
  TableChart as BoardIcon,
  Settings as SettingsIcon,
  Timeline as ActivityIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
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
  const [currentView, setCurrentView] = useState('overview');
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [pipelines, setPipelines] = useState([]);
  const [boards, setBoards] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (selectedWorkspace) {
      fetchWorkspaceData();
    }
  }, [selectedWorkspace]);

  const fetchWorkspaces = async () => {
    try {
      const response = await axios.get('/api/crm/workspaces', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setWorkspaces(response.data.data);
      if (response.data.data.length > 0) {
        setSelectedWorkspace(response.data.data[0]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      setLoading(false);
    }
  };

  const fetchWorkspaceData = async () => {
    if (!selectedWorkspace) return;

    try {
      // Fetch pipelines
      const pipelinesRes = await axios.get('/api/crm/pipelines', {
        params: { workspace: selectedWorkspace._id },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setPipelines(pipelinesRes.data.data);
      if (pipelinesRes.data.data.length > 0 && !selectedPipeline) {
        setSelectedPipeline(pipelinesRes.data.data[0]);
      }

      // Fetch boards
      const boardsRes = await axios.get('/api/crm/boards', {
        params: { workspace: selectedWorkspace._id },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setBoards(boardsRes.data.data);
      if (boardsRes.data.data.length > 0 && !selectedBoard) {
        setSelectedBoard(boardsRes.data.data[0]);
      }

      // Fetch stats
      const statsRes = await axios.get(`/api/crm/workspaces/${selectedWorkspace._id}/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('Error fetching workspace data:', error);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const renderOverview = () => (
    <Box>
      <Typography variant="h4" gutterBottom>
        CRM Overview
      </Typography>
      
      {stats && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <KanbanIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">{stats.totalDeals || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Deals
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <MoneyIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">
                      ${(stats.totalValue || 0).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Pipeline Value
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'info.main' }}>
                    <PeopleIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">{stats.totalContacts || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Contacts
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'secondary.main' }}>
                    <TrendingUpIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">
                      {stats.conversionRate ? `${stats.conversionRate.toFixed(1)}%` : '0%'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Win Rate
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Activity feed coming soon...
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <List>
                <ListItem button onClick={() => setCurrentView('deals')}>
                  <ListItemIcon>
                    <KanbanIcon />
                  </ListItemIcon>
                  <ListItemText primary="View Deals" />
                </ListItem>
                <ListItem button onClick={() => setCurrentView('contacts')}>
                  <ListItemIcon>
                    <ContactsIcon />
                  </ListItemIcon>
                  <ListItemText primary="Manage Contacts" />
                </ListItem>
                <ListItem button onClick={() => setCurrentView('pipelines')}>
                  <ListItemIcon>
                    <PipelineIcon />
                  </ListItemIcon>
                  <ListItemText primary="Configure Pipelines" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap>
          CRM
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem button selected={currentView === 'overview'} onClick={() => setCurrentView('overview')}>
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Overview" />
        </ListItem>
        <ListItem button selected={currentView === 'deals'} onClick={() => setCurrentView('deals')}>
          <ListItemIcon>
            <KanbanIcon />
          </ListItemIcon>
          <ListItemText primary="Deals" />
        </ListItem>
        <ListItem button selected={currentView === 'contacts'} onClick={() => setCurrentView('contacts')}>
          <ListItemIcon>
            <ContactsIcon />
          </ListItemIcon>
          <ListItemText primary="Contacts" />
        </ListItem>
        <ListItem button selected={currentView === 'pipelines'} onClick={() => setCurrentView('pipelines')}>
          <ListItemIcon>
            <PipelineIcon />
          </ListItemIcon>
          <ListItemText primary="Pipelines" />
        </ListItem>
        <ListItem button selected={currentView === 'boards'} onClick={() => setCurrentView('boards')}>
          <ListItemIcon>
            <BoardIcon />
          </ListItemIcon>
          <ListItemText primary="Boards" />
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem button selected={currentView === 'settings'} onClick={() => setCurrentView('settings')}>
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItem>
      </List>
    </Box>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar */}
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
            {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
          </Typography>

          {workspaces.length > 0 && (
            <FormControl variant="outlined" size="small" sx={{ minWidth: 200, mr: 2 }}>
              <InputLabel sx={{ color: 'white' }}>Workspace</InputLabel>
              <Select
                value={selectedWorkspace?._id || ''}
                onChange={(e) => {
                  const workspace = workspaces.find(w => w._id === e.target.value);
                  setSelectedWorkspace(workspace);
                }}
                label="Workspace"
                sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'white' } }}
              >
                {workspaces.map(workspace => (
                  <MenuItem key={workspace._id} value={workspace._id}>
                    {workspace.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {currentView === 'deals' && pipelines.length > 0 && (
            <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
              <InputLabel sx={{ color: 'white' }}>Pipeline</InputLabel>
              <Select
                value={selectedPipeline?._id || ''}
                onChange={(e) => {
                  const pipeline = pipelines.find(p => p._id === e.target.value);
                  setSelectedPipeline(pipeline);
                }}
                label="Pipeline"
                sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'white' } }}
              >
                {pipelines.map(pipeline => (
                  <MenuItem key={pipeline._id} value={pipeline._id}>
                    {pipeline.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {currentView === 'boards' && boards.length > 0 && (
            <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
              <InputLabel sx={{ color: 'white' }}>Board</InputLabel>
              <Select
                value={selectedBoard?._id || ''}
                onChange={(e) => {
                  const board = boards.find(b => b._id === e.target.value);
                  setSelectedBoard(board);
                }}
                label="Board"
                sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'white' } }}
              >
                {boards.map(board => (
                  <MenuItem key={board._id} value={board._id}>
                    {board.icon} {board.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
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
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        
        {!selectedWorkspace ? (
          <Card>
            <CardContent>
              <Typography variant="h6" color="textSecondary">
                No workspace available. Create a workspace to get started.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <>
            {currentView === 'overview' && renderOverview()}
            {currentView === 'deals' && selectedPipeline && (
              <DealKanban
                workspaceId={selectedWorkspace._id}
                pipelineId={selectedPipeline._id}
              />
            )}
            {currentView === 'contacts' && (
              <ContactManager workspaceId={selectedWorkspace._id} />
            )}
            {currentView === 'pipelines' && (
              <PipelineManager workspaceId={selectedWorkspace._id} />
            )}
            {currentView === 'boards' && selectedBoard && (
              <BoardView
                workspaceId={selectedWorkspace._id}
                boardId={selectedBoard._id}
              />
            )}
            {currentView === 'settings' && (
              <WorkspaceSettings workspaceId={selectedWorkspace._id} />
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default CRMDashboard;
