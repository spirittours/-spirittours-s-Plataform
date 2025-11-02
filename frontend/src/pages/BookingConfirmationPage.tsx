import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { fetchBookingById } from '../store/slices/bookingsSlice';
import { Card, Button, Loading, Badge } from '../components/UI';

const BookingConfirmationPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { currentBooking, loading } = useSelector((state: RootState) => state.bookings);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    if (bookingId) {
      dispatch(fetchBookingById(Number(bookingId)));
    }

    // Hide confetti after animation
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, [bookingId, dispatch]);

  if (loading || !currentBooking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading size="lg" text="Loading booking details..." />
      </div>
    );
  }

  const tour = currentBooking.tour;
  const totalParticipants = 
    currentBooking.number_of_adults + 
    currentBooking.number_of_children + 
    currentBooking.number_of_infants;

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <span className="text-2xl">🎉</span>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4 animate-bounce">
            <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-3">
            Booking Confirmed! 🎉
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Your adventure is booked and ready to go!
          </p>
          <div className="flex items-center justify-center gap-2 text-gray-700">
            <span className="font-semibold">Booking Reference:</span>
            <Badge variant="info" className="text-lg px-4 py-1">
              #{currentBooking.booking_reference || bookingId}
            </Badge>
          </div>
        </div>

        {/* Booking Details Card */}
        <Card className="mb-6" padding="lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-4 border-b">
            Booking Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Tour Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
                Tour Information
              </h3>
              
              {tour && (
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                      <img
                        src={tour.featured_image_url || 'https://via.placeholder.com/200x200'}
                        alt={tour.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="ml-4">
                      <h4 className="font-bold text-gray-800 mb-1">{tour.title}</h4>
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        {tour.location}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        {tour.duration_days} days
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Tour Date:</span>
                  <span className="font-semibold">
                    {new Date(currentBooking.tour_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Booking Status:</span>
                  <Badge
                    variant={
                      currentBooking.status === 'confirmed' ? 'success' :
                      currentBooking.status === 'pending' ? 'warning' :
                      currentBooking.status === 'cancelled' ? 'danger' : 'info'
                    }
                  >
                    {currentBooking.status?.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Payment Status:</span>
                  <Badge
                    variant={
                      currentBooking.payment_status === 'paid' ? 'success' :
                      currentBooking.payment_status === 'pending' ? 'warning' : 'danger'
                    }
                  >
                    {currentBooking.payment_status?.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Participants & Pricing */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                Participants
              </h3>

              <div className="space-y-2 mb-6">
                {currentBooking.number_of_adults > 0 && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Adults:</span>
                    <span className="font-semibold">{currentBooking.number_of_adults}</span>
                  </div>
                )}
                {currentBooking.number_of_children > 0 && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Children:</span>
                    <span className="font-semibold">{currentBooking.number_of_children}</span>
                  </div>
                )}
                {currentBooking.number_of_infants > 0 && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Infants:</span>
                    <span className="font-semibold">{currentBooking.number_of_infants}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 bg-blue-50 px-3 rounded-lg">
                  <span className="font-semibold text-gray-800">Total Participants:</span>
                  <span className="font-bold text-blue-600">{totalParticipants}</span>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                Pricing
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">${currentBooking.total_price}</span>
                </div>
                {currentBooking.discount_amount && currentBooking.discount_amount > 0 && (
                  <div className="flex justify-between py-2 text-green-600">
                    <span>Discount:</span>
                    <span className="font-semibold">-${currentBooking.discount_amount}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 bg-green-50 px-3 rounded-lg border-2 border-green-200">
                  <span className="font-bold text-gray-800 text-lg">Total Paid:</span>
                  <span className="font-bold text-green-600 text-xl">${currentBooking.total_price}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Special Requirements */}
          {currentBooking.special_requirements && (
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Special Requirements</h3>
              <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">
                {currentBooking.special_requirements}
              </p>
            </div>
          )}
        </Card>

        {/* What's Next Section */}
        <Card className="mb-6 bg-blue-50" padding="lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            What's Next?
          </h2>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                1
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Check Your Email</h4>
                <p className="text-sm text-gray-600">
                  We've sent a confirmation email with your booking details and e-ticket.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                2
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Prepare for Your Tour</h4>
                <p className="text-sm text-gray-600">
                  Review what to bring and arrival instructions in your confirmation email.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                3
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Share Your Experience</h4>
                <p className="text-sm text-gray-600">
                  After your tour, leave a review to help other travelers!
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate('/my-bookings')}
            size="lg"
            className="flex-1 sm:flex-initial"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
            View My Bookings
          </Button>
          <Button
            onClick={() => navigate('/tours')}
            variant="outline"
            size="lg"
            className="flex-1 sm:flex-initial"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
            Browse More Tours
          </Button>
        </div>

        {/* Support Info */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-2">
            Questions about your booking?
          </p>
          <Link to="/contact" className="text-blue-600 hover:text-blue-700 font-semibold">
            Contact Our Support Team →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationPage;
