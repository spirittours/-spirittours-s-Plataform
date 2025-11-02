import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
} from '@mui/material';
import { CheckCircle, Cancel, Event } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { TourGuide, GuideStatus, DayAvailability } from '../../types/staff.types';
import apiClient from '../../services/apiClient';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TeamAvailability: React.FC = () => {
  const [guides, setGuides] = useState<TourGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    fetchGuides();
  }, []);

  const fetchGuides = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<TourGuide[]>('/api/staff/guides', {
        params: { status: GuideStatus.ACTIVE },
      });
      setGuides(response.data);
    } catch (err: any) {
      console.error('Error fetching guides:', err);
      toast.error('Failed to load team availability');
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (guideId: string, day: string, isAvailable: boolean) => {
    try {
      await apiClient.patch(`/api/staff/guides/${guideId}/availability`, {
        day: day.toLowerCase(),
        isAvailable: !isAvailable,
      });
      toast.success('Availability updated!');
      await fetchGuides();
    } catch (err: any) {
      toast.error('Failed to update availability');
    }
  };

  const getDayAvailability = (guide: TourGuide, dayIndex: number): boolean => {
    const dayKey = DAYS[dayIndex].toLowerCase() as keyof typeof guide.availability.weeklySchedule;
    return guide.availability.weeklySchedule[dayKey]?.isAvailable || false;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const availableToday = guides.filter((g) => {
    const today = new Date().getDay();
    const dayIndex = today === 0 ? 6 : today - 1;
    return getDayAvailability(g, dayIndex);
  }).length;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Team Availability
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and manage team member availability schedules
          </Typography>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Total Team Members
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {guides.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Available Today
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {availableToday}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                On Leave
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {guides.filter((g) => g.status === GuideStatus.ON_LEAVE).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Availability Rate
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {guides.length > 0 ? ((availableToday / guides.length) * 100).toFixed(0) : 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Availability Matrix */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Guide</TableCell>
                <TableCell>Status</TableCell>
                {DAYS.map((day) => (
                  <TableCell key={day} align="center">
                    {day.substring(0, 3)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {guides.map((guide) => (
                <TableRow key={guide.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {guide.firstName} {guide.lastName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={guide.status}
                      size="small"
                      color={guide.status === GuideStatus.ACTIVE ? 'success' : 'default'}
                    />
                  </TableCell>
                  {DAYS.map((day, idx) => {
                    const isAvailable = getDayAvailability(guide, idx);
                    return (
                      <TableCell key={day} align="center">
                        <FormControlLabel
                          control={
                            <Switch
                              checked={isAvailable}
                              onChange={() => toggleAvailability(guide.id, day, isAvailable)}
                              size="small"
                              color="success"
                            />
                          }
                          label=""
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Legend */}
      <Box display="flex" gap={2} mt={2}>
        <Chip icon={<CheckCircle />} label="Available" size="small" color="success" />
        <Chip icon={<Cancel />} label="Unavailable" size="small" />
      </Box>
    </Box>
  );
};

export default TeamAvailability;
