import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import './App.css';

// Layout Components
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import AdminLayout from './layouts/AdminLayout';

// All Pages - Import from index
import {
  HomePage,
  ToursPage,
  TourDetailPage,
  SearchPage,
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  BookingPage,
  BookingConfirmationPage,
  MyBookingsPage,
  ProfilePage,
  DashboardPage,
  ReviewsPage,
  AdminDashboardPage,
  AdminToursPage,
  AdminBookingsPage,
  AdminUsersPage,
  AdminReviewsPage,
  AdminAnalyticsPage,
  NotFoundPage,
} from './pages';

// Protected Route Component
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';

// Global Components
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import { Toast } from './components/UI';

function App() {
  return (
    <Provider store={store}>
      <ErrorBoundary>
        <Toast />
        <Router>
        <Routes>
          {/* Public Routes with Main Layout */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/tours" element={<ToursPage />} />
            <Route path="/tours/:id" element={<TourDetailPage />} />
            <Route path="/search" element={<SearchPage />} />
          </Route>

          {/* Auth Routes with Auth Layout */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          {/* Protected User Routes with Main Layout */}
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route path="/booking/:tourId" element={<BookingPage />} />
            <Route path="/booking/confirmation/:bookingId" element={<BookingConfirmationPage />} />
            <Route path="/my-bookings" element={<MyBookingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/my-reviews" element={<ReviewsPage />} />
          </Route>

          {/* Protected Admin Routes with Admin Layout */}
          <Route element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/tours" element={<AdminToursPage />} />
            <Route path="/admin/bookings" element={<AdminBookingsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/reviews" element={<AdminReviewsPage />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          </Route>

          {/* 404 Not Found Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Router>
      </ErrorBoundary>
    </Provider>
  );
}

export default App;
