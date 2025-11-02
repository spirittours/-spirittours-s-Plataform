/**
 * CustomerProfile Component Stories
 * Comprehensive Storybook stories demonstrating all features
 */

import type { Meta, StoryObj } from '@storybook/react';
import { CustomerProfile } from './CustomerProfile';
import { QueryClient, QueryClientProvider } from 'react-query';
import { rest } from 'msw';

// Mock data
const mockCustomerData = {
  id: 'customer-123',
  firstName: 'David',
  lastName: 'Cohen',
  email: 'david.cohen@example.com',
  phone: '+972-50-123-4567',
  dateOfBirth: '1985-06-15',
  avatar: 'https://i.pravatar.cc/150?img=12',
  address: {
    street: '123 King David St',
    city: 'Jerusalem',
    state: 'Jerusalem District',
    country: 'Israel',
    postalCode: '94101',
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
  tier: 'gold' as const,
  points: 850,
  totalBookings: 15,
  totalSpent: 5200,
  memberSince: '2020-01-15',
  verified: true,
};

const meta = {
  title: 'Components/Customer/CustomerProfile',
  component: CustomerProfile,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# CustomerProfile Component

A comprehensive customer profile management component with full CRUD capabilities.

## Features
- ✨ Multi-tab interface (Personal Info, Security, Preferences, Activity)
- 📝 Inline profile editing with form validation
- 🖼️ Avatar upload with preview
- 🔒 Secure password change functionality
- ⚙️ Preference management (language, currency, notifications, privacy)
- 📊 Activity history display
- 🏆 Tier-based customer classification (Bronze/Silver/Gold/Platinum)
- 📱 Responsive design for mobile and desktop
- 🔄 Real-time data updates with React Query
- ⚠️ Comprehensive error handling

## Usage

\`\`\`tsx
import { CustomerProfile } from '@/components/Customer/CustomerProfile';
import { QueryClient, QueryClientProvider } from 'react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CustomerProfile />
    </QueryClientProvider>
  );
}
\`\`\`

## API Endpoints

- **GET** \`/api/customers/profile\` - Fetch profile data
- **PUT** \`/api/customers/profile\` - Update profile data
- **POST** \`/api/customers/avatar\` - Upload avatar image
- **POST** \`/api/customers/change-password\` - Change password
        `,
      },
    },
    msw: {
      handlers: [
        rest.get('/api/customers/profile', (req, res, ctx) => {
          return res(ctx.json(mockCustomerData));
        }),
        rest.put('/api/customers/profile', (req, res, ctx) => {
          return res(ctx.json({ ...mockCustomerData, ...req.body }));
        }),
      ],
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      });
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
} satisfies Meta<typeof CustomerProfile>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default customer profile view
 * Shows a Gold tier customer with complete profile information
 */
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Default customer profile with complete information and Gold tier status.',
      },
    },
  },
};

/**
 * Bronze Tier Customer
 * New customer with basic profile
 */
export const BronzeTier: Story = {
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/customers/profile', (req, res, ctx) => {
          return res(
            ctx.json({
              ...mockCustomerData,
              tier: 'bronze',
              points: 50,
              totalBookings: 1,
              totalSpent: 200,
              verified: false,
            })
          );
        }),
      ],
    },
    docs: {
      description: {
        story: 'Bronze tier customer with minimal activity and unverified status.',
      },
    },
  },
};

/**
 * Platinum Tier Customer
 * VIP customer with extensive activity
 */
export const PlatinumTier: Story = {
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/customers/profile', (req, res, ctx) => {
          return res(
            ctx.json({
              ...mockCustomerData,
              tier: 'platinum',
              points: 5000,
              totalBookings: 50,
              totalSpent: 25000,
              verified: true,
            })
          );
        }),
      ],
    },
    docs: {
      description: {
        story: 'Platinum tier VIP customer with extensive booking history.',
      },
    },
  },
};

/**
 * Loading State
 * Shows the loading spinner while fetching data
 */
export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/customers/profile', (req, res, ctx) => {
          return res(ctx.delay('infinite'));
        }),
      ],
    },
    docs: {
      description: {
        story: 'Loading state displayed while fetching customer data.',
      },
    },
  },
};

/**
 * Error State
 * Shows error message when data fetch fails
 */
export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/customers/profile', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Failed to load profile' }));
        }),
      ],
    },
    docs: {
      description: {
        story: 'Error state displayed when data fetch fails.',
      },
    },
  },
};

/**
 * Unverified Customer
 * Customer with unverified email/phone
 */
export const Unverified: Story = {
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/customers/profile', (req, res, ctx) => {
          return res(
            ctx.json({
              ...mockCustomerData,
              verified: false,
            })
          );
        }),
      ],
    },
    docs: {
      description: {
        story: 'Customer profile without verification badge.',
      },
    },
  },
};

/**
 * Mobile View
 * Responsive layout for mobile devices
 */
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
    docs: {
      description: {
        story: 'Mobile-optimized layout for smartphones.',
      },
    },
  },
};

/**
 * Tablet View
 * Responsive layout for tablets
 */
export const Tablet: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story: 'Tablet-optimized layout for medium screens.',
      },
    },
  },
};

/**
 * Dark Mode
 * Profile in dark theme
 */
export const DarkMode: Story = {
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'Customer profile displayed in dark theme.',
      },
    },
  },
  globals: {
    theme: 'dark',
  },
};
