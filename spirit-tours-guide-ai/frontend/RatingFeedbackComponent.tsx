/**
 * Rating & Feedback Component
 * 
 * Features:
 * - Multi-dimensional rating collection at each waypoint
 * - Real-time feedback submission with sentiment preview
 * - Visual star rating interface
 * - Feedback categorization (positive, constructive, complaint, suggestion)
 * - Guide dashboard with performance insights
 * - Alert notifications for low ratings
 * - Trend visualization with charts
 * 
 * Props:
 * - tourId: Current tour identifier
 * - waypointId: Current waypoint identifier
 * - guideId: Guide being rated
 * - passengerId: Passenger submitting rating
 * - onSubmit: Callback after rating submission
 * - mode: 'passenger' | 'guide-dashboard'
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Star,
  Send,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Award,
  Target,
} from 'lucide-react';

interface RatingDimensions {
  guideKnowledge: number;
  communication: number;
  routeExperience: number;
  vehicleComfort: number;
  overallSatisfaction: number;
}

interface RatingFeedbackProps {
  tourId: string;
  waypointId?: string;
  guideId: string;
  passengerId?: string;
  onSubmit?: (result: any) => void;
  mode?: 'passenger' | 'guide-dashboard';
}

const RatingFeedbackComponent: React.FC<RatingFeedbackProps> = ({
  tourId,
  waypointId,
  guideId,
  passengerId,
  onSubmit,
  mode = 'passenger',
}) => {
  // State for passenger mode
  const [ratings, setRatings] = useState<RatingDimensions>({
    guideKnowledge: 0,
    communication: 0,
    routeExperience: 0,
    vehicleComfort: 0,
    overallSatisfaction: 0,
  });
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  
  // State for guide dashboard mode
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  
  // WebSocket for real-time alerts
  useEffect(() => {
    if (mode === 'guide-dashboard') {
      fetchDashboardData();
      
      // Setup WebSocket for real-time alerts
      const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:3000');
      
      socket.on('guide:alert', (data) => {
        if (data.guideId === guideId) {
          setAlerts(prev => [data.alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
          // Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(data.alert.title, {
              body: data.alert.message,
              icon: '/icon-192x192.png',
            });
          }
        }
      });
      
      return () => {
        socket.off('guide:alert');
        socket.close();
      };
    }
  }, [mode, guideId, timeRange]);
  
  /**
   * Fetch guide dashboard data
   */
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/ratings/guide/${guideId}/dashboard`, {
        params: { timeRange },
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Handle star rating click
   */
  const handleRatingChange = (dimension: keyof RatingDimensions, value: number) => {
    setRatings(prev => ({ ...prev, [dimension]: value }));
  };
  
  /**
   * Render star rating interface
   */
  const renderStarRating = (dimension: keyof RatingDimensions, label: string) => {
    const currentRating = ratings[dimension];
    
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleRatingChange(dimension, star)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <Star
                size={32}
                className={star <= currentRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
              />
            </button>
          ))}
          <span className="ml-3 text-lg font-semibold text-gray-700">
            {currentRating > 0 ? `${currentRating}.0` : '-'}
          </span>
        </div>
      </div>
    );
  };
  
  /**
   * Submit rating and feedback
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (ratings.overallSatisfaction === 0) {
      alert('Please provide an overall satisfaction rating');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await axios.post('/api/ratings/submit', {
        tourId,
        waypointId,
        passengerId,
        guideId,
        guideKnowledge: ratings.guideKnowledge || null,
        communication: ratings.communication || null,
        routeExperience: ratings.routeExperience || null,
        vehicleComfort: ratings.vehicleComfort || null,
        overallSatisfaction: ratings.overallSatisfaction,
        feedbackText: feedbackText || null,
        feedbackCategory: feedbackCategory || null,
      });
      
      setSubmitResult(response.data);
      
      if (onSubmit) {
        onSubmit(response.data);
      }
      
      // Show success message
      alert('Thank you for your feedback! Your rating helps improve our service.');
      
      // Reset form
      setRatings({
        guideKnowledge: 0,
        communication: 0,
        routeExperience: 0,
        vehicleComfort: 0,
        overallSatisfaction: 0,
      });
      setFeedbackText('');
      setFeedbackCategory('');
      
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  /**
   * Render passenger rating form
   */
  const renderPassengerForm = () => (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <MessageSquare className="mr-2" />
        Rate Your Experience
      </h2>
      
      <form onSubmit={handleSubmit}>
        {/* Overall Satisfaction - Required */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          {renderStarRating('overallSatisfaction', '⭐ Overall Satisfaction (Required)')}
        </div>
        
        {/* Optional detailed ratings */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Optional: Rate Specific Aspects
          </h3>
          {renderStarRating('guideKnowledge', '📚 Guide Knowledge & Expertise')}
          {renderStarRating('communication', '💬 Communication & Clarity')}
          {renderStarRating('routeExperience', '🗺️ Route & Experience Quality')}
          {renderStarRating('vehicleComfort', '🚗 Vehicle Comfort & Cleanliness')}
        </div>
        
        {/* Feedback text */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Share Your Thoughts (Optional)
          </label>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            placeholder="Tell us about your experience..."
          />
        </div>
        
        {/* Feedback category */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Feedback Type
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { value: 'positive', label: 'Positive', icon: ThumbsUp, color: 'green' },
              { value: 'constructive', label: 'Constructive', icon: Target, color: 'blue' },
              { value: 'complaint', label: 'Complaint', icon: ThumbsDown, color: 'red' },
              { value: 'suggestion', label: 'Suggestion', icon: Lightbulb, color: 'yellow' },
              { value: 'question', label: 'Question', icon: MessageSquare, color: 'purple' },
            ].map((category) => {
              const Icon = category.icon;
              const isSelected = feedbackCategory === category.value;
              return (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setFeedbackCategory(category.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? `border-${category.color}-500 bg-${category.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon size={20} className={`mx-auto mb-1 text-${category.color}-600`} />
                  <div className="text-xs font-medium">{category.label}</div>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting || ratings.overallSatisfaction === 0}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Submitting...
            </>
          ) : (
            <>
              <Send size={20} className="mr-2" />
              Submit Feedback
            </>
          )}
        </button>
      </form>
      
      {/* Show result if available */}
      {submitResult && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center text-green-800 font-semibold mb-2">
            <CheckCircle size={20} className="mr-2" />
            Feedback Submitted Successfully!
          </div>
          {submitResult.sentiment && (
            <div className="text-sm text-gray-700">
              <p>Sentiment: {submitResult.sentiment.label} ({(submitResult.sentiment.score * 100).toFixed(0)}%)</p>
              {submitResult.alert?.shouldAlert && (
                <p className="text-orange-600 mt-1">
                  ⚠️ Guide has been notified for immediate attention
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
  
  /**
   * Render guide dashboard
   */
  const renderGuideDashboard = () => {
    if (loading || !dashboardData) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }
    
    const { summary, insights, trends } = dashboardData;
    
    return (
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
          <Award className="mr-3 text-blue-600" />
          Performance Dashboard
        </h1>
        
        {/* Time range selector */}
        <div className="mb-6 flex space-x-2">
          {['24h', '7d', '30d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {range === '24h' ? 'Last 24 Hours' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
            </button>
          ))}
        </div>
        
        {/* Real-time alerts */}
        {alerts.length > 0 && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <h3 className="text-lg font-semibold text-red-800 mb-2 flex items-center">
              <AlertTriangle className="mr-2" />
              Recent Alerts ({alerts.length})
            </h3>
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert, index) => (
                <div key={index} className="text-sm text-red-700">
                  <strong>{alert.title}</strong>: {alert.message}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm mb-1">Total Ratings</div>
            <div className="text-3xl font-bold text-blue-600">{summary.total_ratings}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm mb-1">Average Rating</div>
            <div className="text-3xl font-bold text-green-600 flex items-center">
              {parseFloat(summary.average_rating).toFixed(2)}
              <Star size={24} className="ml-1 fill-yellow-400 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm mb-1">Positive Feedback</div>
            <div className="text-3xl font-bold text-green-600">
              {summary.positive_count}
              {summary.total_ratings > 0 && (
                <span className="text-base ml-2 text-gray-600">
                  ({((summary.positive_count / summary.total_ratings) * 100).toFixed(0)}%)
                </span>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm mb-1">Low Ratings</div>
            <div className="text-3xl font-bold text-red-600">
              {summary.low_ratings}
              {summary.total_ratings > 0 && (
                <span className="text-base ml-2 text-gray-600">
                  ({((summary.low_ratings / summary.total_ratings) * 100).toFixed(0)}%)
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Dimensional performance */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Performance by Dimension</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Guide Knowledge', value: summary.avg_knowledge, icon: '📚' },
              { label: 'Communication', value: summary.avg_communication, icon: '💬' },
              { label: 'Route Experience', value: summary.avg_route, icon: '🗺️' },
              { label: 'Vehicle Comfort', value: summary.avg_vehicle, icon: '🚗' },
            ].map((dimension) => {
              const rating = parseFloat(dimension.value) || 0;
              const percentage = (rating / 5) * 100;
              const color = rating >= 4 ? 'green' : rating >= 3 ? 'yellow' : 'red';
              
              return (
                <div key={dimension.label} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">
                      {dimension.icon} {dimension.label}
                    </span>
                    <span className="font-bold text-gray-800">{rating.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`bg-${color}-500 h-3 rounded-full transition-all`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* AI Insights */}
        {insights && insights.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Strengths */}
            <div className="bg-green-50 rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold text-green-800 mb-4 flex items-center">
                <ThumbsUp className="mr-2" />
                Strengths
              </h3>
              <ul className="space-y-2">
                {insights
                  .filter((i: any) => i.insight_type === 'strength')
                  .slice(0, 3)
                  .map((insight: any, index: number) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle size={16} className="mr-2 mt-1 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{insight.insight_text}</span>
                    </li>
                  ))}
              </ul>
            </div>
            
            {/* Areas for Improvement */}
            <div className="bg-orange-50 rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold text-orange-800 mb-4 flex items-center">
                <Target className="mr-2" />
                Areas for Improvement
              </h3>
              <ul className="space-y-2">
                {insights
                  .filter((i: any) => i.insight_type === 'weakness')
                  .slice(0, 3)
                  .map((insight: any, index: number) => (
                    <li key={index} className="flex items-start">
                      <AlertTriangle size={16} className="mr-2 mt-1 text-orange-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{insight.insight_text}</span>
                    </li>
                  ))}
              </ul>
            </div>
            
            {/* Quick Wins */}
            <div className="bg-blue-50 rounded-lg shadow p-6 md:col-span-2">
              <h3 className="text-xl font-semibold text-blue-800 mb-4 flex items-center">
                <Lightbulb className="mr-2" />
                Quick Wins - Immediate Actions
              </h3>
              <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {insights
                  .filter((i: any) => i.insight_type === 'suggestion')
                  .slice(0, 3)
                  .map((insight: any, index: number) => (
                    <li key={index} className="flex items-start bg-white p-3 rounded-lg">
                      <Lightbulb size={16} className="mr-2 mt-1 text-blue-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{insight.insight_text}</span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}
        
        {/* Trend chart placeholder */}
        {trends && trends.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <TrendingUp className="mr-2" />
              Rating Trends
            </h3>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center text-gray-500">
                <TrendingUp size={48} className="mx-auto mb-2" />
                <p>Chart visualization would go here</p>
                <p className="text-sm">(Integration with Chart.js or Recharts recommended)</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return mode === 'passenger' ? renderPassengerForm() : renderGuideDashboard();
};

export default RatingFeedbackComponent;
