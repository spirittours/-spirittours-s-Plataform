import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { toursAPI } from '../../services/api';

interface Tour {
  id: number;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  tour_type: string;
  difficulty_level: string;
  duration_days: number;
  duration_hours?: number;
  price: number;
  discounted_price?: number;
  currency: string;
  max_group_size: number;
  min_age: number;
  languages: string[];
  location: string;
  country: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  featured_image_url?: string;
  images: Array<{ url: string; caption?: string }>;
  average_rating?: number;
  total_reviews: number;
  total_bookings: number;
  is_active: boolean;
  is_featured: boolean;
  includes: string[];
  excludes: string[];
  highlights: string[];
  meeting_point?: string;
  cancellation_policy?: string;
  tags: string[];
}

interface ToursState {
  tours: Tour[];
  featuredTours: Tour[];
  currentTour: Tour | null;
  filters: {
    search?: string;
    tour_type?: string;
    difficulty_level?: string;
    min_price?: number;
    max_price?: number;
    min_duration?: number;
    max_duration?: number;
    location?: string;
    min_rating?: number;
    languages?: string[];
    is_featured?: boolean;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  loading: boolean;
  error: string | null;
}

const initialState: ToursState = {
  tours: [],
  featuredTours: [],
  currentTour: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  },
  loading: false,
  error: null,
};

// Async thunks
export const fetchTours = createAsyncThunk(
  'tours/fetchTours',
  async (params: {
    page?: number;
    limit?: number;
    search?: string;
    tour_type?: string;
    difficulty_level?: string;
    min_price?: number;
    max_price?: number;
    min_duration?: number;
    max_duration?: number;
    location?: string;
    min_rating?: number;
    languages?: string[];
    is_featured?: boolean;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }, { rejectWithValue }) => {
    try {
      const response = await toursAPI.getTours(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch tours');
    }
  }
);

export const fetchFeaturedTours = createAsyncThunk(
  'tours/fetchFeaturedTours',
  async (limit: number = 6, { rejectWithValue }) => {
    try {
      const response = await toursAPI.getFeaturedTours(limit);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch featured tours');
    }
  }
);

export const fetchTourById = createAsyncThunk(
  'tours/fetchTourById',
  async (tourId: number, { rejectWithValue }) => {
    try {
      const response = await toursAPI.getTourById(tourId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch tour details');
    }
  }
);

export const fetchTourBySlug = createAsyncThunk(
  'tours/fetchTourBySlug',
  async (slug: string, { rejectWithValue }) => {
    try {
      const response = await toursAPI.getTourBySlug(slug);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch tour details');
    }
  }
);

export const searchTours = createAsyncThunk(
  'tours/searchTours',
  async (params: {
    query: string;
    filters?: any;
    page?: number;
    limit?: number;
  }, { rejectWithValue }) => {
    try {
      const response = await toursAPI.searchTours(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Search failed');
    }
  }
);

const toursSlice = createSlice({
  name: 'tours',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<ToursState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    clearCurrentTour: (state) => {
      state.currentTour = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch tours
    builder.addCase(fetchTours.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTours.fulfilled, (state, action) => {
      state.loading = false;
      state.tours = action.payload.items || action.payload;
      state.pagination = {
        page: action.payload.page || 1,
        limit: action.payload.limit || 12,
        total: action.payload.total || action.payload.length,
        totalPages: action.payload.pages || Math.ceil((action.payload.total || action.payload.length) / (action.payload.limit || 12)),
      };
    });
    builder.addCase(fetchTours.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch featured tours
    builder.addCase(fetchFeaturedTours.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchFeaturedTours.fulfilled, (state, action) => {
      state.loading = false;
      state.featuredTours = action.payload;
    });
    builder.addCase(fetchFeaturedTours.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch tour by ID
    builder.addCase(fetchTourById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTourById.fulfilled, (state, action) => {
      state.loading = false;
      state.currentTour = action.payload;
    });
    builder.addCase(fetchTourById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch tour by slug
    builder.addCase(fetchTourBySlug.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTourBySlug.fulfilled, (state, action) => {
      state.loading = false;
      state.currentTour = action.payload;
    });
    builder.addCase(fetchTourBySlug.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Search tours
    builder.addCase(searchTours.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(searchTours.fulfilled, (state, action) => {
      state.loading = false;
      state.tours = action.payload.items || action.payload;
      state.pagination = {
        page: action.payload.page || 1,
        limit: action.payload.limit || 12,
        total: action.payload.total || action.payload.length,
        totalPages: action.payload.pages || Math.ceil((action.payload.total || action.payload.length) / (action.payload.limit || 12)),
      };
    });
    builder.addCase(searchTours.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { setFilters, clearFilters, setPage, clearCurrentTour, clearError } = toursSlice.actions;
export default toursSlice.reducer;
