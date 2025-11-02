/**
 * DashboardWidgets Component Stories
 * Comprehensive examples of dashboard widget configurations
 */

import type { Meta, StoryObj } from '@storybook/react';
import { DashboardWidgets, WidgetConfig } from './DashboardWidgets';
import { AttachMoney, People, Event, TrendingUp, Star } from '@mui/icons-material';

// Mock chart data
const lineChartData = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 5000 },
  { name: 'Apr', value: 4500 },
  { name: 'May', value: 6000 },
  { name: 'Jun', value: 5500 },
];

const barChartData = [
  { name: 'Mon', value: 12 },
  { name: 'Tue', value: 19 },
  { name: 'Wed', value: 15 },
  { name: 'Thu', value: 25 },
  { name: 'Fri', value: 22 },
  { name: 'Sat', value: 30 },
  { name: 'Sun', value: 28 },
];

const pieChartData = [
  { name: 'Jerusalem', value: 400 },
  { name: 'Tel Aviv', value: 300 },
  { name: 'Dead Sea', value: 200 },
  { name: 'Galilee', value: 100 },
];

const activityData = [
  {
    id: '1',
    title: 'New Booking Confirmed',
    description: 'John Doe booked Jerusalem City Tour',
    timestamp: new Date().toISOString(),
    type: 'success' as const,
  },
  {
    id: '2',
    title: 'Payment Received',
    description: '$250 received from Jane Smith',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    type: 'success' as const,
  },
  {
    id: '3',
    title: 'Review Submitted',
    description: 'New 5-star review from Michael Brown',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    type: 'info' as const,
  },
  {
    id: '4',
    title: 'Cancellation Request',
    description: 'Sarah Wilson requested to cancel booking',
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    type: 'warning' as const,
  },
];

