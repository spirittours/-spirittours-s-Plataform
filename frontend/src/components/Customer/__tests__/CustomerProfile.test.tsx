/**
 * @file CustomerProfile.test.tsx
 * @description Comprehensive test suite for CustomerProfile component
 * Tests cover rendering, user interactions, form validation, and API integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CustomerProfile from '../CustomerProfile';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
  },
}));

// ============================================================================
// TEST UTILITIES
// ============================================================================

const mockCustomerData = {
  id: 'customer-123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1-555-0123',
  dateOfBirth: '1985-06-15',
  avatar: 'https://example.com/avatar.jpg',
  address: {
    street: '123 Main St',
    city: 'Jerusalem',
    state: 'Jerusalem District',
    country: 'Israel',
    postalCode: '12345',
  },
  preferences: {
    language: 'en',
    currency: 'USD',
    notifications: {
      email: true,
      sms: false,
      push: true,
    },
    privacy: {
      showProfile: true,
      showBookingHistory: true,
    },
  },
  tier: 'Gold',
  totalBookings: 15,
  totalSpent: 5200,
  memberSince: '2020-01-15',
  verified: true,
  loyaltyPoints: 850,
};

const theme = createTheme();

/**
 * Render component with all necessary providers
 */
const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

/**
 * Wait for component to finish loading
 */
