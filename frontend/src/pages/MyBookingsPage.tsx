import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { fetchUserBookings, cancelBooking } from '../store/slices/bookingsSlice';
import { addToast } from '../store/slices/uiSlice';
import { Link } from 'react-router-dom';
import { Card, Button, Badge, Loading, Modal } from '../components/UI';

const MyBookingsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { bookings, loading } = useSelector((state: RootState) => state.bookings);
  
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<number | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  
  useEffect(() => {
    dispatch(fetchUserBookings({}));
  }, [dispatch]);

  const filteredBookings = bookings
    .filter(booking => {
      if (filterStatus === 'all') return true;
      return booking.status === filterStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.tour_date).getTime() - new Date(b.tour_date).getTime();
        case 'date_desc':
          return new Date(b.tour_date).getTime() - new Date(a.tour_date).getTime();
        case 'price_asc':
          return a.total_price - b.total_price;
        case 'price_desc':
          return b.total_price - a.total_price;
        case 'booking_date':
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        default:
          return 0;
      }
    });

  const upcomingBookings = bookings.filter(
    b => b.status === 'confirmed' && new Date(b.tour_date) > new Date()
  );
  const pastBookings = bookings.filter(
    b => new Date(b.tour_date) <= new Date()
  );
  const cancelledBookings = bookings.filter(
    b => b.status === 'cancelled'
  );

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;
    
    setIsCancelling(true);
    try {
      await dispatch(cancelBooking(bookingToCancel)).unwrap();
      dispatch(addToast({
        message: 'Booking cancelled successfully',
        type: 'success'
      }));
      setShowCancelModal(false);
      setBookingToCancel(null);
      dispatch(fetchUserBookings({}));
    } catch (error) {
      dispatch(addToast({
        message: 'Failed to cancel booking',
        type: 'error'
      }));
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
      confirmed: 'success',
      pending: 'warning',
      cancelled: 'danger',
      completed: 'info'
    };
    return variants[status] || 'info';
  };

  const canCancelBooking = (booking: any) => {
    const tourDate = new Date(booking.tour_date);
    const now = new Date();
    const hoursDiff = (tourDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return booking.status === 'confirmed' && hoursDiff > 24;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading size="lg" text="Loading your bookings..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">
            My Bookings
          </h1>
          <p className="text-gray-600">
            Manage and view all your tour bookings
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-blue-50 border-l-4 border-blue-600" padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Bookings</p>
                <p className="text-3xl font-bold text-blue-600">{bookings.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="bg-green-50 border-l-4 border-green-600" padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Upcoming</p>
                <p className="text-3xl font-bold text-green-600">{upcomingBookings.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="bg-gray-100 border-l-4 border-gray-600" padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-3xl font-bold text-gray-600">{pastBookings.length}</p>
              </div>
              <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="bg-red-50 border-l-4 border-red-600" padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Cancelled</p>
                <p className="text-3xl font-bold text-red-600">{cancelledBookings.length}</p>
              </div>
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {bookings.length > 0 ? (
          <>
            {/* Filters and Sort */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      filterStatus === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All ({bookings.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('confirmed')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      filterStatus === 'confirmed'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Confirmed ({upcomingBookings.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('pending')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      filterStatus === 'pending'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setFilterStatus('cancelled')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      filterStatus === 'cancelled'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Cancelled ({cancelledBookings.length})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-gray-700">Sort:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="date_desc">Tour Date (Newest)</option>
                    <option value="date_asc">Tour Date (Oldest)</option>
                    <option value="booking_date">Booking Date</option>
                    <option value="price_desc">Price (High to Low)</option>
                    <option value="price_asc">Price (Low to High)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bookings List */}
            <div className="space-y-4">
              {filteredBookings.map((booking) => {
                const tour = booking.tour;
                const tourDate = new Date(booking.tour_date);
                const isPast = tourDate < new Date();
                const totalParticipants = 
                  booking.number_of_adults + 
                  booking.number_of_children + 
                  booking.number_of_infants;

                return (
                  <Card key={booking.id} hover className="overflow-hidden">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Tour Image */}
                      {tour && (
                        <div className="md:w-64 h-48 md:h-auto flex-shrink-0">
                          <img
                            src={tour.featured_image_url || 'https://via.placeholder.com/400x300'}
                            alt={tour.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Booking Details */}
                      <div className="flex-1 p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-3 mb-2">
                              <h3 className="text-xl font-bold text-gray-800">
                                {tour?.title || 'Tour'}
                              </h3>
                              <Badge variant={getStatusBadge(booking.status)}>
                                {booking.status.toUpperCase()}
                              </Badge>
                              {isPast && booking.status === 'confirmed' && (
                                <Badge variant="info">COMPLETED</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              Booking Ref: <span className="font-semibold">{booking.booking_reference || `#${booking.id}`}</span>
                            </p>
                            {tour?.location && (
                              <div className="flex items-center text-sm text-gray-600">
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                {tour.location}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Tour Date</p>
                            <p className="font-semibold text-sm">
                              {tourDate.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Duration</p>
                            <p className="font-semibold text-sm">{tour?.duration_days || '-'} days</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Participants</p>
                            <p className="font-semibold text-sm">{totalParticipants}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Total Price</p>
                            <p className="font-bold text-blue-600 text-lg">${booking.total_price}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link to={`/tours/${tour?.id}`}>
                            <Button variant="outline" size="sm">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                              View Tour
                            </Button>
                          </Link>
                          
                          {booking.payment_status === 'paid' && (
                            <Button variant="outline" size="sm">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                              </svg>
                              Download Ticket
                            </Button>
                          )}

                          {isPast && booking.status === 'confirmed' && !booking.has_review && (
                            <Link to={`/tours/${tour?.id}#review`}>
                              <Button variant="primary" size="sm">
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                Write Review
                              </Button>
                            </Link>
                          )}

                          {canCancelBooking(booking) && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                setBookingToCancel(booking.id);
                                setShowCancelModal(true);
                              }}
                            >
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                              Cancel Booking
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {filteredBookings.length === 0 && (
              <Card className="text-center py-12">
                <p className="text-gray-600 mb-4">No bookings found with the selected filters.</p>
                <Button onClick={() => setFilterStatus('all')}>
                  Show All Bookings
                </Button>
              </Card>
            )}
          </>
        ) : (
          <Card className="text-center py-16">
            <svg className="mx-auto h-20 w-20 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">
              No Bookings Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start your adventure by booking an amazing tour!
            </p>
            <Link to="/tours">
              <Button size="lg">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
                Browse Tours
              </Button>
            </Link>
          </Card>
        )}
      </div>

      {/* Cancel Booking Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setBookingToCancel(null);
        }}
        title="Cancel Booking"
        size="sm"
      >
        <div className="py-4">
          <p className="text-gray-600 mb-6">
            Are you sure you want to cancel this booking? This action cannot be undone.
            You will receive a refund according to our cancellation policy.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={handleCancelBooking}
              variant="danger"
              loading={isCancelling}
              disabled={isCancelling}
              className="flex-1"
            >
              Yes, Cancel Booking
            </Button>
            <Button
              onClick={() => {
                setShowCancelModal(false);
                setBookingToCancel(null);
              }}
              variant="outline"
              disabled={isCancelling}
              className="flex-1"
            >
              Keep Booking
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MyBookingsPage;
