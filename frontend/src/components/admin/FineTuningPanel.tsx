import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Tab,
  Tabs,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Cancel as CancelIcon,
  CloudUpload as DeployIcon,
  PlayArrow as StartIcon,
  Refresh as RefreshIcon,
  Timeline as MetricsIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  AttachMoney as CostIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

interface FineTuningPanelProps {
  workspaceId: string;
}

interface FineTuningJob {
  _id: string;
  jobId: string;
  name: string;
  baseModel: string;
  method: string;
  status: string;
  progress: {
    currentEpoch: number;
    totalEpochs: number;
    percentComplete: number;
  };
  resources: {
    gpuType: string;
    estimatedCost: number;
    actualCost?: number;
  };
  metrics: {
    trainingLoss: number[];
    validationLoss: number[];
  };
  deployment?: {
    status: string;
    endpoint?: string;
  };
  createdAt: string;
  completedAt?: string;
}

interface Model {
  id: string;
  name: string;
  contextWindow: number;
  recommendedGpu: string;
  estimatedTime: string;
  cost: string;
}

const FineTuningPanel: React.FC<FineTuningPanelProps> = ({ workspaceId }) => {
  const [jobs, setJobs] = useState<FineTuningJob[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<FineTuningJob | null>(null);
  
  // New job form
  const [newJob, setNewJob] = useState({
    name: '',
    description: '',
    baseModel: 'llama-3.1-8b',
    method: 'lora',
    trainingData: {
      source: 'workspace',
      filters: {},
    },
    hyperparameters: {
      epochs: 3,
      batchSize: 4,
      learningRate: 0.0001,
    },
  });

  useEffect(() => {
    loadJobs();
    loadModels();
  }, [workspaceId]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/ai/fine-tuning/${workspaceId}/jobs`);
      setJobs(response.data.jobs || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      const response = await axios.get('/api/ai/fine-tuning/models');
      setModels(response.data.models || []);
    } catch (error) {
      console.error('Error loading models:', error);
    }
  };

  const handleCreateJob = async () => {
    try {
      await axios.post(`/api/ai/fine-tuning/${workspaceId}/jobs`, newJob);
      setCreateDialogOpen(false);
      loadJobs();
      
      // Reset form
      setNewJob({
        name: '',
        description: '',
        baseModel: 'llama-3.1-8b',
        method: 'lora',
        trainingData: {
          source: 'workspace',
          filters: {},
        },
        hyperparameters: {
          epochs: 3,
          batchSize: 4,
          learningRate: 0.0001,
        },
      });
    } catch (error) {
      console.error('Error creating job:', error);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await axios.post(`/api/ai/fine-tuning/${workspaceId}/jobs/${jobId}/cancel`);
      loadJobs();
    } catch (error) {
      console.error('Error cancelling job:', error);
    }
  };

  const handleDeployModel = async (jobId: string) => {
    try {
      await axios.post(`/api/ai/fine-tuning/${workspaceId}/jobs/${jobId}/deploy`);
      loadJobs();
    } catch (error) {
      console.error('Error deploying model:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' } = {
      pending: 'default',
      preparing: 'info',
      training: 'primary',
      evaluating: 'secondary',
      completed: 'success',
      failed: 'error',
      cancelled: 'warning',
    };
    return colors[status] || 'default';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const renderJobsList = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Model</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Progress</TableCell>
            <TableCell>GPU</TableCell>
            <TableCell>Cost</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.jobId} hover onClick={() => setSelectedJob(job)} style={{ cursor: 'pointer' }}>
              <TableCell>
                <Typography variant="body2" fontWeight="bold">
                  {job.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {job.jobId}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip label={job.baseModel} size="small" />
                <Typography variant="caption" display="block" color="textSecondary">
                  Method: {job.method.toUpperCase()}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip label={job.status} color={getStatusColor(job.status)} size="small" />
              </TableCell>
              <TableCell>
                <Box sx={{ width: 100 }}>
                  <LinearProgress variant="determinate" value={job.progress.percentComplete} />
                  <Typography variant="caption">
                    {job.progress.percentComplete}%
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="caption">{job.resources.gpuType}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  ${job.resources.actualCost?.toFixed(2) || job.resources.estimatedCost.toFixed(2)}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="caption">{formatDate(job.createdAt)}</Typography>
              </TableCell>
              <TableCell>
                {['training', 'preparing'].includes(job.status) && (
                  <Tooltip title="Cancel">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleCancelJob(job.jobId); }}>
                      <CancelIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {job.status === 'completed' && job.deployment?.status !== 'deployed' && (
                  <Tooltip title="Deploy">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeployModel(job.jobId); }}>
                      <DeployIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderJobMetrics = () => {
    if (!selectedJob) {
      return (
        <Box textAlign="center" py={4}>
          <Typography color="textSecondary">Select a job to view metrics</Typography>
        </Box>
      );
    }

    const metricsData = selectedJob.metrics.trainingLoss.map((loss, index) => ({
      step: index + 1,
      trainingLoss: loss,
      validationLoss: selectedJob.metrics.validationLoss[index],
    }));

    return (
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {selectedJob.name}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="textSecondary">Status</Typography>
                    <Typography variant="h6">
                      <Chip label={selectedJob.status} color={getStatusColor(selectedJob.status)} />
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="textSecondary">Progress</Typography>
                    <Typography variant="h6">{selectedJob.progress.percentComplete}%</Typography>
                    <LinearProgress variant="determinate" value={selectedJob.progress.percentComplete} />
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="textSecondary">Epoch</Typography>
                    <Typography variant="h6">
                      {selectedJob.progress.currentEpoch}/{selectedJob.progress.totalEpochs}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="textSecondary">Cost</Typography>
                    <Typography variant="h6">
                      ${selectedJob.resources.actualCost?.toFixed(2) || selectedJob.resources.estimatedCost.toFixed(2)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Training & Validation Loss</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metricsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="step" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="trainingLoss" stroke="#8884d8" name="Training Loss" />
                    <Line type="monotone" dataKey="validationLoss" stroke="#82ca9d" name="Validation Loss" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderModelsInfo = () => (
    <Grid container spacing={2}>
      {models.map((model) => (
        <Grid item xs={12} md={6} lg={4} key={model.id}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>{model.name}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MemoryIcon fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="body2">Context: {model.contextWindow.toLocaleString()} tokens</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SpeedIcon fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="body2">GPU: {model.recommendedGpu}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MetricsIcon fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="body2">Time: {model.estimatedTime}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CostIcon fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="body2">Cost: {model.cost}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Fine-Tuning Pipeline</Typography>
        <Box>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadJobs}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            New Training Job
          </Button>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)}>
          <Tab label="Training Jobs" />
          <Tab label="Job Metrics" />
          <Tab label="Available Models" />
        </Tabs>
      </Box>

      {loading ? (
        <LinearProgress />
      ) : (
        <>
          {selectedTab === 0 && renderJobsList()}
          {selectedTab === 1 && renderJobMetrics()}
          {selectedTab === 2 && renderModelsInfo()}
        </>
      )}

      {/* Create Job Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Fine-Tuning Job</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Job Name"
                value={newJob.name}
                onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={newJob.description}
                onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Base Model</InputLabel>
                <Select
                  value={newJob.baseModel}
                  label="Base Model"
                  onChange={(e) => setNewJob({ ...newJob, baseModel: e.target.value })}
                >
                  {models.map((model) => (
                    <MenuItem key={model.id} value={model.id}>{model.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Training Method</InputLabel>
                <Select
                  value={newJob.method}
                  label="Training Method"
                  onChange={(e) => setNewJob({ ...newJob, method: e.target.value })}
                >
                  <MenuItem value="lora">LoRA (Recommended)</MenuItem>
                  <MenuItem value="qlora">QLoRA (Memory Efficient)</MenuItem>
                  <MenuItem value="full">Full Fine-tuning</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="Epochs"
                value={newJob.hyperparameters.epochs}
                onChange={(e) => setNewJob({
                  ...newJob,
                  hyperparameters: { ...newJob.hyperparameters, epochs: parseInt(e.target.value) }
                })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="Batch Size"
                value={newJob.hyperparameters.batchSize}
                onChange={(e) => setNewJob({
                  ...newJob,
                  hyperparameters: { ...newJob.hyperparameters, batchSize: parseInt(e.target.value) }
                })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="Learning Rate"
                value={newJob.hyperparameters.learningRate}
                onChange={(e) => setNewJob({
                  ...newJob,
                  hyperparameters: { ...newJob.hyperparameters, learningRate: parseFloat(e.target.value) }
                })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateJob} startIcon={<StartIcon />}>
            Start Training
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FineTuningPanel;
