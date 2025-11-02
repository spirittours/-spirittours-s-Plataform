import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { fetchTours } from '../store/slices/toursSlice';
import { fetchUserBookings } from '../store/slices/bookingsSlice';
import { fetchUserReviews } from '../store/slices/reviewsSlice';
import { Card, Badge, Loading } from '../components/UI';

const AdminDashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { tours, loading: toursLoading } = useSelector((state: RootState) => state.tours);
  const { bookings, loading: bookingsLoading } = useSelector((state: RootState) => state.bookings);
  const { userReviews, loading: reviewsLoading } = useSelector((state: RootState) => state.reviews);

  useEffect(() => {
    dispatch(fetchTours({ page: 1, limit: 100 }));
    dispatch(fetchUserBookings({ limit: 100 }));
    dispatch(fetchUserReviews());
  }, [dispatch]);

  // Calculate statistics
  const totalRevenue = bookings.reduce((sum, booking) => {
    if (booking.payment_status === 'paid') {
      return sum + booking.total_price;
    }
    return sum;
  }, 0);

  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;

  const activeTours = tours.filter(t => t.is_active).length;
  const inactiveTours = tours.filter(t => !t.is_active).length;

  const approvedReviews = userReviews.filter(r => r.status === 'approved').length;
  const pendingReviews = userReviews.filter(r => r.status === 'pending').length;

  const averageRating = userReviews.length > 0
    ? userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length
    : 0;

  // Recent activities
  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
    .slice(0, 5);

  const recentReviews = [...userReviews]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Top performing tours
  const tourBookingCounts = bookings.reduce((acc: Record<number, number>, booking) => {
    if (booking.tour_id) {
      acc[booking.tour_id] = (acc[booking.tour_id] || 0) + 1;
    }
    return acc;
  }, {});

  const topTours = tours
    .map(tour => ({
      ...tour,
      bookingCount: tourBookingCounts[tour.id] || 0
    }))
    .sort((a, b) => b.bookingCount - a.bookingCount)
    .slice(0, 5);

  if (toursLoading || bookingsLoading || reviewsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Overview of your platform performance</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-600" padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
              <p className="text-3xl font-bold text-green-600">${totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-1">From {bookings.filter(b => b.payment_status === 'paid').length} paid bookings</p>
            </div>
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>

        {/* Total Bookings */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-600" padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Bookings</p>
              <p className="text-3xl font-bold text-blue-600">{bookings.length}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="success" className="text-xs">{confirmedBookings} confirmed</Badge>
                <Badge variant="warning" className="text-xs">{pendingBookings} pending</Badge>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>

        {/* Total Tours */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-600" padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Tours</p>
              <p className="text-3xl font-bold text-purple-600">{tours.length}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="success" className="text-xs">{activeTours} active</Badge>
                <Badge variant="danger" className="text-xs">{inactiveTours} inactive</Badge>
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </div>
          </div>
        </Card>

        {/* Reviews & Rating */}
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-600" padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg Rating</p>
              <p className="text-3xl font-bold text-yellow-600">{averageRating.toFixed(1)}★</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="success" className="text-xs">{approvedReviews} approved</Badge>
                <Badge variant="warning" className="text-xs">{pendingReviews} pending</Badge>
              </div>
            </div>
            <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card padding="lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/admin/tours"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-center"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
            <p className="font-semibold text-gray-800">Manage Tours</p>
          </Link>
          <Link
            to="/admin/bookings"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-center"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
            <p className="font-semibold text-gray-800">View Bookings</p>
          </Link>
          <Link
            to="/admin/users"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition text-center"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            <p className="font-semibold text-gray-800">Manage Users</p>
          </Link>
          <Link
            to="/admin/reviews"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition text-center"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <p className="font-semibold text-gray-800">Moderate Reviews</p>
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Recent Bookings</h2>
            <Link to="/admin/bookings" className="text-sm text-blue-600 hover:text-blue-700 font-semibold">
              View All →
            </Link>
          </div>
          {recentBookings.length > 0 ? (
            <div className="space-y-3">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">
                      {booking.tour?.title || 'Tour'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {booking.number_of_adults + booking.number_of_children + booking.number_of_infants} guests
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      booking.status === 'confirmed' ? 'success' :
                      booking.status === 'pending' ? 'warning' : 'danger'
                    }>
                      {booking.status}
                    </Badge>
                    <p className="text-xs text-gray-600 mt-1">${booking.total_price}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No recent bookings</p>
          )}
        </Card>

        {/* Top Performing Tours */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Top Performing Tours</h2>
            <Link to="/admin/analytics" className="text-sm text-blue-600 hover:text-blue-700 font-semibold">
              Analytics →
            </Link>
          </div>
          {topTours.length > 0 ? (
            <div className="space-y-3">
              {topTours.map((tour, index) => (
                <div key={tour.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">{tour.title}</p>
                    <p className="text-xs text-gray-600">{tour.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">{tour.bookingCount}</p>
                    <p className="text-xs text-gray-600">bookings</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No tour data available</p>
          )}
        </Card>
      </div>

      {/* Recent Reviews */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Recent Reviews</h2>
          <Link to="/admin/reviews" className="text-sm text-blue-600 hover:text-blue-700 font-semibold">
            View All →
          </Link>
        </div>
        {recentReviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentReviews.map((review) => (
              <div key={review.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${i < review.rating ? 'text-yellow-500' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <Badge variant={
                    review.status === 'approved' ? 'success' :
                    review.status === 'pending' ? 'warning' : 'danger'
                  }>
                    {review.status}
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-gray-800 mb-1">{review.title}</p>
                <p className="text-xs text-gray-600 line-clamp-2">{review.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No reviews yet</p>
        )}
      </Card>
    </div>
  );
};

export default AdminDashboardPage;
