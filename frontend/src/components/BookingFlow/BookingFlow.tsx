/**
 * Booking Flow Component
 * Multi-step booking process with validation
 */

import React, { useState } from 'react';
import BookingCalendar from '../BookingCalendar/BookingCalendar';
import './BookingFlow.css';

interface Tour {
  id: number;
  name: string;
  description: string;
  base_price: number;
  duration_hours: number;
}

interface TimeSlot {
  slot_id: number;
  start_time: string;
  end_time: string;
  available_spots: number;
  max_capacity: number;
  price_per_person: number;
  current_bookings: number;
}

interface BookingData {
  tourId: number;
  slotId: number | null;
  selectedDate: Date | null;
  selectedTime: TimeSlot | null;
  numAdults: number;
  numChildren: number;
  numInfants: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  specialRequirements: string;
  dietaryRestrictions: string;
  accessibilityNeeds: string;
}

interface BookingFlowProps {
  tour: Tour;
  onBookingComplete?: (bookingReference: string) => void;
  onCancel?: () => void;
}

enum BookingStep {
  SELECT_DATE = 'select_date',
  PARTY_DETAILS = 'party_details',
  CUSTOMER_INFO = 'customer_info',
  REVIEW = 'review',
  CONFIRMATION = 'confirmation'
}

