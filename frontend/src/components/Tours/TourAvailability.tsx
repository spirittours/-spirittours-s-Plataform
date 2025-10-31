import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Alert,
  Skeleton,
  ToggleButtonGroup,
  ToggleButton,
  Stack,
  Divider,
  Badge,
} from '@mui/material';
import {
  DateCalendar,
  LocalizationProvider,
  PickersDay,
  PickersDayProps,
} from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  CalendarMonth as CalendarMonthIcon,
  ViewWeek as ViewWeekIcon,
  ViewDay as ViewDayIcon,
  ContentCopy as ContentCopyIcon,
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { toast } from 'react-hot-toast';
import { toursService } from '../../services/toursService';
import { Availability, AvailabilityStatus, TimeSlot } from '../../types/tour.types';

interface TourAvailabilityProps {
  tourId: string;
  embedded?: boolean;
  onAvailabilityChange?: () => void;
}

interface AvailabilityFormData {
  date: Date | null;
  timeSlots: TimeSlot[];
  maxParticipants: number;
  price: number;
  status: AvailabilityStatus;
}

interface DayAvailability {
  date: Date;
  availability: Availability | null;
  status: 'available' | 'full' | 'blocked' | 'none';
  spotsLeft: number;
  totalSpots: number;
}

const TourAvailability: React.FC<TourAvailabilityProps> = ({
  tourId,
  embedded = false,
  onAvailabilityChange,
}) => {
  // State
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'week' | 'list'>('calendar');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<Availability | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [availabilityToDelete, setAvailabilityToDelete] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<AvailabilityFormData>({
    date: null,
    timeSlots: [{ startTime: '09:00', endTime: '17:00', maxParticipants: 10 }],
    maxParticipants: 10,
    price: 0,
    status: 'available',
  });

  // Load availabilities
  useEffect(() => {
    loadAvailabilities();
  }, [tourId, currentMonth]);

  const loadAvailabilities = async () => {
    try {
      setLoading(true);
      const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      
      const data = await toursService.getAvailability(tourId, startDate, endDate);
      setAvailabilities(data);
    } catch (error) {
      console.error('Failed to load availabilities:', error);
      toast.error('Failed to load availability data');
    } finally {
      setLoading(false);
    }
  };

  // Get availability for a specific date
  const getAvailabilityForDate = useCallback((date: Date): DayAvailability => {
    const availability = availabilities.find(a => 
      isSameDay(parseISO(a.date), date)
    );

    if (!availability) {
      return {
        date,
        availability: null,
        status: 'none',
        spotsLeft: 0,
        totalSpots: 0,
      };
    }

    const totalSpots = availability.maxParticipants;
    const bookedSpots = availability.bookings?.length || 0;
    const spotsLeft = totalSpots - bookedSpots;

    let status: 'available' | 'full' | 'blocked' | 'none';
    if (availability.status === 'blocked') {
      status = 'blocked';
    } else if (spotsLeft === 0) {
      status = 'full';
    } else {
      status = 'available';
    }

    return {
      date,
      availability,
      status,
      spotsLeft,
      totalSpots,
    };
  }, [availabilities]);

  // Custom day component for calendar
  const CustomDay = (props: PickersDayProps<Date>) => {
    const { day, ...other } = props;
    const dayAvailability = getAvailabilityForDate(day);

    const getDayColor = () => {
      switch (dayAvailability.status) {
        case 'available':
          return '#4caf50';
        case 'full':
          return '#ff9800';
        case 'blocked':
          return '#f44336';
        default:
          return 'transparent';
      }
    };

    return (
      <Badge
        key={day.toString()}
        overlap="circular"
        badgeContent={
          dayAvailability.status !== 'none' ? (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: getDayColor(),
              }}
            />
          ) : null
        }
      >
        <PickersDay
          {...other}
          day={day}
          onClick={() => handleDateClick(day)}
          sx={{
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.08)',
            },
          }}
        />
      </Badge>
    );
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const availability = getAvailabilityForDate(date);
    if (availability.availability) {
      setEditingAvailability(availability.availability);
      setFormData({
        date: date,
        timeSlots: availability.availability.timeSlots || [],
        maxParticipants: availability.availability.maxParticipants,
        price: availability.availability.price || 0,
        status: availability.availability.status,
      });
    } else {
      setEditingAvailability(null);
      setFormData({
        date: date,
        timeSlots: [{ startTime: '09:00', endTime: '17:00', maxParticipants: 10 }],
        maxParticipants: 10,
        price: 0,
        status: 'available',
      });
    }
    setOpenDialog(true);
  };

  // Handle month change
  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date);
  };

  // Handle view mode change
  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: 'calendar' | 'week' | 'list' | null,
  ) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  // Handle add time slot
  const handleAddTimeSlot = () => {
    setFormData({
      ...formData,
      timeSlots: [
        ...formData.timeSlots,
        { startTime: '09:00', endTime: '17:00', maxParticipants: 10 },
      ],
    });
  };

  // Handle remove time slot
  const handleRemoveTimeSlot = (index: number) => {
    setFormData({
      ...formData,
      timeSlots: formData.timeSlots.filter((_, i) => i !== index),
    });
  };

  // Handle time slot change
  const handleTimeSlotChange = (index: number, field: keyof TimeSlot, value: string | number) => {
    const updatedSlots = [...formData.timeSlots];
    updatedSlots[index] = { ...updatedSlots[index], [field]: value };
    setFormData({ ...formData, timeSlots: updatedSlots });
  };

  // Handle submit
  const handleSubmit = async () => {
    try {
      if (!formData.date) {
        toast.error('Please select a date');
        return;
      }

      const availabilityData = {
        date: format(formData.date, 'yyyy-MM-dd'),
        timeSlots: formData.timeSlots,
        maxParticipants: formData.maxParticipants,
        price: formData.price,
        status: formData.status,
      };

      if (editingAvailability) {
        await toursService.updateAvailability(tourId, editingAvailability.id, availabilityData);
        toast.success('Availability updated successfully');
      } else {
        await toursService.createAvailability(tourId, availabilityData);
        toast.success('Availability created successfully');
      }

      setOpenDialog(false);
      loadAvailabilities();
      onAvailabilityChange?.();
    } catch (error) {
      console.error('Failed to save availability:', error);
      toast.error('Failed to save availability');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!availabilityToDelete) return;

    try {
      await toursService.deleteAvailability(tourId, availabilityToDelete);
      toast.success('Availability deleted successfully');
      setDeleteConfirmOpen(false);
      setAvailabilityToDelete(null);
      loadAvailabilities();
      onAvailabilityChange?.();
    } catch (error) {
      console.error('Failed to delete availability:', error);
      toast.error('Failed to delete availability');
    }
  };

  // Handle block/unblock date
  const handleToggleBlock = async (availabilityId: string, currentStatus: AvailabilityStatus) => {
    try {
      const newStatus = currentStatus === 'blocked' ? 'available' : 'blocked';
      await toursService.updateAvailability(tourId, availabilityId, { status: newStatus });
      toast.success(`Date ${newStatus === 'blocked' ? 'blocked' : 'unblocked'} successfully`);
      loadAvailabilities();
      onAvailabilityChange?.();
    } catch (error) {
      console.error('Failed to toggle block:', error);
      toast.error('Failed to update status');
    }
  };

  // Handle copy availability
  const handleCopyAvailability = (availability: Availability) => {
    setFormData({
      date: null,
      timeSlots: availability.timeSlots || [],
      maxParticipants: availability.maxParticipants,
      price: availability.price || 0,
      status: 'available',
    });
    setEditingAvailability(null);
    setOpenDialog(true);
    toast.success('Availability copied. Select a date to paste.');
  };

  // Handle export
  const handleExport = async () => {
    try {
      const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(addMonths(currentMonth, 2)), 'yyyy-MM-dd');
      
      await toursService.exportAvailability(tourId, startDate, endDate);
      toast.success('Availability exported successfully');
    } catch (error) {
      console.error('Failed to export:', error);
      toast.error('Failed to export availability');
    }
  };

  // Render calendar view
  const renderCalendarView = () => (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <DateCalendar
              value={currentMonth}
              onChange={handleMonthChange}
              slots={{ day: CustomDay }}
              loading={loading}
            />
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Stack direction="row" spacing={2} justifyContent="center">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#4caf50' }} />
              <Typography variant="body2">Available</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#ff9800' }} />
              <Typography variant="body2">Full</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#f44336' }} />
              <Typography variant="body2">Blocked</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </LocalizationProvider>
  );

  // Render list view
  const renderListView = () => {
    const monthDays = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });

    const dayAvailabilities = monthDays.map(getAvailabilityForDate);

    return (
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Time Slots</TableCell>
                  <TableCell align="right">Available / Total</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                    </TableRow>
                  ))
                ) : dayAvailabilities.filter(da => da.status !== 'none').length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary">
                        No availability configured for this month
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  dayAvailabilities
                    .filter(da => da.status !== 'none')
                    .map((dayAvailability) => (
                      <TableRow key={dayAvailability.date.toISOString()}>
                        <TableCell>
                          <Typography variant="body2">
                            {format(dayAvailability.date, 'MMM dd, yyyy')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(dayAvailability.date, 'EEEE')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={dayAvailability.status}
                            color={
                              dayAvailability.status === 'available'
                                ? 'success'
                                : dayAvailability.status === 'full'
                                ? 'warning'
                                : 'error'
                            }
                            icon={
                              dayAvailability.status === 'available' ? (
                                <CheckCircleIcon />
                              ) : dayAvailability.status === 'full' ? (
                                <WarningIcon />
                              ) : (
                                <BlockIcon />
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {dayAvailability.availability?.timeSlots?.map((slot, index) => (
                            <Chip
                              key={index}
                              size="small"
                              label={`${slot.startTime} - ${slot.endTime}`}
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          )) || '-'}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {dayAvailability.spotsLeft} / {dayAvailability.totalSpots}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            ${dayAvailability.availability?.price || 0}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleDateClick(dayAvailability.date)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Copy">
                            <IconButton
                              size="small"
                              onClick={() =>
                                dayAvailability.availability &&
                                handleCopyAvailability(dayAvailability.availability)
                              }
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={dayAvailability.status === 'blocked' ? 'Unblock' : 'Block'}>
                            <IconButton
                              size="small"
                              onClick={() =>
                                dayAvailability.availability &&
                                handleToggleBlock(
                                  dayAvailability.availability.id,
                                  dayAvailability.availability.status
                                )
                              }
                            >
                              <BlockIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                if (dayAvailability.availability) {
                                  setAvailabilityToDelete(dayAvailability.availability.id);
                                  setDeleteConfirmOpen(true);
                                }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    );
  };

  // Render availability dialog
  const renderAvailabilityDialog = () => (
    <Dialog
      open={openDialog}
      onClose={() => setOpenDialog(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {editingAvailability ? 'Edit Availability' : 'Add Availability'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            {formData.date && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Configuring availability for {format(formData.date, 'MMMM dd, yyyy')}
              </Alert>
            )}
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Max Participants"
              type="number"
              value={formData.maxParticipants}
              onChange={(e) =>
                setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 0 })
              }
              InputProps={{ inputProps: { min: 1 } }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Price Override"
              type="number"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
              }
              InputProps={{ startAdornment: '$' }}
              helperText="Leave 0 to use default price"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as AvailabilityStatus })
                }
                label="Status"
              >
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="blocked">Blocked</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">Time Slots</Typography>
              <Button startIcon={<AddIcon />} onClick={handleAddTimeSlot} size="small">
                Add Slot
              </Button>
            </Box>

            {formData.timeSlots.map((slot, index) => (
              <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="Start Time"
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => handleTimeSlotChange(index, 'startTime', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="End Time"
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => handleTimeSlotChange(index, 'endTime', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    label="Max Participants"
                    type="number"
                    value={slot.maxParticipants}
                    onChange={(e) =>
                      handleTimeSlotChange(index, 'maxParticipants', parseInt(e.target.value) || 0)
                    }
                    InputProps={{ inputProps: { min: 1 } }}
                  />
                </Grid>
                <Grid item xs={1}>
                  <Tooltip title="Remove slot">
                    <IconButton
                      color="error"
                      onClick={() => handleRemoveTimeSlot(index)}
                      disabled={formData.timeSlots.length === 1}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Grid>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {editingAvailability ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Render delete confirmation dialog
  const renderDeleteConfirmDialog = () => (
    <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
      <DialogTitle>Confirm Delete</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete this availability? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
        <Button onClick={handleDelete} color="error" variant="contained">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      {/* Header */}
      {!embedded && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4">Tour Availability</Typography>
          <Stack direction="row" spacing={2}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
            >
              <ToggleButton value="calendar">
                <Tooltip title="Calendar View">
                  <CalendarMonthIcon />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="list">
                <Tooltip title="List View">
                  <ViewDayIcon />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExport}
            >
              Export
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setSelectedDate(new Date());
                setEditingAvailability(null);
                setFormData({
                  date: new Date(),
                  timeSlots: [{ startTime: '09:00', endTime: '17:00', maxParticipants: 10 }],
                  maxParticipants: 10,
                  price: 0,
                  status: 'available',
                });
                setOpenDialog(true);
              }}
            >
              Add Availability
            </Button>
          </Stack>
        </Box>
      )}

      {/* View Content */}
      {viewMode === 'calendar' ? renderCalendarView() : renderListView()}

      {/* Dialogs */}
      {renderAvailabilityDialog()}
      {renderDeleteConfirmDialog()}
    </Box>
  );
};

export default TourAvailability;
