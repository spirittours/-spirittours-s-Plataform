import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { reviewsAPI } from '../../services/api';

interface Review {
  id: number;
  tour_id: number;
  user_id: number;
  booking_id?: number;
  rating: number;
  value_rating?: number;
  guide_rating?: number;
  organization_rating?: number;
  experience_rating?: number;
  title: string;
  content: string;
  pros?: string;
  cons?: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged' | 'hidden';
  is_verified_purchase: boolean;
  helpful_count: number;
  not_helpful_count: number;
  flag_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
  };
  media?: Array<{
    url: string;
    type: 'image' | 'video';
  }>;
  response?: {
    content: string;
    created_at: string;
  };
}

interface RatingSummary {
  average_rating: number;
  total_reviews: number;
  rating_distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  average_value_rating?: number;
  average_guide_rating?: number;
  average_organization_rating?: number;
  average_experience_rating?: number;
}

interface ReviewsState {
  reviews: Review[];
  currentReview: Review | null;
  ratingSummary: RatingSummary | null;
  userReviews: Review[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const initialState: ReviewsState = {
  reviews: [],
  currentReview: null,
  ratingSummary: null,
  userReviews: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
};

// Async thunks
export const fetchTourReviews = createAsyncThunk(
  'reviews/fetchTourReviews',
  async (params: {
    tourId: number;
    page?: number;
    limit?: number;
    sort_by?: string;
    min_rating?: number;
  }, { rejectWithValue }) => {
    try {
      const response = await reviewsAPI.getTourReviews(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch reviews');
    }
  }
);

export const fetchTourRatingSummary = createAsyncThunk(
  'reviews/fetchTourRatingSummary',
  async (tourId: number, { rejectWithValue }) => {
    try {
      const response = await reviewsAPI.getTourRatingSummary(tourId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch rating summary');
    }
  }
);

export const createReview = createAsyncThunk(
  'reviews/createReview',
  async (reviewData: {
    tour_id: number;
    booking_id?: number;
    rating: number;
    value_rating?: number;
    guide_rating?: number;
    organization_rating?: number;
    experience_rating?: number;
    title: string;
    content: string;
    pros?: string;
    cons?: string;
    media?: Array<{
      url: string;
      type: 'image' | 'video';
    }>;
  }, { rejectWithValue }) => {
    try {
      const response = await reviewsAPI.createReview(reviewData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to create review');
    }
  }
);

export const updateReview = createAsyncThunk(
  'reviews/updateReview',
  async (params: {
    reviewId: number;
    updates: Partial<Review>;
  }, { rejectWithValue }) => {
    try {
      const response = await reviewsAPI.updateReview(params.reviewId, params.updates);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to update review');
    }
  }
);

export const deleteReview = createAsyncThunk(
  'reviews/deleteReview',
  async (reviewId: number, { rejectWithValue }) => {
    try {
      await reviewsAPI.deleteReview(reviewId);
      return reviewId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to delete review');
    }
  }
);

export const voteReview = createAsyncThunk(
  'reviews/voteReview',
  async (params: {
    reviewId: number;
    isHelpful: boolean;
  }, { rejectWithValue }) => {
    try {
      const response = await reviewsAPI.voteReview(params.reviewId, params.isHelpful);
      return { reviewId: params.reviewId, ...response.data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to vote on review');
    }
  }
);

export const flagReview = createAsyncThunk(
  'reviews/flagReview',
  async (params: {
    reviewId: number;
    reason: string;
    description?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await reviewsAPI.flagReview(params.reviewId, params.reason, params.description);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to flag review');
    }
  }
);

export const fetchUserReviews = createAsyncThunk(
  'reviews/fetchUserReviews',
  async (_, { rejectWithValue }) => {
    try {
      const response = await reviewsAPI.getUserReviews();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch user reviews');
    }
  }
);

const reviewsSlice = createSlice({
  name: 'reviews',
  initialState,
  reducers: {
    clearCurrentReview: (state) => {
      state.currentReview = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch tour reviews
    builder.addCase(fetchTourReviews.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTourReviews.fulfilled, (state, action) => {
      state.loading = false;
      state.reviews = action.payload.items || action.payload;
      state.pagination = {
        page: action.payload.page || 1,
        limit: action.payload.limit || 10,
        total: action.payload.total || action.payload.length,
        totalPages: action.payload.pages || Math.ceil((action.payload.total || action.payload.length) / (action.payload.limit || 10)),
      };
    });
    builder.addCase(fetchTourReviews.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch tour rating summary
    builder.addCase(fetchTourRatingSummary.fulfilled, (state, action) => {
      state.ratingSummary = action.payload;
    });

    // Create review
    builder.addCase(createReview.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createReview.fulfilled, (state, action) => {
      state.loading = false;
      state.currentReview = action.payload;
      state.userReviews.unshift(action.payload);
    });
    builder.addCase(createReview.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Update review
    builder.addCase(updateReview.fulfilled, (state, action) => {
      const index = state.reviews.findIndex(r => r.id === action.payload.id);
      if (index !== -1) {
        state.reviews[index] = action.payload;
      }
      const userIndex = state.userReviews.findIndex(r => r.id === action.payload.id);
      if (userIndex !== -1) {
        state.userReviews[userIndex] = action.payload;
      }
    });

    // Delete review
    builder.addCase(deleteReview.fulfilled, (state, action) => {
      state.reviews = state.reviews.filter(r => r.id !== action.payload);
      state.userReviews = state.userReviews.filter(r => r.id !== action.payload);
    });

    // Vote review
    builder.addCase(voteReview.fulfilled, (state, action) => {
      const review = state.reviews.find(r => r.id === action.payload.reviewId);
      if (review) {
        review.helpful_count = action.payload.helpful_count;
        review.not_helpful_count = action.payload.not_helpful_count;
      }
    });

    // Fetch user reviews
    builder.addCase(fetchUserReviews.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchUserReviews.fulfilled, (state, action) => {
      state.loading = false;
      state.userReviews = action.payload;
    });
    builder.addCase(fetchUserReviews.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearCurrentReview, clearError, setPage } = reviewsSlice.actions;
export default reviewsSlice.reducer;
