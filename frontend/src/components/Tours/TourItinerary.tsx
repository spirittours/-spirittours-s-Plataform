import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  TextField,
  Grid,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  FormControlLabel,
  Checkbox,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  DragIndicator as DragIndicatorIcon,
  ContentCopy as ContentCopyIcon,
  Restaurant as RestaurantIcon,
  Hotel as HotelIcon,
  LocalActivity as LocalActivityIcon,
  DirectionsCar as DirectionsCarIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationOnIcon,
} from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'react-hot-toast';
import { toursService } from '../../services/toursService';
import { Itinerary, ItineraryActivity } from '../../types/tour.types';

interface TourItineraryProps {
  tourId: string;
  itinerary: Itinerary[];
  editable?: boolean;
  onItineraryChange?: (itinerary: Itinerary[]) => void;
}

interface ItineraryFormData {
  day: number;
  title: string;
  description: string;
  activities: ItineraryActivity[];
  meals: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
  };
  accommodation: string;
  notes: string;
}

const TourItinerary: React.FC<TourItineraryProps> = ({
  tourId,
  itinerary: initialItinerary,
  editable = false,
  onItineraryChange,
}) => {
  // State
  const [itinerary, setItinerary] = useState<Itinerary[]>(initialItinerary);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<Itinerary | null>(null);
  const [dayToDelete, setDayToDelete] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | false>(false);

  // Form state
  const [formData, setFormData] = useState<ItineraryFormData>({
    day: 1,
    title: '',
    description: '',
    activities: [],
    meals: {
      breakfast: false,
      lunch: false,
      dinner: false,
    },
    accommodation: '',
    notes: '',
  });

  // Activity form state
  const [activityForm, setActivityForm] = useState<ItineraryActivity>({
    id: '',
    time: '09:00',
    title: '',
    description: '',
    location: '',
    duration: 60,
    type: 'activity',
  });

  // Setup sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = itinerary.findIndex((day) => day.id === active.id);
    const newIndex = itinerary.findIndex((day) => day.id === over.id);

    const reorderedItinerary = arrayMove(itinerary, oldIndex, newIndex).map((day, index) => ({
      ...day,
      day: index + 1,
    }));

    setItinerary(reorderedItinerary);
    onItineraryChange?.(reorderedItinerary);

    try {
      await toursService.updateItinerary(tourId, reorderedItinerary);
      toast.success('Itinerary reordered successfully');
    } catch (error) {
      console.error('Failed to reorder itinerary:', error);
      toast.error('Failed to save new order');
    }
  };

  // Handle add day
  const handleAddDay = () => {
    setEditingDay(null);
    setFormData({
      day: itinerary.length + 1,
      title: '',
      description: '',
      activities: [],
      meals: {
        breakfast: false,
        lunch: false,
        dinner: false,
      },
      accommodation: '',
      notes: '',
    });
    setDialogOpen(true);
  };

  // Handle edit day
  const handleEditDay = (day: Itinerary) => {
    setEditingDay(day);
    setFormData({
      day: day.day,
      title: day.title,
      description: day.description,
      activities: day.activities || [],
      meals: day.meals || { breakfast: false, lunch: false, dinner: false },
      accommodation: day.accommodation || '',
      notes: day.notes || '',
    });
    setDialogOpen(true);
  };

  // Handle save day
  const handleSaveDay = async () => {
    try {
      const dayData: Itinerary = {
        id: editingDay?.id || `day_${Date.now()}`,
        day: formData.day,
        title: formData.title,
        description: formData.description,
        activities: formData.activities,
        meals: formData.meals,
        accommodation: formData.accommodation,
        notes: formData.notes,
      };

      let updatedItinerary: Itinerary[];

      if (editingDay) {
        updatedItinerary = itinerary.map(day =>
          day.id === editingDay.id ? dayData : day
        );
      } else {
        updatedItinerary = [...itinerary, dayData];
      }

      setItinerary(updatedItinerary);
      onItineraryChange?.(updatedItinerary);

      await toursService.updateItinerary(tourId, updatedItinerary);
      toast.success(editingDay ? 'Day updated successfully' : 'Day added successfully');
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to save day:', error);
      toast.error('Failed to save day');
    }
  };

  // Handle delete day
  const handleDeleteDay = async () => {
    if (!dayToDelete) return;

    try {
      const updatedItinerary = itinerary
        .filter(day => day.id !== dayToDelete)
        .map((day, index) => ({
          ...day,
          day: index + 1,
        }));

      setItinerary(updatedItinerary);
      onItineraryChange?.(updatedItinerary);

      await toursService.updateItinerary(tourId, updatedItinerary);
      toast.success('Day deleted successfully');
      setDeleteConfirmOpen(false);
      setDayToDelete(null);
    } catch (error) {
      console.error('Failed to delete day:', error);
      toast.error('Failed to delete day');
    }
  };

  // Handle duplicate day
  const handleDuplicateDay = async (day: Itinerary) => {
    try {
      const newDay: Itinerary = {
        ...day,
        id: `day_${Date.now()}`,
        day: itinerary.length + 1,
        title: `${day.title} (Copy)`,
      };

      const updatedItinerary = [...itinerary, newDay];
      setItinerary(updatedItinerary);
      onItineraryChange?.(updatedItinerary);

      await toursService.updateItinerary(tourId, updatedItinerary);
      toast.success('Day duplicated successfully');
    } catch (error) {
      console.error('Failed to duplicate day:', error);
      toast.error('Failed to duplicate day');
    }
  };

  // Activity handlers
  const handleAddActivity = () => {
    setActivityForm({
      id: `activity_${Date.now()}`,
      time: '09:00',
      title: '',
      description: '',
      location: '',
      duration: 60,
      type: 'activity',
    });
    setActivityDialogOpen(true);
  };

  const handleEditActivity = (activity: ItineraryActivity) => {
    setActivityForm(activity);
    setActivityDialogOpen(true);
  };

  const handleSaveActivity = () => {
    const existingIndex = formData.activities.findIndex(a => a.id === activityForm.id);

    if (existingIndex >= 0) {
      const updatedActivities = [...formData.activities];
      updatedActivities[existingIndex] = activityForm;
      setFormData({ ...formData, activities: updatedActivities });
    } else {
      setFormData({
        ...formData,
        activities: [...formData.activities, activityForm],
      });
    }

    setActivityDialogOpen(false);
  };

  const handleDeleteActivity = (activityId: string) => {
    setFormData({
      ...formData,
      activities: formData.activities.filter(a => a.id !== activityId),
    });
  };

  // Get activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'meal':
        return <RestaurantIcon />;
      case 'accommodation':
        return <HotelIcon />;
      case 'transport':
        return <DirectionsCarIcon />;
      case 'activity':
      default:
        return <LocalActivityIcon />;
    }
  };

  // Sortable Day Component
  const SortableDay = ({ day }: { day: Itinerary }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: day.id, disabled: !editable });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const mealsIncluded = Object.values(day.meals || {}).filter(Boolean).length;

    return (
      <Accordion
        ref={setNodeRef}
        style={style}
        expanded={expandedDay === day.id}
        onChange={() => setExpandedDay(expandedDay === day.id ? false : day.id)}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            backgroundColor: 'background.paper',
            '&:hover': { backgroundColor: 'action.hover' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
            {editable && (
              <Box {...attributes} {...listeners} sx={{ cursor: 'grab', display: 'flex' }}>
                <DragIndicatorIcon color="action" />
              </Box>
            )}
            
            <Chip
              label={`Day ${day.day}`}
              color="primary"
              size="small"
            />
            
            <Typography variant="h6" sx={{ flex: 1 }}>
              {day.title}
            </Typography>
            
            <Stack direction="row" spacing={1} onClick={(e) => e.stopPropagation()}>
              {mealsIncluded > 0 && (
                <Chip
                  icon={<RestaurantIcon />}
                  label={`${mealsIncluded} meal${mealsIncluded > 1 ? 's' : ''}`}
                  size="small"
                  variant="outlined"
                />
              )}
              {day.accommodation && (
                <Chip
                  icon={<HotelIcon />}
                  label="Accommodation"
                  size="small"
                  variant="outlined"
                />
              )}
              {day.activities && day.activities.length > 0 && (
                <Chip
                  icon={<LocalActivityIcon />}
                  label={`${day.activities.length} activit${day.activities.length > 1 ? 'ies' : 'y'}`}
                  size="small"
                  variant="outlined"
                />
              )}
              
              {editable && (
                <>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={(e) => {
                      e.stopPropagation();
                      handleEditDay(day);
                    }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Duplicate">
                    <IconButton size="small" onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateDay(day);
                    }}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDayToDelete(day.id);
                        setDeleteConfirmOpen(true);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Stack>
          </Box>
        </AccordionSummary>
        
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="body1" paragraph>
                {day.description}
              </Typography>
            </Grid>
            
            {day.activities && day.activities.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon color="primary" />
                  Activities
                </Typography>
                <List>
                  {day.activities.map((activity, index) => (
                    <React.Fragment key={activity.id}>
                      {index > 0 && <Divider />}
                      <ListItem>
                        <ListItemIcon>
                          {getActivityIcon(activity.type)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip label={activity.time} size="small" />
                              <Typography variant="subtitle2">{activity.title}</Typography>
                              {activity.duration && (
                                <Chip
                                  label={`${activity.duration} min`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <>
                              {activity.description && (
                                <Typography variant="body2" color="text.secondary">
                                  {activity.description}
                                </Typography>
                              )}
                              {activity.location && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                  <LocationOnIcon fontSize="small" color="action" />
                                  <Typography variant="caption" color="text.secondary">
                                    {activity.location}
                                  </Typography>
                                </Box>
                              )}
                            </>
                          }
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </Grid>
            )}
            
            {(day.meals?.breakfast || day.meals?.lunch || day.meals?.dinner) && (
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, backgroundColor: 'background.default' }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <RestaurantIcon color="primary" fontSize="small" />
                    Meals Included
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    {day.meals.breakfast && <Chip label="Breakfast" size="small" color="success" />}
                    {day.meals.lunch && <Chip label="Lunch" size="small" color="success" />}
                    {day.meals.dinner && <Chip label="Dinner" size="small" color="success" />}
                  </Stack>
                </Paper>
              </Grid>
            )}
            
            {day.accommodation && (
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, backgroundColor: 'background.default' }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HotelIcon color="primary" fontSize="small" />
                    Accommodation
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {day.accommodation}
                  </Typography>
                </Paper>
              </Grid>
            )}
            
            {day.notes && (
              <Grid item xs={12}>
                <Alert severity="info" icon={<InfoIcon />}>
                  <Typography variant="body2">{day.notes}</Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>
    );
  };

  // Render day dialog
  const renderDayDialog = () => (
    <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        {editingDay ? `Edit Day ${editingDay.day}` : `Add Day ${formData.day}`}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Day Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Arrival in Tokyo"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief overview of the day's highlights"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">Activities</Typography>
              <Button startIcon={<AddIcon />} onClick={handleAddActivity}>
                Add Activity
              </Button>
            </Box>
            
            {formData.activities.length === 0 ? (
              <Alert severity="info">No activities added yet</Alert>
            ) : (
              <List>
                {formData.activities.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    {index > 0 && <Divider />}
                    <ListItem
                      secondaryAction={
                        <Stack direction="row" spacing={1}>
                          <IconButton size="small" onClick={() => handleEditActivity(activity)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteActivity(activity.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      }
                    >
                      <ListItemIcon>{getActivityIcon(activity.type)}</ListItemIcon>
                      <ListItemText
                        primary={`${activity.time} - ${activity.title}`}
                        secondary={activity.description}
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Meals Included
            </Typography>
            <Stack direction="row" spacing={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.meals.breakfast}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        meals: { ...formData.meals, breakfast: e.target.checked },
                      })
                    }
                  />
                }
                label="Breakfast"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.meals.lunch}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        meals: { ...formData.meals, lunch: e.target.checked },
                      })
                    }
                  />
                }
                label="Lunch"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.meals.dinner}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        meals: { ...formData.meals, dinner: e.target.checked },
                      })
                    }
                  />
                }
                label="Dinner"
              />
            </Stack>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Accommodation"
              value={formData.accommodation}
              onChange={(e) => setFormData({ ...formData, accommodation: e.target.value })}
              placeholder="e.g., Hilton Tokyo Bay - Deluxe Room"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Important information or special instructions"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
        <Button onClick={handleSaveDay} variant="contained">
          {editingDay ? 'Update' : 'Add'} Day
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Render activity dialog
  const renderActivityDialog = () => (
    <Dialog open={activityDialogOpen} onClose={() => setActivityDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        {activityForm.id && formData.activities.find(a => a.id === activityForm.id)
          ? 'Edit Activity'
          : 'Add Activity'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Time"
              type="time"
              value={activityForm.time}
              onChange={(e) => setActivityForm({ ...activityForm, time: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Duration (minutes)"
              type="number"
              value={activityForm.duration}
              onChange={(e) =>
                setActivityForm({ ...activityForm, duration: parseInt(e.target.value) || 0 })
              }
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Activity Title"
              value={activityForm.title}
              onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              value={activityForm.description}
              onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Location"
              value={activityForm.location}
              onChange={(e) => setActivityForm({ ...activityForm, location: e.target.value })}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setActivityDialogOpen(false)}>Cancel</Button>
        <Button onClick={handleSaveActivity} variant="contained">
          Save Activity
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Render delete confirmation
  const renderDeleteConfirm = () => (
    <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
      <DialogTitle>Confirm Delete</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete this day? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
        <Button onClick={handleDeleteDay} color="error" variant="contained">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      {editable && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">
            Tour Itinerary ({itinerary.length} {itinerary.length === 1 ? 'day' : 'days'})
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddDay}>
            Add Day
          </Button>
        </Box>
      )}

      {itinerary.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No itinerary configured yet. {editable && 'Click "Add Day" to start building the itinerary.'}
          </Typography>
        </Paper>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={itinerary.map(day => day.id)}
            strategy={verticalListSortingStrategy}
          >
            <Stack spacing={2}>
              {itinerary.map(day => (
                <SortableDay key={day.id} day={day} />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      )}

      {renderDayDialog()}
      {renderActivityDialog()}
      {renderDeleteConfirm()}
    </Box>
  );
};

export default TourItinerary;
