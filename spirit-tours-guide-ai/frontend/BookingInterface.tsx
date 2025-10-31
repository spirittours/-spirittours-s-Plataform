import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Calendar, Clock, Users, CreditCard, Tag, 
  AlertCircle, CheckCircle, Loader, ChevronRight,
  DollarSign, MapPin, User, Mail, Phone, X
} from 'lucide-react';

// Types
interface Tour {
  id: string;
  name: string;
  description: string;
  routeId: string;
  basePrice: number;
  maxCapacity: number;
  duration: string;
  meetingPoint: string;
}

interface AvailableDate {
  date: string;
  availableSlots: number;
  status: 'available' | 'limited' | 'full';
}

interface AvailableTime {
  time: string;
  available: boolean;
  availableCapacity: number;
  maxCapacity: number;
  basePrice: number;
}

interface PricingBreakdown {
  basePrice: number;
  seasonalMultiplier: number;
  dayOfWeekMultiplier: number;
  groupDiscount: number;
  earlyBirdDiscount?: number;
  lastMinuteDiscount?: number;
  discountCodeAmount?: number;
  subtotal: number;
  finalPrice: number;
  currency: string;
  discountDetails: string[];
}

interface PassengerInfo {
  name: string;
  age?: number;
  email?: string;
  phone?: string;
  specialRequests?: string;
}

interface BookingData {
  tourId: string;
  tourDate: string;
  tourTime: string;
  passengersCount: number;
  passengerDetails: PassengerInfo[];
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  discountCode?: string;
  currency: string;
  specialRequests?: string;
}

interface BookingInterfaceProps {
  tour: Tour;
  onBookingComplete?: (bookingId: string) => void;
  onCancel?: () => void;
}

