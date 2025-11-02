import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  Grid,
  Chip,
  IconButton,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { Calendar, momentLocalizer, View, Event } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { TourAssignment, AssignmentStatus } from '../../types/staff.types';
import apiClient from '../../services/apiClient';

const localizer = momentLocalizer(moment);

interface CalendarEvent extends Event {
  id: string;
  resource: TourAssignment;
}

const ScheduleManagement: React.FC = () => {
  const [assignments, setAssignments] = useState<TourAssignment[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const { control, handleSubmit, reset } = useForm();

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    const calendarEvents: CalendarEvent[] = assignments.map((assignment) => {
      const start = new Date(assignment.date);
      const [startHour, startMin] = assignment.startTime.split(':').map(Number);
      start.setHours(startHour, startMin);

      const end = new Date(assignment.date);
      const [endHour, endMin] = assignment.endTime.split(':').map(Number);
      end.setHours(endHour, endMin);

      return {
        id: assignment.id,
        title: `${assignment.tourName} - ${assignment.guideName}`,
        start,
        end,
        resource: assignment,
      };
    });
    setEvents(calendarEvents);
  }, [assignments]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<TourAssignment[]>('/api/staff/assignments');
      setAssignments(response.data);
    } catch (err: any) {
      console.error('Error fetching assignments:', err);
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setOpenDialog(true);
  };

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setSelectedDate(start);
    setSelectedEvent(null);
    reset({ date: start });
    setOpenDialog(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (selectedEvent) {
        await apiClient.put(`/api/staff/assignments/${selectedEvent.id}`, data);
        toast.success('Assignment updated!');
      } else {
        await apiClient.post('/api/staff/assignments', data);
        toast.success('Assignment created!');
      }
      await fetchAssignments();
      setOpenDialog(false);
    } catch (err: any) {
      toast.error('Failed to save assignment');
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent || !window.confirm('Delete this assignment?')) return;

    try {
      await apiClient.delete(`/api/staff/assignments/${selectedEvent.id}`);
      toast.success('Assignment deleted!');
      await fetchAssignments();
      setOpenDialog(false);
    } catch (err: any) {
      toast.error('Failed to delete assignment');
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const status = event.resource.status;
    const colors: Record<string, string> = {
      scheduled: '#2196f3',
      confirmed: '#4caf50',
      in_progress: '#ff9800',
      completed: '#9e9e9e',
      cancelled: '#f44336',
    };

    return {
      style: {
        backgroundColor: colors[status] || '#2196f3',
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Schedule Management
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
          New Assignment
        </Button>
      </Box>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Today's Assignments
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {
                  assignments.filter(
                    (a) =>
                      new Date(a.date).toDateString() === new Date().toDateString()
                  ).length
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                This Week
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {assignments.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, height: 600 }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          eventPropGetter={eventStyleGetter}
          views={['month', 'week', 'day']}
          defaultView="week"
        />
      </Paper>

      {/* Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {selectedEvent ? 'Edit Assignment' : 'New Assignment'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Controller
                  name="tourName"
                  control={control}
                  defaultValue={selectedEvent?.resource.tourName || ''}
                  render={({ field }) => (
                    <TextField {...field} label="Tour Name" fullWidth />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="guideName"
                  control={control}
                  defaultValue={selectedEvent?.resource.guideName || ''}
                  render={({ field }) => (
                    <TextField {...field} label="Guide Name" fullWidth />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="startTime"
                  control={control}
                  defaultValue={selectedEvent?.resource.startTime || '09:00'}
                  render={({ field }) => (
                    <TextField {...field} label="Start Time" type="time" fullWidth />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="endTime"
                  control={control}
                  defaultValue={selectedEvent?.resource.endTime || '17:00'}
                  render={({ field }) => (
                    <TextField {...field} label="End Time" type="time" fullWidth />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            {selectedEvent && (
              <Button onClick={handleDelete} color="error">
                Delete
              </Button>
            )}
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              {selectedEvent ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ScheduleManagement;
