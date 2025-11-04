/**
 * DealKanban Component
 * 
 * Drag-and-drop kanban board for deal management.
 * Displays deals organized by pipeline stages with visual progress tracking.
 */

import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  VideoCall as VideoIcon,
  WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';

const DealKanban = ({ workspaceId, pipelineId }) => {
  const [pipeline, setPipeline] = useState(null);
  const [deals, setDeals] = useState({});
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    value: '',
    contact: '',
    expectedCloseDate: '',
    priority: 'medium',
  });

  useEffect(() => {
    if (pipelineId) {
      fetchPipelineAndDeals();
    }
  }, [pipelineId]);

  const fetchPipelineAndDeals = async () => {
    try {
      setLoading(true);
      
      // Fetch pipeline details
      const pipelineRes = await axios.get(`/api/crm/pipelines/${pipelineId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setPipeline(pipelineRes.data.data);

      // Fetch deals for this pipeline
      const dealsRes = await axios.get(`/api/crm/deals?workspace=${workspaceId}&pipeline=${pipelineId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      // Group deals by stage
      const dealsByStage = {};
      pipelineRes.data.data.stages.forEach(stage => {
        dealsByStage[stage.id] = dealsRes.data.data.filter(deal => deal.stage === stage.id);
      });
      setDeals(dealsByStage);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching pipeline and deals:', error);
      setLoading(false);
    }
  };

  // Configure drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over) return;

    // Extract deal ID and stage IDs
    const dealId = active.id;
    const newStageId = over.id;

    // Find the source stage
    let sourceStageId = null;
    for (const [stageId, stageDeals] of Object.entries(deals)) {
      if (stageDeals.some(deal => deal._id === dealId)) {
        sourceStageId = stageId;
        break;
      }
    }

    if (!sourceStageId || sourceStageId === newStageId) return;

    try {
      await axios.put(
        `/api/crm/deals/${dealId}/stage`,
        { stage: newStageId },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      // Update local state
      const newDeals = { ...deals };
      const dealIndex = newDeals[sourceStageId].findIndex(d => d._id === dealId);
      const [movedDeal] = newDeals[sourceStageId].splice(dealIndex, 1);
      newDeals[newStageId] = [...(newDeals[newStageId] || []), { ...movedDeal, stage: newStageId }];
      setDeals(newDeals);
    } catch (error) {
      console.error('Error moving deal:', error);
      fetchPipelineAndDeals();
    }
  };

  const handleCreateDeal = async () => {
    try {
      const response = await axios.post(
        '/api/crm/deals',
        {
          ...formData,
          workspace: workspaceId,
          pipeline: pipelineId,
          stage: pipeline.stages[0].id,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      // Add to first stage
      const firstStageId = pipeline.stages[0].id;
      setDeals({
        ...deals,
        [firstStageId]: [...(deals[firstStageId] || []), response.data.data],
      });

      setOpenDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error creating deal:', error);
    }
  };

  const handleRecordActivity = async (dealId, type) => {
    try {
      await axios.post(
        `/api/crm/deals/${dealId}/activity`,
        { type },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchPipelineAndDeals(); // Refresh to show updated engagement
    } catch (error) {
      console.error('Error recording activity:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      value: '',
      contact: '',
      expectedCloseDate: '',
      priority: 'medium',
    });
    setSelectedDeal(null);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'default',
      medium: 'primary',
      high: 'warning',
      urgent: 'error',
    };
    return colors[priority] || 'default';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!pipeline) {
    return (
      <Box p={3}>
        <Typography variant="h6">No pipeline selected</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">{pipeline.name}</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          New Deal
        </Button>
      </Box>

      {/* Kanban Board - Simplified without drag & drop for now */}
      <Grid container spacing={2}>
        {pipeline.stages.map((stage) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={stage.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" style={{ color: stage.color }}>
                    {stage.name}
                  </Typography>
                  <Chip
                    label={`${deals[stage.id]?.length || 0}`}
                    size="small"
                    color="primary"
                  />
                </Box>

                <Typography variant="caption" color="textSecondary" display="block" mb={2}>
                  {stage.probability}% probability
                </Typography>

                <Box
                  style={{
                    minHeight: '500px',
                    padding: '8px',
                  }}
                >
                  {deals[stage.id]?.map((deal) => (
                    <Card
                      key={deal._id}
                      style={{
                        marginBottom: '12px',
                        cursor: 'pointer',
                      }}
                      elevation={2}
                      onClick={() => {
                        setSelectedDeal(deal);
                        setFormData({
                          title: deal.title,
                          value: deal.value,
                          contact: deal.contact?._id || '',
                          expectedCloseDate: deal.expectedCloseDate || '',
                          priority: deal.priority || 'medium',
                        });
                        setOpenDialog(true);
                      }}
                    >
                                <CardContent>
                                  <Typography variant="subtitle1" gutterBottom>
                                    {deal.title}
                                  </Typography>

                                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                                    <MoneyIcon fontSize="small" color="action" />
                                    <Typography variant="h6" color="primary">
                                      {formatCurrency(deal.value)}
                                    </Typography>
                                  </Box>

                                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                                    <TrendingUpIcon fontSize="small" color="action" />
                                    <Typography variant="body2" color="textSecondary">
                                      Expected: {formatCurrency(deal.expectedValue)}
                                    </Typography>
                                  </Box>

                                  {deal.contact && (
                                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                                      <Avatar sx={{ width: 24, height: 24 }}>
                                        {deal.contact.first_name?.[0]}
                                      </Avatar>
                                      <Typography variant="body2">
                                        {deal.contact.first_name} {deal.contact.last_name}
                                      </Typography>
                                    </Box>
                                  )}

                                  <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                                    <Chip
                                      label={deal.priority}
                                      size="small"
                                      color={getPriorityColor(deal.priority)}
                                    />

                                    <Box display="flex" gap={0.5}>
                                      <Tooltip title="Log Call">
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRecordActivity(deal._id, 'call');
                                          }}
                                        >
                                          <PhoneIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Log Email">
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRecordActivity(deal._id, 'email');
                                          }}
                                        >
                                          <EmailIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Log Meeting">
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRecordActivity(deal._id, 'meeting');
                                          }}
                                        >
                                          <VideoIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Log WhatsApp">
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRecordActivity(deal._id, 'whatsapp');
                                          }}
                                        >
                                          <WhatsAppIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </Box>
                                  </Box>

                                  {deal.expectedCloseDate && (
                                    <Typography variant="caption" color="textSecondary" display="block" mt={1}>
                                      Expected: {new Date(deal.expectedCloseDate).toLocaleDateString()}
                                    </Typography>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

      {/* Create Deal Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Deal</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Deal Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Value"
              type="number"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              fullWidth
              InputProps={{ startAdornment: '$' }}
            />
            <TextField
              label="Expected Close Date"
              type="date"
              value={formData.expectedCloseDate}
              onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                label="Priority"
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateDeal} variant="contained" color="primary">
            Create Deal
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DealKanban;
