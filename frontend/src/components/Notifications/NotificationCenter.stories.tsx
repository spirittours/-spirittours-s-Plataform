/**
 * NotificationCenter Component Stories
 * Comprehensive examples of notification center features
 */

import type { Meta, StoryObj } from '@storybook/react';
import { NotificationCenter, Notification } from './NotificationCenter';
import { rest } from 'msw';

// Mock notifications
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Booking Confirmed',
    message: 'Your Jerusalem City Tour booking has been confirmed for Dec 15, 2024',
    type: 'success',
    category: 'booking',
    priority: 'high',
    read: false,
    timestamp: new Date().toISOString(),
    actionUrl: '/bookings/123',
    actionText: 'View Booking',
  },
  {
    id: '2',
    title: 'Payment Received',
    message: 'Payment of $250 has been successfully processed',
    type: 'success',
    category: 'payment',
    priority: 'medium',
    read: false,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '3',
    title: 'Special Offer: 20% Off',
    message: 'Book any tour this week and get 20% off. Use code: SPIRIT20',
    type: 'info',
    category: 'promo',
    priority: 'low',
    read: true,
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    actionUrl: '/tours',
    actionText: 'Browse Tours',
  },
  {
    id: '4',
    title: 'Tour Starting Soon',
    message: 'Your Dead Sea tour starts in 2 hours. Please arrive 15 minutes early.',
    type: 'warning',
    category: 'booking',
    priority: 'urgent',
    read: false,
    timestamp: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: '5',
    title: 'Payment Failed',
    message: 'Your recent payment attempt was unsuccessful. Please update your payment method.',
    type: 'error',
    category: 'payment',
    priority: 'high',
    read: false,
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    actionUrl: '/settings/payment',
    actionText: 'Update Payment',
  },
  {
    id: '6',
    title: 'New Review',
    message: 'John Doe left a 5-star review for your recent tour',
    type: 'info',
    category: 'social',
    priority: 'low',
    read: true,
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '7',
    title: 'System Maintenance',
    message: 'Scheduled maintenance on Dec 10, 2024 from 2:00 AM to 4:00 AM',
    type: 'warning',
    category: 'system',
    priority: 'medium',
    read: true,
    timestamp: new Date(Date.now() - 172800000).toISOString(),
  },
];

const meta = {
  title: 'Components/Notifications/NotificationCenter',
  component: NotificationCenter,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
# NotificationCenter Component

An advanced notification management system with real-time updates, filtering, and comprehensive features.

## Features
- 🔔 Real-time notifications via WebSocket
- 🔍 Search and filter capabilities
- 📱 Desktop notifications (Web Notifications API)
- 🔊 Sound alerts (configurable)
- ✅ Mark as read/unread functionality
- 🗑️ Delete individual or all notifications
- 📂 Categorized notifications (booking, payment, system, promo, social)
- 🎯 Priority-based sorting (urgent, high, medium, low)
- 🎨 Type-based styling (success, warning, error, info)
- 📊 Unread count badge
- ⚙️ User preferences (sound, desktop notifications)

## Notification Types
- **Success**: Successful operations (booking confirmed, payment received)
- **Warning**: Important alerts (approaching deadline, pending action)
- **Error**: Critical issues (payment failed, booking cancelled)
- **Info**: General information updates

## Categories
- **Booking**: Tour bookings, cancellations, modifications
- **Payment**: Payment confirmations, refunds, invoices
- **System**: System updates, maintenance, announcements
- **Promo**: Promotional offers, discounts, deals
- **Social**: Reviews, comments, messages

## Usage

\`\`\`tsx
import { NotificationCenter } from '@/components/Notifications/NotificationCenter';

function App() {
  const handleNotificationClick = (notification) => {
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  return (
    <NotificationCenter 
      userId="user-123"
      maxNotifications={50}
      enableSound={true}
      enableDesktopNotifications={true}
      onNotificationClick={handleNotificationClick}
    />
  );
}
\`\`\`
        `,
      },
    },
    msw: {
      handlers: [
        rest.get('/api/notifications/:userId', (req, res, ctx) => {
          return res(ctx.json(mockNotifications));
        }),
        rest.patch('/api/notifications/:id/read', (req, res, ctx) => {
          return res(ctx.json({ success: true }));
        }),
        rest.patch('/api/notifications/:userId/read-all', (req, res, ctx) => {
          return res(ctx.json({ success: true }));
        }),
        rest.delete('/api/notifications/:id', (req, res, ctx) => {
          return res(ctx.json({ success: true }));
        }),
        rest.delete('/api/notifications/:userId/all', (req, res, ctx) => {
          return res(ctx.json({ success: true }));
        }),
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    userId: {
      description: 'Unique user identifier',
      control: 'text',
    },
    maxNotifications: {
      description: 'Maximum number of notifications to display',
      control: 'number',
    },
    enableSound: {
      description: 'Enable sound alerts for new notifications',
      control: 'boolean',
    },
    enableDesktopNotifications: {
      description: 'Enable desktop notifications',
      control: 'boolean',
    },
    onNotificationClick: {
      description: 'Callback when notification is clicked',
      action: 'notification-clicked',
    },
  },
} satisfies Meta<typeof NotificationCenter>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default notification center
 * Shows all notification types with mixed read/unread status
 */
