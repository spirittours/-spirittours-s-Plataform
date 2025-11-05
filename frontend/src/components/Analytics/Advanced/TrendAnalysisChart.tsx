/**
 * Trend Analysis Chart - Sprint 25 (Fase 7)
 * 
 * Advanced time-series visualization component with multiple metrics,
 * moving averages, and anomaly detection.
 * 
 * Features:
 * - Multi-metric selection
 * - Time granularity control (daily, weekly, monthly)
 * - Moving average overlays
 * - Anomaly highlighting
 * - Growth rate visualization
 * - Export chart data
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  Switch,
  FormControlLabel,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Download,
  Refresh,
  Info as InfoIcon,
  TrendingUp,
  Warning
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Dot
} from 'recharts';

interface TrendData {
  metric: string;
  period: { startDate: string; endDate: string };
  granularity: string;
  data: Array<{ date: string; value: number; count?: number }>;
  movingAverages: Record<string, Array<{ date: string; value: number | null }>>;
  growthRates: Array<{ date: string; value: number; absolute: number }>;
  anomalies: Array<{ date: string; value: number; type: string; severity: number }>;
  trend: {
    direction: string;
    slope: number;
    confidence: number;
    strength: string;
  };
  summary: {
    total: number;
    average: number;
    min: number;
    max: number;
    trend: string;
  };
}

const TrendAnalysisChart: React.FC = () => {
  const [metric, setMetric] = useState('revenue');
  const [granularity, setGranularity] = useState('daily');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showMovingAverage, setShowMovingAverage] = useState(true);
  const [showGrowthRate, setShowGrowthRate] = useState(false);
  const [showAnomalies, setShowAnomalies] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null);

  const workspaceId = 'workspace123'; // TODO: Get from context

  const metrics = [
    { value: 'revenue', label: 'Revenue' },
    { value: 'bookings', label: 'Bookings' },
    { value: 'customers', label: 'Customers' },
    { value: 'conversations', label: 'Conversations' },
    { value: 'satisfaction', label: 'Satisfaction' },
    { value: 'performance', label: 'Employee Performance' }
  ];

  useEffect(() => {
    fetchTrendData();
  }, [metric, granularity, startDate, endDate]);

  const fetchTrendData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/analytics/${workspaceId}/trends/${metric}?` +
        `startDate=${startDate}&endDate=${endDate}&granularity=${granularity}&` +
        `includeMovingAverage=${showMovingAverage}&includeGrowthRate=${showGrowthRate}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch trend data');
      }

      const result = await response.json();
      setTrendData(result.data);
    } catch (err: any) {
      console.error('Error fetching trend data:', err);
      setError(err.message || 'Failed to load trend data');
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: number) => {
    if (metric === 'revenue') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
      }).format(value);
    }
    if (metric === 'satisfaction') {
      return value.toFixed(2);
    }
    return new Intl.NumberFormat('en-US').format(Math.round(value));
  };

  const getChartData = () => {
    if (!trendData) return [];

    const data = trendData.data.map((point, index) => {
      const chartPoint: any = {
        date: point.date,
        value: point.value
      };

      // Add moving averages
      if (showMovingAverage && trendData.movingAverages) {
        Object.keys(trendData.movingAverages).forEach(key => {
          const ma = trendData.movingAverages[key][index];
          if (ma) {
            chartPoint[key] = ma.value;
          }
        });
      }

      // Mark anomalies
      const anomaly = trendData.anomalies.find(a => a.date === point.date);
      if (anomaly) {
        chartPoint.anomaly = true;
        chartPoint.anomalyType = anomaly.type;
      }

      return chartPoint;
    });

    return data;
  };

  const getTrendIcon = () => {
    if (!trendData) return null;
    if (trendData.trend.direction === 'increasing') return <TrendingUp color="success" />;
    if (trendData.trend.direction === 'decreasing') return <TrendingUp color="error" sx={{ transform: 'rotate(180deg)' }} />;
    return <TrendingUp color="action" sx={{ transform: 'rotate(90deg)' }} />;
  };

  const getTrendColor = () => {
    if (!trendData) return 'grey';
    if (trendData.trend.direction === 'increasing') return '#4caf50';
    if (trendData.trend.direction === 'decreasing') return '#f44336';
    return '#9e9e9e';
  };

  const downloadData = () => {
    if (!trendData) return;

    const csv = [
      ['Date', 'Value', ...Object.keys(trendData.movingAverages || {})].join(','),
      ...trendData.data.map((point, index) => {
        const row = [point.date, point.value];
        Object.keys(trendData.movingAverages || {}).forEach(key => {
          const ma = trendData.movingAverages[key][index];
          row.push(ma?.value?.toString() || '');
        });
        return row.join(',');
      })
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trend_${metric}_${startDate}_${endDate}.csv`;
    link.click();
  };

  // Custom dot component to highlight anomalies
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.anomaly && showAnomalies) {
      return (
        <svg>
          <circle
            cx={cx}
            cy={cy}
            r={8}
            fill={payload.anomalyType === 'spike' ? '#ff5722' : '#ff9800'}
            stroke="#fff"
            strokeWidth={2}
          />
        </svg>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" fontWeight="bold">
            Trend Analysis
          </Typography>
          <Stack direction="row" spacing={1}>
            <IconButton onClick={fetchTrendData} color="primary" size="small">
              <Refresh />
            </IconButton>
            <IconButton onClick={downloadData} color="primary" size="small" disabled={!trendData}>
              <Download />
            </IconButton>
          </Stack>
        </Box>

        {/* Controls */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Metric</InputLabel>
              <Select value={metric} onChange={(e) => setMetric(e.target.value)} label="Metric">
                {metrics.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Granularity</InputLabel>
              <Select value={granularity} onChange={(e) => setGranularity(e.target.value)} label="Granularity">
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>

        {/* Options */}
        <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
          <FormControlLabel
            control={
              <Switch
                checked={showMovingAverage}
                onChange={(e) => setShowMovingAverage(e.target.checked)}
                size="small"
              />
            }
            label="Moving Average"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showAnomalies}
                onChange={(e) => setShowAnomalies(e.target.checked)}
                size="small"
              />
            }
            label="Anomalies"
          />
        </Stack>

        {/* Loading/Error States */}
        {loading && (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Trend Summary */}
        {trendData && !loading && (
          <>
            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center" p={2} bgcolor="grey.50" borderRadius={1}>
                  <Typography variant="caption" color="text.secondary">
                    Total
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {formatValue(trendData.summary.total)}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center" p={2} bgcolor="grey.50" borderRadius={1}>
                  <Typography variant="caption" color="text.secondary">
                    Average
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {formatValue(trendData.summary.average)}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center" p={2} bgcolor="grey.50" borderRadius={1}>
                  <Typography variant="caption" color="text.secondary">
                    Min / Max
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {formatValue(trendData.summary.min)} / {formatValue(trendData.summary.max)}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center" p={2} bgcolor="grey.50" borderRadius={1}>
                  <Typography variant="caption" color="text.secondary">
                    Trend
                  </Typography>
                  <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                    {getTrendIcon()}
                    <Typography variant="h6" fontWeight="bold" color={getTrendColor()}>
                      {trendData.trend.direction}
                    </Typography>
                  </Box>
                  <Chip
                    label={`${trendData.trend.strength} (${(trendData.trend.confidence * 100).toFixed(0)}%)`}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              </Grid>
            </Grid>

            {/* Chart */}
            <Box height={400}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getChartData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => formatValue(value)}
                  />
                  <RechartsTooltip
                    formatter={(value: any) => formatValue(value)}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Legend />
                  
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#2196f3"
                    strokeWidth={2}
                    name={metrics.find(m => m.value === metric)?.label}
                    dot={<CustomDot />}
                  />

                  {showMovingAverage && trendData.movingAverages && (
                    <>
                      {Object.keys(trendData.movingAverages).map((key, index) => (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={['#ff9800', '#4caf50', '#9c27b0'][index]}
                          strokeWidth={1.5}
                          strokeDasharray="5 5"
                          name={key.toUpperCase().replace('MA', 'MA ')}
                          dot={false}
                        />
                      ))}
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </Box>

            {/* Anomalies List */}
            {trendData.anomalies.length > 0 && showAnomalies && (
              <Box mt={3}>
                <Typography variant="body2" fontWeight="medium" gutterBottom>
                  <Warning fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                  Detected Anomalies ({trendData.anomalies.length})
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {trendData.anomalies.map((anomaly, index) => (
                    <Chip
                      key={index}
                      label={`${new Date(anomaly.date).toLocaleDateString()}: ${formatValue(anomaly.value)} (${anomaly.type})`}
                      size="small"
                      color={anomaly.type === 'spike' ? 'error' : 'warning'}
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TrendAnalysisChart;
