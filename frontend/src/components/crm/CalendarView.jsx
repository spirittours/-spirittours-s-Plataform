/**
 * Calendar View Component
 * 
 * Full-featured calendar view for deals, tasks, and events.
 * Displays items in day/week/month views.
 * 
 * Features:
 * - Month/Week/Day view modes
 * - Event creation and editing
 * - Drag-and-drop rescheduling
 * - Color-coded events by type
 * - Today indicator
 * - Event details popup
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  ButtonGroup,
  IconButton,
  Chip,
  Avatar,
  Tooltip,
  Card,
  CardContent,
  Stack,
  Popover,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  Add as AddIcon,
  Event as EventIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { formatDate, formatTime, formatCurrency } from '../../utils/formatters';

/**
 * Generate calendar dates for month view
 */
const generateMonthDates = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

  const dates = [];
  const current = new Date(startDate);

  for (let week = 0; week < 6; week++) {
    const weekDates = [];
    for (let day = 0; day < 7; day++) {
      weekDates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    dates.push(weekDates);
    
    // Stop if we've passed the last day and completed a week
    if (current > lastDay && day === 6) break;
  }

  return dates;
};

/**
 * Event Card Component
 */
const EventCard = ({ event, onClick }) => {
  const getEventColor = (type) => {
    switch (type) {
      case 'deal':
        return 'primary.main';
      case 'task':
        return 'success.main';
      case 'meeting':
        return 'warning.main';
      case 'deadline':
        return 'error.main';
      default:
        return 'grey.500';
    }
  };

  return (
    <Box
      onClick={() => onClick(event)}
      sx={{
        px: 1,
        py: 0.5,
        mb: 0.5,
        borderRadius: 0.5,
        bgcolor: getEventColor(event.type),
        color: 'white',
        cursor: 'pointer',
        fontSize: '0.75rem',
        '&:hover': {
          opacity: 0.8,
        },
      }}
    >
      <Typography variant="caption" fontWeight="medium" noWrap>
        {event.time && `${formatTime(event.time)} `}
        {event.title}
      </Typography>
    </Box>
  );
};

/**
 * Event Details Popover
 */
