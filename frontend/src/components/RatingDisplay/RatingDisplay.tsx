/**
 * Rating Display Component
 * Visual display of ratings with stars and statistics
 */

import React from 'react';
import './RatingDisplay.css';

interface RatingDisplayProps {
  rating: number;
  totalReviews?: number;
  showCount?: boolean;
  size?: 'small' | 'medium' | 'large';
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

const RatingDisplay: React.FC<RatingDisplayProps> = ({
  rating,
  totalReviews,
  showCount = true,
  size = 'medium',
  interactive = false,
  onChange
}) => {
  const [hoverRating, setHoverRating] = React.useState(0);
  
  const displayRating = interactive && hoverRating > 0 ? hoverRating : rating;
  
  const handleClick = (newRating: number) => {
    if (interactive && onChange) {
      onChange(newRating);
    }
  };
  
  const handleMouseEnter = (newRating: number) => {
    if (interactive) {
      setHoverRating(newRating);
    }
  };
  
  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(0);
    }
  };
  
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const fillPercentage = Math.min(Math.max(displayRating - (i - 1), 0), 1) * 100;
      
      stars.push(
        <div
          key={i}
          className={`star ${interactive ? 'interactive' : ''} ${size}`}
          onClick={() => handleClick(i)}
          onMouseEnter={() => handleMouseEnter(i)}
          onMouseLeave={handleMouseLeave}
          role={interactive ? 'button' : undefined}
          tabIndex={interactive ? 0 : undefined}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id={`star-fill-${i}`}>
                <stop offset={`${fillPercentage}%`} stopColor="#FFB800" />
                <stop offset={`${fillPercentage}%`} stopColor="#E0E0E0" />
              </linearGradient>
            </defs>
            <path
              d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              fill={`url(#star-fill-${i})`}
              stroke="#FFB800"
              strokeWidth="1"
            />
          </svg>
        </div>
      );
    }
    return stars;
  };
  
  return (
    <div className={`rating-display ${size}`}>
      <div className="stars-container">
        {renderStars()}
      </div>
      {showCount && totalReviews !== undefined && (
        <span className="review-count">
          ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
        </span>
      )}
    </div>
  );
};

export default RatingDisplay;
