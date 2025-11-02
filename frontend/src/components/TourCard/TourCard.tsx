import React from 'react';
import { Link } from 'react-router-dom';
import { Tour } from '../../types/tour';
import RatingDisplay from '../RatingDisplay/RatingDisplay';
import { Badge } from '../UI';

interface TourCardProps {
  tour: Tour;
  variant?: 'default' | 'compact' | 'featured';
  showBadges?: boolean;
  className?: string;
}

const TourCard: React.FC<TourCardProps> = ({ 
  tour, 
  variant = 'default',
  showBadges = true,
  className = '' 
}) => {
  const discount = tour.discounted_price 
    ? Math.round(((tour.price - tour.discounted_price) / tour.price) * 100) 
    : 0;

  const currentPrice = tour.discounted_price || tour.price;

  if (variant === 'compact') {
    return (
      <Link
        to={`/tours/${tour.id}`}
        className={`flex gap-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden ${className}`}
      >
        <div className="relative w-40 h-32 flex-shrink-0">
          <img
            src={tour.featured_image_url || 'https://via.placeholder.com/400x300'}
            alt={tour.title}
            className="w-full h-full object-cover"
          />
          {discount > 0 && showBadges && (
            <div className="absolute top-2 right-2">
              <Badge variant="danger">{discount}% OFF</Badge>
            </div>
          )}
        </div>
        <div className="flex-1 py-3 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="info" className="text-xs">{tour.tour_type}</Badge>
            <span className="text-xs text-gray-500">{tour.duration_days} days</span>
          </div>
          <h3 className="font-bold text-gray-800 mb-1 line-clamp-1">{tour.title}</h3>
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {tour.location}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <RatingDisplay rating={tour.average_rating || 0} size="small" />
              <span className="text-xs text-gray-500">({tour.total_reviews})</span>
            </div>
            <div className="text-right">
              {tour.discounted_price && (
                <span className="text-xs text-gray-400 line-through block">${tour.price}</span>
              )}
              <span className="text-lg font-bold text-blue-600">${currentPrice}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === 'featured') {
    return (
      <Link
        to={`/tours/${tour.id}`}
        className={`group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${className}`}
      >
        <div className="relative h-72 overflow-hidden">
          <img
            src={tour.featured_image_url || 'https://via.placeholder.com/400x300'}
            alt={tour.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {discount > 0 && showBadges && (
            <div className="absolute top-4 right-4">
              <Badge variant="danger" className="text-sm font-bold">
                {discount}% OFF
              </Badge>
            </div>
          )}
          
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="success" className="bg-white/20 backdrop-blur-sm border-white/30">
                {tour.tour_type}
              </Badge>
              <Badge variant="info" className="bg-white/20 backdrop-blur-sm border-white/30">
                {tour.duration_days} days
              </Badge>
            </div>
            <h3 className="text-2xl font-bold mb-1 line-clamp-2">{tour.title}</h3>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 mb-4 line-clamp-2 h-12">
            {tour.short_description}
          </p>
          
          <div className="flex items-center mb-4 text-gray-600">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span>{tour.location}</span>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <RatingDisplay rating={tour.average_rating || 0} size="medium" />
              <span className="text-sm text-gray-600">
                ({tour.total_reviews} reviews)
              </span>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-500 block">Starting from</span>
              <div className="flex items-center gap-2">
                {tour.discounted_price && (
                  <span className="text-sm text-gray-400 line-through">${tour.price}</span>
                )}
                <span className="text-2xl font-bold text-blue-600">${currentPrice}</span>
              </div>
              <span className="text-sm text-gray-500">per person</span>
            </div>
            <span className="text-blue-600 font-semibold group-hover:text-blue-700">
              View Details →
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // Default variant
  return (
    <Link
      to={`/tours/${tour.id}`}
      className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 ${className}`}
    >
      <div className="relative h-64 overflow-hidden">
        <img
          src={tour.featured_image_url || 'https://via.placeholder.com/400x300'}
          alt={tour.title}
          className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
        />
        {discount > 0 && showBadges && (
          <div className="absolute top-4 right-4">
            <Badge variant="danger">
              {discount}% OFF
            </Badge>
          </div>
        )}
      </div>
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="info" className="text-sm capitalize">{tour.tour_type}</Badge>
          <span className="text-sm text-gray-500">{tour.duration_days} days</span>
        </div>
        
        <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
          {tour.title}
        </h3>
        
        <p className="text-gray-600 mb-4 line-clamp-2">
          {tour.short_description}
        </p>
        
        <div className="flex items-center mb-4">
          <svg className="w-5 h-5 text-gray-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <span className="text-gray-600">{tour.location}</span>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <RatingDisplay rating={tour.average_rating || 0} size="small" />
            <span className="text-sm text-gray-500">
              ({tour.total_reviews} reviews)
            </span>
          </div>
        </div>
        
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-500">From</span>
              {tour.discounted_price ? (
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-blue-600">
                    ${tour.discounted_price}
                  </span>
                  <span className="text-sm text-gray-400 line-through">
                    ${tour.price}
                  </span>
                </div>
              ) : (
                <div className="text-2xl font-bold text-blue-600">
                  ${tour.price}
                </div>
              )}
              <span className="text-sm text-gray-500">per person</span>
            </div>
            
            <span className="text-blue-600 font-semibold hover:text-blue-700">
              View Details →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default TourCard;
