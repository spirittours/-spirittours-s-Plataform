/**
 * Project Manager Component
 * 
 * Complete project management interface with tasks, milestones, and team.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Avatar,
  AvatarGroup,
  Stack,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Group as GroupIcon,
  AttachMoney as MoneyIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

const ProjectManager = ({ workspaceId }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    fetchProjects();
  }, [workspaceId]);

  const fetchProjects = async () => {
    try {
      const response = await fetch(`/api/crm/projects/${workspaceId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (health) => {
    switch (health) {
      case 'on_track': return 'success';
      case 'at_risk': return 'warning';
      case 'off_track': return 'error';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'on_hold': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Projects
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          New Project
        </Button>
      </Box>

      <Grid container spacing={3}>
        {projects.map((project) => (
          <Grid item xs={12} md={6} lg={4} key={project._id}>
            <Card sx={{ '&:hover': { boxShadow: 6 }, cursor: 'pointer' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {project.name}
                  </Typography>
                  <Chip
                    label={project.health}
                    color={getHealthColor(project.health)}
                    size="small"
                  />
                </Box>

                <Chip
                  label={project.status}
                  color={getStatusColor(project.status)}
                  size="small"
                  sx={{ mb: 2 }}
                />

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {project.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption">Progress</Typography>
                    <Typography variant="caption">{project.progress}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={project.progress}
                    color={project.progress >= 75 ? 'success' : 'primary'}
                  />
                </Box>

                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CheckIcon fontSize="small" color="action" />
                    <Typography variant="caption">
                      {project.tasks?.filter(t => t.status === 'completed').length || 0}/
                      {project.tasks?.length || 0} Tasks
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <MoneyIcon fontSize="small" color="action" />
                    <Typography variant="caption">
                      ${project.budget?.spent || 0}/${project.budget?.total || 0}
                    </Typography>
                  </Box>
                </Stack>

                {project.team && project.team.length > 0 && (
                  <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 28, height: 28 } }}>
                    {project.team.map((member, idx) => (
                      <Avatar key={idx} src={member.user?.avatar}>
                        {member.user?.firstName?.[0]}
                      </Avatar>
                    ))}
                  </AvatarGroup>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create Project Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Project Name"
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            margin="normal"
          />
          <TextField
            fullWidth
            select
            label="Status"
            margin="normal"
            defaultValue="planning"
          >
            <MenuItem value="planning">Planning</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="on_hold">On Hold</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectManager;
