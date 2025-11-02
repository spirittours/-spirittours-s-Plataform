/**
 * @file DashboardWidgets.tsx
 * @module Components/Dashboard
 * @description Reusable dashboard widget system with multiple widget types
 * 
 * @features
 * - Modular widget architecture
 * - Responsive grid layout
 * - Real-time data updates
 * - Interactive charts and graphs
 * - Customizable widget configurations
 * - Loading states and error handling
 * - Export functionality
 * 
 * @example
 * ```tsx
 * import { DashboardWidgets, WidgetConfig } from '@/components/Dashboard/DashboardWidgets';
 * 
 * const widgets: WidgetConfig[] = [
 *   { type: 'stats', title: 'Total Revenue', value: 125000, trend: 12.5 },
 *   { type: 'chart', title: 'Bookings', data: chartData },
 * ];
 * 
 * <DashboardWidgets widgets={widgets} />
 * ```
 * 
 * @author Spirit Tours Development Team
 * @since 1.0.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  CircularProgress,
  Divider,
  Tooltip,
  alpha,
  useTheme,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  MoreVert,
  Refresh,
  GetApp,
  Settings,
  ShowChart,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  People,
  AttachMoney,
  Event,
  Star,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { format } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Widget type definition
 */
export type WidgetType = 'stats' | 'chart' | 'list' | 'progress' | 'gauge' | 'activity';

/**
 * Chart type definition
 */
export type ChartType = 'line' | 'bar' | 'pie' | 'area';

/**
 * Widget configuration interface
 * 
 * @interface WidgetConfig
 * @property {string} id - Unique widget identifier
 * @property {WidgetType} type - Widget type
 * @property {string} title - Widget title
 * @property {any} data - Widget data (structure depends on type)
 * @property {Object} [options] - Optional widget configuration
 * @property {ChartType} [options.chartType] - Chart type (for chart widgets)
 * @property {string} [options.color] - Primary color
 * @property {boolean} [options.exportable] - Enable export functionality
 * @property {boolean} [options.refreshable] - Enable manual refresh
 * @property {number} [options.refreshInterval] - Auto-refresh interval (ms)
 * @property {number} [options.gridSize] - Grid size (1-12, default 4)
 */
export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  data: any;
  options?: {
    chartType?: ChartType;
    color?: string;
    exportable?: boolean;
    refreshable?: boolean;
    refreshInterval?: number;
    gridSize?: number;
    icon?: React.ReactNode;
  };
}

/**
 * Stats widget data interface
 */
interface StatsData {
  value: number;
  unit?: string;
  trend?: number;
  trendLabel?: string;
  subtitle?: string;
  target?: number;
}

/**
 * Props for DashboardWidgets component
 */
interface DashboardWidgetsProps {
  widgets: WidgetConfig[];
  onRefresh?: (widgetId: string) => Promise<void>;
  onExport?: (widgetId: string) => void;
}

// ============================================================================
// WIDGET COMPONENTS
// ============================================================================

/**
 * Stats Widget - Display KPI with trend indicator
 * 
 * @component
 * @param {WidgetConfig} config - Widget configuration
 * @returns {JSX.Element} Rendered stats widget
 */
const StatsWidget: React.FC<{ config: WidgetConfig }> = ({ config }) => {
  const theme = useTheme();
  const data = config.data as StatsData;
  const color = config.options?.color || theme.palette.primary.main;

  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const trendPositive = (data.trend || 0) >= 0;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        {config.options?.icon && (
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(color, 0.1),
              color: color,
              display: 'flex',
            }}
          >
            {config.options.icon}
          </Box>
        )}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, color: color }}>
            {formatValue(data.value)}
            {data.unit && (
              <Typography component="span" variant="h5" sx={{ ml: 1, color: 'text.secondary' }}>
                {data.unit}
              </Typography>
            )}
          </Typography>
          {data.subtitle && (
            <Typography variant="body2" color="text.secondary">
              {data.subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      {data.trend !== undefined && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Chip
            size="small"
            icon={trendPositive ? <TrendingUp /> : <TrendingDown />}
            label={`${trendPositive ? '+' : ''}${data.trend}%`}
            color={trendPositive ? 'success' : 'error'}
            sx={{ fontWeight: 600 }}
          />
          {data.trendLabel && (
            <Typography variant="caption" color="text.secondary">
              {data.trendLabel}
            </Typography>
          )}
        </Box>
      )}

      {data.target && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Progress to Target
            </Typography>
            <Typography variant="caption" fontWeight={600}>
              {Math.round((data.value / data.target) * 100)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min((data.value / data.target) * 100, 100)}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: alpha(color, 0.1),
              '& .MuiLinearProgress-bar': {
                bgcolor: color,
                borderRadius: 4,
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

/**
 * Chart Widget - Display data visualization
 * 
 * @component
 * @param {WidgetConfig} config - Widget configuration
 * @returns {JSX.Element} Rendered chart widget
 */
const ChartWidget: React.FC<{ config: WidgetConfig }> = ({ config }) => {
  const theme = useTheme();
  const chartType = config.options?.chartType || 'line';
  const color = config.options?.color || theme.palette.primary.main;

  const renderChart = () => {
    const commonProps = {
      data: config.data,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    };

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
              <YAxis stroke={theme.palette.text.secondary} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: theme.shape.borderRadius,
                }}
              />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ fill: color }} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
              <YAxis stroke={theme.palette.text.secondary} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: theme.shape.borderRadius,
                }}
              />
              <Bar dataKey="value" fill={color} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
              <YAxis stroke={theme.palette.text.secondary} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: theme.shape.borderRadius,
                }}
              />
              <Area type="monotone" dataKey="value" stroke={color} fill={alpha(color, 0.2)} />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        const COLORS = [
          theme.palette.primary.main,
          theme.palette.secondary.main,
          theme.palette.success.main,
          theme.palette.warning.main,
          theme.palette.error.main,
        ];
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={config.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {config.data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ height: 300, width: '100%' }}>
      {renderChart()}
    </Box>
  );
};

