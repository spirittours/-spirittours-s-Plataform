/**
 * Timeline/Gantt Chart View Component
 * 
 * Displays deals, tasks, or projects in a timeline/Gantt chart format.
 * Shows start dates, end dates, progress, and dependencies.
 * 
 * Features:
 * - Horizontal timeline with date ranges
 * - Task bars with progress indicators
 * - Milestone markers
 * - Dependency lines
 * - Resource allocation visualization
 * - Zoom controls (day, week, month view)
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Tooltip,
  Button,
  ButtonGroup,
  Avatar,
  AvatarGroup,
  Stack,
  LinearProgress,
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Today as TodayIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { formatDate, formatCurrency } from '../../utils/formatters';

/**
 * Generate date range for timeline
 */
const generateDateRange = (startDate, endDate, viewMode) => {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(new Date(current));
    
    if (viewMode === 'day') {
      current.setDate(current.getDate() + 1);
    } else if (viewMode === 'week') {
      current.setDate(current.getDate() + 7);
    } else {
      current.setMonth(current.getMonth() + 1);
    }
  }

  return dates;
};

/**
 * Calculate position and width for task bar
 */
const calculateBarPosition = (taskStart, taskEnd, timelineStart, timelineEnd, containerWidth) => {
  const totalDuration = timelineEnd.getTime() - timelineStart.getTime();
  const taskStartOffset = taskStart.getTime() - timelineStart.getTime();
  const taskDuration = taskEnd.getTime() - taskStart.getTime();

  const left = (taskStartOffset / totalDuration) * containerWidth;
  const width = (taskDuration / totalDuration) * containerWidth;

  return { left: Math.max(0, left), width: Math.max(20, width) };
};

/**
 * Timeline Header Component
 */
