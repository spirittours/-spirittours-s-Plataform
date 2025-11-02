import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
import { createReview } from '../../store/slices/reviewsSlice';
import { Button, Input, Card, Modal } from '../UI';
import RatingDisplay from '../RatingDisplay/RatingDisplay';

interface ReviewFormProps {
  tourId: number;
  bookingId?: number;
  onSuccess?: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ tourId, bookingId, onSuccess }) => {
  const dispatch = useDispatch<AppDispatch>();
  
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    rating: 0,
    value_rating: 0,
    guide_rating: 0,
    organization_rating: 0,
    experience_rating: 0,
    title: '',
    content: '',
    pros: '',
    cons: '',
  });
  
  const handleRatingChange = (field: string, rating: number) => {
    setFormData({ ...formData, [field]: rating });
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const reviewData = {
        tour_id: tourId,
        booking_id: bookingId,
        ...formData,
      };
      
      await dispatch(createReview(reviewData));
      
      setIsOpen(false);
      setFormData({
        rating: 0,
        value_rating: 0,
        guide_rating: 0,
        organization_rating: 0,
        experience_rating: 0,
        title: '',
        content: '',
        pros: '',
        cons: '',
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="primary">
        Write a Review
      </Button>
      
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Write Your Review"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Overall Rating */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Overall Rating *
            </label>
            <RatingDisplay
              rating={formData.rating}
              size="large"
              interactive
              onChange={(rating) => handleRatingChange('rating', rating)}
            />
          </div>
          
          {/* Detailed Ratings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Value for Money
              </label>
              <RatingDisplay
                rating={formData.value_rating}
                size="medium"
                interactive
                onChange={(rating) => handleRatingChange('value_rating', rating)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tour Guide
              </label>
              <RatingDisplay
                rating={formData.guide_rating}
                size="medium"
                interactive
                onChange={(rating) => handleRatingChange('guide_rating', rating)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Organization
              </label>
              <RatingDisplay
                rating={formData.organization_rating}
                size="medium"
                interactive
                onChange={(rating) => handleRatingChange('organization_rating', rating)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Overall Experience
              </label>
              <RatingDisplay
                rating={formData.experience_rating}
                size="medium"
                interactive
                onChange={(rating) => handleRatingChange('experience_rating', rating)}
              />
            </div>
          </div>
          
          {/* Review Title */}
          <Input
            type="text"
            name="title"
            label="Review Title"
            placeholder="Summarize your experience"
            value={formData.title}
            onChange={handleInputChange}
            required
            fullWidth
          />
          
          {/* Review Content */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Your Review *
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              required
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Share your experience with this tour..."
            />
          </div>
          
          {/* Pros */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              What did you like? (Optional)
            </label>
            <textarea
              name="pros"
              value={formData.pros}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Share the highlights..."
            />
          </div>
          
          {/* Cons */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              What could be improved? (Optional)
            </label>
            <textarea
              name="cons"
              value={formData.cons}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Share areas for improvement..."
            />
          </div>
          
          {/* Submit Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              fullWidth
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              fullWidth
              loading={loading}
              disabled={formData.rating === 0 || !formData.title || !formData.content}
            >
              Submit Review
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default ReviewForm;