const BookingInterface: React.FC<BookingInterfaceProps> = ({ 
  tour, 
  onBookingComplete, 
  onCancel 
}) => {
  // State
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Step 1: Date & Time Selection
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableTimes, setAvailableTimes] = useState<AvailableTime[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [passengersCount, setPassengersCount] = useState<number>(2);

  // Step 2: Passenger Details
  const [passengers, setPassengers] = useState<PassengerInfo[]>([
    { name: '', age: undefined, email: '', phone: '' }
  ]);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Step 3: Pricing & Discounts
  const [currency, setCurrency] = useState('USD');
  const [discountCode, setDiscountCode] = useState('');
  const [discountValidation, setDiscountValidation] = useState<{
    valid: boolean;
    discountAmount?: number;
    description?: string;
  } | null>(null);
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);

  // Step 4: Payment (handled by PaymentForm component)
  const [bookingId, setBookingId] = useState<string>('');

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

  // Load available dates when month changes
  useEffect(() => {
    loadAvailableDates();
  }, [selectedMonth, tour.id]);

  // Load available times when date is selected
  useEffect(() => {
    if (selectedDate) {
      loadAvailableTimes();
    }
  }, [selectedDate, tour.id]);

  // Calculate pricing when key parameters change
  useEffect(() => {
    if (selectedDate && selectedTime && passengersCount > 0) {
      calculatePricing();
    }
  }, [selectedDate, selectedTime, passengersCount, currency, discountCode]);

  // Update passengers array when count changes
  useEffect(() => {
    const newPassengers: PassengerInfo[] = Array.from(
      { length: passengersCount },
      (_, i) => passengers[i] || { name: '', age: undefined, email: '', phone: '' }
    );
    setPassengers(newPassengers);
  }, [passengersCount]);

  const loadAvailableDates = async () => {
    try {
      setLoading(true);
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      
      const response = await axios.get(`${API_BASE}/bookings/availability/dates`, {
        params: { tourId: tour.id, month, year }
      });

      setAvailableDates(response.data.dates || []);
    } catch (err: any) {
      console.error('Error loading dates:', err);
      setError(err.response?.data?.error || 'Failed to load available dates');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTimes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/bookings/availability/times`, {
        params: { tourId: tour.id, date: selectedDate }
      });

      setAvailableTimes(response.data.times || []);
    } catch (err: any) {
      console.error('Error loading times:', err);
      setError(err.response?.data?.error || 'Failed to load available times');
    } finally {
      setLoading(false);
    }
  };

  const calculatePricing = async () => {
    try {
      const response = await axios.post(`${API_BASE}/bookings/pricing/calculate`, {
        tourId: tour.id,
        date: selectedDate,
        time: selectedTime,
        passengers: passengersCount,
        discountCode: discountCode || undefined,
        currency
      });

      setPricing(response.data.pricing);
      
      if (discountCode && response.data.pricing.discountCodeAmount) {
        setDiscountValidation({
          valid: true,
          discountAmount: response.data.pricing.discountCodeAmount,
          description: `Code applied successfully`
        });
      }
    } catch (err: any) {
      console.error('Error calculating pricing:', err);
      if (discountCode) {
        setDiscountValidation({
          valid: false,
          description: err.response?.data?.error || 'Invalid discount code'
        });
      }
    }
  };

  const validateDiscountCode = async () => {
    if (!discountCode.trim()) return;

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE}/bookings/discount/validate`, {
        code: discountCode,
        amount: pricing?.subtotal || 0
      });

      setDiscountValidation({
        valid: response.data.valid,
        discountAmount: response.data.discountAmount,
        description: response.data.description
      });

      if (response.data.valid) {
        calculatePricing();
      }
    } catch (err: any) {
      setDiscountValidation({
        valid: false,
        description: err.response?.data?.error || 'Invalid discount code'
      });
    } finally {
      setLoading(false);
    }
  };

  const createBooking = async () => {
    try {
      setLoading(true);
      setError(null);

      const bookingData: BookingData = {
        tourId: tour.id,
        tourDate: selectedDate,
        tourTime: selectedTime,
        passengersCount,
        passengerDetails: passengers,
        contactName,
        contactEmail,
        contactPhone,
        discountCode: discountCode || undefined,
        currency,
        specialRequests: specialRequests || undefined
      };

      const response = await axios.post(`${API_BASE}/bookings/create`, bookingData);

      setBookingId(response.data.booking.bookingId);
      setSuccess('Booking created successfully! Proceeding to payment...');
      setStep(4);
    } catch (err: any) {
      console.error('Error creating booking:', err);
      setError(err.response?.data?.error || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep((step - 1) as 1 | 2 | 3 | 4);
      setError(null);
    }
  };

  const handleNext = () => {
    setError(null);

    if (step === 1) {
      if (!selectedDate || !selectedTime || passengersCount < 1) {
        setError('Please select date, time, and number of passengers');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!contactName || !contactEmail || !contactPhone) {
        setError('Please fill in all contact information');
        return;
      }
      
      const invalidPassenger = passengers.find(p => !p.name.trim());
      if (invalidPassenger) {
        setError('Please fill in names for all passengers');
        return;
      }
      
      setStep(3);
    } else if (step === 3) {
      createBooking();
    }
  };

  const formatCurrency = (amount: number, curr: string = currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Render Step Indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {[1, 2, 3, 4].map((s) => (
        <React.Fragment key={s}>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
            step === s 
              ? 'bg-blue-600 text-white' 
              : step > s 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-300 text-gray-600'
          }`}>
            {step > s ? <CheckCircle size={20} /> : s}
          </div>
          {s < 4 && (
            <ChevronRight className={step > s ? 'text-green-600' : 'text-gray-300'} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // Render Step 1: Date & Time Selection
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Calendar className="mr-2" /> Select Date & Time
        </h3>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Previous
          </button>
          <span className="font-semibold">
            {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Next
          </button>
        </div>

        {/* Available Dates */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {availableDates.map((dateObj) => (
            <button
              key={dateObj.date}
              onClick={() => setSelectedDate(dateObj.date)}
              disabled={dateObj.status === 'full'}
              className={`p-3 rounded text-center ${
                selectedDate === dateObj.date
                  ? 'bg-blue-600 text-white'
                  : dateObj.status === 'available'
                    ? 'bg-green-100 hover:bg-green-200'
                    : dateObj.status === 'limited'
                      ? 'bg-yellow-100 hover:bg-yellow-200'
                      : 'bg-gray-200 cursor-not-allowed'
              }`}
            >
              {new Date(dateObj.date).getDate()}
              {dateObj.status === 'limited' && (
                <div className="text-xs mt-1">Limited</div>
              )}
            </button>
          ))}
        </div>

        {selectedDate && (
          <div className="bg-blue-50 p-4 rounded mb-4">
            <p className="font-semibold">{formatDate(selectedDate)}</p>
          </div>
        )}

        {/* Available Times */}
        {selectedDate && availableTimes.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3 flex items-center">
              <Clock className="mr-2" size={18} /> Available Times
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {availableTimes.map((timeObj) => (
                <button
                  key={timeObj.time}
                  onClick={() => setSelectedTime(timeObj.time)}
                  disabled={!timeObj.available}
                  className={`p-3 rounded ${
                    selectedTime === timeObj.time
                      ? 'bg-blue-600 text-white'
                      : timeObj.available
                        ? 'bg-gray-100 hover:bg-gray-200'
                        : 'bg-gray-200 cursor-not-allowed text-gray-400'
                  }`}
                >
                  <div className="font-semibold">{timeObj.time}</div>
                  <div className="text-xs mt-1">
                    {timeObj.available 
                      ? `${timeObj.availableCapacity}/${timeObj.maxCapacity} spots`
                      : 'Full'
                    }
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Passengers Count */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center">
          <Users className="mr-2" size={18} /> Number of Passengers
        </h4>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setPassengersCount(Math.max(1, passengersCount - 1))}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            -
          </button>
          <span className="text-2xl font-semibold w-16 text-center">
            {passengersCount}
          </span>
          <button
            onClick={() => setPassengersCount(Math.min(tour.maxCapacity, passengersCount + 1))}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            +
          </button>
          <span className="text-gray-600">
            (Max: {tour.maxCapacity})
          </span>
        </div>
      </div>
    </div>
  );

  // Render Step 2: Passenger Details
  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold mb-4 flex items-center">
        <User className="mr-2" /> Passenger Information
      </h3>

      {/* Contact Information */}
      <div className="bg-yellow-50 p-4 rounded">
        <h4 className="font-semibold mb-3">Primary Contact</h4>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Full Name *"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="email"
            placeholder="Email Address *"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="tel"
            placeholder="Phone Number *"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      {/* Passenger Details */}
      <div>
        <h4 className="font-semibold mb-3">Passenger Details</h4>
        {passengers.map((passenger, index) => (
          <div key={index} className="bg-gray-50 p-4 rounded mb-3">
            <h5 className="font-semibold mb-2">Passenger {index + 1}</h5>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Full Name *"
                value={passenger.name}
                onChange={(e) => {
                  const updated = [...passengers];
                  updated[index].name = e.target.value;
                  setPassengers(updated);
                }}
                className="px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="number"
                placeholder="Age (optional)"
                value={passenger.age || ''}
                onChange={(e) => {
                  const updated = [...passengers];
                  updated[index].age = e.target.value ? parseInt(e.target.value) : undefined;
                  setPassengers(updated);
                }}
                className="px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Special Requests */}
      <div>
        <h4 className="font-semibold mb-3">Special Requests (Optional)</h4>
        <textarea
          placeholder="Dietary restrictions, accessibility needs, etc."
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          rows={4}
        />
      </div>
    </div>
  );

  // Render Step 3: Review & Pricing
  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold mb-4 flex items-center">
        <DollarSign className="mr-2" /> Review & Pricing
      </h3>

      {/* Booking Summary */}
      <div className="bg-blue-50 p-4 rounded">
        <h4 className="font-semibold mb-3">Booking Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Tour:</span>
            <span className="font-semibold">{tour.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Date:</span>
            <span className="font-semibold">{formatDate(selectedDate)}</span>
          </div>
          <div className="flex justify-between">
            <span>Time:</span>
            <span className="font-semibold">{selectedTime}</span>
          </div>
          <div className="flex justify-between">
            <span>Passengers:</span>
            <span className="font-semibold">{passengersCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Contact:</span>
            <span className="font-semibold">{contactName}</span>
          </div>
        </div>
      </div>

      {/* Currency Selection */}
      <div>
        <h4 className="font-semibold mb-3">Currency</h4>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
        >
          <option value="USD">USD - US Dollar</option>
          <option value="EUR">EUR - Euro</option>
          <option value="GBP">GBP - British Pound</option>
          <option value="JPY">JPY - Japanese Yen</option>
          <option value="CAD">CAD - Canadian Dollar</option>
          <option value="AUD">AUD - Australian Dollar</option>
          <option value="CHF">CHF - Swiss Franc</option>
          <option value="CNY">CNY - Chinese Yuan</option>
        </select>
      </div>

      {/* Discount Code */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center">
          <Tag className="mr-2" size={18} /> Discount Code
        </h4>
        <div className="flex space-x-3">
          <input
            type="text"
            placeholder="Enter discount code"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
            className="flex-1 px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={validateDiscountCode}
            disabled={!discountCode.trim() || loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
          >
            Apply
          </button>
        </div>
        {discountValidation && (
          <div className={`mt-2 p-2 rounded text-sm ${
            discountValidation.valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {discountValidation.description}
          </div>
        )}
      </div>

      {/* Pricing Breakdown */}
      {pricing && (
        <div className="bg-green-50 p-4 rounded">
          <h4 className="font-semibold mb-3">Pricing Breakdown</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Base Price ({passengersCount} passengers):</span>
              <span>{formatCurrency(pricing.basePrice)}</span>
            </div>
            
            {pricing.discountDetails.map((detail, index) => (
              <div key={index} className="flex justify-between text-green-600">
                <span>{detail}</span>
              </div>
            ))}
            
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(pricing.finalPrice, pricing.currency)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render Step 4: Payment (handled by separate component)
  const renderStep4 = () => (
    <div className="text-center">
      <CheckCircle className="mx-auto text-green-600 mb-4" size={64} />
      <h3 className="text-2xl font-bold mb-2">Booking Created!</h3>
      <p className="text-gray-600 mb-4">Booking ID: {bookingId}</p>
      <p className="mb-6">Proceeding to payment...</p>
      {/* PaymentForm component would be rendered here */}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Book Your Tour</h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <X size={24} />
          </button>
        )}
      </div>

      {/* Tour Info */}
      <div className="bg-gray-50 p-4 rounded mb-6">
        <h3 className="text-xl font-semibold mb-2">{tour.name}</h3>
        <p className="text-gray-600 mb-2">{tour.description}</p>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span className="flex items-center">
            <Clock size={16} className="mr-1" /> {tour.duration}
          </span>
          <span className="flex items-center">
            <Users size={16} className="mr-1" /> Max {tour.maxCapacity} people
          </span>
          <span className="flex items-center">
            <MapPin size={16} className="mr-1" /> {tour.meetingPoint}
          </span>
        </div>
      </div>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
          <AlertCircle className="mr-2" size={20} />
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
          <CheckCircle className="mr-2" size={20} />
          {success}
        </div>
      )}

      {/* Step Content */}
      <div className="mb-6">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>

      {/* Navigation Buttons */}
      {step < 4 && (
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={step === 1}
            className="px-6 py-3 bg-gray-200 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 flex items-center"
          >
            {loading ? (
              <>
                <Loader className="animate-spin mr-2" size={20} />
                Processing...
              </>
            ) : step === 3 ? (
              <>
                Create Booking
                <ChevronRight className="ml-2" size={20} />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="ml-2" size={20} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default BookingInterface;