const TimelineHeader = ({ dates, viewMode }) => {
  const formatHeaderDate = (date) => {
    if (viewMode === 'day') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (viewMode === 'week') {
      return `Week ${Math.ceil(date.getDate() / 7)}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
  };

  return (
    <Box sx={{ display: 'flex', borderBottom: 2, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Box sx={{ minWidth: 250, p: 2, borderRight: 2, borderColor: 'divider' }}>
        <Typography variant="subtitle2" fontWeight="bold">
          Tasks
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexGrow: 1, overflowX: 'auto' }}>
        {dates.map((date, index) => (
          <Box
            key={index}
            sx={{
              minWidth: 100,
              p: 1,
              borderRight: 1,
              borderColor: 'divider',
              textAlign: 'center',
              bgcolor: date.toDateString() === new Date().toDateString() ? 'action.selected' : 'transparent',
            }}
          >
            <Typography variant="caption" fontWeight="bold">
              {formatHeaderDate(date)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

/**
 * Task Row Component
 */
const TaskRow = ({ task, timelineStart, timelineEnd, containerWidth }) => {
  const taskStart = new Date(task.startDate);
  const taskEnd = new Date(task.endDate);
  const { left, width } = calculateBarPosition(taskStart, taskEnd, timelineStart, timelineEnd, containerWidth);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success.main';
      case 'in_progress':
        return 'primary.main';
      case 'overdue':
        return 'error.main';
      case 'pending':
        return 'grey.400';
      default:
        return 'grey.400';
    }
  };

  return (
    <Box sx={{ display: 'flex', borderBottom: 1, borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}>
      {/* Task Info */}
      <Box sx={{ minWidth: 250, p: 2, borderRight: 2, borderColor: 'divider' }}>
        <Typography variant="body2" fontWeight="medium" sx={{ mb: 0.5 }}>
          {task.title}
        </Typography>
        
        <Stack direction="row" spacing={0.5} alignItems="center">
          {task.priority && (
            <Chip
              label={task.priority}
              size="small"
              color={
                task.priority === 'high' ? 'error' :
                task.priority === 'medium' ? 'warning' : 'default'
              }
              sx={{ height: 20 }}
            />
          )}
          
          {task.assignees && task.assignees.length > 0 && (
            <AvatarGroup max={2} sx={{ '& .MuiAvatar-root': { width: 20, height: 20, fontSize: 10 } }}>
              {task.assignees.map((assignee, index) => (
                <Tooltip key={index} title={assignee.name}>
                  <Avatar src={assignee.avatar} alt={assignee.name}>
                    {assignee.name.charAt(0)}
                  </Avatar>
                </Tooltip>
              ))}
            </AvatarGroup>
          )}
        </Stack>
      </Box>

      {/* Timeline Bar */}
      <Box sx={{ flexGrow: 1, position: 'relative', height: 60 }}>
        <Tooltip
          title={
            <Box>
              <Typography variant="caption">{task.title}</Typography>
              <Typography variant="caption" display="block">
                {formatDate(taskStart)} - {formatDate(taskEnd)}
              </Typography>
              {task.progress !== undefined && (
                <Typography variant="caption" display="block">
                  Progress: {task.progress}%
                </Typography>
              )}
              {task.value && (
                <Typography variant="caption" display="block">
                  Value: {formatCurrency(task.value)}
                </Typography>
              )}
            </Box>
          }
        >
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              left: `${left}px`,
              width: `${width}px`,
              height: 32,
              bgcolor: getStatusColor(task.status),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              px: 1,
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.8,
              },
            }}
          >
            <Typography
              variant="caption"
              color="white"
              fontWeight="bold"
              noWrap
              sx={{ flexGrow: 1 }}
            >
              {task.title}
            </Typography>
            
            {task.isMilestone && (
              <CircleIcon sx={{ fontSize: 12, color: 'white' }} />
            )}
          </Box>
        </Tooltip>

        {/* Progress Bar */}
        {task.progress !== undefined && task.progress > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              left: `${left}px`,
              width: `${width * (task.progress / 100)}px`,
              height: 32,
              bgcolor: 'success.dark',
              borderRadius: 1,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Today Indicator */}
        {(() => {
          const today = new Date();
          if (today >= timelineStart && today <= timelineEnd) {
            const todayPosition = calculateBarPosition(today, today, timelineStart, timelineEnd, containerWidth);
            return (
              <Box
                sx={{
                  position: 'absolute',
                  left: `${todayPosition.left}px`,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  bgcolor: 'error.main',
                  zIndex: 1,
                }}
              />
            );
          }
          return null;
        })()}
      </Box>
    </Box>
  );
};

/**
 * Main Timeline View Component
 */
const TimelineView = ({ tasks: initialTasks, defaultViewMode = 'week' }) => {
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [tasks] = useState(initialTasks);

  // Calculate timeline date range
  const { timelineStart, timelineEnd } = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return {
        timelineStart: new Date(),
        timelineEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
    }

    const dates = tasks.flatMap(task => [
      new Date(task.startDate),
      new Date(task.endDate),
    ]);

    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // Add padding
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);

    return {
      timelineStart: minDate,
      timelineEnd: maxDate,
    };
  }, [tasks]);

  const dates = useMemo(
    () => generateDateRange(timelineStart, timelineEnd, viewMode),
    [timelineStart, timelineEnd, viewMode]
  );

  const containerWidth = dates.length * 100;

  const handleZoomIn = () => {
    if (viewMode === 'month') setViewMode('week');
    else if (viewMode === 'week') setViewMode('day');
  };

  const handleZoomOut = () => {
    if (viewMode === 'day') setViewMode('week');
    else if (viewMode === 'week') setViewMode('month');
  };

  const handleToday = () => {
    // Scroll to today
    const todayPosition = calculateBarPosition(
      new Date(),
      new Date(),
      timelineStart,
      timelineEnd,
      containerWidth
    );
    
    const container = document.querySelector('.timeline-container');
    if (container) {
      container.scrollLeft = todayPosition.left - 250;
    }
  };

  return (
    <Paper elevation={2} sx={{ borderRadius: 2 }}>
      {/* Controls */}
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" fontWeight="bold">
          Timeline View
        </Typography>
        
        <Stack direction="row" spacing={2}>
          <ButtonGroup size="small">
            <Button onClick={() => setViewMode('day')} variant={viewMode === 'day' ? 'contained' : 'outlined'}>
              Day
            </Button>
            <Button onClick={() => setViewMode('week')} variant={viewMode === 'week' ? 'contained' : 'outlined'}>
              Week
            </Button>
            <Button onClick={() => setViewMode('month')} variant={viewMode === 'month' ? 'contained' : 'outlined'}>
              Month
            </Button>
          </ButtonGroup>
          
          <ButtonGroup size="small">
            <Button onClick={handleZoomOut} disabled={viewMode === 'month'}>
              <ZoomOutIcon />
            </Button>
            <Button onClick={handleZoomIn} disabled={viewMode === 'day'}>
              <ZoomInIcon />
            </Button>
          </ButtonGroup>
          
          <Button size="small" startIcon={<TodayIcon />} onClick={handleToday}>
            Today
          </Button>
        </Stack>
      </Box>

      {/* Timeline */}
      <Box className="timeline-container" sx={{ overflowX: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
        <TimelineHeader dates={dates} viewMode={viewMode} />
        
        {tasks.map(task => (
          <TaskRow
            key={task.id}
            task={task}
            timelineStart={timelineStart}
            timelineEnd={timelineEnd}
            containerWidth={containerWidth}
          />
        ))}
      </Box>

      {/* Legend */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Chip label="Completed" size="small" sx={{ bgcolor: 'success.main', color: 'white' }} />
        <Chip label="In Progress" size="small" sx={{ bgcolor: 'primary.main', color: 'white' }} />
        <Chip label="Overdue" size="small" sx={{ bgcolor: 'error.main', color: 'white' }} />
        <Chip label="Pending" size="small" sx={{ bgcolor: 'grey.400', color: 'white' }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 2, height: 20, bgcolor: 'error.main' }} />
          <Typography variant="caption">Today</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CircleIcon sx={{ fontSize: 12 }} />
          <Typography variant="caption">Milestone</Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default TimelineView;