export const Default: Story = {
  args: {
    userId: 'user-123',
    maxNotifications: 50,
    enableSound: true,
    enableDesktopNotifications: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Default notification center with multiple notification types and priorities.',
      },
    },
  },
};

/**
 * All Unread Notifications
 * Notification center with all unread notifications
 */
export const AllUnread: Story = {
  args: {
    userId: 'user-123',
  },
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/notifications/:userId', (req, res, ctx) => {
          const unreadNotifications = mockNotifications.map(n => ({ ...n, read: false }));
          return res(ctx.json(unreadNotifications));
        }),
      ],
    },
    docs: {
      description: {
        story: 'Notification center showing only unread notifications with badge count.',
      },
    },
  },
};

/**
 * Empty State
 * No notifications available
 */
export const Empty: Story = {
  args: {
    userId: 'user-123',
  },
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/notifications/:userId', (req, res, ctx) => {
          return res(ctx.json([]));
        }),
      ],
    },
    docs: {
      description: {
        story: 'Empty state displayed when there are no notifications.',
      },
    },
  },
};

/**
 * Urgent Notifications Only
 * High priority and urgent notifications
 */
export const UrgentOnly: Story = {
  args: {
    userId: 'user-123',
  },
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/notifications/:userId', (req, res, ctx) => {
          const urgentNotifications = mockNotifications.filter(
            n => n.priority === 'urgent' || n.priority === 'high'
          );
          return res(ctx.json(urgentNotifications));
        }),
      ],
    },
    docs: {
      description: {
        story: 'Notification center displaying only urgent and high-priority notifications.',
      },
    },
  },
};

/**
 * Booking Notifications
 * Notifications related to tour bookings
 */
export const BookingsOnly: Story = {
  args: {
    userId: 'user-123',
  },
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/notifications/:userId', (req, res, ctx) => {
          const bookingNotifications = mockNotifications.filter(n => n.category === 'booking');
          return res(ctx.json(bookingNotifications));
        }),
      ],
    },
    docs: {
      description: {
        story: 'Notifications filtered by booking category.',
      },
    },
  },
};

/**
 * Payment Notifications
 * Notifications related to payments
 */
export const PaymentsOnly: Story = {
  args: {
    userId: 'user-123',
  },
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/notifications/:userId', (req, res, ctx) => {
          const paymentNotifications = mockNotifications.filter(n => n.category === 'payment');
          return res(ctx.json(paymentNotifications));
        }),
      ],
    },
    docs: {
      description: {
        story: 'Notifications filtered by payment category.',
      },
    },
  },
};

/**
 * Loading State
 * Notification center while fetching data
 */
export const Loading: Story = {
  args: {
    userId: 'user-123',
  },
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/notifications/:userId', (req, res, ctx) => {
          return res(ctx.delay('infinite'));
        }),
      ],
    },
    docs: {
      description: {
        story: 'Loading state displayed while fetching notifications.',
      },
    },
  },
};

/**
 * Error State
 * Failed to load notifications
 */
export const Error: Story = {
  args: {
    userId: 'user-123',
  },
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/notifications/:userId', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Failed to load notifications' }));
        }),
      ],
    },
    docs: {
      description: {
        story: 'Error state when notification fetch fails.',
      },
    },
  },
};

/**
 * Sound Disabled
 * Notification center with sound alerts disabled
 */
export const SoundDisabled: Story = {
  args: {
    userId: 'user-123',
    enableSound: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Notification center with sound alerts disabled in settings.',
      },
    },
  },
};

/**
 * Desktop Notifications Disabled
 * Notification center with desktop notifications disabled
 */
export const DesktopDisabled: Story = {
  args: {
    userId: 'user-123',
    enableDesktopNotifications: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Notification center with desktop notifications disabled.',
      },
    },
  },
};

/**
 * Dark Mode
 * Notification center in dark theme
 */
export const DarkMode: Story = {
  args: {
    userId: 'user-123',
  },
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'Notification center displayed in dark theme.',
      },
    },
  },
  globals: {
    theme: 'dark',
  },
};
