/**
 * PipelineManager Component
 * 
 * Pipeline configuration and management interface.
 * Features: stage management, analytics, pipeline templates
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  LinearProgress,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  TrendingUp as TrendingIcon,
  Timeline as TimelineIcon,
  Analytics as AnalyticsIcon,
  Palette as ColorIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { SketchPicker } from 'react-color';

const PipelineManager = ({ workspaceId }) => {
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [currentStage, setCurrentStage] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  // New pipeline form
  const [newPipeline, setNewPipeline] = useState({
    name: '',
    description: '',
  });

  // New stage form
  const [newStage, setNewStage] = useState({
    name: '',
    probability: 50,
    color: '#3B82F6',
    rottenDays: 30,
  });

  // Load pipelines
  useEffect(() => {
    loadPipelines();
  }, [workspaceId]);

  // Load analytics when pipeline selected
  useEffect(() => {
    if (selectedPipeline) {
      loadAnalytics();
    }
  }, [selectedPipeline]);

  const loadPipelines = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/crm/pipelines', {
        params: { workspace: workspaceId },
      });
      setPipelines(response.data.data);
      
      if (response.data.data.length > 0 && !selectedPipeline) {
        setSelectedPipeline(response.data.data[0]);
      }
    } catch (error) {
      console.error('Error loading pipelines:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const [statsRes, velocityRes, conversionRes] = await Promise.all([
        axios.get(`/api/crm/pipelines/${selectedPipeline._id}/stats`),
        axios.get(`/api/crm/pipelines/${selectedPipeline._id}/velocity`),
        axios.get(`/api/crm/pipelines/${selectedPipeline._id}/conversion`),
      ]);

      setAnalytics({
        stats: statsRes.data.data,
        velocity: velocityRes.data.data,
        conversion: conversionRes.data.data,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  // Handle create pipeline
  const handleCreatePipeline = async () => {
    try {
      const response = await axios.post('/api/crm/pipelines', {
        ...newPipeline,
        workspace: workspaceId,
      });

      setPipelines([...pipelines, response.data.data]);
      setSelectedPipeline(response.data.data);
      setDialogOpen(false);
      setNewPipeline({ name: '', description: '' });
    } catch (error) {
      console.error('Error creating pipeline:', error);
    }
  };

  // Handle delete pipeline
  const handleDeletePipeline = async (pipelineId) => {
    if (!window.confirm('Are you sure? This will affect all associated deals.')) {
      return;
    }

    try {
      await axios.delete(`/api/crm/pipelines/${pipelineId}`);
      setPipelines(pipelines.filter(p => p._id !== pipelineId));
      
      if (selectedPipeline?._id === pipelineId) {
        setSelectedPipeline(pipelines[0] || null);
      }
    } catch (error) {
      console.error('Error deleting pipeline:', error);
      alert(error.response?.data?.error || 'Cannot delete pipeline with active deals');
    }
  };

  // Handle add stage
  const handleAddStage = async () => {
    try {
      await axios.post(`/api/crm/pipelines/${selectedPipeline._id}/stages`, newStage);
      
      loadPipelines();
      setStageDialogOpen(false);
      setCurrentStage(null);
      setNewStage({
        name: '',
        probability: 50,
        color: '#3B82F6',
        rottenDays: 30,
      });
    } catch (error) {
      console.error('Error adding stage:', error);
    }
  };

  // Handle update stage
  const handleUpdateStage = async () => {
    try {
      await axios.put(
        `/api/crm/pipelines/${selectedPipeline._id}/stages/${currentStage.id}`,
        newStage
      );
      
      loadPipelines();
      setStageDialogOpen(false);
      setCurrentStage(null);
      setNewStage({
        name: '',
        probability: 50,
        color: '#3B82F6',
        rottenDays: 30,
      });
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  };

  // Handle delete stage
  const handleDeleteStage = async (stageId) => {
    if (!window.confirm('Delete this stage? Deals in this stage will need to be moved.')) {
      return;
    }

    try {
      await axios.delete(`/api/crm/pipelines/${selectedPipeline._id}/stages/${stageId}`);
      loadPipelines();
    } catch (error) {
      console.error('Error deleting stage:', error);
      alert(error.response?.data?.error || 'Cannot delete stage with deals');
    }
  };

  // Handle drag end for stage reordering
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const stages = Array.from(selectedPipeline.stages);
    const [reorderedStage] = stages.splice(result.source.index, 1);
    stages.splice(result.destination.index, 0, reorderedStage);

    const stageOrder = stages.map(s => s.id);

    try {
      await axios.put(`/api/crm/pipelines/${selectedPipeline._id}/stages/reorder`, {
        stageOrder,
      });
      
      loadPipelines();
    } catch (error) {
      console.error('Error reordering stages:', error);
    }
  };

  // Open stage dialog
  const openStageDialog = (stage = null) => {
    if (stage) {
      setCurrentStage(stage);
      setNewStage({
        name: stage.name,
        probability: stage.probability,
        color: stage.color || '#3B82F6',
        rottenDays: stage.rottenDays || 30,
      });
    } else {
      setCurrentStage(null);
      setNewStage({
        name: '',
        probability: 50,
        color: '#3B82F6',
        rottenDays: 30,
      });
    }
    setStageDialogOpen(true);
  };

  // Format number
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value || 0);
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Pipeline Manager
        </Typography>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => setDialogOpen(true)}
        >
          New Pipeline
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Pipeline List */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pipelines
              </Typography>
              <List>
                {pipelines.map((pipeline) => (
                  <ListItem
                    key={pipeline._id}
                    button
                    selected={selectedPipeline?._id === pipeline._id}
                    onClick={() => setSelectedPipeline(pipeline)}
                    sx={{
                      borderRadius: 1,
                      mb: 1,
                      '&.Mui-selected': {
                        bgcolor: 'primary.light',
                      },
                    }}
                  >
                    <ListItemText
                      primary={pipeline.name}
                      secondary={`${pipeline.stages.length} stages`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePipeline(pipeline._id);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Pipeline Details */}
        <Grid item xs={12} md={9}>
          {selectedPipeline ? (
            <>
              {/* Stages Management */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      {selectedPipeline.name} - Stages
                    </Typography>
                    <Button
                      startIcon={<AddIcon />}
                      size="small"
                      variant="outlined"
                      onClick={() => openStageDialog()}
                    >
                      Add Stage
                    </Button>
                  </Box>

                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="stages">
                      {(provided) => (
                        <List {...provided.droppableProps} ref={provided.innerRef}>
                          {selectedPipeline.stages.map((stage, index) => (
                            <Draggable key={stage.id} draggableId={stage.id} index={index}>
                              {(provided, snapshot) => (
                                <ListItem
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  sx={{
                                    mb: 1,
                                    bgcolor: snapshot.isDragging ? 'action.hover' : 'background.paper',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                  }}
                                >
                                  <Box {...provided.dragHandleProps} sx={{ mr: 1 }}>
                                    <DragIcon color="action" />
                                  </Box>
                                  <Box
                                    sx={{
                                      width: 16,
                                      height: 16,
                                      borderRadius: '50%',
                                      bgcolor: stage.color || '#3B82F6',
                                      mr: 2,
                                    }}
                                  />
                                  <ListItemText
                                    primary={stage.name}
                                    secondary={
                                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                        <Chip label={`${stage.probability}%`} size="small" />
                                        {stage.rottenDays && (
                                          <Chip label={`${stage.rottenDays} days`} size="small" variant="outlined" />
                                        )}
                                      </Box>
                                    }
                                  />
                                  <ListItemSecondaryAction>
                                    <IconButton
                                      size="small"
                                      onClick={() => openStageDialog(stage)}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDeleteStage(stage.id)}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </ListItemSecondaryAction>
                                </ListItem>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </List>
                      )}
                    </Droppable>
                  </DragDropContext>
                </CardContent>
              </Card>

              {/* Analytics */}
              {analytics && (
                <>
                  {/* Stats Cards */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Total Deals
                          </Typography>
                          <Typography variant="h4">
                            {formatNumber(analytics.stats.totalDeals)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Won Deals
                          </Typography>
                          <Typography variant="h4" color="success.main">
                            {formatNumber(analytics.stats.wonDeals)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Win Rate
                          </Typography>
                          <Typography variant="h4">
                            {analytics.stats.conversionRate?.toFixed(1)}%
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Avg. Duration
                          </Typography>
                          <Typography variant="h4">
                            {analytics.stats.averageDealDuration?.toFixed(0)} days
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* Velocity Chart */}
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        <TimelineIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                        Pipeline Velocity
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Stage</TableCell>
                              <TableCell align="right">Avg. Duration</TableCell>
                              <TableCell align="right">Deal Count</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {Object.entries(analytics.velocity).map(([stageId, data]) => (
                              <TableRow key={stageId}>
                                <TableCell>
                                  {selectedPipeline.stages.find(s => s.id === stageId)?.name || stageId}
                                </TableCell>
                                <TableCell align="right">
                                  {data.avgDuration?.toFixed(1)} days
                                </TableCell>
                                <TableCell align="right">
                                  {data.count}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>

                  {/* Conversion Funnel */}
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        <TrendingIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                        Conversion Funnel
                      </Typography>
                      {analytics.conversion.map((stage, index) => (
                        <Box key={stage.stageId} sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2">
                              {stage.stageName}
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {stage.count} deals ({stage.conversionRate?.toFixed(1)}%)
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={stage.conversionRate || 0}
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          ) : (
            <Card>
              <CardContent>
                <Typography variant="h6" color="text.secondary" textAlign="center">
                  Select a pipeline or create a new one
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Create Pipeline Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Pipeline</DialogTitle>
        <DialogContent>
          <TextField
            label="Pipeline Name"
            fullWidth
            required
            value={newPipeline.name}
            onChange={(e) => setNewPipeline({ ...newPipeline, name: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={newPipeline.description}
            onChange={(e) => setNewPipeline({ ...newPipeline, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreatePipeline} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Stage Dialog */}
      <Dialog open={stageDialogOpen} onClose={() => setStageDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{currentStage ? 'Edit Stage' : 'Add Stage'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Stage Name"
                fullWidth
                required
                value={newStage.name}
                onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Probability (%)"
                type="number"
                fullWidth
                value={newStage.probability}
                onChange={(e) => setNewStage({ ...newStage, probability: parseInt(e.target.value) })}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Rotten Days"
                type="number"
                fullWidth
                value={newStage.rottenDays}
                onChange={(e) => setNewStage({ ...newStage, rottenDays: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                startIcon={<ColorIcon />}
                variant="outlined"
                onClick={() => setColorPickerOpen(!colorPickerOpen)}
                fullWidth
                sx={{ bgcolor: newStage.color, color: 'white', '&:hover': { bgcolor: newStage.color } }}
              >
                Choose Color
              </Button>
              {colorPickerOpen && (
                <Box sx={{ mt: 2 }}>
                  <SketchPicker
                    color={newStage.color}
                    onChange={(color) => setNewStage({ ...newStage, color: color.hex })}
                  />
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStageDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={currentStage ? handleUpdateStage : handleAddStage}
            variant="contained"
          >
            {currentStage ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PipelineManager;
