import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { fetchUserBookings } from '../store/slices/bookingsSlice';
import { fetchUserReviews } from '../store/slices/reviewsSlice';
import { Card, Badge, Button, Loading } from '../components/UI';
import RatingDisplay from '../components/RatingDisplay/RatingDisplay';

const DashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { bookings, loading: bookingsLoading } = useSelector((state: RootState) => state.bookings);
  const { userReviews, loading: reviewsLoading } = useSelector((state: RootState) => state.reviews);
  
  useEffect(() => {
    dispatch(fetchUserBookings({ limit: 5 }));
    dispatch(fetchUserReviews());
  }, [dispatch]);

  const upcomingBookings = bookings.filter(
    b => b.status === 'confirmed' && new Date(b.tour_date) > new Date()
  );
  const completedTours = bookings.filter(
    b => new Date(b.tour_date) <= new Date() && b.status === 'confirmed'
  );
  const pendingReviews = completedTours.filter(
    b => !b.has_review
  ).length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (bookingsLoading && reviewsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">
            {getGreeting()}, {user?.first_name}! 👋
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your tours
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link to="/my-bookings">
            <Card className="hover:shadow-lg transition-all bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-600" padding="md">
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
          </Link>

          <Link to="/my-bookings?status=confirmed">
            <Card className="hover:shadow-lg transition-all bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-600" padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Upcoming Tours</p>
                  <p className="text-3xl font-bold text-green-600">{upcomingBookings.length}</p>
                </div>
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </Card>
          </Link>

          <Link to="/my-reviews">
            <Card className="hover:shadow-lg transition-all bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-600" padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">My Reviews</p>
                  <p className="text-3xl font-bold text-yellow-600">{userReviews.length}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>
            </Card>
          </Link>

          <Link to="/profile">
            <Card className="hover:shadow-lg transition-all bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-600" padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Profile Status</p>
                  <p className="text-sm font-bold text-purple-600">
                    {user?.is_verified ? 'Verified' : 'Unverified'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Upcoming Bookings */}
          <Card className="lg:col-span-2" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                Upcoming Tours
              </h2>
              <Link to="/my-bookings">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>

            {upcomingBookings.length > 0 ? (
              <div className="space-y-4">
                {upcomingBookings.slice(0, 3).map((booking) => {
                  const tour = booking.tour;
                  const daysUntil = Math.ceil(
                    (new Date(booking.tour_date).getTime() - new Date().getTime()) / 
                    (1000 * 60 * 60 * 24)
                  );

                  return (
                    <Link
                      key={booking.id}
                      to={`/tours/${tour?.id}`}
                      className="flex gap-4 p-4 border rounded-lg hover:bg-gray-50 transition"
                    >
                      {tour && (
                        <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                          <img
                            src={tour.featured_image_url || 'https://via.placeholder.com/200x200'}
                            alt={tour.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 mb-1">
                          {tour?.title}
                        </h3>
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          {new Date(booking.tour_date).toLocaleDateString()}
                        </div>
                        <Badge variant={daysUntil <= 7 ? 'warning' : 'info'}>
                          {daysUntil === 0 ? 'Today!' : 
                           daysUntil === 1 ? 'Tomorrow' : 
                           `In ${daysUntil} days`}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-600 mb-4">No upcoming tours scheduled</p>
                <Link to="/tours">
                  <Button>Browse Tours</Button>
                </Link>
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <Card padding="lg">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <Link to="/tours" className="block">
                <Button variant="primary" className="w-full" size="md">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                  Browse Tours
                </Button>
              </Link>
              <Link to="/search" className="block">
                <Button variant="outline" className="w-full" size="md">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                  Search Tours
                </Button>
              </Link>
              <Link to="/my-bookings" className="block">
                <Button variant="outline" className="w-full" size="md">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                  My Bookings
                </Button>
              </Link>
              <Link to="/profile" className="block">
                <Button variant="outline" className="w-full" size="md">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  My Profile
                </Button>
              </Link>
            </div>

            {pendingReviews > 0 && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-semibold text-yellow-800 mb-2">
                  ⭐ {pendingReviews} tour{pendingReviews > 1 ? 's' : ''} waiting for review
                </p>
                <Link to="/my-bookings">
                  <Button variant="warning" size="sm" className="w-full">
                    Write Reviews
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </div>

        {/* Recent Reviews */}
        {userReviews.length > 0 && (
          <Card padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                Recent Reviews
              </h2>
              <Link to="/my-reviews">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userReviews.slice(0, 4).map((review) => (
                <div key={review.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <RatingDisplay rating={review.rating} size="small" />
                    <Badge variant={
                      review.status === 'approved' ? 'success' :
                      review.status === 'pending' ? 'warning' : 'danger'
                    }>
                      {review.status}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-1">
                    {review.title}
                  </h4>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {review.content}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
