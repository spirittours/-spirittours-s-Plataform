import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Dashboard from '../Dashboard';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../store/slices/authSlice';

// Mock store
const mockStore = configureStore({
  reducer: {
    auth: authReducer,
  },
  preloadedState: {
    auth: {
      isAuthenticated: true,
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
      },
      token: 'mock-token',
      loading: false,
      error: null,
    },
  },
});

const theme = createTheme();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={mockStore}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          {component}
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders dashboard with user information', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    expect(screen.getByText(/Test User/i)).toBeInTheDocument();
  });

  test('displays main navigation menu', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText(/Tours/i)).toBeInTheDocument();
    expect(screen.getByText(/Bookings/i)).toBeInTheDocument();
    expect(screen.getByText(/Analytics/i)).toBeInTheDocument();
  });

  test('shows statistics cards', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/Total Bookings/i)).toBeInTheDocument();
      expect(screen.getByText(/Revenue/i)).toBeInTheDocument();
      expect(screen.getByText(/Active Tours/i)).toBeInTheDocument();
    });
  });

  test('handles menu navigation correctly', () => {
    renderWithProviders(<Dashboard />);
    
    const toursButton = screen.getByText(/Tours/i);
    fireEvent.click(toursButton);
    
    expect(window.location.pathname).toContain('/tours');
  });

  test('displays recent activity section', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/Recent Activity/i)).toBeInTheDocument();
    });
  });

  test('shows quick actions menu', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByRole('button', { name: /Create Tour/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Booking/i })).toBeInTheDocument();
  });

  test('displays user profile menu on avatar click', () => {
    renderWithProviders(<Dashboard />);
    
    const avatar = screen.getByTestId('user-avatar');
    fireEvent.click(avatar);
    
    expect(screen.getByText(/Profile/i)).toBeInTheDocument();
    expect(screen.getByText(/Settings/i)).toBeInTheDocument();
    expect(screen.getByText(/Logout/i)).toBeInTheDocument();
  });

  test('handles logout functionality', async () => {
    renderWithProviders(<Dashboard />);
    
    const avatar = screen.getByTestId('user-avatar');
    fireEvent.click(avatar);
    
    const logoutButton = screen.getByText(/Logout/i);
    fireEvent.click(logoutButton);
    
    await waitFor(() => {
      expect(window.location.pathname).toBe('/login');
    });
  });

  test('displays notifications badge with count', () => {
    renderWithProviders(<Dashboard />);
    
    const notificationBadge = screen.getByTestId('notification-badge');
    expect(notificationBadge).toBeInTheDocument();
  });

  test('renders responsive layout on mobile', () => {
    window.innerWidth = 375;
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByTestId('mobile-menu-button')).toBeInTheDocument();
  });
});