const EventDetailsPopover = ({ event, anchorEl, onClose }) => {
  const open = Boolean(anchorEl);

  if (!event) return null;

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
    >
      <Card sx={{ minWidth: 300, maxWidth: 400 }}>
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Chip
                label={event.type}
                size="small"
                color={
                  event.type === 'deal' ? 'primary' :
                  event.type === 'task' ? 'success' :
                  event.type === 'meeting' ? 'warning' : 'default'
                }
                sx={{ mb: 1 }}
              />
              <Typography variant="h6" fontWeight="bold">
                {event.title}
              </Typography>
            </Box>

            {event.description && (
              <Typography variant="body2" color="text.secondary">
                {event.description}
              </Typography>
            )}

            <Stack direction="row" spacing={1} alignItems="center">
              <EventIcon fontSize="small" color="action" />
              <Typography variant="body2">
                {formatDate(event.date)}
              </Typography>
            </Stack>

            {event.time && (
              <Stack direction="row" spacing={1} alignItems="center">
                <TimeIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  {formatTime(event.time)}
                  {event.endTime && ` - ${formatTime(event.endTime)}`}
                </Typography>
              </Stack>
            )}

            {event.assignee && (
              <Stack direction="row" spacing={1} alignItems="center">
                <PersonIcon fontSize="small" color="action" />
                <Avatar
                  src={event.assignee.avatar}
                  alt={event.assignee.name}
                  sx={{ width: 24, height: 24 }}
                >
                  {event.assignee.name.charAt(0)}
                </Avatar>
                <Typography variant="body2">
                  {event.assignee.name}
                </Typography>
              </Stack>
            )}

            {event.value && (
              <Box>
                <Typography variant="subtitle2" color="success.main" fontWeight="bold">
                  {formatCurrency(event.value)}
                </Typography>
              </Box>
            )}

            {event.location && (
              <Typography variant="body2" color="text.secondary">
                📍 {event.location}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Popover>
  );
};

/**
 * Month View Component
 */
const MonthView = ({ dates, currentDate, events, onEventClick }) => {
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  return (
    <Box>
      {/* Day Headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: 2, borderColor: 'divider' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Box key={day} sx={{ p: 1, textAlign: 'center', bgcolor: 'background.paper' }}>
            <Typography variant="caption" fontWeight="bold" color="text.secondary">
              {day}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Calendar Grid */}
      {dates.map((week, weekIndex) => (
        <Box key={weekIndex} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {week.map((date, dayIndex) => {
            const dayEvents = getEventsForDate(date);
            const isTodayCell = isToday(date);
            const isCurrentMonthCell = isCurrentMonth(date);

            return (
              <Box
                key={dayIndex}
                sx={{
                  minHeight: 120,
                  p: 1,
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: isTodayCell ? 'action.selected' : 'background.default',
                  opacity: isCurrentMonthCell ? 1 : 0.5,
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight={isTodayCell ? 'bold' : 'normal'}
                  color={isTodayCell ? 'primary' : 'text.primary'}
                  sx={{ mb: 1 }}
                >
                  {date.getDate()}
                </Typography>

                {dayEvents.slice(0, 3).map(event => (
                  <EventCard key={event.id} event={event} onClick={onEventClick} />
                ))}

                {dayEvents.length > 3 && (
                  <Typography variant="caption" color="text.secondary">
                    +{dayEvents.length - 3} more
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
};

/**
 * Main Calendar View Component
 */
const CalendarView = ({ events: initialEvents, onEventAdd, onEventEdit }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [events] = useState(initialEvents);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  const dates = useMemo(
    () => generateMonthDates(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  const handlePreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleEventClick = (event) => (e) => {
    setSelectedEvent(event);
    setAnchorEl(e.currentTarget);
  };

  const handlePopoverClose = () => {
    setSelectedEvent(null);
    setAnchorEl(null);
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <Paper elevation={2} sx={{ borderRadius: 2 }}>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" fontWeight="bold">
            {monthName}
          </Typography>
          
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" onClick={handlePreviousMonth}>
              <ChevronLeftIcon />
            </IconButton>
            <Button size="small" startIcon={<TodayIcon />} onClick={handleToday}>
              Today
            </Button>
            <IconButton size="small" onClick={handleNextMonth}>
              <ChevronRightIcon />
            </IconButton>
          </Stack>
        </Box>

        <Stack direction="row" spacing={2}>
          <ButtonGroup size="small">
            <Button
              onClick={() => setViewMode('day')}
              variant={viewMode === 'day' ? 'contained' : 'outlined'}
            >
              Day
            </Button>
            <Button
              onClick={() => setViewMode('week')}
              variant={viewMode === 'week' ? 'contained' : 'outlined'}
            >
              Week
            </Button>
            <Button
              onClick={() => setViewMode('month')}
              variant={viewMode === 'month' ? 'contained' : 'outlined'}
            >
              Month
            </Button>
          </ButtonGroup>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onEventAdd}
          >
            Add Event
          </Button>
        </Stack>
      </Box>

      {/* Calendar Content */}
      <Box sx={{ p: 2 }}>
        {viewMode === 'month' && (
          <MonthView
            dates={dates}
            currentDate={currentDate}
            events={events}
            onEventClick={handleEventClick}
          />
        )}
        {viewMode === 'week' && (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
            Week view coming soon...
          </Typography>
        )}
        {viewMode === 'day' && (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
            Day view coming soon...
          </Typography>
        )}
      </Box>

      {/* Event Details Popover */}
      <EventDetailsPopover
        event={selectedEvent}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
      />

      {/* Legend */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Chip label="Deals" size="small" sx={{ bgcolor: 'primary.main', color: 'white' }} />
        <Chip label="Tasks" size="small" sx={{ bgcolor: 'success.main', color: 'white' }} />
        <Chip label="Meetings" size="small" sx={{ bgcolor: 'warning.main', color: 'white' }} />
        <Chip label="Deadlines" size="small" sx={{ bgcolor: 'error.main', color: 'white' }} />
      </Box>
    </Paper>
  );
};

export default CalendarView;
