import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { bookingsAPI } from '../../services/api';

interface Booking {
  id: number;
  tour_id: number;
  user_id: number;
  booking_reference: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';
  number_of_adults: number;
  number_of_children: number;
  number_of_infants: number;
  booking_date: string;
  tour_date: string;
  total_price: number;
  currency: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  payment_method?: string;
  special_requirements?: string;
  tour?: {
    id: number;
    title: string;
    featured_image_url?: string;
    location: string;
  };
  participants: Array<{
    name: string;
    age: number;
    type: 'adult' | 'child' | 'infant';
  }>;
}

interface BookingsState {
  bookings: Booking[];
  currentBooking: Booking | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const initialState: BookingsState = {
  bookings: [],
  currentBooking: null,
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
export const createBooking = createAsyncThunk(
  'bookings/createBooking',
  async (bookingData: {
    tour_id: number;
    tour_date: string;
    number_of_adults: number;
    number_of_children?: number;
    number_of_infants?: number;
    participants: Array<{
      name: string;
      age: number;
      type: 'adult' | 'child' | 'infant';
    }>;
    special_requirements?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await bookingsAPI.createBooking(bookingData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to create booking');
    }
  }
);

export const fetchUserBookings = createAsyncThunk(
  'bookings/fetchUserBookings',
  async (params: {
    page?: number;
    limit?: number;
    status?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await bookingsAPI.getUserBookings(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch bookings');
    }
  }
);

export const fetchBookingById = createAsyncThunk(
  'bookings/fetchBookingById',
  async (bookingId: number, { rejectWithValue }) => {
    try {
      const response = await bookingsAPI.getBookingById(bookingId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch booking details');
    }
  }
);

export const cancelBooking = createAsyncThunk(
  'bookings/cancelBooking',
  async (params: {
    bookingId: number;
    reason?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await bookingsAPI.cancelBooking(params.bookingId, params.reason);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to cancel booking');
    }
  }
);

export const processPayment = createAsyncThunk(
  'bookings/processPayment',
  async (params: {
    bookingId: number;
    paymentMethod: string;
    paymentDetails: any;
  }, { rejectWithValue }) => {
    try {
      const response = await bookingsAPI.processPayment(
        params.bookingId,
        params.paymentMethod,
        params.paymentDetails
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Payment processing failed');
    }
  }
);

const bookingsSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    clearCurrentBooking: (state) => {
      state.currentBooking = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Create booking
    builder.addCase(createBooking.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createBooking.fulfilled, (state, action) => {
      state.loading = false;
      state.currentBooking = action.payload;
      state.bookings.unshift(action.payload);
    });
    builder.addCase(createBooking.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch user bookings
    builder.addCase(fetchUserBookings.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchUserBookings.fulfilled, (state, action) => {
      state.loading = false;
      state.bookings = action.payload.items || action.payload;
      state.pagination = {
        page: action.payload.page || 1,
        limit: action.payload.limit || 10,
        total: action.payload.total || action.payload.length,
        totalPages: action.payload.pages || Math.ceil((action.payload.total || action.payload.length) / (action.payload.limit || 10)),
      };
    });
    builder.addCase(fetchUserBookings.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch booking by ID
    builder.addCase(fetchBookingById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchBookingById.fulfilled, (state, action) => {
      state.loading = false;
      state.currentBooking = action.payload;
    });
    builder.addCase(fetchBookingById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Cancel booking
    builder.addCase(cancelBooking.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(cancelBooking.fulfilled, (state, action) => {
      state.loading = false;
      // Update booking in list
      const index = state.bookings.findIndex(b => b.id === action.payload.id);
      if (index !== -1) {
        state.bookings[index] = action.payload;
      }
      // Update current booking if it's the same
      if (state.currentBooking?.id === action.payload.id) {
        state.currentBooking = action.payload;
      }
    });
    builder.addCase(cancelBooking.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Process payment
    builder.addCase(processPayment.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(processPayment.fulfilled, (state, action) => {
      state.loading = false;
      // Update booking with payment info
      const index = state.bookings.findIndex(b => b.id === action.payload.booking_id);
      if (index !== -1) {
        state.bookings[index].payment_status = action.payload.status;
      }
      if (state.currentBooking?.id === action.payload.booking_id) {
        state.currentBooking.payment_status = action.payload.status;
      }
    });
    builder.addCase(processPayment.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearCurrentBooking, clearError, setPage } = bookingsSlice.actions;
export default bookingsSlice.reducer;