const BookingFlow: React.FC<BookingFlowProps> = ({
  tour,
  onBookingComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState<BookingStep>(BookingStep.SELECT_DATE);
  const [bookingData, setBookingData] = useState<BookingData>({
    tourId: tour.id,
    slotId: null,
    selectedDate: null,
    selectedTime: null,
    numAdults: 1,
    numChildren: 0,
    numInfants: 0,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    specialRequirements: '',
    dietaryRestrictions: '',
    accessibilityNeeds: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingReference, setBookingReference] = useState<string | null>(null);

  // Handle date and time slot selection
  const handleDateSelect = (date: Date, slots: TimeSlot[]) => {
    setBookingData(prev => ({
      ...prev,
      selectedDate: date,
      selectedTime: null,
      slotId: null
    }));
  };

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    setBookingData(prev => ({
      ...prev,
      selectedTime: slot,
      slotId: slot.slot_id
    }));
  };

  // Calculate total price
  const calculateTotalPrice = (): number => {
    if (!bookingData.selectedTime) return 0;
    
    const pricePerPerson = bookingData.selectedTime.price_per_person;
    const adultPrice = pricePerPerson * bookingData.numAdults;
    const childPrice = pricePerPerson * 0.7 * bookingData.numChildren; // 30% discount
    const infantPrice = 0; // Infants free
    
    const subtotal = adultPrice + childPrice + infantPrice;
    const tax = subtotal * 0.1; // 10% tax
    
    return subtotal + tax;
  };

  // Validate current step
  const canProceed = (): boolean => {
    switch (currentStep) {
      case BookingStep.SELECT_DATE:
        return bookingData.slotId !== null;
      case BookingStep.PARTY_DETAILS:
        return bookingData.numAdults + bookingData.numChildren + bookingData.numInfants > 0;
      case BookingStep.CUSTOMER_INFO:
        return (
          bookingData.customerName.trim() !== '' &&
          bookingData.customerEmail.trim() !== '' &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingData.customerEmail)
        );
      case BookingStep.REVIEW:
        return true;
      default:
        return false;
    }
  };

  // Navigation
  const goToNextStep = () => {
    const steps = [
      BookingStep.SELECT_DATE,
      BookingStep.PARTY_DETAILS,
      BookingStep.CUSTOMER_INFO,
      BookingStep.REVIEW
    ];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const goToPreviousStep = () => {
    const steps = [
      BookingStep.SELECT_DATE,
      BookingStep.PARTY_DETAILS,
      BookingStep.CUSTOMER_INFO,
      BookingStep.REVIEW
    ];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  // Submit booking
  const handleSubmitBooking = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/calendar/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header would be added by axios interceptor
        },
        body: JSON.stringify({
          tour_id: bookingData.tourId,
          booking_slot_id: bookingData.slotId,
          num_adults: bookingData.numAdults,
          num_children: bookingData.numChildren,
          num_infants: bookingData.numInfants,
          customer_name: bookingData.customerName,
          customer_email: bookingData.customerEmail,
          customer_phone: bookingData.customerPhone,
          special_requirements: bookingData.specialRequirements,
          dietary_restrictions: bookingData.dietaryRestrictions,
          accessibility_needs: bookingData.accessibilityNeeds
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create booking');
      }

      const data = await response.json();
      setBookingReference(data.booking_reference);
      setCurrentStep(BookingStep.CONFIRMATION);

      if (onBookingComplete) {
        onBookingComplete(data.booking_reference);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error creating booking:', err);
    } finally {
      setLoading(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case BookingStep.SELECT_DATE:
        return (
          <div className="booking-step">
            <h2>Select Date & Time</h2>
            <BookingCalendar
              tourId={tour.id}
              onDateSelect={handleDateSelect}
            />
            {bookingData.selectedDate && (
              <div className="time-slot-selection">
                <h3>Available Times</h3>
                {/* Time slots would be rendered here from BookingCalendar */}
              </div>
            )}
          </div>
        );

      case BookingStep.PARTY_DETAILS:
        return (
          <div className="booking-step">
            <h2>Party Size</h2>
            <div className="party-size-form">
              <div className="form-group">
                <label htmlFor="numAdults">Adults (Age 13+)</label>
                <input
                  type="number"
                  id="numAdults"
                  min="0"
                  max="20"
                  value={bookingData.numAdults}
                  onChange={(e) =>
                    setBookingData(prev => ({ ...prev, numAdults: parseInt(e.target.value) || 0 }))
                  }
                />
                <span className="price-info">
                  ${bookingData.selectedTime?.price_per_person.toFixed(2)} per person
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="numChildren">Children (Age 3-12)</label>
                <input
                  type="number"
                  id="numChildren"
                  min="0"
                  max="20"
                  value={bookingData.numChildren}
                  onChange={(e) =>
                    setBookingData(prev => ({ ...prev, numChildren: parseInt(e.target.value) || 0 }))
                  }
                />
                <span className="price-info">
                  ${((bookingData.selectedTime?.price_per_person || 0) * 0.7).toFixed(2)} per child
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="numInfants">Infants (Age 0-2)</label>
                <input
                  type="number"
                  id="numInfants"
                  min="0"
                  max="10"
                  value={bookingData.numInfants}
                  onChange={(e) =>
                    setBookingData(prev => ({ ...prev, numInfants: parseInt(e.target.value) || 0 }))
                  }
                />
                <span className="price-info">Free</span>
              </div>

              <div className="total-people">
                Total: {bookingData.numAdults + bookingData.numChildren + bookingData.numInfants} people
              </div>
            </div>
          </div>
        );

      case BookingStep.CUSTOMER_INFO:
        return (
          <div className="booking-step">
            <h2>Contact Information</h2>
            <div className="customer-info-form">
              <div className="form-group">
                <label htmlFor="customerName">Full Name *</label>
                <input
                  type="text"
                  id="customerName"
                  required
                  value={bookingData.customerName}
                  onChange={(e) =>
                    setBookingData(prev => ({ ...prev, customerName: e.target.value }))
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="customerEmail">Email Address *</label>
                <input
                  type="email"
                  id="customerEmail"
                  required
                  value={bookingData.customerEmail}
                  onChange={(e) =>
                    setBookingData(prev => ({ ...prev, customerEmail: e.target.value }))
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="customerPhone">Phone Number</label>
                <input
                  type="tel"
                  id="customerPhone"
                  value={bookingData.customerPhone}
                  onChange={(e) =>
                    setBookingData(prev => ({ ...prev, customerPhone: e.target.value }))
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="specialRequirements">Special Requirements</label>
                <textarea
                  id="specialRequirements"
                  rows={3}
                  value={bookingData.specialRequirements}
                  onChange={(e) =>
                    setBookingData(prev => ({ ...prev, specialRequirements: e.target.value }))
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="dietaryRestrictions">Dietary Restrictions</label>
                <textarea
                  id="dietaryRestrictions"
                  rows={2}
                  value={bookingData.dietaryRestrictions}
                  onChange={(e) =>
                    setBookingData(prev => ({ ...prev, dietaryRestrictions: e.target.value }))
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="accessibilityNeeds">Accessibility Needs</label>
                <textarea
                  id="accessibilityNeeds"
                  rows={2}
                  value={bookingData.accessibilityNeeds}
                  onChange={(e) =>
                    setBookingData(prev => ({ ...prev, accessibilityNeeds: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
        );

      case BookingStep.REVIEW:
        return (
          <div className="booking-step">
            <h2>Review Your Booking</h2>
            <div className="booking-review">
              <div className="review-section">
                <h3>Tour Details</h3>
                <p><strong>Tour:</strong> {tour.name}</p>
                <p><strong>Date:</strong> {bookingData.selectedDate?.toLocaleDateString()}</p>
                <p><strong>Time:</strong> {bookingData.selectedTime?.start_time}</p>
                <p><strong>Duration:</strong> {tour.duration_hours} hours</p>
              </div>

              <div className="review-section">
                <h3>Party Details</h3>
                <p><strong>Adults:</strong> {bookingData.numAdults}</p>
                <p><strong>Children:</strong> {bookingData.numChildren}</p>
                <p><strong>Infants:</strong> {bookingData.numInfants}</p>
              </div>

              <div className="review-section">
                <h3>Contact Information</h3>
                <p><strong>Name:</strong> {bookingData.customerName}</p>
                <p><strong>Email:</strong> {bookingData.customerEmail}</p>
                <p><strong>Phone:</strong> {bookingData.customerPhone || 'Not provided'}</p>
              </div>

              <div className="review-section price-summary">
                <h3>Price Summary</h3>
                <div className="price-line">
                  <span>Subtotal:</span>
                  <span>${(calculateTotalPrice() / 1.1).toFixed(2)}</span>
                </div>
                <div className="price-line">
                  <span>Tax (10%):</span>
                  <span>${(calculateTotalPrice() - calculateTotalPrice() / 1.1).toFixed(2)}</span>
                </div>
                <div className="price-line total">
                  <span>Total:</span>
                  <span>${calculateTotalPrice().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case BookingStep.CONFIRMATION:
        return (
          <div className="booking-step confirmation">
            <div className="confirmation-icon">✓</div>
            <h2>Booking Confirmed!</h2>
            <p className="booking-reference">
              Your booking reference: <strong>{bookingReference}</strong>
            </p>
            <p>A confirmation email has been sent to {bookingData.customerEmail}</p>
            <div className="confirmation-actions">
              <button className="btn btn-primary" onClick={() => window.location.href = '/my-bookings'}>
                View My Bookings
              </button>
              <button className="btn btn-secondary" onClick={() => window.location.href = '/'}>
                Return to Home
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render progress bar
  const renderProgressBar = () => {
    const steps = [
      { key: BookingStep.SELECT_DATE, label: 'Date & Time' },
      { key: BookingStep.PARTY_DETAILS, label: 'Party Size' },
      { key: BookingStep.CUSTOMER_INFO, label: 'Contact Info' },
      { key: BookingStep.REVIEW, label: 'Review' }
    ];

    const currentIndex = steps.findIndex(s => s.key === currentStep);

    return (
      <div className="booking-progress">
        {steps.map((step, index) => (
          <div
            key={step.key}
            className={`progress-step ${index <= currentIndex ? 'active' : ''} ${
              index < currentIndex ? 'completed' : ''
            }`}
          >
            <div className="step-number">{index + 1}</div>
            <div className="step-label">{step.label}</div>
          </div>
        ))}
      </div>
    );
  };

  if (currentStep === BookingStep.CONFIRMATION) {
    return (
      <div className="booking-flow">
        {renderStepContent()}
      </div>
    );
  }

  return (
    <div className="booking-flow">
      {renderProgressBar()}

      <div className="booking-content">
        {error && <div className="error-message">{error}</div>}
        {renderStepContent()}
      </div>

      <div className="booking-actions">
        {currentStep !== BookingStep.SELECT_DATE && (
          <button
            className="btn btn-secondary"
            onClick={goToPreviousStep}
            disabled={loading}
          >
            Back
          </button>
        )}

        {currentStep !== BookingStep.REVIEW && (
          <button
            className="btn btn-primary"
            onClick={goToNextStep}
            disabled={!canProceed() || loading}
          >
            Continue
          </button>
        )}

        {currentStep === BookingStep.REVIEW && (
          <button
            className="btn btn-primary"
            onClick={handleSubmitBooking}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Confirm Booking'}
          </button>
        )}

        <button
          className="btn btn-text"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default BookingFlow;