const meta = {
  title: 'Components/Dashboard/DashboardWidgets',
  component: DashboardWidgets,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# DashboardWidgets Component

A flexible and modular dashboard widget system for displaying various types of data visualizations and metrics.

## Features
- 📊 Multiple widget types (stats, charts, lists, progress, activity)
- 📈 Chart support (line, bar, pie, area) using Recharts
- 🎨 Customizable colors and styling
- 🔄 Auto-refresh and manual refresh capabilities
- 📤 Export functionality
- 📱 Responsive grid layout
- ⚡ Real-time data updates
- 🎯 Loading states and error handling

## Widget Types

### Stats Widget
Display KPIs with trend indicators, targets, and icons.

### Chart Widget
Visualize data with line, bar, pie, or area charts.

### Activity Widget
Show recent activities, events, or notifications.

### Progress Widget
Display progress bars and gauges (coming soon).

## Usage

\`\`\`tsx
import { DashboardWidgets, WidgetConfig } from '@/components/Dashboard/DashboardWidgets';

const widgets: WidgetConfig[] = [
  {
    id: 'revenue',
    type: 'stats',
    title: 'Total Revenue',
    data: { value: 125000, trend: 12.5, unit: 'USD' },
    options: { color: '#2196F3', icon: <AttachMoney /> }
  },
  {
    id: 'bookings-chart',
    type: 'chart',
    title: 'Bookings This Month',
    data: chartData,
    options: { chartType: 'line', exportable: true }
  }
];

<DashboardWidgets 
  widgets={widgets} 
  onRefresh={handleRefresh}
  onExport={handleExport}
/>
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    widgets: {
      description: 'Array of widget configurations',
    },
    onRefresh: {
      description: 'Callback function for widget refresh',
      action: 'refresh',
    },
    onExport: {
      description: 'Callback function for data export',
      action: 'export',
    },
  },
} satisfies Meta<typeof DashboardWidgets>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Complete Dashboard
 * Shows a full dashboard with multiple widget types
 */
export const CompleteDashboard: Story = {
  args: {
    widgets: [
      {
        id: 'revenue',
        type: 'stats',
        title: 'Total Revenue',
        data: {
          value: 125000,
          unit: 'USD',
          trend: 12.5,
          trendLabel: 'vs last month',
          subtitle: 'Year to date',
          target: 150000,
        },
        options: {
          color: '#2196F3',
          icon: <AttachMoney />,
          refreshable: true,
          gridSize: 3,
        },
      },
      {
        id: 'bookings',
        type: 'stats',
        title: 'Total Bookings',
        data: {
          value: 450,
          trend: 8.3,
          trendLabel: 'vs last month',
          target: 500,
        },
        options: {
          color: '#4CAF50',
          icon: <Event />,
          refreshable: true,
          gridSize: 3,
        },
      },
      {
        id: 'customers',
        type: 'stats',
        title: 'Active Customers',
        data: {
          value: 1250,
          trend: 5.2,
          trendLabel: 'this month',
        },
        options: {
          color: '#FF9800',
          icon: <People />,
          refreshable: true,
          gridSize: 3,
        },
      },
      {
        id: 'rating',
        type: 'stats',
        title: 'Average Rating',
        data: {
          value: 4.8,
          unit: '/ 5.0',
          trend: 2.1,
          trendLabel: 'improvement',
        },
        options: {
          color: '#FFC107',
          icon: <Star />,
          gridSize: 3,
        },
      },
      {
        id: 'revenue-chart',
        type: 'chart',
        title: 'Monthly Revenue Trend',
        data: lineChartData,
        options: {
          chartType: 'line',
          exportable: true,
          refreshable: true,
          gridSize: 6,
        },
      },
      {
        id: 'bookings-chart',
        type: 'chart',
        title: 'Weekly Bookings',
        data: barChartData,
        options: {
          chartType: 'bar',
          exportable: true,
          gridSize: 6,
        },
      },
      {
        id: 'destinations',
        type: 'chart',
        title: 'Popular Destinations',
        data: pieChartData,
        options: {
          chartType: 'pie',
          exportable: true,
          gridSize: 6,
        },
      },
      {
        id: 'activities',
        type: 'activity',
        title: 'Recent Activities',
        data: activityData,
        options: {
          refreshable: true,
          gridSize: 6,
        },
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Complete dashboard with stats, charts, and activity widgets.',
      },
    },
  },
};

/**
 * Stats Widgets Only
 * Dashboard with only KPI statistics
 */
export const StatsOnly: Story = {
  args: {
    widgets: [
      {
        id: 'revenue',
        type: 'stats',
        title: 'Total Revenue',
        data: {
          value: 125000,
          unit: 'USD',
          trend: 12.5,
          target: 150000,
        },
        options: {
          color: '#2196F3',
          icon: <AttachMoney />,
        },
      },
      {
        id: 'bookings',
        type: 'stats',
        title: 'Total Bookings',
        data: {
          value: 450,
          trend: 8.3,
        },
        options: {
          color: '#4CAF50',
          icon: <Event />,
        },
      },
      {
        id: 'customers',
        type: 'stats',
        title: 'Active Customers',
        data: {
          value: 1250,
          trend: -2.5,
        },
        options: {
          color: '#FF9800',
          icon: <People />,
        },
      },
      {
        id: 'rating',
        type: 'stats',
        title: 'Average Rating',
        data: {
          value: 4.8,
          unit: '/ 5.0',
        },
        options: {
          color: '#FFC107',
          icon: <Star />,
        },
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard displaying only statistics widgets with KPIs and trends.',
      },
    },
  },
};

/**
 * Charts Only
 * Dashboard with various chart visualizations
 */
export const ChartsOnly: Story = {
  args: {
    widgets: [
      {
        id: 'line-chart',
        type: 'chart',
        title: 'Revenue Trend',
        data: lineChartData,
        options: {
          chartType: 'line',
          exportable: true,
          gridSize: 6,
        },
      },
      {
        id: 'bar-chart',
        type: 'chart',
        title: 'Weekly Bookings',
        data: barChartData,
        options: {
          chartType: 'bar',
          gridSize: 6,
        },
      },
      {
        id: 'area-chart',
        type: 'chart',
        title: 'Customer Growth',
        data: lineChartData,
        options: {
          chartType: 'area',
          gridSize: 6,
        },
      },
      {
        id: 'pie-chart',
        type: 'chart',
        title: 'Destinations',
        data: pieChartData,
        options: {
          chartType: 'pie',
          gridSize: 6,
        },
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with various chart types: line, bar, area, and pie charts.',
      },
    },
  },
};

/**
 * Single Widget
 * Isolated widget display
 */
export const SingleWidget: Story = {
  args: {
    widgets: [
      {
        id: 'revenue',
        type: 'stats',
        title: 'Total Revenue',
        data: {
          value: 125000,
          unit: 'USD',
          trend: 12.5,
          trendLabel: 'vs last month',
          subtitle: 'Year to date',
          target: 150000,
        },
        options: {
          color: '#2196F3',
          icon: <AttachMoney />,
          refreshable: true,
          gridSize: 12,
        },
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Single widget displayed at full width.',
      },
    },
  },
};

/**
 * Mobile Layout
 * Responsive dashboard for mobile devices
 */
export const Mobile: Story = {
  args: CompleteDashboard.args,
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
    docs: {
      description: {
        story: 'Mobile-optimized dashboard layout.',
      },
    },
  },
};

/**
 * Dark Mode
 * Dashboard in dark theme
 */
export const DarkMode: Story = {
  args: CompleteDashboard.args,
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'Dashboard displayed in dark theme.',
      },
    },
  },
  globals: {
    theme: 'dark',
  },
};
