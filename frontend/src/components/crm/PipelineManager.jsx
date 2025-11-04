/**
 * PipelineManager Component
 * 
 * Configure and manage sales pipelines with stages.
 * Includes analytics, velocity tracking, and conversion funnel.
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Slider,
  Paper,
  Divider,
  CircularProgress,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  TrendingUp as TrendingUpIcon,
  Timeline as TimelineIcon,
  Insights as InsightsIcon,
} from '@mui/icons-material';
// Drag and drop temporarily disabled for React 19 compatibility
// Will be re-enabled with @dnd-kit in Phase 4
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const PipelineManager = ({ workspaceId }) => {
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openStageDialog, setOpenStageDialog] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [analytics, setAnalytics] = useState(null);
  const [velocity, setVelocity] = useState(null);
  const [conversion, setConversion] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [stageData, setStageData] = useState({
    name: '',
    probability: 50,
    color: '#3B82F6',
    rottenDays: 30,
  });

  useEffect(() => {
    fetchPipelines();
  }, [workspaceId]);

  useEffect(() => {
    if (selectedPipeline) {
      fetchAnalytics();
    }
  }, [selectedPipeline]);

  const fetchPipelines = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/crm/pipelines', {
        params: { workspace: workspaceId },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setPipelines(response.data.data);
      if (response.data.data.length > 0 && !selectedPipeline) {
        setSelectedPipeline(response.data.data[0]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!selectedPipeline) return;

    try {
      // Fetch statistics
      const statsRes = await axios.get(`/api/crm/pipelines/${selectedPipeline._id}/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setAnalytics(statsRes.data.data);

      // Fetch velocity
      const velocityRes = await axios.get(`/api/crm/pipelines/${selectedPipeline._id}/velocity`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setVelocity(velocityRes.data.data);

      // Fetch conversion
      const conversionRes = await axios.get(`/api/crm/pipelines/${selectedPipeline._id}/conversion`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setConversion(conversionRes.data.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleCreatePipeline = async () => {
    try {
      await axios.post(
        '/api/crm/pipelines',
        { ...formData, workspace: workspaceId },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchPipelines();
      setOpenDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error creating pipeline:', error);
    }
  };

  const handleAddStage = async () => {
    try {
      await axios.post(
        `/api/crm/pipelines/${selectedPipeline._id}/stages`,
        stageData,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchPipelines();
      setOpenStageDialog(false);
      resetStageForm();
    } catch (error) {
      console.error('Error adding stage:', error);
    }
  };

  const handleUpdateStage = async () => {
    try {
      await axios.put(
        `/api/crm/pipelines/${selectedPipeline._id}/stages/${selectedStage.id}`,
        stageData,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchPipelines();
      setOpenStageDialog(false);
      resetStageForm();
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  };

  const handleDeleteStage = async (stageId) => {
    if (window.confirm('Are you sure? Deals in this stage will need to be moved.')) {
      try {
        await axios.delete(
          `/api/crm/pipelines/${selectedPipeline._id}/stages/${stageId}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        fetchPipelines();
      } catch (error) {
        console.error('Error deleting stage:', error);
        alert(error.response?.data?.error || 'Cannot delete stage');
      }
    }
  };

  const handleReorderStages = async (result) => {
    if (!result.destination) return;

    const newStages = Array.from(selectedPipeline.stages);
    const [removed] = newStages.splice(result.source.index, 1);
    newStages.splice(result.destination.index, 0, removed);

    try {
      await axios.put(
        `/api/crm/pipelines/${selectedPipeline._id}/stages/reorder`,
        { stageOrder: newStages.map(s => s.id) },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Update local state
      setSelectedPipeline({ ...selectedPipeline, stages: newStages });
    } catch (error) {
      console.error('Error reordering stages:', error);
      fetchPipelines();
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
  };

  const resetStageForm = () => {
    setStageData({
      name: '',
      probability: 50,
      color: '#3B82F6',
      rottenDays: 30,
    });
    setSelectedStage(null);
  };

  const openEditStageDialog = (stage) => {
    setSelectedStage(stage);
    setStageData({
      name: stage.name,
      probability: stage.probability,
      color: stage.color,
      rottenDays: stage.rottenDays || 30,
    });
    setOpenStageDialog(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Pipeline Manager</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
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
                  >
                    <ListItemText
                      primary={pipeline.name}
                      secondary={`${pipeline.stages?.length || 0} stages`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Pipeline Details */}
        <Grid item xs={12} md={9}>
          {selectedPipeline ? (
            <Card>
              <CardContent>
                <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
                  <Tab label="Stages" />
                  <Tab label="Analytics" />
                  <Tab label="Velocity" />
                </Tabs>

                {/* Stages Tab */}
                {currentTab === 0 && (
                  <Box mt={3}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">{selectedPipeline.name}</Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => setOpenStageDialog(true)}
                      >
                        Add Stage
                      </Button>
                    </Box>

                    <DragDropContext onDragEnd={handleReorderStages}>
                      <Droppable droppableId="stages">
                        {(provided) => (
                          <List
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                          >
                            {selectedPipeline.stages?.map((stage, index) => (
                              <Draggable key={stage.id} draggableId={stage.id} index={index}>
                                {(provided) => (
                                  <Paper
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    sx={{ mb: 2, p: 2 }}
                                  >
                                    <Box display="flex" alignItems="center" gap={2}>
                                      <Box {...provided.dragHandleProps}>
                                        <DragIcon />
                                      </Box>
                                      <Box
                                        sx={{
                                          width: 20,
                                          height: 20,
                                          borderRadius: '50%',
                                          backgroundColor: stage.color,
                                        }}
                                      />
                                      <Box flex={1}>
                                        <Typography variant="subtitle1">
                                          {stage.name}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                          Probability: {stage.probability}% | 
                                          Rotten after: {stage.rottenDays || 30} days
                                        </Typography>
                                      </Box>
                                      <IconButton
                                        size="small"
                                        onClick={() => openEditStageDialog(stage)}
                                      >
                                        <EditIcon />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleDeleteStage(stage.id)}
                                      >
                                        <DeleteIcon />
                                      </IconButton>
                                    </Box>
                                  </Paper>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </List>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </Box>
                )}

                {/* Analytics Tab */}
                {currentTab === 1 && analytics && (
                  <Box mt={3}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={3}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h4" color="primary">
                              {analytics.totalDeals || 0}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Total Deals
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h4" color="success.main">
                              {analytics.wonDeals || 0}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Won Deals
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h4" color="error.main">
                              {analytics.lostDeals || 0}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Lost Deals
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h4" color="secondary.main">
                              {analytics.conversionRate?.toFixed(1) || 0}%
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Win Rate
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Pipeline Distribution
                            </Typography>
                            {analytics.stageDistribution && (
                              <Doughnut
                                data={{
                                  labels: Object.keys(analytics.stageDistribution),
                                  datasets: [{
                                    data: Object.values(analytics.stageDistribution),
                                    backgroundColor: selectedPipeline.stages.map(s => s.color),
                                  }],
                                }}
                              />
                            )}
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Average Deal Duration
                            </Typography>
                            <Typography variant="h3" color="primary">
                              {analytics.averageDealDuration || 0}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              days
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* Velocity Tab */}
                {currentTab === 2 && velocity && (
                  <Box mt={3}>
                    <Typography variant="h6" gutterBottom>
                      Stage Velocity (Average Time per Stage)
                    </Typography>
                    <Bar
                      data={{
                        labels: Object.keys(velocity),
                        datasets: [{
                          label: 'Days in Stage',
                          data: Object.values(velocity).map(v => v.avgDuration / 24), // Convert hours to days
                          backgroundColor: '#3B82F6',
                        }],
                      }}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { display: false },
                          title: {
                            display: true,
                            text: 'Average Days Spent in Each Stage',
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Days' },
                          },
                        },
                      }}
                    />

                    {conversion && (
                      <Box mt={4}>
                        <Typography variant="h6" gutterBottom>
                          Conversion Funnel
                        </Typography>
                        <List>
                          {conversion.map((stage, index) => (
                            <ListItem key={stage.stage}>
                              <ListItemText
                                primary={
                                  <Box display="flex" alignItems="center" gap={2}>
                                    <Typography>{stage.stage}</Typography>
                                    <Chip
                                      label={`${stage.deals} deals`}
                                      size="small"
                                      color="primary"
                                    />
                                  </Box>
                                }
                                secondary={
                                  <Box mt={1}>
                                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                                      <Typography variant="caption">
                                        {stage.conversionRate?.toFixed(1)}% conversion
                                      </Typography>
                                    </Box>
                                    <Box
                                      sx={{
                                        width: '100%',
                                        height: 30,
                                        backgroundColor: '#e0e0e0',
                                        position: 'relative',
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          width: `${stage.conversionRate || 0}%`,
                                          height: '100%',
                                          backgroundColor: '#3B82F6',
                                        }}
                                      />
                                    </Box>
                                  </Box>
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <Typography variant="body1" color="textSecondary">
                  Select a pipeline to view details
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Create Pipeline Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Pipeline</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Pipeline Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreatePipeline} variant="contained" color="primary">
            Create Pipeline
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Stage Dialog */}
      <Dialog open={openStageDialog} onClose={() => setOpenStageDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedStage ? 'Edit Stage' : 'Add New Stage'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} mt={1}>
            <TextField
              label="Stage Name"
              value={stageData.name}
              onChange={(e) => setStageData({ ...stageData, name: e.target.value })}
              fullWidth
              required
            />
            
            <Box>
              <Typography gutterBottom>Probability: {stageData.probability}%</Typography>
              <Slider
                value={stageData.probability}
                onChange={(e, value) => setStageData({ ...stageData, probability: value })}
                min={0}
                max={100}
                valueLabelDisplay="auto"
              />
            </Box>

            <TextField
              label="Stage Color"
              type="color"
              value={stageData.color}
              onChange={(e) => setStageData({ ...stageData, color: e.target.value })}
              fullWidth
            />

            <TextField
              label="Rotten Days"
              type="number"
              value={stageData.rottenDays}
              onChange={(e) => setStageData({ ...stageData, rottenDays: parseInt(e.target.value) })}
              fullWidth
              helperText="Number of days before a deal becomes 'rotten' in this stage"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStageDialog(false)}>Cancel</Button>
          <Button
            onClick={selectedStage ? handleUpdateStage : handleAddStage}
            variant="contained"
            color="primary"
          >
            {selectedStage ? 'Update' : 'Add'} Stage
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PipelineManager;
