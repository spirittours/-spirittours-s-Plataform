import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { fetchTourById } from '../store/slices/toursSlice';
import { fetchTourReviews, fetchTourRatingSummary } from '../store/slices/reviewsSlice';
import { addToast } from '../store/slices/uiSlice';
import RatingDisplay from '../components/RatingDisplay/RatingDisplay';
import ReviewForm from '../components/ReviewForm/ReviewForm';
import { Modal, Button } from '../components/UI';

const TourDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  
  const { currentTour, loading } = useSelector((state: RootState) => state.tours);
  const { reviews, ratingSummary } = useSelector((state: RootState) => state.reviews);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'reviews' | 'faq'>('overview');
  const [showImageModal, setShowImageModal] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // FAQ data (could be moved to backend later)
  const faqItems = [
    {
      question: 'What is the cancellation policy?',
      answer: currentTour?.cancellation_policy || 'Free cancellation up to 24 hours before the tour starts. Full refund available.'
    },
    {
      question: 'What should I bring?',
      answer: 'Comfortable walking shoes, weather-appropriate clothing, sunscreen, water bottle, and camera. Specific requirements will be sent after booking.'
    },
    {
      question: 'Is this tour suitable for children?',
      answer: 'Yes, this tour is family-friendly. Children under 12 receive a discounted rate. Infants under 3 are free.'
    },
    {
      question: 'What happens in bad weather?',
      answer: 'Tours operate in most weather conditions. In case of extreme weather, we will contact you to reschedule or provide a full refund.'
    },
    {
      question: 'Are meals included?',
      answer: currentTour?.includes?.some(item => item.toLowerCase().includes('meal') || item.toLowerCase().includes('lunch') || item.toLowerCase().includes('food')) 
        ? 'Yes, meals are included as specified in the "What\'s Included" section.' 
        : 'Meals are not included unless specified. Lunch breaks are provided where you can purchase food.'
    }
  ];
  
  useEffect(() => {
    if (id) {
      dispatch(fetchTourById(Number(id)));
      dispatch(fetchTourReviews({ tourId: Number(id), limit: 5 }));
      dispatch(fetchTourRatingSummary(Number(id)));
    }
  }, [dispatch, id]);

  const handleBookNow = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/booking/${id}` } });
    } else {
      navigate(`/booking/${id}`);
    }
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const title = currentTour?.title || 'Check out this tour';
    
    const shareUrls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`,
      email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`
    };

    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      dispatch(addToast({ message: 'Link copied to clipboard!', type: 'success' }));
      setShowShareModal(false);
    } else if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
  };

  const handleToggleFavorite = () => {
    // TODO: Integrate with backend favorites API
    setIsFavorite(!isFavorite);
    dispatch(addToast({ 
      message: isFavorite ? 'Removed from favorites' : 'Added to favorites', 
      type: 'success' 
    }));
  };

  const handleReviewSuccess = () => {
    setShowReviewForm(false);
    if (id) {
      dispatch(fetchTourReviews({ tourId: Number(id), limit: 5 }));
      dispatch(fetchTourRatingSummary(Number(id)));
    }
    dispatch(addToast({ message: 'Review submitted successfully!', type: 'success' }));
  };

  if (loading || !currentTour) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const images = currentTour.images?.length > 0
    ? currentTour.images.map(img => img.url)
    : [currentTour.featured_image_url || 'https://via.placeholder.com/800x600'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumbs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm">
              <Link to="/" className="text-gray-500 hover:text-blue-600">Home</Link>
              <span className="text-gray-400">/</span>
              <Link to="/tours" className="text-gray-500 hover:text-blue-600">Tours</Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-800">{currentTour.title}</span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="hidden sm:inline">Share</span>
              </button>
              <button
                onClick={handleToggleFavorite}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <svg className={`w-5 h-5 ${isFavorite ? 'fill-current text-red-600' : ''}`} fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="hidden sm:inline">{isFavorite ? 'Saved' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              <div className="relative h-96 group cursor-pointer" onClick={() => setShowImageModal(true)}>
                <img
                  src={images[selectedImage]}
                  alt={currentTour.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {images.length > 1 && (
                <div className="grid grid-cols-6 gap-2 p-4">
                  {images.slice(0, 6).map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`relative h-16 rounded overflow-hidden ${
                        selectedImage === index ? 'ring-2 ring-blue-600' : ''
                      }`}
                    >
                      <img
                        src={image}
                        alt={`View ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-110 transition-transform"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tour Header */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full capitalize">
                      {currentTour.tour_type}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-semibold rounded-full capitalize">
                      {currentTour.difficulty_level}
                    </span>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-3">
                    {currentTour.title}
                  </h1>
                  <div className="flex items-center space-x-6 text-gray-600">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <span>{currentTour.location}</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span>{currentTour.duration_days} days</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                      <span>Max {currentTour.max_group_size} people</span>
                    </div>
                  </div>
                </div>
              </div>

              {ratingSummary && (
                <div className="flex items-center space-x-4 pt-4 border-t">
                  <RatingDisplay rating={ratingSummary.average_rating} size="medium" />
                  <span className="text-2xl font-bold text-gray-800">
                    {ratingSummary.average_rating.toFixed(1)}
                  </span>
                  <span className="text-gray-600">
                    ({ratingSummary.total_reviews} reviews)
                  </span>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-md mb-6">
              <div className="border-b">
                <div className="flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-4 font-semibold border-b-2 transition ${
                      activeTab === 'overview'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('itinerary')}
                    className={`py-4 font-semibold border-b-2 transition ${
                      activeTab === 'itinerary'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    What's Included
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`py-4 font-semibold border-b-2 transition ${
                      activeTab === 'reviews'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Reviews ({currentTour.total_reviews})
                  </button>
                  <button
                    onClick={() => setActiveTab('faq')}
                    className={`py-4 font-semibold border-b-2 transition ${
                      activeTab === 'faq'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    FAQ
                  </button>
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-3">About This Tour</h3>
                      <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                        {currentTour.description}
                      </p>
                    </div>

                    {currentTour.highlights && currentTour.highlights.length > 0 && (
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">Highlights</h3>
                        <ul className="space-y-2">
                          {currentTour.highlights.map((highlight, index) => (
                            <li key={index} className="flex items-start">
                              <svg className="w-5 h-5 text-green-500 mr-2 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-gray-600">{highlight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {currentTour.meeting_point && (
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">Meeting Point</h3>
                        <p className="text-gray-600">{currentTour.meeting_point}</p>
                      </div>
                    )}

                    {currentTour.languages && currentTour.languages.length > 0 && (
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">Languages</h3>
                        <div className="flex flex-wrap gap-2">
                          {currentTour.languages.map((lang, index) => (
                            <span key={index} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentTour.cancellation_policy && (
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">Cancellation Policy</h3>
                        <p className="text-gray-600">{currentTour.cancellation_policy}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'itinerary' && (
                  <div className="space-y-6">
                    {currentTour.includes && currentTour.includes.length > 0 && (
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">What's Included</h3>
                        <ul className="space-y-2">
                          {currentTour.includes.map((item, index) => (
                            <li key={index} className="flex items-start">
                              <svg className="w-5 h-5 text-green-500 mr-2 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span className="text-gray-600">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {currentTour.excludes && currentTour.excludes.length > 0 && (
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">What's Not Included</h3>
                        <ul className="space-y-2">
                          {currentTour.excludes.map((item, index) => (
                            <li key={index} className="flex items-start">
                              <svg className="w-5 h-5 text-red-500 mr-2 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                              <span className="text-gray-600">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-800">Customer Reviews</h3>
                      {isAuthenticated && (
                        <Button
                          onClick={() => setShowReviewForm(true)}
                          variant="primary"
                          size="sm"
                          icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          }
                        >
                          Write a Review
                        </Button>
                      )}
                    </div>
                    {reviews.length > 0 ? (
                      <>
                        {reviews.map((review) => (
                          <div key={review.id} className="border-b pb-6 last:border-b-0">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                                  {review.user?.first_name?.[0]}{review.user?.last_name?.[0]}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800">
                                    {review.user?.first_name} {review.user?.last_name}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {new Date(review.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <RatingDisplay rating={review.rating} size="small" />
                            </div>
                            
                            {review.title && (
                              <h4 className="font-semibold text-gray-800 mb-2">{review.title}</h4>
                            )}
                            
                            <p className="text-gray-600 mb-3">{review.content}</p>
                            
                            {review.is_verified_purchase && (
                              <span className="inline-flex items-center text-sm text-green-600">
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Verified Purchase
                              </span>
                            )}
                          </div>
                        ))}
                        
                        <Link
                          to={`/tours/${id}#reviews`}
                          className="inline-block text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          View all reviews →
                        </Link>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-4">No reviews yet. Be the first to review!</p>
                        {isAuthenticated && (
                          <Button
                            onClick={() => setShowReviewForm(true)}
                            variant="primary"
                          >
                            Write the First Review
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'faq' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Frequently Asked Questions</h3>
                    {faqItems.map((item, index) => (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                          className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition"
                        >
                          <span className="font-semibold text-gray-800">{item.question}</span>
                          <svg
                            className={`w-5 h-5 text-gray-500 transition-transform ${
                              expandedFaq === index ? 'transform rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {expandedFaq === index && (
                          <div className="px-6 py-4 bg-gray-50 border-t">
                            <p className="text-gray-600">{item.answer}</p>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        Can't find what you're looking for?{' '}
                        <button className="text-blue-600 hover:text-blue-700 font-semibold">
                          Contact our support team
                        </button>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Booking Widget Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <div className="mb-6">
                <div className="flex items-baseline space-x-2 mb-2">
                  <span className="text-sm text-gray-500">From</span>
                  {currentTour.discounted_price ? (
                    <>
                      <span className="text-3xl font-bold text-blue-600">
                        ${currentTour.discounted_price}
                      </span>
                      <span className="text-lg text-gray-400 line-through">
                        ${currentTour.price}
                      </span>
                    </>
                  ) : (
                    <span className="text-3xl font-bold text-blue-600">
                      ${currentTour.price}
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500">per person</span>
              </div>

              <button
                onClick={handleBookNow}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold mb-4"
              >
                Book Now
              </button>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-600">Free cancellation</span>
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-600">Instant confirmation</span>
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">Mobile ticket</span>
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold text-gray-800 mb-3">Need help?</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Contact our customer support team for assistance
                </p>
                <button className="w-full border border-blue-600 text-blue-600 px-6 py-2 rounded-lg hover:bg-blue-50 transition font-semibold">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <Modal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        size="xl"
        showCloseButton
      >
        <div className="relative">
          <img
            src={images[selectedImage]}
            alt={currentTour.title}
            className="w-full h-auto max-h-[80vh] object-contain"
          />
          {images.length > 1 && (
            <div className="flex items-center justify-center space-x-4 mt-4">
              <button
                onClick={() => setSelectedImage((selectedImage - 1 + images.length) % images.length)}
                className="p-2 bg-gray-800 bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-gray-600">
                {selectedImage + 1} / {images.length}
              </span>
              <button
                onClick={() => setSelectedImage((selectedImage + 1) % images.length)}
                className="p-2 bg-gray-800 bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Share Modal */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Share this tour"
        size="sm"
      >
        <div className="space-y-3">
          <button
            onClick={() => handleShare('facebook')}
            className="w-full flex items-center space-x-3 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span>Share on Facebook</span>
          </button>
          <button
            onClick={() => handleShare('twitter')}
            className="w-full flex items-center space-x-3 px-4 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
            </svg>
            <span>Share on Twitter</span>
          </button>
          <button
            onClick={() => handleShare('whatsapp')}
            className="w-full flex items-center space-x-3 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            <span>Share on WhatsApp</span>
          </button>
          <button
            onClick={() => handleShare('email')}
            className="w-full flex items-center space-x-3 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Share via Email</span>
          </button>
          <button
            onClick={() => handleShare('copy')}
            className="w-full flex items-center space-x-3 px-4 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Copy Link</span>
          </button>
        </div>
      </Modal>

      {/* Review Form Modal */}
      {showReviewForm && id && (
        <ReviewForm
          tourId={Number(id)}
          onSuccess={handleReviewSuccess}
        />
      )}
    </div>
  );
};

export default TourDetailPage;
