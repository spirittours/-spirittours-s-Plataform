import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { fetchFeaturedTours } from '../store/slices/toursSlice';
import { addToast } from '../store/slices/uiSlice';
import RatingDisplay from '../components/RatingDisplay/RatingDisplay';
import TourCard from '../components/TourCard/TourCard';
import { Button, Skeleton } from '../components/UI';

const HomePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { featuredTours, loading } = useSelector((state: RootState) => state.tours);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials = [
    {
      id: 1,
      name: 'Sarah Johnson',
      location: 'New York, USA',
      rating: 5,
      text: 'Absolutely amazing experience! The tour guides were knowledgeable and friendly.',
      tour: 'Grand Canyon Adventure'
    },
    {
      id: 2,
      name: 'Michael Chen',
      location: 'Toronto, Canada',
      rating: 5,
      text: 'Best vacation ever! Spirit Tours exceeded all my expectations.',
      tour: 'European Heritage Tour'
    },
    {
      id: 3,
      name: 'Emma Williams',
      location: 'London, UK',
      rating: 5,
      text: 'Incredible value for money! Highly recommended for all travelers!',
      tour: 'Southeast Asia Explorer'
    }
  ];

  useEffect(() => {
    dispatch(fetchFeaturedTours(6));
  }, [dispatch]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    
    setIsSubscribing(true);
    
    setTimeout(() => {
      dispatch(addToast({ 
        message: 'Successfully subscribed to newsletter!', 
        type: 'success' 
      }));
      setNewsletterEmail('');
      setIsSubscribing(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Discover Amazing Tours Around the World
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-blue-100">
            Book unique experiences and create unforgettable memories
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-3xl mx-auto bg-white rounded-lg shadow-xl p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Where do you want to go?"
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Search Tours
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Featured Tours Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Featured Tours
            </h2>
            <p className="text-lg text-gray-600">
              Explore our handpicked selection of amazing experiences
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, index) => (
                <Skeleton key={index} variant="rectangular" height={400} className="rounded-lg" />
              ))}
            </div>
          ) : featuredTours.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredTours.map((tour) => (
                <TourCard key={tour.id} tour={tour} variant="default" />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No featured tours available at the moment.</p>
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to="/tours"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              View All Tours
            </Link>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 px-4 bg-white border-b">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">10K+</div>
              <div className="text-gray-600">Happy Travelers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">500+</div>
              <div className="text-gray-600">Amazing Tours</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">50+</div>
              <div className="text-gray-600">Destinations</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">4.9★</div>
              <div className="text-gray-600">Average Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              What Our Travelers Say
            </h2>
            <p className="text-lg text-gray-600">
              Real experiences from real people
            </p>
          </div>

          <div className="relative bg-white rounded-lg shadow-xl p-8 md:p-12">
            <div className="absolute top-8 left-8 text-6xl text-blue-200">"</div>
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-4">
                <RatingDisplay rating={testimonials[currentTestimonial].rating} size="medium" />
              </div>
              <p className="text-xl text-gray-700 text-center mb-6 italic">
                {testimonials[currentTestimonial].text}
              </p>
              <div className="text-center">
                <p className="font-bold text-gray-800">{testimonials[currentTestimonial].name}</p>
                <p className="text-gray-600">{testimonials[currentTestimonial].location}</p>
                <p className="text-sm text-blue-600 mt-2">{testimonials[currentTestimonial].tour}</p>
              </div>
            </div>
            <div className="absolute bottom-8 right-8 text-6xl text-blue-200">"</div>
            
            <div className="flex items-center justify-center space-x-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`h-3 rounded-full transition-all ${
                    index === currentTestimonial 
                      ? 'w-8 bg-blue-600' 
                      : 'w-3 bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Why Choose Spirit Tours?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Best Price Guarantee</h3>
              <p className="text-gray-600">
                We offer competitive prices and match any lower rate you find elsewhere
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">24/7 Customer Support</h3>
              <p className="text-gray-600">
                Our dedicated team is always ready to help you with any questions
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Verified Reviews</h3>
              <p className="text-gray-600">
                Read authentic reviews from real travelers to make informed decisions
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Subscribe to Our Newsletter
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Get exclusive deals, travel tips, and destination guides delivered to your inbox
          </p>
          <form onSubmit={handleNewsletterSubmit} className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="flex-1 px-6 py-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              />
              <Button
                type="submit"
                loading={isSubscribing}
                disabled={isSubscribing}
                size="lg"
                className="whitespace-nowrap"
              >
                {isSubscribing ? 'Subscribing...' : 'Subscribe Now'}
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </form>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Your Adventure?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of happy travelers who have discovered amazing experiences with us
          </p>
          <Link
            to="/tours"
            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg hover:bg-blue-50 transition font-semibold"
          >
            Browse Tours Now
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