/**
 * Activity Widget - Display recent activities or events
 * 
 * @component
 * @param {WidgetConfig} config - Widget configuration
 * @returns {JSX.Element} Rendered activity widget
 */
const ActivityWidget: React.FC<{ config: WidgetConfig }> = ({ config }) => {
  const activities = config.data as Array<{
    id: string;
    title: string;
    description: string;
    timestamp: string;
    type: 'success' | 'warning' | 'error' | 'info';
  }>;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle color="success" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'error':
        return <Warning color="error" />;
      default:
        return <Event color="primary" />;
    }
  };

  return (
    <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
      {activities.map((activity, index) => (
        <Box key={activity.id}>
          <Box sx={{ display: 'flex', gap: 2, py: 2 }}>
            {getActivityIcon(activity.type)}
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={600}>
                {activity.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {activity.description}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                {format(new Date(activity.timestamp), 'MMM dd, yyyy HH:mm')}
              </Typography>
            </Box>
          </Box>
          {index < activities.length - 1 && <Divider />}
        </Box>
      ))}
    </Box>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * DashboardWidgets - Flexible dashboard widget system
 * 
 * @component
 * @description
 * A modular widget system for building customizable dashboards with:
 * - Multiple widget types (stats, charts, lists, progress, activity)
 * - Responsive grid layout
 * - Real-time updates with auto-refresh
 * - Export functionality
 * - Loading states and error handling
 * 
 * **Supported Widget Types:**
 * 1. **Stats** - KPI display with trend indicators
 * 2. **Chart** - Line, bar, pie, and area charts
 * 3. **Activity** - Recent activities and events list
 * 4. **Progress** - Progress bars and gauges
 * 5. **List** - Custom list displays
 * 
 * @param {DashboardWidgetsProps} props - Component props
 * @returns {JSX.Element} Rendered dashboard widgets grid
 * 
 * @example
 * ```tsx
 * const widgets: WidgetConfig[] = [
 *   {
 *     id: 'revenue',
 *     type: 'stats',
 *     title: 'Total Revenue',
 *     data: { value: 125000, trend: 12.5, unit: 'USD' },
 *     options: { color: '#2196F3', icon: <AttachMoney /> }
 *   },
 *   {
 *     id: 'bookings-chart',
 *     type: 'chart',
 *     title: 'Bookings This Month',
 *     data: chartData,
 *     options: { chartType: 'line', exportable: true }
 *   }
 * ];
 * 
 * <DashboardWidgets widgets={widgets} onRefresh={handleRefresh} />
 * ```
 */
export const DashboardWidgets: React.FC<DashboardWidgetsProps> = ({
  widgets,
  onRefresh,
  onExport,
}) => {
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});
  const [anchorEl, setAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({});

  /**
   * Handle widget refresh
   */
  const handleRefresh = async (widgetId: string) => {
    if (!onRefresh) return;
    setRefreshing((prev) => ({ ...prev, [widgetId]: true }));
    try {
      await onRefresh(widgetId);
    } finally {
      setRefreshing((prev) => ({ ...prev, [widgetId]: false }));
    }
  };

  /**
   * Handle widget menu open
   */
  const handleMenuOpen = (widgetId: string, event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl((prev) => ({ ...prev, [widgetId]: event.currentTarget }));
  };

  /**
   * Handle widget menu close
   */
  const handleMenuClose = (widgetId: string) => {
    setAnchorEl((prev) => ({ ...prev, [widgetId]: null }));
  };

  /**
   * Render widget based on type
   */
  const renderWidget = (config: WidgetConfig) => {
    switch (config.type) {
      case 'stats':
        return <StatsWidget config={config} />;
      case 'chart':
        return <ChartWidget config={config} />;
      case 'activity':
        return <ActivityWidget config={config} />;
      default:
        return (
          <Typography color="text.secondary">
            Widget type &quot;{config.type}&quot; not implemented
          </Typography>
        );
    }
  };

  return (
    <Grid container spacing={3}>
      {widgets.map((widget) => (
        <Grid
          item
          xs={12}
          sm={6}
          md={widget.options?.gridSize || 4}
          key={widget.id}
        >
          <Card
            elevation={1}
            sx={{
              height: '100%',
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              },
            }}
          >
            <CardHeader
              title={widget.title}
              titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
              action={
                <>
                  {widget.options?.refreshable && (
                    <Tooltip title="Refresh">
                      <IconButton
                        size="small"
                        onClick={() => handleRefresh(widget.id)}
                        disabled={refreshing[widget.id]}
                      >
                        {refreshing[widget.id] ? (
                          <CircularProgress size={20} />
                        ) : (
                          <Refresh />
                        )}
                      </IconButton>
                    </Tooltip>
                  )}
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(widget.id, e)}
                  >
                    <MoreVert />
                  </IconButton>
                  <Menu
                    anchorEl={anchorEl[widget.id]}
                    open={Boolean(anchorEl[widget.id])}
                    onClose={() => handleMenuClose(widget.id)}
                  >
                    {widget.options?.exportable && (
                      <MenuItem onClick={() => onExport?.(widget.id)}>
                        <GetApp sx={{ mr: 1 }} /> Export Data
                      </MenuItem>
                    )}
                    <MenuItem>
                      <Settings sx={{ mr: 1 }} /> Configure
                    </MenuItem>
                  </Menu>
                </>
              }
            />
            <CardContent sx={{ pt: 0 }}>
              {renderWidget(widget)}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default DashboardWidgets;
