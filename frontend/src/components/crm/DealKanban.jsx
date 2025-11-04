/**
 * DealKanban Component
 * 
 * Drag-and-drop Kanban board for managing deals through pipeline stages.
 * Features: drag-drop, stage management, deal cards, quick actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
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
  LinearProgress,
  Menu,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';

const DealKanban = ({ workspaceId, pipelineId }) => {
  const [stages, setStages] = useState([]);
  const [deals, setDeals] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [newDeal, setNewDeal] = useState({
    title: '',
    value: 0,
    contact: '',
    expectedCloseDate: '',
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentStage, setCurrentStage] = useState(null);

  // Load pipeline and deals
  useEffect(() => {
    loadPipelineAndDeals();
  }, [pipelineId]);

  const loadPipelineAndDeals = async () => {
    try {
      setLoading(true);
      
      // Load pipeline with stages
      const pipelineRes = await axios.get(`/api/crm/pipelines/${pipelineId}`);
      const pipelineData = pipelineRes.data.data;
      setStages(pipelineData.stages);

      // Load deals for this pipeline
      const dealsRes = await axios.get(`/api/crm/deals`, {
        params: { workspace: workspaceId, pipeline: pipelineId },
      });
      
      // Group deals by stage
      const dealsByStage = {};
      pipelineData.stages.forEach(stage => {
        dealsByStage[stage.id] = [];
      });
      
      dealsRes.data.data.forEach(deal => {
        if (dealsByStage[deal.stage]) {
          dealsByStage[deal.stage].push(deal);
        }
      });
      
      setDeals(dealsByStage);
    } catch (error) {
      console.error('Error loading pipeline and deals:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle drag end
  const onDragEnd = useCallback(async (result) => {
    const { source, destination, draggableId } = result;

    // Dropped outside the list
    if (!destination) return;

    // No change in position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceStageId = source.droppableId;
    const destStageId = destination.droppableId;

    // Create new deals object
    const newDeals = { ...deals };
    const sourceDealsList = Array.from(newDeals[sourceStageId]);
    const destDealsList =
      sourceStageId === destStageId
        ? sourceDealsList
        : Array.from(newDeals[destStageId]);

    // Remove from source
    const [movedDeal] = sourceDealsList.splice(source.index, 1);

    // Add to destination
    destDealsList.splice(destination.index, 0, movedDeal);

    // Update state optimistically
    newDeals[sourceStageId] = sourceDealsList;
    newDeals[destStageId] = destDealsList;
    setDeals(newDeals);

    // Update on server
    try {
      await axios.put(`/api/crm/deals/${draggableId}/stage`, {
        stage: destStageId,
        note: `Moved from ${sourceStageId} to ${destStageId}`,
      });
    } catch (error) {
      console.error('Error updating deal stage:', error);
      // Revert on error
      loadPipelineAndDeals();
    }
  }, [deals]);

  // Handle create deal
  const handleCreateDeal = async () => {
    try {
      const response = await axios.post('/api/crm/deals', {
        ...newDeal,
        workspace: workspaceId,
        pipeline: pipelineId,
        stage: currentStage,
      });

      // Add to deals list
      const newDeals = { ...deals };
      newDeals[currentStage].unshift(response.data.data);
      setDeals(newDeals);

      // Reset form
      setNewDeal({
        title: '',
        value: 0,
        contact: '',
        expectedCloseDate: '',
      });
      setDealDialogOpen(false);
    } catch (error) {
      console.error('Error creating deal:', error);
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value || 0);
  };

  // Get stage color
  const getStageColor = (stage) => {
    return stage.color || '#3B82F6';
  };

  // Calculate stage total
  const getStageTotal = (stageId) => {
    const stageDeals = deals[stageId] || [];
    return stageDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  };

  // Render deal card
  const renderDealCard = (deal, index) => (
    <Draggable key={deal._id} draggableId={deal._id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          sx={{
            mb: 2,
            cursor: 'grab',
            opacity: snapshot.isDragging ? 0.8 : 1,
            transform: snapshot.isDragging ? 'rotate(2deg)' : 'none',
            '&:hover': {
              boxShadow: 3,
            },
          }}
          onClick={() => setSelectedDeal(deal)}
        >
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                {deal.title}
              </Typography>
              <IconButton size="small">
                <MoreIcon fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <MoneyIcon sx={{ fontSize: 18, mr: 0.5, color: 'success.main' }} />
              <Typography variant="body2" fontWeight={600}>
                {formatCurrency(deal.value)}
              </Typography>
            </Box>

            {deal.contact && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PersonIcon sx={{ fontSize: 18, mr: 0.5, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {deal.contact.first_name} {deal.contact.last_name}
                </Typography>
              </Box>
            )}

            {deal.expectedCloseDate && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CalendarIcon sx={{ fontSize: 18, mr: 0.5, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {new Date(deal.expectedCloseDate).toLocaleDateString()}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
              <Chip
                label={`${deal.probability}%`}
                size="small"
                color={deal.probability > 70 ? 'success' : deal.probability > 40 ? 'warning' : 'default'}
              />
              
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {deal.owner && (
                  <Tooltip title={`${deal.owner.first_name} ${deal.owner.last_name}`}>
                    <Avatar
                      sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
                    >
                      {deal.owner.first_name?.charAt(0)}
                    </Avatar>
                  </Tooltip>
                )}
              </Box>
            </Box>

            {/* Quick actions */}
            <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
              <Tooltip title="Call">
                <IconButton size="small" color="primary">
                  <PhoneIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Email">
                <IconButton size="small" color="primary">
                  <EmailIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="WhatsApp">
                <IconButton size="small" color="success">
                  <WhatsAppIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
      <DragDropContext onDragEnd={onDragEnd}>
        <Box sx={{ display: 'flex', gap: 2, minHeight: '80vh' }}>
          {stages.map((stage) => (
            <Box
              key={stage.id}
              sx={{
                minWidth: 300,
                maxWidth: 300,
                bgcolor: 'grey.50',
                borderRadius: 2,
                p: 2,
              }}
            >
              {/* Stage Header */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: getStageColor(stage),
                      }}
                    />
                    <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                      {stage.name}
                    </Typography>
                    <Chip
                      label={deals[stage.id]?.length || 0}
                      size="small"
                      sx={{ height: 20 }}
                    />
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      setAnchorEl(e.currentTarget);
                      setCurrentStage(stage.id);
                    }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Typography variant="body2" color="text.secondary">
                  {formatCurrency(getStageTotal(stage.id))}
                </Typography>
              </Box>

              {/* Deals List */}
              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      minHeight: 200,
                      bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
                      borderRadius: 1,
                      transition: 'background-color 0.2s',
                    }}
                  >
                    {deals[stage.id]?.map((deal, index) =>
                      renderDealCard(deal, index)
                    )}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </Box>
          ))}
        </Box>
      </DragDropContext>

      {/* Add Deal Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            setDealDialogOpen(true);
          }}
        >
          Create New Deal
        </MenuItem>
      </Menu>

      {/* Create Deal Dialog */}
      <Dialog
        open={dealDialogOpen}
        onClose={() => setDealDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Deal</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Deal Title"
                fullWidth
                value={newDeal.title}
                onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Value"
                type="number"
                fullWidth
                value={newDeal.value}
                onChange={(e) => setNewDeal({ ...newDeal, value: parseFloat(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Expected Close Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={newDeal.expectedCloseDate}
                onChange={(e) => setNewDeal({ ...newDeal, expectedCloseDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Contact ID"
                fullWidth
                value={newDeal.contact}
                onChange={(e) => setNewDeal({ ...newDeal, contact: e.target.value })}
                helperText="Enter contact ID or leave empty"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDealDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateDeal} variant="contained">
            Create Deal
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DealKanban;
