import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { fetchUserReviews, deleteReview } from '../store/slices/reviewsSlice';
import { addToast } from '../store/slices/uiSlice';
import { Link } from 'react-router-dom';
import RatingDisplay from '../components/RatingDisplay/RatingDisplay';
import { Card, Button, Badge, Loading, Modal } from '../components/UI';

const ReviewsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { userReviews, loading } = useSelector((state: RootState) => state.reviews);
  
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    dispatch(fetchUserReviews());
  }, [dispatch]);

  const filteredReviews = userReviews
    .filter(review => {
      if (filterStatus === 'all') return true;
      return review.status === filterStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'date_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'rating_high':
          return b.rating - a.rating;
        case 'rating_low':
          return a.rating - b.rating;
        default:
          return 0;
      }
    });

  const approvedReviews = userReviews.filter(r => r.status === 'approved');
  const pendingReviews = userReviews.filter(r => r.status === 'pending');
  const rejectedReviews = userReviews.filter(r => r.status === 'rejected');

  const averageRating = userReviews.length > 0
    ? userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length
    : 0;

  const handleDeleteReview = async () => {
    if (!reviewToDelete) return;
    
    setIsDeleting(true);
    try {
      await dispatch(deleteReview(reviewToDelete)).unwrap();
      dispatch(addToast({
        message: 'Review deleted successfully',
        type: 'success'
      }));
      setShowDeleteModal(false);
      setReviewToDelete(null);
    } catch (error) {
      dispatch(addToast({
        message: 'Failed to delete review',
        type: 'error'
      }));
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading size="lg" text="Loading your reviews..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">
            My Reviews
          </h1>
          <p className="text-gray-600">
            Manage your tour reviews and ratings
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-blue-50 border-l-4 border-blue-600" padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Reviews</p>
                <p className="text-3xl font-bold text-blue-600">{userReviews.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="bg-green-50 border-l-4 border-green-600" padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Approved</p>
                <p className="text-3xl font-bold text-green-600">{approvedReviews.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="bg-yellow-50 border-l-4 border-yellow-600" padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{pendingReviews.length}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="bg-purple-50 border-l-4 border-purple-600" padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Rating</p>
                <p className="text-3xl font-bold text-purple-600">
                  {averageRating.toFixed(1)}★
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {userReviews.length > 0 ? (
          <>
            {/* Filters and Sort */}
            <Card className="mb-6" padding="md">
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
                    All ({userReviews.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('approved')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      filterStatus === 'approved'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Approved ({approvedReviews.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('pending')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      filterStatus === 'pending'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Pending ({pendingReviews.length})
                  </button>
                  {rejectedReviews.length > 0 && (
                    <button
                      onClick={() => setFilterStatus('rejected')}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${
                        filterStatus === 'rejected'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Rejected ({rejectedReviews.length})
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-gray-700">Sort:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="date_desc">Newest First</option>
                    <option value="date_asc">Oldest First</option>
                    <option value="rating_high">Highest Rating</option>
                    <option value="rating_low">Lowest Rating</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Reviews List */}
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <Card key={review.id} hover padding="lg">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <RatingDisplay rating={review.rating} size="medium" />
                        <Badge variant={
                          review.status === 'approved' ? 'success' :
                          review.status === 'pending' ? 'warning' : 'danger'
                        }>
                          {review.status.toUpperCase()}
                        </Badge>
                        {review.is_verified_purchase && (
                          <Badge variant="info">
                            <svg className="w-3 h-3 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Verified
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">
                        {review.title}
                      </h3>
                      <p className="text-gray-600 mb-3 whitespace-pre-line">
                        {review.content}
                      </p>

                      {/* Rating Breakdown */}
                      {(review.value_rating || review.guide_rating || review.organization_rating) && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
                          {review.value_rating && (
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Value</p>
                              <div className="flex items-center">
                                <span className="text-sm font-bold text-gray-800">
                                  {review.value_rating}
                                </span>
                                <span className="text-yellow-500 ml-1">★</span>
                              </div>
                            </div>
                          )}
                          {review.guide_rating && (
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Guide</p>
                              <div className="flex items-center">
                                <span className="text-sm font-bold text-gray-800">
                                  {review.guide_rating}
                                </span>
                                <span className="text-yellow-500 ml-1">★</span>
                              </div>
                            </div>
                          )}
                          {review.organization_rating && (
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Organization</p>
                              <div className="flex items-center">
                                <span className="text-sm font-bold text-gray-800">
                                  {review.organization_rating}
                                </span>
                                <span className="text-yellow-500 ml-1">★</span>
                              </div>
                            </div>
                          )}
                          {review.experience_rating && (
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Experience</p>
                              <div className="flex items-center">
                                <span className="text-sm font-bold text-gray-800">
                                  {review.experience_rating}
                                </span>
                                <span className="text-yellow-500 ml-1">★</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <p className="text-sm text-gray-500 mt-4">
                        Posted on {new Date(review.created_at).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>

                    <div className="flex sm:flex-col gap-2">
                      {review.tour_id && (
                        <Link to={`/tours/${review.tour_id}`}>
                          <Button variant="outline" size="sm">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                            View Tour
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setReviewToDelete(review.id);
                          setShowDeleteModal(true);
                        }}
                      >
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {filteredReviews.length === 0 && (
              <Card className="text-center py-12">
                <p className="text-gray-600 mb-4">No reviews found with the selected filters.</p>
                <Button onClick={() => setFilterStatus('all')}>
                  Show All Reviews
                </Button>
              </Card>
            )}
          </>
        ) : (
          <Card className="text-center py-16">
            <svg className="mx-auto h-20 w-20 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">
              No Reviews Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Complete a tour and share your experience!
            </p>
            <Link to="/my-bookings">
              <Button size="lg">
                View My Bookings
              </Button>
            </Link>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setReviewToDelete(null);
        }}
        title="Delete Review"
        size="sm"
      >
        <div className="py-4">
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete this review? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={handleDeleteReview}
              variant="danger"
              loading={isDeleting}
              disabled={isDeleting}
              className="flex-1"
            >
              Yes, Delete Review
            </Button>
            <Button
              onClick={() => {
                setShowDeleteModal(false);
                setReviewToDelete(null);
              }}
              variant="outline"
              disabled={isDeleting}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReviewsPage;
