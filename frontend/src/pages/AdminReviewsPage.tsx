import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { fetchUserReviews } from '../store/slices/reviewsSlice';
import { addToast } from '../store/slices/uiSlice';
import { Card, Button, Badge, Loading, Modal, Input, Pagination } from '../components/UI';
import { Link } from 'react-router-dom';

const AdminReviewsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { userReviews: reviews, loading, pagination } = useSelector((state: RootState) => state.reviews);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRating, setFilterRating] = useState<string>('all');
  const [filterVerified, setFilterVerified] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_desc');
  
  // Modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [responseContent, setResponseContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    dispatch(fetchUserReviews({ page: 1, limit: 20 }));
  }, [dispatch]);

  // Filter and sort reviews
  const filteredReviews = reviews
    .filter(review => {
      // Status filter
      if (filterStatus === 'all') return true;
      return review.status === filterStatus;
    })
    .filter(review => {
      // Rating filter
      if (filterRating === 'all') return true;
      const rating = parseInt(filterRating);
      return review.rating === rating;
    })
    .filter(review => {
      // Verified purchase filter
      if (filterVerified === 'all') return true;
      if (filterVerified === 'verified') return review.is_verified_purchase;
      if (filterVerified === 'unverified') return !review.is_verified_purchase;
      return true;
    })
    .filter(review => {
      // Search filter
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        review.title.toLowerCase().includes(query) ||
        review.content.toLowerCase().includes(query) ||
        review.user?.first_name.toLowerCase().includes(query) ||
        review.user?.last_name.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'created_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'rating_desc':
          return b.rating - a.rating;
        case 'rating_asc':
          return a.rating - b.rating;
        case 'helpful_desc':
          return b.helpful_count - a.helpful_count;
        case 'flagged_desc':
          return b.flag_count - a.flag_count;
        default:
          return 0;
      }
    });

  // Calculate statistics
  const totalReviews = reviews.length;
  const pendingReviews = reviews.filter(r => r.status === 'pending').length;
  const approvedReviews = reviews.filter(r => r.status === 'approved').length;
  const flaggedReviews = reviews.filter(r => r.status === 'flagged' || r.flag_count > 0).length;
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  // Action handlers
  const handleApproveReview = async () => {
    if (!selectedReview) return;
    
    setIsProcessing(true);
    try {
      // TODO: Implement approve review API call
      dispatch(addToast({
        message: 'Review approved successfully',
        type: 'success'
      }));
      setShowApproveModal(false);
      setSelectedReview(null);
      dispatch(fetchUserReviews({ page: 1, limit: 20 }));
    } catch (error) {
      dispatch(addToast({
        message: 'Failed to approve review',
        type: 'error'
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectReview = async () => {
    if (!selectedReview || !rejectReason.trim()) {
      dispatch(addToast({
        message: 'Please provide a rejection reason',
        type: 'warning'
      }));
      return;
    }
    
    setIsProcessing(true);
    try {
      // TODO: Implement reject review API call
      dispatch(addToast({
        message: 'Review rejected successfully',
        type: 'success'
      }));
      setShowRejectModal(false);
      setSelectedReview(null);
      setRejectReason('');
      dispatch(fetchUserReviews({ page: 1, limit: 20 }));
    } catch (error) {
      dispatch(addToast({
        message: 'Failed to reject review',
        type: 'error'
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!selectedReview) return;
    
    setIsProcessing(true);
    try {
      // TODO: Implement delete review API call
      dispatch(addToast({
        message: 'Review deleted successfully',
        type: 'success'
      }));
      setShowDeleteModal(false);
      setSelectedReview(null);
      dispatch(fetchUserReviews({ page: 1, limit: 20 }));
    } catch (error) {
      dispatch(addToast({
        message: 'Failed to delete review',
        type: 'error'
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRespondReview = async () => {
    if (!selectedReview || !responseContent.trim()) {
      dispatch(addToast({
        message: 'Please provide a response',
        type: 'warning'
      }));
      return;
    }
    
    setIsProcessing(true);
    try {
      // TODO: Implement respond to review API call
      dispatch(addToast({
        message: 'Response posted successfully',
        type: 'success'
      }));
      setShowResponseModal(false);
      setSelectedReview(null);
      setResponseContent('');
      dispatch(fetchUserReviews({ page: 1, limit: 20 }));
    } catch (error) {
      dispatch(addToast({
        message: 'Failed to post response',
        type: 'error'
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info', text: string }> = {
      approved: { variant: 'success', text: 'Approved' },
      pending: { variant: 'warning', text: 'Pending' },
      rejected: { variant: 'danger', text: 'Rejected' },
      flagged: { variant: 'danger', text: 'Flagged' },
      hidden: { variant: 'info', text: 'Hidden' },
    };
    const config = statusMap[status] || { variant: 'info', text: status };
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading size="lg" text="Loading reviews..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Review Moderation</h1>
          <p className="text-gray-600">Manage and moderate customer reviews</p>
        </div>
        <Button size="lg">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
          </svg>
          Export Reviews
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-blue-50 border-l-4 border-blue-600" padding="md">
          <p className="text-sm text-gray-600 mb-1">Total Reviews</p>
          <p className="text-3xl font-bold text-blue-600">{totalReviews}</p>
        </Card>
        <Card className="bg-yellow-50 border-l-4 border-yellow-600" padding="md">
          <p className="text-sm text-gray-600 mb-1">Pending</p>
          <p className="text-3xl font-bold text-yellow-600">{pendingReviews}</p>
        </Card>
        <Card className="bg-green-50 border-l-4 border-green-600" padding="md">
          <p className="text-sm text-gray-600 mb-1">Approved</p>
          <p className="text-3xl font-bold text-green-600">{approvedReviews}</p>
        </Card>
        <Card className="bg-red-50 border-l-4 border-red-600" padding="md">
          <p className="text-sm text-gray-600 mb-1">Flagged</p>
          <p className="text-3xl font-bold text-red-600">{flaggedReviews}</p>
        </Card>
        <Card className="bg-purple-50 border-l-4 border-purple-600" padding="md">
          <p className="text-sm text-gray-600 mb-1">Avg Rating</p>
          <p className="text-3xl font-bold text-purple-600">{averageRating}★</p>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card padding="md">
        <div className="space-y-4">
          {/* Search */}
          <div>
            <Input
              placeholder="Search reviews by title, content, or user name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              }
              fullWidth
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                    filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus('pending')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                    filterStatus === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setFilterStatus('approved')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                    filterStatus === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Approved
                </button>
                <button
                  onClick={() => setFilterStatus('flagged')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                    filterStatus === 'flagged' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Flagged
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Rating</label>
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Verified</label>
              <select
                value={filterVerified}
                onChange={(e) => setFilterVerified(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="verified">Verified Purchase</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="created_desc">Newest First</option>
                <option value="created_asc">Oldest First</option>
                <option value="rating_desc">Highest Rating</option>
                <option value="rating_asc">Lowest Rating</option>
                <option value="helpful_desc">Most Helpful</option>
                <option value="flagged_desc">Most Flagged</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((review) => (
          <Card key={review.id} padding="md">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {review.user?.first_name[0]}{review.user?.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-gray-800">
                        {review.user?.first_name} {review.user?.last_name}
                      </p>
                      {review.is_verified_purchase && (
                        <Badge variant="info" className="text-xs">
                          <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Verified Purchase
                        </Badge>
                      )}
                      {getStatusBadge(review.status)}
                      {review.flag_count > 0 && (
                        <Badge variant="danger" className="text-xs">
                          {review.flag_count} flags
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      {renderStars(review.rating)}
                      <span>•</span>
                      <span>{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {review.status === 'pending' && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => {
                        setSelectedReview(review);
                        setShowApproveModal(true);
                      }}
                      title="Approve"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </Button>
                  )}
                  {(review.status === 'pending' || review.status === 'flagged') && (
                    <Button
                      variant="warning"
                      size="sm"
                      onClick={() => {
                        setSelectedReview(review);
                        setShowRejectModal(true);
                      }}
                      title="Reject"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </Button>
                  )}
                  <Button
                    variant="info"
                    size="sm"
                    onClick={() => {
                      setSelectedReview(review);
                      setResponseContent(review.response?.content || '');
                      setShowResponseModal(true);
                    }}
                    title="Respond"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setSelectedReview(review);
                      setShowDeleteModal(true);
                    }}
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </Button>
                </div>
              </div>

              {/* Review Content */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">{review.title}</h3>
                <p className="text-gray-700 leading-relaxed">{review.content}</p>
              </div>

              {/* Pros and Cons */}
              {(review.pros || review.cons) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
                  {review.pros && (
                    <div>
                      <p className="text-sm font-semibold text-green-700 mb-1">Pros:</p>
                      <p className="text-sm text-gray-700">{review.pros}</p>
                    </div>
                  )}
                  {review.cons && (
                    <div>
                      <p className="text-sm font-semibold text-red-700 mb-1">Cons:</p>
                      <p className="text-sm text-gray-700">{review.cons}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Additional Ratings */}
              {(review.value_rating || review.guide_rating || review.organization_rating || review.experience_rating) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t">
                  {review.value_rating && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Value</p>
                      {renderStars(review.value_rating)}
                    </div>
                  )}
                  {review.guide_rating && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Guide</p>
                      {renderStars(review.guide_rating)}
                    </div>
                  )}
                  {review.organization_rating && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Organization</p>
                      {renderStars(review.organization_rating)}
                    </div>
                  )}
                  {review.experience_rating && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Experience</p>
                      {renderStars(review.experience_rating)}
                    </div>
                  )}
                </div>
              )}

              {/* Response */}
              {review.response && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r">
                  <div className="flex items-start gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1zm-5 8.274l-.818 2.552c-.25.78.128 1.63.899 1.902l1.286.643a1 1 0 00.894-1.788l-1.233-.616 1.738-5.42a1 1 0 00-.285-1.05A3.989 3.989 0 005 6a3.989 3.989 0 00-2.667 1.019 1 1 0 00-.285 1.05l1.738 5.42-1.233.617a1 1 0 10.894 1.788l1.286-.643c.771-.272 1.149-1.122.899-1.902L4.18 10.274z" />
                    </svg>
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900 text-sm mb-1">Official Response</p>
                      <p className="text-sm text-gray-700">{review.response.content}</p>
                      <p className="text-xs text-gray-600 mt-2">
                        {new Date(review.response.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  <span>👍 {review.helpful_count} helpful</span>
                  <span>👎 {review.not_helpful_count} not helpful</span>
                </div>
                <Link to={`/admin/reviews/${review.id}`} className="text-blue-600 hover:underline">
                  View Details →
                </Link>
              </div>
            </div>
          </Card>
        ))}

        {filteredReviews.length === 0 && (
          <Card padding="lg">
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
              <p className="text-gray-600 mb-4">No reviews found matching your criteria.</p>
              <Button onClick={() => {
                setFilterStatus('all');
                setFilterRating('all');
                setFilterVerified('all');
                setSearchQuery('');
              }}>
                Clear All Filters
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => dispatch(fetchUserReviews({ page, limit: 20 }))}
            showFirstLast
          />
        </div>
      )}

      {/* Approve Review Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setSelectedReview(null);
        }}
        title="Approve Review"
        size="sm"
      >
        <div className="py-4">
          <p className="text-gray-600 mb-6">
            Are you sure you want to approve this review? It will be visible to all customers.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={handleApproveReview}
              variant="success"
              loading={isProcessing}
              disabled={isProcessing}
              className="flex-1"
            >
              Approve Review
            </Button>
            <Button
              onClick={() => {
                setShowApproveModal(false);
                setSelectedReview(null);
              }}
              variant="outline"
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Review Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedReview(null);
          setRejectReason('');
        }}
        title="Reject Review"
        size="md"
      >
        <div className="py-4">
          <p className="text-gray-600 mb-4">
            Please provide a reason for rejecting this review. The user will be notified.
          </p>
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Rejection Reason *
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Enter reason for rejection (e.g., inappropriate content, spam, violates guidelines)..."
            />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleRejectReview}
              variant="danger"
              loading={isProcessing}
              disabled={isProcessing || !rejectReason.trim()}
              className="flex-1"
            >
              Reject Review
            </Button>
            <Button
              onClick={() => {
                setShowRejectModal(false);
                setSelectedReview(null);
                setRejectReason('');
              }}
              variant="outline"
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Response Modal */}
      <Modal
        isOpen={showResponseModal}
        onClose={() => {
          setShowResponseModal(false);
          setSelectedReview(null);
          setResponseContent('');
        }}
        title="Respond to Review"
        size="md"
      >
        <div className="py-4">
          <p className="text-gray-600 mb-4">
            Provide an official response to this review. Your response will be visible publicly.
          </p>
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Response *
            </label>
            <textarea
              value={responseContent}
              onChange={(e) => setResponseContent(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={5}
              placeholder="Write your response here..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Be professional and courteous. Address the customer's concerns directly.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleRespondReview}
              variant="success"
              loading={isProcessing}
              disabled={isProcessing || !responseContent.trim()}
              className="flex-1"
            >
              Post Response
            </Button>
            <Button
              onClick={() => {
                setShowResponseModal(false);
                setSelectedReview(null);
                setResponseContent('');
              }}
              variant="outline"
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Review Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedReview(null);
        }}
        title="Delete Review"
        size="sm"
      >
        <div className="py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold text-red-800 mb-1">Warning: This action is permanent!</p>
                <p className="text-sm text-red-700">
                  Deleting this review cannot be undone. Consider rejecting instead if you want to keep a record.
                </p>
              </div>
            </div>
          </div>
          <p className="text-gray-600 mb-6">
            Are you sure you want to permanently delete this review?
          </p>
          <div className="flex gap-3">
            <Button
              onClick={handleDeleteReview}
              variant="danger"
              loading={isProcessing}
              disabled={isProcessing}
              className="flex-1"
            >
              Yes, Delete Review
            </Button>
            <Button
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedReview(null);
              }}
              variant="outline"
              disabled={isProcessing}
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

export default AdminReviewsPage;