const waitForDataLoad = async () => {
  await waitFor(() => {
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
};

// ============================================================================
// TEST SUITE
// ============================================================================

describe('CustomerProfile Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();

    // Mock successful data fetch
    mockedAxios.get.mockResolvedValue({ data: mockCustomerData });
  });

  afterEach(() => {
    queryClient.clear();
  });

  // ==========================================================================
  // RENDERING TESTS
  // ==========================================================================

  describe('Rendering', () => {
    test('renders loading state initially', () => {
      renderWithProviders(<CustomerProfile />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('renders customer profile with all data', async () => {
      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText(/Gold Member/i)).toBeInTheDocument();
    });

    test('displays verified badge for verified customers', async () => {
      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      const verifiedBadge = screen.getByTestId('verified-badge');
      expect(verifiedBadge).toBeInTheDocument();
    });

    test('renders all four tabs', async () => {
      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      expect(screen.getByRole('tab', { name: /personal information/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /security/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /preferences/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /activity/i })).toBeInTheDocument();
    });

    test('displays customer avatar', async () => {
      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      const avatar = screen.getByAlt('Customer Avatar');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', mockCustomerData.avatar);
    });

    test('shows tier-specific badge', async () => {
      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      expect(screen.getByText('Gold Member')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // TAB NAVIGATION TESTS
  // ==========================================================================

  describe('Tab Navigation', () => {
    test('switches to security tab on click', async () => {
      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      const securityTab = screen.getByRole('tab', { name: /security/i });
      fireEvent.click(securityTab);

      await waitFor(() => {
        expect(screen.getByText(/change password/i)).toBeInTheDocument();
      });
    });

    test('switches to preferences tab on click', async () => {
      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      const preferencesTab = screen.getByRole('tab', { name: /preferences/i });
      fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByText(/language preference/i)).toBeInTheDocument();
      });
    });

    test('switches to activity tab on click', async () => {
      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      const activityTab = screen.getByRole('tab', { name: /activity/i });
      fireEvent.click(activityTab);

      await waitFor(() => {
        expect(screen.getByText(/booking history/i)).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // EDIT MODE TESTS
  // ==========================================================================

  describe('Edit Mode', () => {
    test('enables edit mode when edit button is clicked', async () => {
      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });
    });

    test('allows editing first name', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      expect(firstNameInput).toHaveValue('Jane');
    });

    test('cancels edit mode without saving changes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    test('saves changes when save button is clicked', async () => {
      const user = userEvent.setup();
      mockedAxios.put.mockResolvedValue({ data: { ...mockCustomerData, firstName: 'Jane' } });

      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockedAxios.put).toHaveBeenCalledWith(
          '/api/customers/profile',
          expect.objectContaining({ firstName: 'Jane' })
        );
      });
    });
  });

  // ==========================================================================
  // AVATAR UPLOAD TESTS
  // ==========================================================================

  describe('Avatar Upload', () => {
    test('shows avatar upload button in edit mode', async () => {
      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      const uploadButton = screen.getByTestId('avatar-upload-button');
      expect(uploadButton).toBeInTheDocument();
    });

    test('handles avatar file selection', async () => {
      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      const file = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
      const input = screen.getByTestId('avatar-input');
      
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(input.files?.[0]).toBe(file);
      });
    });
  });

  // ==========================================================================
  // PASSWORD CHANGE TESTS
  // ==========================================================================

  describe('Password Change', () => {
    test('opens password change dialog', async () => {
      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      const securityTab = screen.getByRole('tab', { name: /security/i });
      fireEvent.click(securityTab);

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      fireEvent.click(changePasswordButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
      });
    });

    test('validates password requirements', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      const securityTab = screen.getByRole('tab', { name: /security/i });
      fireEvent.click(securityTab);

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      fireEvent.click(changePasswordButton);

      const newPasswordInput = screen.getByLabelText(/^new password$/i);
      await user.type(newPasswordInput, 'weak');

      // Should show validation error for weak password
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /update password/i });
        expect(submitButton).toBeDisabled();
      });
    });

    test('submits password change successfully', async () => {
      const user = userEvent.setup();
      mockedAxios.post.mockResolvedValue({ data: { success: true } });

      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      const securityTab = screen.getByRole('tab', { name: /security/i });
      fireEvent.click(securityTab);

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      fireEvent.click(changePasswordButton);

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/^new password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

      await user.type(currentPasswordInput, 'oldPassword123!');
      await user.type(newPasswordInput, 'newPassword123!');
      await user.type(confirmPasswordInput, 'newPassword123!');

      const submitButton = screen.getByRole('button', { name: /update password/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/customers/change-password', {
          currentPassword: 'oldPassword123!',
          newPassword: 'newPassword123!',
        });
      });
    });
  });

  // ==========================================================================
  // PREFERENCES TESTS
  // ==========================================================================

  describe('Preferences Management', () => {
    test('displays current language preference', async () => {
      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      const preferencesTab = screen.getByRole('tab', { name: /preferences/i });
      fireEvent.click(preferencesTab);

      await waitFor(() => {
        const languageSelect = screen.getByLabelText(/language/i);
        expect(languageSelect).toHaveValue('en');
      });
    });

    test('toggles email notification preference', async () => {
      mockedAxios.put.mockResolvedValue({ data: mockCustomerData });

      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      const preferencesTab = screen.getByRole('tab', { name: /preferences/i });
      fireEvent.click(preferencesTab);

      const emailSwitch = screen.getByRole('checkbox', { name: /email notifications/i });
      fireEvent.click(emailSwitch);

      await waitFor(() => {
        expect(mockedAxios.put).toHaveBeenCalled();
      });
    });

    test('updates currency preference', async () => {
      mockedAxios.put.mockResolvedValue({ data: mockCustomerData });

      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      const preferencesTab = screen.getByRole('tab', { name: /preferences/i });
      fireEvent.click(preferencesTab);

      const currencySelect = screen.getByLabelText(/currency/i);
      fireEvent.change(currencySelect, { target: { value: 'EUR' } });

      await waitFor(() => {
        expect(mockedAxios.put).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('Error Handling', () => {
    test('displays error message when data fetch fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      renderWithProviders(<CustomerProfile />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load profile/i)).toBeInTheDocument();
      });
    });

    test('displays error message when update fails', async () => {
      mockedAxios.put.mockRejectedValue(new Error('Update failed'));

      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to update profile/i)).toBeInTheDocument();
      });
    });

    test('retries data fetch on error', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce({ data: mockCustomerData });

      renderWithProviders(<CustomerProfile />);

      const retryButton = await screen.findByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // ACCESSIBILITY TESTS
  // ==========================================================================

  describe('Accessibility', () => {
    test('has proper ARIA labels for form inputs', async () => {
      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    test('supports keyboard navigation for tabs', async () => {
      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      const personalTab = screen.getByRole('tab', { name: /personal information/i });
      personalTab.focus();

      fireEvent.keyDown(personalTab, { key: 'ArrowRight' });

      await waitFor(() => {
        const securityTab = screen.getByRole('tab', { name: /security/i });
        expect(securityTab).toHaveFocus();
      });
    });

    test('provides proper focus management in dialogs', async () => {
      renderWithProviders(<CustomerProfile />);
      await waitForDataLoad();

      const securityTab = screen.getByRole('tab', { name: /security/i });
      fireEvent.click(securityTab);

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      fireEvent.click(changePasswordButton);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByLabelText(/current password/i)).toHaveFocus();
      });
    });
  });

  // ==========================================================================
  // RESPONSIVE DESIGN TESTS
  // ==========================================================================

  describe('Responsive Design', () => {
    test('adapts layout for mobile screens', () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<CustomerProfile />);

      const container = screen.getByTestId('profile-container');
      expect(container).toHaveStyle({ maxWidth: '100%' });
    });

    test('shows desktop layout on large screens', () => {
      global.innerWidth = 1920;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<CustomerProfile />);

      const container = screen.getByTestId('profile-container');
      expect(container).toHaveStyle({ maxWidth: '1200px' });
    });
  });
});
