/**
 * WorkspaceSettings Component
 * 
 * Workspace administration and configuration interface.
 * Features: member management, integrations, security settings
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
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Security as SecurityIcon,
  Integration as IntegrationIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

const WorkspaceSettings = ({ workspaceId }) => {
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    email: '',
    role: 'member',
    permissions: {
      canManageBoards: false,
      canManagePipelines: false,
      canManageMembers: false,
      canExportData: false,
      canManageIntegrations: false,
    },
  });

  // Load workspace
  useEffect(() => {
    loadWorkspace();
  }, [workspaceId]);

  const loadWorkspace = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/crm/workspaces/${workspaceId}`);
      setWorkspace(response.data.data);
    } catch (error) {
      console.error('Error loading workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle update workspace
  const handleUpdateWorkspace = async (updates) => {
    try {
      const response = await axios.put(`/api/crm/workspaces/${workspaceId}`, updates);
      setWorkspace(response.data.data);
    } catch (error) {
      console.error('Error updating workspace:', error);
    }
  };

  // Handle add member
  const handleAddMember = async () => {
    try {
      await axios.post(`/api/crm/workspaces/${workspaceId}/members`, newMember);
      loadWorkspace();
      setMemberDialogOpen(false);
      setNewMember({
        email: '',
        role: 'member',
        permissions: {
          canManageBoards: false,
          canManagePipelines: false,
          canManageMembers: false,
          canExportData: false,
          canManageIntegrations: false,
        },
      });
    } catch (error) {
      console.error('Error adding member:', error);
      alert(error.response?.data?.error || 'Failed to add member');
    }
  };

  // Handle remove member
  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member from workspace?')) return;

    try {
      await axios.delete(`/api/crm/workspaces/${workspaceId}/members/${memberId}`);
      loadWorkspace();
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  // Handle update member role
  const handleUpdateMemberRole = async (memberId, role) => {
    try {
      await axios.put(`/api/crm/workspaces/${workspaceId}/members/${memberId}`, { role });
      loadWorkspace();
    } catch (error) {
      console.error('Error updating member role:', error);
    }
  };

  // Handle update integrations
  const handleUpdateIntegrations = async (integration, enabled) => {
    try {
      const integrations = {
        ...workspace.integrations,
        [integration]: {
          ...workspace.integrations?.[integration],
          enabled,
        },
      };

      await axios.put(`/api/crm/workspaces/${workspaceId}/integrations`, integrations);
      loadWorkspace();
    } catch (error) {
      console.error('Error updating integration:', error);
    }
  };

  // Handle update security settings
  const handleUpdateSecurity = async (settings) => {
    try {
      await axios.put(`/api/crm/workspaces/${workspaceId}/security`, settings);
      loadWorkspace();
    } catch (error) {
      console.error('Error updating security:', error);
    }
  };

  // Handle panic mode
  const handlePanicMode = async (activate) => {
    if (activate) {
      if (!window.confirm('Activate PANIC MODE? This will lock ALL workspace data!')) {
        return;
      }
    }

    try {
      if (activate) {
        await axios.post(`/api/crm/workspaces/${workspaceId}/panic`);
      } else {
        await axios.delete(`/api/crm/workspaces/${workspaceId}/panic`);
      }
      loadWorkspace();
    } catch (error) {
      console.error('Error toggling panic mode:', error);
    }
  };

  // Get role color
  const getRoleColor = (role) => {
    switch (role) {
      case 'owner':
        return 'error';
      case 'admin':
        return 'warning';
      case 'member':
        return 'primary';
      case 'viewer':
        return 'default';
      default:
        return 'default';
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  if (!workspace) {
    return <Typography>Workspace not found</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Workspace Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {workspace.name}
        </Typography>
      </Box>

      {/* Panic Mode Alert */}
      {workspace.isPanicMode && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => handlePanicMode(false)}
            >
              Deactivate
            </Button>
          }
        >
          <strong>PANIC MODE ACTIVATED</strong> - Workspace is locked
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab icon={<SettingsIcon />} label="General" iconPosition="start" />
        <Tab icon={<PeopleIcon />} label="Members" iconPosition="start" />
        <Tab icon={<IntegrationIcon />} label="Integrations" iconPosition="start" />
        <Tab icon={<SecurityIcon />} label="Security" iconPosition="start" />
      </Tabs>

      {/* General Settings */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Workspace Information
                </Typography>
                <TextField
                  label="Workspace Name"
                  fullWidth
                  value={workspace.name}
                  onChange={(e) => handleUpdateWorkspace({ name: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Slug"
                  fullWidth
                  value={workspace.slug}
                  disabled
                  sx={{ mb: 2 }}
                  helperText="URL-friendly identifier"
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Subscription
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Current Plan
                  </Typography>
                  <Chip
                    label={workspace.subscription?.plan?.toUpperCase() || 'FREE'}
                    color="primary"
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Seats Used
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(workspace.subscription?.usedSeats / workspace.subscription?.seats) * 100}
                    sx={{ mt: 1, height: 8, borderRadius: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {workspace.subscription?.usedSeats} / {workspace.subscription?.seats} seats
                  </Typography>
                </Box>
                <Button variant="outlined" fullWidth>
                  Upgrade Plan
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Members Tab */}
      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Team Members
              </Typography>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={() => setMemberDialogOpen(true)}
              >
                Add Member
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Member</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Permissions</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workspace.members?.map((member) => (
                    <TableRow key={member._id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {member.user?.first_name?.charAt(0)}
                          </Avatar>
                          <Typography variant="body2">
                            {member.user?.first_name} {member.user?.last_name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {member.user?.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select
                            value={member.role}
                            onChange={(e) => handleUpdateMemberRole(member._id, e.target.value)}
                            disabled={member.role === 'owner'}
                          >
                            <MenuItem value="owner">Owner</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                            <MenuItem value="member">Member</MenuItem>
                            <MenuItem value="viewer">Viewer</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {member.permissions?.canManageBoards && (
                            <Chip label="Boards" size="small" />
                          )}
                          {member.permissions?.canManagePipelines && (
                            <Chip label="Pipelines" size="small" />
                          )}
                          {member.permissions?.canManageMembers && (
                            <Chip label="Members" size="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveMember(member._id)}
                          disabled={member.role === 'owner'}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Integrations Tab */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          {/* Gmail Integration */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Gmail</Typography>
                  <Switch
                    checked={workspace.integrations?.gmail?.enabled || false}
                    onChange={(e) => handleUpdateIntegrations('gmail', e.target.checked)}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Connect your Gmail account for two-way email sync
                </Typography>
                {workspace.integrations?.gmail?.enabled && (
                  <Button variant="outlined" size="small" sx={{ mt: 2 }}>
                    Configure
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Outlook Integration */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Outlook</Typography>
                  <Switch
                    checked={workspace.integrations?.outlook?.enabled || false}
                    onChange={(e) => handleUpdateIntegrations('outlook', e.target.checked)}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Connect Microsoft Outlook for email and calendar sync
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* DocuSign Integration */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">DocuSign</Typography>
                  <Switch
                    checked={workspace.integrations?.docusign?.enabled || false}
                    onChange={(e) => handleUpdateIntegrations('docusign', e.target.checked)}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Send and track documents for e-signature
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Zoom Integration */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Zoom</Typography>
                  <Switch
                    checked={workspace.integrations?.zoom?.enabled || false}
                    onChange={(e) => handleUpdateIntegrations('zoom', e.target.checked)}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Create and manage video meetings
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Security Tab */}
      {tabValue === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Security Settings
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={workspace.security?.twoFactorRequired || false}
                      onChange={(e) => handleUpdateSecurity({
                        ...workspace.security,
                        twoFactorRequired: e.target.checked,
                      })}
                    />
                  }
                  label="Require Two-Factor Authentication for all members"
                  sx={{ mb: 2 }}
                />

                <Divider sx={{ my: 2 }} />

                <FormControlLabel
                  control={
                    <Switch
                      checked={workspace.security?.ssoEnabled || false}
                      onChange={(e) => handleUpdateSecurity({
                        ...workspace.security,
                        ssoEnabled: e.target.checked,
                      })}
                    />
                  }
                  label="Enable Single Sign-On (SSO)"
                  sx={{ mb: 2 }}
                />

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle1" gutterBottom>
                  IP Whitelist
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Restrict access to specific IP addresses
                </Typography>
                <List>
                  {workspace.security?.ipWhitelist?.map((ip, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={ip} />
                      <ListItemSecondaryAction>
                        <IconButton size="small">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
                <Button variant="outlined" size="small">
                  Add IP Address
                </Button>

                <Divider sx={{ my: 3 }} />

                <Alert severity="warning" icon={<WarningIcon />}>
                  <Typography variant="subtitle2" gutterBottom>
                    Emergency Panic Mode
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Immediately locks all workspace data in case of security breach
                  </Typography>
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    onClick={() => handlePanicMode(!workspace.isPanicMode)}
                    sx={{ mt: 1 }}
                  >
                    {workspace.isPanicMode ? 'Deactivate' : 'Activate'} Panic Mode
                  </Button>
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Add Member Dialog */}
      <Dialog
        open={memberDialogOpen}
        onClose={() => setMemberDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Team Member</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                required
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  label="Role"
                >
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="member">Member</MenuItem>
                  <MenuItem value="viewer">Viewer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Permissions
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={newMember.permissions.canManageBoards}
                    onChange={(e) => setNewMember({
                      ...newMember,
                      permissions: { ...newMember.permissions, canManageBoards: e.target.checked },
                    })}
                  />
                }
                label="Manage Boards"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={newMember.permissions.canManagePipelines}
                    onChange={(e) => setNewMember({
                      ...newMember,
                      permissions: { ...newMember.permissions, canManagePipelines: e.target.checked },
                    })}
                  />
                }
                label="Manage Pipelines"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={newMember.permissions.canExportData}
                    onChange={(e) => setNewMember({
                      ...newMember,
                      permissions: { ...newMember.permissions, canExportData: e.target.checked },
                    })}
                  />
                }
                label="Export Data"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddMember} variant="contained">
            Add Member
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkspaceSettings;
