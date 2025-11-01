import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Stack,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
  Tooltip,
  Avatar,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  ViewWeek as ViewWeekIcon,
  ViewDay as ViewDayIcon,
  CalendarMonth as CalendarMonthIcon,
  FilterList as FilterListIcon,
  Person as PersonIcon,
  AttachMoney as AttachMoneyIcon,
} from '@mui/icons-material';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  isSameMonth,
  isSameDay,
  parseISO,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { bookingsService } from '../../services/bookingsService';
import { Booking, BookingStatus, BookingFilters } from '../../types/booking.types';

interface BookingCalendarProps {
  embedded?: boolean;
  tourId?: string;
}

interface CalendarDay {
  date: Date;
  bookings: Booking[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

type ViewMode = 'month' | 'week' | 'day';

const BookingCalendar: React.FC<BookingCalendarProps> = ({
  embedded = false,
  tourId,
}) => {
  const navigate = useNavigate();

  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState<BookingFilters>({
    tourId,
    status: [],
  });

  // Load bookings
  useEffect(() => {
    loadBookings();
  }, [currentDate, viewMode, filters]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on view mode
      let startDate: Date;
      let endDate: Date;

      switch (viewMode) {
        case 'month':
          startDate = startOfWeek(startOfMonth(currentDate));
          endDate = endOfWeek(endOfMonth(currentDate));
          break;
        case 'week':
          startDate = startOfWeek(currentDate);
          endDate = endOfWeek(currentDate);
          break;
        case 'day':
          startDate = startOfDay(currentDate);
          endDate = endOfDay(currentDate);
          break;
      }

      const response = await bookingsService.getBookings(1, 1000, {
        ...filters,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      });

      setBookings(response.bookings);
    } catch (error) {
      console.error('Failed to load bookings:', error);
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  // Navigation
  const handlePrevious = () => {
    switch (viewMode) {
      case 'month':
        setCurrentDate(addMonths(currentDate, -1));
        break;
      case 'week':
        setCurrentDate(addDays(currentDate, -7));
        break;
      case 'day':
        setCurrentDate(addDays(currentDate, -1));
        break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case 'month':
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(addDays(currentDate, 7));
        break;
      case 'day':
        setCurrentDate(addDays(currentDate, 1));
        break;
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Get bookings for specific date
  const getBookingsForDate = (date: Date): Booking[] => {
    return bookings.filter((booking) =>
      isSameDay(parseISO(booking.tourStartDate), date)
    );
  };

  // Get calendar days for month view
  const calendarDays: CalendarDay[] = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    const days: CalendarDay[] = [];
    let day = start;

    while (day <= end) {
      days.push({
        date: day,
        bookings: getBookingsForDate(day),
        isCurrentMonth: isSameMonth(day, currentDate),
        isToday: isSameDay(day, new Date()),
      });
      day = addDays(day, 1);
    }

    return days;
  }, [currentDate, bookings]);

  // Get week days
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  // Handle booking click
  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setDetailsDialogOpen(true);
  };

  const handleViewDetails = () => {
    if (selectedBooking) {
      navigate(`/bookings/${selectedBooking.id}`);
    }
  };

  // Get status color
  const getStatusColor = (status: BookingStatus): string => {
    switch (status) {
      case BookingStatus.CONFIRMED:
      case BookingStatus.PAID:
        return '#4caf50';
      case BookingStatus.PENDING:
        return '#ff9800';
      case BookingStatus.CANCELLED:
      case BookingStatus.NO_SHOW:
        return '#f44336';
      case BookingStatus.IN_PROGRESS:
        return '#2196f3';
      case BookingStatus.COMPLETED:
        return '#9c27b0';
      default:
        return '#9e9e9e';
    }
  };

  // Render month view
  const renderMonthView = () => (
    <Box>
      {/* Week day headers */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 1,
          mb: 1,
        }}
      >
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <Paper key={day} sx={{ p: 1, textAlign: 'center', bgcolor: 'action.hover' }}>
            <Typography variant="caption" fontWeight="medium">
              {day}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Calendar grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 1,
        }}
      >
        {calendarDays.map((day, index) => (
          <Paper
            key={index}
            sx={{
              p: 1,
              minHeight: 100,
              cursor: 'pointer',
              border: day.isToday ? '2px solid' : 'none',
              borderColor: 'primary.main',
              bgcolor: day.isCurrentMonth ? 'background.paper' : 'action.hover',
              opacity: day.isCurrentMonth ? 1 : 0.6,
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
            onClick={() => setSelectedDate(day.date)}
          >
            <Badge badgeContent={day.bookings.length} color="primary">
              <Typography
                variant="body2"
                fontWeight={day.isToday ? 'bold' : 'normal'}
                color={day.isToday ? 'primary' : 'inherit'}
              >
                {format(day.date, 'd')}
              </Typography>
            </Badge>

            {/* Booking indicators */}
            <Box sx={{ mt: 1 }}>
              {day.bookings.slice(0, 3).map((booking) => (
                <Tooltip key={booking.id} title={`${booking.customer.firstName} - ${booking.tourTitle}`}>
                  <Box
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookingClick(booking);
                    }}
                    sx={{
                      height: 6,
                      bgcolor: getStatusColor(booking.status),
                      borderRadius: 0.5,
                      mb: 0.5,
                      cursor: 'pointer',
                    }}
                  />
                </Tooltip>
              ))}
              {day.bookings.length > 3 && (
                <Typography variant="caption" color="text.secondary">
                  +{day.bookings.length - 3} more
                </Typography>
              )}
            </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  );

  // Render week view
  const renderWeekView = () => (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 2,
        }}
      >
        {weekDays.map((day) => {
          const dayBookings = getBookingsForDate(day);
          const isToday = isSameDay(day, new Date());

          return (
            <Paper
              key={day.toString()}
              sx={{
                p: 2,
                minHeight: 400,
                border: isToday ? '2px solid' : 'none',
                borderColor: 'primary.main',
              }}
            >
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                {format(day, 'EEE')}
              </Typography>
              <Typography variant="h5" gutterBottom color={isToday ? 'primary' : 'inherit'}>
                {format(day, 'd')}
              </Typography>

              <Stack spacing={1} sx={{ mt: 2 }}>
                {dayBookings.map((booking) => (
                  <Paper
                    key={booking.id}
                    sx={{
                      p: 1,
                      cursor: 'pointer',
                      borderLeft: '4px solid',
                      borderLeftColor: getStatusColor(booking.status),
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                    onClick={() => handleBookingClick(booking)}
                  >
                    <Typography variant="caption" fontWeight="medium" noWrap>
                      {booking.tourTitle}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary" noWrap>
                      {booking.customer.firstName} {booking.customer.lastName}
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                      <Chip
                        label={booking.totalParticipants}
                        size="small"
                        icon={<PersonIcon />}
                        sx={{ height: 16, '& .MuiChip-label': { px: 0.5 } }}
                      />
                      <Chip
                        label={booking.status}
                        size="small"
                        sx={{
                          height: 16,
                          bgcolor: getStatusColor(booking.status),
                          color: 'white',
                          '& .MuiChip-label': { px: 0.5 },
                        }}
                      />
                    </Stack>
                  </Paper>
                ))}

                {dayBookings.length === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    No bookings
                  </Typography>
                )}
              </Stack>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );

  // Render day view
  const renderDayView = () => {
    const dayBookings = getBookingsForDate(currentDate);

    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </Typography>

        {dayBookings.length === 0 ? (
          <Alert severity="info">No bookings for this date</Alert>
        ) : (
          <Stack spacing={2}>
            {dayBookings.map((booking) => (
              <Card key={booking.id}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {booking.tourTitle}
                      </Typography>

                      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Avatar sx={{ width: 24, height: 24 }}>
                            {booking.customer.firstName.charAt(0)}
                          </Avatar>
                          <Typography variant="body2">
                            {booking.customer.firstName} {booking.customer.lastName}
                          </Typography>
                        </Box>
                        <Chip
                          icon={<PersonIcon />}
                          label={`${booking.totalParticipants} participants`}
                          size="small"
                        />
                        <Chip
                          icon={<AttachMoneyIcon />}
                          label={`${booking.pricing.currency} ${booking.pricing.total}`}
                          size="small"
                        />
                      </Stack>

                      <Stack direction="row" spacing={1}>
                        <Chip
                          label={booking.status}
                          size="small"
                          sx={{
                            bgcolor: getStatusColor(booking.status),
                            color: 'white',
                          }}
                        />
                        <Chip label={booking.paymentStatus} size="small" variant="outlined" />
                        {booking.tags?.map((tag) => (
                          <Chip key={tag} label={tag} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    </Box>

                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/bookings/${booking.id}`)}
                    >
                      View Details
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>
    );
  };

  // Render booking details dialog
  const renderDetailsDialog = () => (
    <Dialog
      open={detailsDialogOpen}
      onClose={() => setDetailsDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      {selectedBooking && (
        <>
          <DialogTitle>
            Booking #{selectedBooking.bookingNumber}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Tour
                </Typography>
                <Typography variant="body1">{selectedBooking.tourTitle}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Customer
                </Typography>
                <Typography variant="body1">
                  {selectedBooking.customer.firstName} {selectedBooking.customer.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedBooking.customer.email}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Date
                </Typography>
                <Typography variant="body1">
                  {format(parseISO(selectedBooking.tourStartDate), 'MMM dd, yyyy')}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Participants
                </Typography>
                <Typography variant="body1">{selectedBooking.totalParticipants}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Amount
                </Typography>
                <Typography variant="h6" color="primary">
                  {selectedBooking.pricing.currency} {selectedBooking.pricing.total.toFixed(2)}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1}>
                <Chip label={selectedBooking.status} size="small" />
                <Chip label={selectedBooking.paymentStatus} size="small" />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
            <Button onClick={handleViewDetails} variant="contained">
              View Full Details
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );

  // Render filter dialog
  const renderFilterDialog = () => (
    <Dialog
      open={filterDialogOpen}
      onClose={() => setFilterDialogOpen(false)}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Filter Bookings</DialogTitle>
      <DialogContent dividers>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Status</InputLabel>
          <Select
            multiple
            value={filters.status || []}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as BookingStatus[] })}
            label="Status"
          >
            {Object.values(BookingStatus).map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          setFilters({ status: [] });
          setFilterDialogOpen(false);
        }}>
          Clear
        </Button>
        <Button onClick={() => setFilterDialogOpen(false)}>Close</Button>
        <Button onClick={() => {
          setFilterDialogOpen(false);
          loadBookings();
        }} variant="contained">
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      {/* Header */}
      {!embedded && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4">Booking Calendar</Typography>
        </Box>
      )}

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton onClick={handlePrevious}>
                <ChevronLeftIcon />
              </IconButton>
              <Button onClick={handleToday} variant="outlined" startIcon={<TodayIcon />}>
                Today
              </Button>
              <IconButton onClick={handleNext}>
                <ChevronRightIcon />
              </IconButton>

              <Typography variant="h6" sx={{ ml: 2 }}>
                {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
                {viewMode === 'week' &&
                  `${format(startOfWeek(currentDate), 'MMM d')} - ${format(
                    endOfWeek(currentDate),
                    'MMM d, yyyy'
                  )}`}
                {viewMode === 'day' && format(currentDate, 'MMMM d, yyyy')}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={2}>
              <Button
                startIcon={<FilterListIcon />}
                variant="outlined"
                onClick={() => setFilterDialogOpen(true)}
              >
                Filter
              </Button>

              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, val) => val && setViewMode(val)}
                size="small"
              >
                <ToggleButton value="month">
                  <Tooltip title="Month View">
                    <CalendarMonthIcon />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="week">
                  <Tooltip title="Week View">
                    <ViewWeekIcon />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="day">
                  <Tooltip title="Day View">
                    <ViewDayIcon />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Calendar Content */}
      <Card>
        <CardContent>
          {loading ? (
            <Typography>Loading calendar...</Typography>
          ) : (
            <>
              {viewMode === 'month' && renderMonthView()}
              {viewMode === 'week' && renderWeekView()}
              {viewMode === 'day' && renderDayView()}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {renderDetailsDialog()}
      {renderFilterDialog()}
    </Box>
  );
};

export default BookingCalendar;
