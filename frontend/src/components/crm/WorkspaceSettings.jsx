/**
 * WorkspaceSettings Component
 * 
 * Comprehensive workspace administration interface.
 * Manages members, permissions, integrations, security, and subscription.
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Grid,
  Chip,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Security as SecurityIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  IntegrationInstructions as IntegrationIcon,
  CreditCard as BillingIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

const WorkspaceSettings = ({ workspaceId }) => {
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);
  const [openMemberDialog, setOpenMemberDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberFormData, setMemberFormData] = useState({
    userEmail: '',
    role: 'member',
    permissions: {
      canManageBoards: false,
      canManagePipelines: false,
      canManageMembers: false,
      canExportData: false,
      canManageIntegrations: false,
    },
  });

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspace();
    }
  }, [workspaceId]);

  const fetchWorkspace = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/crm/workspaces/${workspaceId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setWorkspace(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching workspace:', error);
      setLoading(false);
    }
  };

  const handleUpdateWorkspace = async (updates) => {
    try {
      await axios.put(
        `/api/crm/workspaces/${workspaceId}`,
        updates,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchWorkspace();
    } catch (error) {
      console.error('Error updating workspace:', error);
    }
  };

  const handleAddMember = async () => {
    try {
      await axios.post(
        `/api/crm/workspaces/${workspaceId}/members`,
        memberFormData,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchWorkspace();
      setOpenMemberDialog(false);
      resetMemberForm();
    } catch (error) {
      console.error('Error adding member:', error);
      alert(error.response?.data?.error || 'Error adding member');
    }
  };

  const handleUpdateMember = async () => {
    try {
      await axios.put(
        `/api/crm/workspaces/${workspaceId}/members/${selectedMember._id}`,
        {
          role: memberFormData.role,
          permissions: memberFormData.permissions,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchWorkspace();
      setOpenMemberDialog(false);
      resetMemberForm();
    } catch (error) {
      console.error('Error updating member:', error);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (window.confirm('Remove this member from the workspace?')) {
      try {
        await axios.delete(
          `/api/crm/workspaces/${workspaceId}/members/${memberId}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        fetchWorkspace();
      } catch (error) {
        console.error('Error removing member:', error);
      }
    }
  };

  const handleUpdateSecurity = async (settings) => {
    try {
      await axios.put(
        `/api/crm/workspaces/${workspaceId}/security`,
        settings,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchWorkspace();
    } catch (error) {
      console.error('Error updating security:', error);
    }
  };

  const handleTogglePanicMode = async () => {
    try {
      if (workspace.isPanicMode) {
        await axios.delete(
          `/api/crm/workspaces/${workspaceId}/panic`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
      } else {
        await axios.post(
          `/api/crm/workspaces/${workspaceId}/panic`,
          {},
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
      }
      fetchWorkspace();
    } catch (error) {
      console.error('Error toggling panic mode:', error);
    }
  };

  const resetMemberForm = () => {
    setMemberFormData({
      userEmail: '',
      role: 'member',
      permissions: {
        canManageBoards: false,
        canManagePipelines: false,
        canManageMembers: false,
        canExportData: false,
        canManageIntegrations: false,
      },
    });
    setSelectedMember(null);
  };

  const openEditMemberDialog = (member) => {
    setSelectedMember(member);
    setMemberFormData({
      userEmail: member.user.email,
      role: member.role,
      permissions: member.permissions,
    });
    setOpenMemberDialog(true);
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      owner: 'error',
      admin: 'warning',
      member: 'primary',
      viewer: 'default',
    };
    return colors[role] || 'default';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!workspace) {
    return (
      <Box p={3}>
        <Typography variant="h6">Workspace not found</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4">{workspace.name}</Typography>
        <Typography variant="body2" color="textSecondary">
          Workspace Settings & Administration
        </Typography>
      </Box>

      {/* Panic Mode Alert */}
      {workspace.isPanicMode && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <strong>Panic Mode Active!</strong> All access to this workspace is currently restricted.
        </Alert>
      )}

      {/* Tabs */}
      <Card>
        <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
          <Tab icon={<SettingsIcon />} label="General" iconPosition="start" />
          <Tab icon={<PeopleIcon />} label="Members" iconPosition="start" />
          <Tab icon={<SecurityIcon />} label="Security" iconPosition="start" />
          <Tab icon={<IntegrationIcon />} label="Integrations" iconPosition="start" />
          <Tab icon={<BillingIcon />} label="Subscription" iconPosition="start" />
        </Tabs>

        <CardContent>
          {/* General Tab */}
          {currentTab === 0 && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    label="Workspace Name"
                    value={workspace.name}
                    onChange={(e) => handleUpdateWorkspace({ name: e.target.value })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Workspace Slug"
                    value={workspace.slug}
                    disabled
                    fullWidth
                    helperText="Unique identifier for your workspace"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Description"
                    value={workspace.description || ''}
                    onChange={(e) => handleUpdateWorkspace({ description: e.target.value })}
                    fullWidth
                    multiline
                    rows={3}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Divider />
                </Grid>
                <Grid item xs={12}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h6" color="error">
                        <WarningIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                        Panic Mode
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Immediately restrict all access to this workspace
                      </Typography>
                    </Box>
                    <Button
                      variant={workspace.isPanicMode ? 'outlined' : 'contained'}
                      color="error"
                      onClick={handleTogglePanicMode}
                    >
                      {workspace.isPanicMode ? 'Deactivate' : 'Activate'} Panic Mode
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Members Tab */}
          {currentTab === 1 && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Team Members ({workspace.members.length})
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenMemberDialog(true)}
                >
                  Add Member
                </Button>
              </Box>

              <List>
                {workspace.members.map((member) => (
                  <React.Fragment key={member._id}>
                    <ListItem>
                      <Avatar sx={{ mr: 2 }}>
                        {member.user.first_name?.[0] || member.user.email[0].toUpperCase()}
                      </Avatar>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography>
                              {member.user.first_name} {member.user.last_name || member.user.email}
                            </Typography>
                            <Chip
                              label={member.role}
                              size="small"
                              color={getRoleBadgeColor(member.role)}
                            />
                          </Box>
                        }
                        secondary={
                          <Box mt={1}>
                            <Typography variant="caption" color="textSecondary">
                              {member.user.email}
                            </Typography>
                            <Box display="flex" gap={1} mt={0.5}>
                              {member.permissions.canManageBoards && (
                                <Chip label="Boards" size="small" variant="outlined" />
                              )}
                              {member.permissions.canManagePipelines && (
                                <Chip label="Pipelines" size="small" variant="outlined" />
                              )}
                              {member.permissions.canManageMembers && (
                                <Chip label="Members" size="small" variant="outlined" />
                              )}
                              {member.permissions.canExportData && (
                                <Chip label="Export" size="small" variant="outlined" />
                              )}
                              {member.permissions.canManageIntegrations && (
                                <Chip label="Integrations" size="small" variant="outlined" />
                              )}
                            </Box>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        {member.role !== 'owner' && (
                          <>
                            <IconButton
                              edge="end"
                              onClick={() => openEditMemberDialog(member)}
                              sx={{ mr: 1 }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              edge="end"
                              onClick={() => handleRemoveMember(member._id)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </>
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            </Box>
          )}

          {/* Security Tab */}
          {currentTab === 2 && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={workspace.security.twoFactorRequired}
                        onChange={(e) => handleUpdateSecurity({
                          twoFactorRequired: e.target.checked,
                        })}
                      />
                    }
                    label="Require Two-Factor Authentication"
                  />
                  <Typography variant="caption" color="textSecondary" display="block">
                    All members must enable 2FA to access the workspace
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={workspace.security.ssoEnabled}
                        onChange={(e) => handleUpdateSecurity({
                          ssoEnabled: e.target.checked,
                        })}
                      />
                    }
                    label="Enable Single Sign-On (SSO)"
                  />
                  <Typography variant="caption" color="textSecondary" display="block">
                    Allow authentication via SSO providers
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Divider />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    IP Whitelist
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Restrict workspace access to specific IP addresses
                  </Typography>
                  <TextField
                    label="Allowed IPs (comma-separated)"
                    value={workspace.security.ipWhitelist?.join(', ') || ''}
                    onChange={(e) => handleUpdateSecurity({
                      ipWhitelist: e.target.value.split(',').map(ip => ip.trim()).filter(Boolean),
                    })}
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="192.168.1.1, 10.0.0.1"
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Integrations Tab */}
          {currentTab === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Connected Integrations
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemText
                    primary="Gmail"
                    secondary={workspace.integrations?.gmail?.enabled ? 'Connected' : 'Not connected'}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={workspace.integrations?.gmail?.enabled || false}
                      disabled
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                
                <ListItem>
                  <ListItemText
                    primary="Outlook"
                    secondary={workspace.integrations?.outlook?.enabled ? 'Connected' : 'Not connected'}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={workspace.integrations?.outlook?.enabled || false}
                      disabled
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                
                <ListItem>
                  <ListItemText
                    primary="DocuSign"
                    secondary={workspace.integrations?.docusign?.enabled ? 'Connected' : 'Not connected'}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={workspace.integrations?.docusign?.enabled || false}
                      disabled
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                
                <ListItem>
                  <ListItemText
                    primary="Zoom"
                    secondary={workspace.integrations?.zoom?.enabled ? 'Connected' : 'Not connected'}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={workspace.integrations?.zoom?.enabled || false}
                      disabled
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </Box>
          )}

          {/* Subscription Tab */}
          {currentTab === 4 && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h5" gutterBottom>
                        {workspace.subscription.plan.toUpperCase()}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Current Plan
                      </Typography>
                      <Box mt={2}>
                        <Typography variant="body2">
                          Seats: {workspace.subscription.usedSeats} / {workspace.subscription.seats}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Available Plans
                  </Typography>
                  <Grid container spacing={2}>
                    {['free', 'basic', 'professional', 'enterprise'].map(plan => (
                      <Grid item xs={12} sm={6} md={3} key={plan}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6">
                              {plan.charAt(0).toUpperCase() + plan.slice(1)}
                            </Typography>
                            <Button
                              variant={workspace.subscription.plan === plan ? 'contained' : 'outlined'}
                              size="small"
                              fullWidth
                              sx={{ mt: 2 }}
                              disabled={workspace.subscription.plan === plan}
                            >
                              {workspace.subscription.plan === plan ? 'Current' : 'Upgrade'}
                            </Button>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Member Dialog */}
      <Dialog open={openMemberDialog} onClose={() => setOpenMemberDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedMember ? 'Edit Member' : 'Add New Member'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Email Address"
              type="email"
              value={memberFormData.userEmail}
              onChange={(e) => setMemberFormData({ ...memberFormData, userEmail: e.target.value })}
              fullWidth
              required
              disabled={!!selectedMember}
            />
            
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={memberFormData.role}
                onChange={(e) => setMemberFormData({ ...memberFormData, role: e.target.value })}
                label="Role"
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="member">Member</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
              </Select>
            </FormControl>

            <Divider />

            <Typography variant="subtitle2">Permissions</Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={memberFormData.permissions.canManageBoards}
                  onChange={(e) => setMemberFormData({
                    ...memberFormData,
                    permissions: {
                      ...memberFormData.permissions,
                      canManageBoards: e.target.checked,
                    },
                  })}
                />
              }
              label="Manage Boards"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={memberFormData.permissions.canManagePipelines}
                  onChange={(e) => setMemberFormData({
                    ...memberFormData,
                    permissions: {
                      ...memberFormData.permissions,
                      canManagePipelines: e.target.checked,
                    },
                  })}
                />
              }
              label="Manage Pipelines"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={memberFormData.permissions.canManageMembers}
                  onChange={(e) => setMemberFormData({
                    ...memberFormData,
                    permissions: {
                      ...memberFormData.permissions,
                      canManageMembers: e.target.checked,
                    },
                  })}
                />
              }
              label="Manage Members"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={memberFormData.permissions.canExportData}
                  onChange={(e) => setMemberFormData({
                    ...memberFormData,
                    permissions: {
                      ...memberFormData.permissions,
                      canExportData: e.target.checked,
                    },
                  })}
                />
              }
              label="Export Data"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={memberFormData.permissions.canManageIntegrations}
                  onChange={(e) => setMemberFormData({
                    ...memberFormData,
                    permissions: {
                      ...memberFormData.permissions,
                      canManageIntegrations: e.target.checked,
                    },
                  })}
                />
              }
              label="Manage Integrations"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMemberDialog(false)}>Cancel</Button>
          <Button
            onClick={selectedMember ? handleUpdateMember : handleAddMember}
            variant="contained"
            color="primary"
          >
            {selectedMember ? 'Update' : 'Add'} Member
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkspaceSettings;
