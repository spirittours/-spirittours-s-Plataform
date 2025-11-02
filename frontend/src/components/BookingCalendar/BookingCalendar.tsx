/**
 * Booking Calendar Component
 * Interactive calendar for viewing and selecting available tour dates
 */

import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isAfter, isBefore } from 'date-fns';
import './BookingCalendar.css';

interface TimeSlot {
  slot_id: number;
  start_time: string;
  end_time: string;
  available_spots: number;
  max_capacity: number;
  price_per_person: number;
  current_bookings: number;
}

interface DayAvailability {
  available_spots: number;
  num_time_slots: number;
  has_availability: boolean;
}

interface BookingCalendarProps {
  tourId: number;
  onDateSelect?: (date: Date, slots: TimeSlot[]) => void;
  minDate?: Date;
  maxDate?: Date;
  initialDate?: Date;
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({
  tourId,
  onDateSelect,
  minDate = new Date(),
  maxDate,
  initialDate = new Date()
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(initialDate);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, DayAvailability>>({});
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch monthly availability when month changes
  useEffect(() => {
    fetchMonthlyAvailability();
  }, [currentMonth, tourId]);

  const fetchMonthlyAvailability = async () => {
    setLoading(true);
    setError(null);

    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;

      const response = await fetch(
        `/api/calendar/tours/${tourId}/monthly?year=${year}&month=${month}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }

      const data = await response.json();
      setAvailabilityMap(data.availability || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching availability:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = async (date: Date) => {
    // Don't allow selecting dates outside the allowed range
    if ((minDate && isBefore(date, minDate)) || (maxDate && isAfter(date, maxDate))) {
      return;
    }

    setSelectedDate(date);
    setLoading(true);
    setError(null);

    try {
      // Fetch available time slots for the selected date
      const response = await fetch('/api/calendar/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tour_id: tourId,
          requested_date: format(date, 'yyyy-MM-dd'),
          num_people: 1, // Default to 1, can be adjusted
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch time slots');
      }

      const data = await response.json();

      if (data.available && data.slots) {
        setSelectedSlots(data.slots);
        if (onDateSelect) {
          onDateSelect(date, data.slots);
        }
      } else {
        setSelectedSlots([]);
        setError(data.reason || 'No availability for this date');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching time slots:', err);
      setSelectedSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const getDayAvailability = (date: Date): DayAvailability | null => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return availabilityMap[dateKey] || null;
  };

  const getDayClassName = (date: Date): string => {
    const classes = ['calendar-day'];
    const availability = getDayAvailability(date);

    // Check if date is in current month
    if (!isSameMonth(date, currentMonth)) {
      classes.push('other-month');
    }

    // Check if date is selected
    if (selectedDate && isSameDay(date, selectedDate)) {
      classes.push('selected');
    }

    // Check if date is in the past or outside allowed range
    if ((minDate && isBefore(date, minDate)) || (maxDate && isAfter(date, maxDate))) {
      classes.push('disabled');
    }

    // Add availability classes
    if (availability) {
      if (availability.has_availability) {
        if (availability.available_spots > 10) {
          classes.push('high-availability');
        } else if (availability.available_spots > 3) {
          classes.push('medium-availability');
        } else {
          classes.push('low-availability');
        }
      } else {
        classes.push('no-availability');
      }
    }

    return classes.join(' ');
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add padding days for the start of the month
  const startDayOfWeek = monthStart.getDay();
  const paddingDays = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    paddingDays.push(null);
  }

  return (
    <div className="booking-calendar">
      {/* Calendar Header */}
      <div className="calendar-header">
        <button
          className="calendar-nav-button"
          onClick={goToPreviousMonth}
          aria-label="Previous month"
        >
          ‹
        </button>
        <h3 className="calendar-title">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          className="calendar-nav-button"
          onClick={goToNextMonth}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Legend */}
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color high-availability"></span>
          <span>High Availability</span>
        </div>
        <div className="legend-item">
          <span className="legend-color medium-availability"></span>
          <span>Medium</span>
        </div>
        <div className="legend-item">
          <span className="legend-color low-availability"></span>
          <span>Low</span>
        </div>
        <div className="legend-item">
          <span className="legend-color no-availability"></span>
          <span>Full</span>
        </div>
      </div>

      {/* Loading/Error States */}
      {loading && <div className="calendar-loading">Loading availability...</div>}
      {error && <div className="calendar-error">{error}</div>}

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="calendar-day-header">
            {day}
          </div>
        ))}

        {/* Padding days */}
        {paddingDays.map((_, index) => (
          <div key={`padding-${index}`} className="calendar-day empty"></div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((date) => {
          const availability = getDayAvailability(date);
          const isDisabled =
            (minDate && isBefore(date, minDate)) ||
            (maxDate && isAfter(date, maxDate));

          return (
            <div
              key={date.toISOString()}
              className={getDayClassName(date)}
              onClick={() => !isDisabled && handleDateClick(date)}
              role="button"
              tabIndex={isDisabled ? -1 : 0}
              aria-label={`${format(date, 'MMMM d, yyyy')}${
                availability
                  ? ` - ${availability.available_spots} spots available`
                  : ''
              }`}
            >
              <span className="day-number">{format(date, 'd')}</span>
              {availability && availability.has_availability && (
                <span className="day-spots">
                  {availability.available_spots} spots
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Date Time Slots */}
      {selectedDate && selectedSlots.length > 0 && (
        <div className="time-slots-section">
          <h4>Available Times for {format(selectedDate, 'MMMM d, yyyy')}</h4>
          <div className="time-slots-grid">
            {selectedSlots.map((slot) => (
              <div key={slot.slot_id} className="time-slot">
                <div className="time-slot-time">
                  {slot.start_time} - {slot.end_time}
                </div>
                <div className="time-slot-info">
                  <span className="time-slot-price">
                    ${slot.price_per_person.toFixed(2)} / person
                  </span>
                  <span className="time-slot-capacity">
                    {slot.available_spots} / {slot.max_capacity} available
                  </span>
                </div>
                <button
                  className="time-slot-select-button"
                  onClick={() => {
                    // Handle time slot selection
                    // This would typically navigate to booking form
                    console.log('Selected slot:', slot);
                  }}
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No availability message */}
      {selectedDate && selectedSlots.length === 0 && !loading && (
        <div className="no-slots-message">
          <p>No available time slots for {format(selectedDate, 'MMMM d, yyyy')}</p>
          <p>Please select another date or join the waitlist.</p>
        </div>
      )}
    </div>
  );
};

export default BookingCalendar;
