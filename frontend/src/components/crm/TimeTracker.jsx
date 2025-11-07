/**
 * Time Tracker Component
 * 
 * Complete time tracking interface with timer, manual entries, and reports.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Avatar,
  Stack,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  Divider,
  Alert,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as ApproveIcon,
  Close as RejectIcon,
  AccessTime as TimeIcon,
  AttachMoney as MoneyIcon,
  Assessment as ReportIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';

const TimeTracker = ({ workspaceId }) => {
  const [timeEntries, setTimeEntries] = useState([]);
  const [runningEntry, setRunningEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [openManualEntry, setOpenManualEntry] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Manual entry form state
  const [manualEntry, setManualEntry] = useState({
    description: '',
    project: '',
    task: '',
    duration: 0,
    billable: true,
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchTimeEntries();
    fetchRunningTimer();
  }, [workspaceId]);

  useEffect(() => {
    let interval;
    if (runningEntry) {
      interval = setInterval(() => {
        const start = new Date(runningEntry.startTime);
        const now = new Date();
        setElapsedTime(Math.floor((now - start) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [runningEntry]);

  const fetchTimeEntries = async () => {
    try {
      const response = await fetch(`/api/crm/time-entries/${workspaceId}/my`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (data.success) {
        setTimeEntries(data.timeEntries);
      }
    } catch (error) {
      console.error('Error fetching time entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRunningTimer = async () => {
    try {
      const response = await fetch(`/api/crm/time-entries/${workspaceId}/running`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (data.success && data.timeEntry) {
        setRunningEntry(data.timeEntry);
      }
    } catch (error) {
      console.error('Error fetching running timer:', error);
    }
  };

  const startTimer = async () => {
    try {
      const response = await fetch(`/api/crm/time-entries/${workspaceId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: 'Working on task',
          billable: true,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setRunningEntry(data.timeEntry);
        setElapsedTime(0);
      }
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  };

  const stopTimer = async () => {
    if (!runningEntry) return;
    
    try {
      const response = await fetch(`/api/crm/time-entries/${workspaceId}/${runningEntry._id}/stop`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (data.success) {
        setRunningEntry(null);
        setElapsedTime(0);
        fetchTimeEntries();
      }
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  };

  const createManualEntry = async () => {
    try {
      const response = await fetch(`/api/crm/time-entries/${workspaceId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...manualEntry,
          startTime: new Date(manualEntry.date),
          duration: manualEntry.duration * 3600, // Convert hours to seconds
        }),
      });
      const data = await response.json();
      if (data.success) {
        setOpenManualEntry(false);
        fetchTimeEntries();
        setManualEntry({
          description: '',
          project: '',
          task: '',
          duration: 0,
          billable: true,
          date: new Date().toISOString().split('T')[0],
        });
      }
    } catch (error) {
      console.error('Error creating manual entry:', error);
    }
  };

  const deleteEntry = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this time entry?')) return;
    
    try {
      const response = await fetch(`/api/crm/time-entries/${workspaceId}/${entryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (data.success) {
        fetchTimeEntries();
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatHours = (seconds) => {
    return (seconds / 3600).toFixed(2);
  };

  const getApprovalColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getTotalHours = () => {
    return timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
  };

  const getTotalCost = () => {
    return timeEntries.reduce((sum, entry) => sum + (entry.cost || 0), 0);
  };

  const getBillableHours = () => {
    return timeEntries
      .filter(e => e.billable)
      .reduce((sum, entry) => sum + (entry.duration || 0), 0);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Time Tracker
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenManualEntry(true)}
        >
          Add Manual Entry
        </Button>
      </Box>

      {/* Timer Widget */}
      <Card sx={{ mb: 3, bgcolor: runningEntry ? 'primary.main' : 'background.paper' }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={2} alignItems="center">
                <TimerIcon 
                  sx={{ 
                    fontSize: 48, 
                    color: runningEntry ? 'white' : 'action.active' 
                  }} 
                />
                <Box>
                  <Typography 
                    variant="h3" 
                    fontWeight="bold"
                    color={runningEntry ? 'white' : 'text.primary'}
                  >
                    {formatDuration(elapsedTime)}
                  </Typography>
                  {runningEntry && (
                    <Typography variant="body2" color="white">
                      {runningEntry.description}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6} sx={{ textAlign: 'right' }}>
              {!runningEntry ? (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayIcon />}
                  onClick={startTimer}
                  sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
                >
                  Start Timer
                </Button>
              ) : (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<StopIcon />}
                  onClick={stopTimer}
                  sx={{ bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' } }}
                >
                  Stop Timer
                </Button>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <TimeIcon color="primary" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {formatHours(getTotalHours())}h
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Hours
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <MoneyIcon color="success" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {formatHours(getBillableHours())}h
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Billable Hours
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <ReportIcon color="info" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    ${getTotalCost().toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Value
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="All Entries" />
          <Tab label="This Week" />
          <Tab label="Pending Approval" />
        </Tabs>
      </Paper>

      {/* Time Entries Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Project</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Billable</TableCell>
              <TableCell>Approval</TableCell>
              <TableCell>Cost</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {timeEntries.map((entry) => (
              <TableRow key={entry._id} hover>
                <TableCell>
                  {new Date(entry.startTime).toLocaleDateString()}
                </TableCell>
                <TableCell>{entry.description}</TableCell>
                <TableCell>
                  {entry.project?.name || '-'}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={formatHours(entry.duration) + 'h'} 
                    size="small" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {entry.billable ? (
                    <Chip label="Yes" size="small" color="success" />
                  ) : (
                    <Chip label="No" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={entry.approvalStatus}
                    size="small"
                    color={getApprovalColor(entry.approvalStatus)}
                  />
                </TableCell>
                <TableCell>
                  {entry.cost ? `$${entry.cost.toFixed(2)}` : '-'}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => deleteEntry(entry._id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Manual Entry Dialog */}
      <Dialog 
        open={openManualEntry} 
        onClose={() => setOpenManualEntry(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Add Manual Time Entry</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Description"
            value={manualEntry.description}
            onChange={(e) => setManualEntry({ ...manualEntry, description: e.target.value })}
            margin="normal"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="Date"
            type="date"
            value={manualEntry.date}
            onChange={(e) => setManualEntry({ ...manualEntry, date: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="Duration (hours)"
            type="number"
            value={manualEntry.duration}
            onChange={(e) => setManualEntry({ ...manualEntry, duration: parseFloat(e.target.value) })}
            margin="normal"
            inputProps={{ step: 0.25, min: 0 }}
          />
          <TextField
            fullWidth
            select
            label="Project"
            value={manualEntry.project}
            onChange={(e) => setManualEntry({ ...manualEntry, project: e.target.value })}
            margin="normal"
          >
            <MenuItem value="">None</MenuItem>
            <MenuItem value="project1">Project 1</MenuItem>
            <MenuItem value="project2">Project 2</MenuItem>
          </TextField>
          <FormControlLabel
            control={
              <Switch
                checked={manualEntry.billable}
                onChange={(e) => setManualEntry({ ...manualEntry, billable: e.target.checked })}
              />
            }
            label="Billable"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenManualEntry(false)}>Cancel</Button>
          <Button variant="contained" onClick={createManualEntry}>
            Add Entry
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TimeTracker;
