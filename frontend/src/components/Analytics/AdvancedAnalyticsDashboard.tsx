/**
 * Advanced Analytics Dashboard
 * Real-time metrics and performance monitoring for AI Multi-Model System
 * Phase 2 Extended - $100K IA Multi-Modelo Upgrade
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Grid, Paper, Typography, Box, Card, CardContent, Switch,
    FormControlLabel, Chip, Alert, Divider, IconButton, Tooltip,
    LinearProgress, CircularProgress, Select, MenuItem, FormControl,
    InputLabel, Button, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
    Timeline, TimelineItem, TimelineContent, TimelineSeparator,
    TimelineDot, TimelineConnector
} from '@mui/lab';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie,
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
    ResponsiveContainer, Cell, RadialBarChart, RadialBar
} from 'recharts';
import {
    Refresh, Settings, Download, Share, FilterList,
    TrendingUp, TrendingDown, Speed, Memory, Storage,
    Psychology, CloudQueue, ErrorOutline, CheckCircle,
    Warning, Info, Notifications, FullscreenExit,
    Fullscreen, ZoomIn, ZoomOut, PlayArrow, Pause
} from '@mui/icons-material';

interface MetricsData {
    ai: {
        totalRequests: number;
        activeRequests: number;
        avgResponseTime: number;
        errorRate: number;
        modelsActive: number;
        tokensProcessed: number;
        costToday: number;
        cacheHitRate: number;
        timestamp: Date;
    };
    loadBalancer: {
        algorithm: string;
        totalDistributed: number;
        distributionEfficiency: number;
        modelLoads: Record<string, number>;
        queueLength: number;
        timestamp: Date;
    };
    performance: {
        cpuUsage: number;
        memoryUsage: number;
        diskUsage: number;
        networkIn: number;
        networkOut: number;
        uptime: number;
        timestamp: Date;
    };
    errors: {
        totalErrors: number;
        errorsByType: Record<string, number>;
        criticalErrors: number;
        timestamp: Date;
    };
    users: {
        activeUsers: number;
        totalSessions: number;
        newSessions: number;
        avgSessionDuration: number;
        timestamp: Date;
    };
}

interface Alert {
    type: 'info' | 'warning' | 'error' | 'success';
    metric: string;
    value: number;
    threshold: number;
    message: string;
    timestamp: Date;
}

const AdvancedAnalyticsDashboard: React.FC = () => {
    // State management
    const [metrics, setMetrics] = useState<MetricsData | null>(null);
    const [historicalData, setHistoricalData] = useState<MetricsData[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isRealTime, setIsRealTime] = useState(true);
    const [timeRange, setTimeRange] = useState('1h');
    const [selectedMetric, setSelectedMetric] = useState('ai');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(1000);
    
    // WebSocket connection
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Chart colors
    const chartColors = {
        primary: '#2196f3',
        secondary: '#ff9800',
        success: '#4caf50',
        warning: '#ff5722',
        error: '#f44336',
        info: '#00bcd4',
        gradient: ['#2196f3', '#21cbf3', '#21f3bb', '#7bf321', '#f3cb21', '#f3211c']
    };

    /**
     * Initialize WebSocket connection
     */
    const initializeWebSocket = useCallback(() => {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.hostname}:8080`;
            
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log('WebSocket connected');
                setIsConnected(true);
                
                // Authenticate
                wsRef.current?.send(JSON.stringify({
                    type: 'authenticate',
                    data: {
                        token: localStorage.getItem('authToken') || 'demo_token_12345',
                        role: 'admin'
                    }
                }));

                // Subscribe to all metrics
                const subscriptions = [
                    'ai_metrics',
                    'load_balancer_metrics',
                    'performance_metrics',
                    'error_metrics',
                    'user_activity',
                    'system_alerts'
                ];

                subscriptions.forEach(subscription => {
                    wsRef.current?.send(JSON.stringify({
                        type: 'subscribe',
                        data: { subscriptionType: subscription }
                    }));
                });
            };

            wsRef.current.onmessage = (event) => {
                const message = JSON.parse(event.data);
                handleWebSocketMessage(message);
            };

            wsRef.current.onclose = () => {
                console.log('WebSocket disconnected');
                setIsConnected(false);
                
                // Attempt to reconnect
                if (isRealTime) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        initializeWebSocket();
                    }, 5000);
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                setIsConnected(false);
            };

        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
        }
    }, [isRealTime]);

    /**
     * Handle WebSocket messages
     */
    const handleWebSocketMessage = (message: any) => {
        switch (message.type) {
            case 'metrics_update':
                handleMetricsUpdate(message.subscriptionType, message.data);
                break;
            case 'system_alerts':
                setAlerts(prev => [...prev, ...message.data.alerts].slice(-50));
                break;
            case 'authentication_success':
                console.log('Authentication successful');
                break;
            default:
                console.log('Received message:', message);
        }
    };

    /**
     * Handle metrics updates
     */
    const handleMetricsUpdate = (subscriptionType: string, data: any) => {
        setMetrics(prev => {
            if (!prev) {
                return {
                    ai: subscriptionType === 'ai_metrics' ? data : {} as any,
                    loadBalancer: subscriptionType === 'load_balancer_metrics' ? data : {} as any,
                    performance: subscriptionType === 'performance_metrics' ? data : {} as any,
                    errors: subscriptionType === 'error_metrics' ? data : {} as any,
                    users: subscriptionType === 'user_activity' ? data : {} as any
                };
            }

            const updated = { ...prev };
            switch (subscriptionType) {
                case 'ai_metrics':
                    updated.ai = data;
                    break;
                case 'load_balancer_metrics':
                    updated.loadBalancer = data;
                    break;
                case 'performance_metrics':
                    updated.performance = data;
                    break;
                case 'error_metrics':
                    updated.errors = data;
                    break;
                case 'user_activity':
                    updated.users = data;
                    break;
            }
            return updated;
        });

        // Add to historical data
        if (data.timestamp) {
            setHistoricalData(prev => {
                const newData = [...prev];
                const existingIndex = newData.findIndex(item => 
                    item[subscriptionType.replace('_metrics', '') as keyof MetricsData]?.timestamp === data.timestamp
                );
                
                if (existingIndex >= 0) {
                    newData[existingIndex] = {
                        ...newData[existingIndex],
                        [subscriptionType.replace('_metrics', '')]: data
                    };
                } else {
                    newData.push({
                        ai: subscriptionType === 'ai_metrics' ? data : {} as any,
                        loadBalancer: subscriptionType === 'load_balancer_metrics' ? data : {} as any,
                        performance: subscriptionType === 'performance_metrics' ? data : {} as any,
                        errors: subscriptionType === 'error_metrics' ? data : {} as any,
                        users: subscriptionType === 'user_activity' ? data : {} as any
                    });
                }
                
                return newData.slice(-100); // Keep last 100 data points
            });
        }
    };

    /**
     * Format duration
     */
    const formatDuration = (ms: number): string => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    };

    /**
     * Format percentage
     */
    const formatPercentage = (value: number): string => {
        return `${(value * 100).toFixed(1)}%`;
    };

    /**
     * Format currency
     */
    const formatCurrency = (value: number): string => {
        return `$${value.toFixed(2)}`;
    };

    /**
     * Get trend indicator
     */
    const getTrendIndicator = (current: number, previous: number, isPercentage = false) => {
        if (historicalData.length < 2) return null;
        
        const diff = current - previous;
        const isUp = diff > 0;
        const color = isUp ? chartColors.success : chartColors.error;
        
        return (
            <Box display="flex" alignItems="center" sx={{ ml: 1 }}>
                {isUp ? <TrendingUp sx={{ color, fontSize: 16 }} /> : <TrendingDown sx={{ color, fontSize: 16 }} />}
                <Typography variant="caption" sx={{ color, ml: 0.5 }}>
                    {isPercentage ? formatPercentage(Math.abs(diff)) : Math.abs(diff).toFixed(1)}
                </Typography>
            </Box>
        );
    };

    /**
     * Render metric card
     */
    const renderMetricCard = (
        title: string,
        value: string | number,
        subtitle?: string,
        icon?: React.ReactNode,
        color = chartColors.primary,
        previousValue?: number
    ) => (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle2" color="textSecondary">
                        {title}
                    </Typography>
                    {icon && <Box sx={{ color }}>{icon}</Box>}
                </Box>
                
                <Box display="flex" alignItems="center">
                    <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                        {value}
                    </Typography>
                    {previousValue !== undefined && 
                        getTrendIndicator(Number(value), previousValue, title.includes('%'))
                    }
                </Box>
                
                {subtitle && (
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                        {subtitle}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );

    /**
     * Render AI metrics
     */
    const renderAIMetrics = () => {
        if (!metrics?.ai) return null;

        const { ai } = metrics;
        const previousAI = historicalData.length > 1 ? 
            historicalData[historicalData.length - 2]?.ai : undefined;

        return (
            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                    {renderMetricCard(
                        'Total Requests',
                        ai.totalRequests?.toLocaleString() || '0',
                        'All-time requests processed',
                        <Psychology />,
                        chartColors.primary,
                        previousAI?.totalRequests
                    )}
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                    {renderMetricCard(
                        'Active Requests',
                        ai.activeRequests || 0,
                        'Currently processing',
                        <Speed />,
                        chartColors.warning,
                        previousAI?.activeRequests
                    )}
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                    {renderMetricCard(
                        'Avg Response Time',
                        `${ai.avgResponseTime || 0}ms`,
                        'Average processing time',
                        <Timeline />,
                        chartColors.info,
                        previousAI?.avgResponseTime
                    )}
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                    {renderMetricCard(
                        'Error Rate',
                        formatPercentage(ai.errorRate || 0),
                        'Request failure rate',
                        <ErrorOutline />,
                        ai.errorRate > 0.05 ? chartColors.error : chartColors.success,
                        previousAI?.errorRate
                    )}
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                    {renderMetricCard(
                        'Active Models',
                        ai.modelsActive || 0,
                        'Models currently serving',
                        <CloudQueue />,
                        chartColors.secondary
                    )}
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                    {renderMetricCard(
                        'Tokens Processed',
                        ai.tokensProcessed?.toLocaleString() || '0',
                        'Total tokens today',
                        <Memory />,
                        chartColors.success
                    )}
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                    {renderMetricCard(
                        'Cost Today',
                        formatCurrency(ai.costToday || 0),
                        'API costs incurred',
                        <TrendingUp />,
                        chartColors.warning
                    )}
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                    {renderMetricCard(
                        'Cache Hit Rate',
                        formatPercentage(ai.cacheHitRate || 0),
                        'Requests served from cache',
                        <Storage />,
                        chartColors.success
                    )}
                </Grid>
            </Grid>
        );
    };

    /**
     * Render performance metrics
     */
    const renderPerformanceMetrics = () => {
        if (!metrics?.performance) return null;

        const { performance } = metrics;

        return (
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                System Resources
                            </Typography>
                            
                            <Box mb={3}>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2">CPU Usage</Typography>
                                    <Typography variant="body2">{performance.cpuUsage?.toFixed(1)}%</Typography>
                                </Box>
                                <LinearProgress 
                                    variant="determinate" 
                                    value={performance.cpuUsage || 0}
                                    sx={{ 
                                        height: 8, 
                                        borderRadius: 1,
                                        backgroundColor: 'grey.200',
                                        '& .MuiLinearProgress-bar': {
                                            backgroundColor: performance.cpuUsage > 80 ? 
                                                chartColors.error : performance.cpuUsage > 60 ? 
                                                chartColors.warning : chartColors.success
                                        }
                                    }}
                                />
                            </Box>
                            
                            <Box mb={3}>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2">Memory Usage</Typography>
                                    <Typography variant="body2">{performance.memoryUsage?.toFixed(1)}%</Typography>
                                </Box>
                                <LinearProgress 
                                    variant="determinate" 
                                    value={performance.memoryUsage || 0}
                                    sx={{ 
                                        height: 8, 
                                        borderRadius: 1,
                                        '& .MuiLinearProgress-bar': {
                                            backgroundColor: performance.memoryUsage > 85 ? 
                                                chartColors.error : performance.memoryUsage > 70 ? 
                                                chartColors.warning : chartColors.success
                                        }
                                    }}
                                />
                            </Box>
                            
                            <Box mb={2}>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2">Disk Usage</Typography>
                                    <Typography variant="body2">{performance.diskUsage?.toFixed(1)}%</Typography>
                                </Box>
                                <LinearProgress 
                                    variant="determinate" 
                                    value={performance.diskUsage || 0}
                                    sx={{ 
                                        height: 8, 
                                        borderRadius: 1,
                                        '& .MuiLinearProgress-bar': {
                                            backgroundColor: performance.diskUsage > 90 ? 
                                                chartColors.error : performance.diskUsage > 75 ? 
                                                chartColors.warning : chartColors.success
                                        }
                                    }}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Network Activity
                            </Typography>
                            
                            {renderMetricCard(
                                'Network In',
                                `${((performance.networkIn || 0) / 1024).toFixed(1)} KB/s`,
                                'Incoming data rate',
                                <TrendingDown sx={{ transform: 'rotate(90deg)' }} />,
                                chartColors.info
                            )}
                            
                            <Box mt={2}>
                                {renderMetricCard(
                                    'Network Out',
                                    `${((performance.networkOut || 0) / 1024).toFixed(1)} KB/s`,
                                    'Outgoing data rate',
                                    <TrendingUp sx={{ transform: 'rotate(90deg)' }} />,
                                    chartColors.secondary
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                System Status
                            </Typography>
                            
                            <Box display="flex" alignItems="center" mb={2}>
                                <CheckCircle sx={{ color: chartColors.success, mr: 1 }} />
                                <Typography variant="body1">System Healthy</Typography>
                            </Box>
                            
                            <Typography variant="body2" color="textSecondary">
                                Uptime: {formatDuration(performance.uptime || 0)}
                            </Typography>
                            
                            <Box mt={2}>
                                <Chip 
                                    label={isConnected ? 'Connected' : 'Disconnected'}
                                    color={isConnected ? 'success' : 'error'}
                                    size="small"
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        );
    };

    /**
     * Render load balancer metrics
     */
    const renderLoadBalancerMetrics = () => {
        if (!metrics?.loadBalancer) return null;

        const { loadBalancer } = metrics;
        const modelLoadData = Object.entries(loadBalancer.modelLoads || {}).map(([model, load]) => ({
            name: model.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            load: load,
            fill: chartColors.gradient[Object.keys(loadBalancer.modelLoads).indexOf(model) % chartColors.gradient.length]
        }));

        return (
            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Model Load Distribution
                            </Typography>
                            
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={modelLoadData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <RechartsTooltip />
                                    <Bar dataKey="load" fill={chartColors.primary} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            {renderMetricCard(
                                'Algorithm',
                                loadBalancer.algorithm || 'intelligent',
                                'Current balancing strategy',
                                <Settings />,
                                chartColors.primary
                            )}
                        </Grid>
                        
                        <Grid item xs={12}>
                            {renderMetricCard(
                                'Total Distributed',
                                loadBalancer.totalDistributed?.toLocaleString() || '0',
                                'Requests distributed',
                                <CloudQueue />,
                                chartColors.secondary
                            )}
                        </Grid>
                        
                        <Grid item xs={12}>
                            {renderMetricCard(
                                'Efficiency',
                                formatPercentage(loadBalancer.distributionEfficiency || 0),
                                'Distribution efficiency',
                                <Speed />,
                                chartColors.success
                            )}
                        </Grid>
                        
                        <Grid item xs={12}>
                            {renderMetricCard(
                                'Queue Length',
                                loadBalancer.queueLength || 0,
                                'Pending requests',
                                <Timeline />,
                                chartColors.warning
                            )}
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        );
    };

    /**
     * Render alerts timeline
     */
    const renderAlertsTimeline = () => {
        const recentAlerts = alerts.slice(-10);

        return (
            <Card>
                <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                        <Typography variant="h6">
                            Recent Alerts
                        </Typography>
                        <Chip 
                            label={`${alerts.length} Total`}
                            color={alerts.some(a => a.type === 'error') ? 'error' : 'default'}
                            size="small"
                        />
                    </Box>
                    
                    <Timeline>
                        {recentAlerts.map((alert, index) => (
                            <TimelineItem key={index}>
                                <TimelineSeparator>
                                    <TimelineDot color={
                                        alert.type === 'error' ? 'error' :
                                        alert.type === 'warning' ? 'warning' :
                                        alert.type === 'success' ? 'success' : 'primary'
                                    }>
                                        {alert.type === 'error' ? <ErrorOutline /> :
                                         alert.type === 'warning' ? <Warning /> :
                                         alert.type === 'success' ? <CheckCircle /> : <Info />}
                                    </TimelineDot>
                                    {index < recentAlerts.length - 1 && <TimelineConnector />}
                                </TimelineSeparator>
                                <TimelineContent>
                                    <Typography variant="body2" component="div">
                                        {alert.message}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        {new Date(alert.timestamp).toLocaleTimeString()}
                                    </Typography>
                                </TimelineContent>
                            </TimelineItem>
                        ))}
                    </Timeline>
                    
                    {recentAlerts.length === 0 && (
                        <Box textAlign="center" py={3}>
                            <CheckCircle sx={{ color: chartColors.success, fontSize: 48, mb: 1 }} />
                            <Typography variant="body2" color="textSecondary">
                                No alerts - System is healthy
                            </Typography>
                        </Box>
                    )}
                </CardContent>
            </Card>
        );
    };

    /**
     * Render historical chart
     */
    const renderHistoricalChart = () => {
        if (historicalData.length === 0) return null;

        const chartData = historicalData.slice(-20).map((data, index) => ({
            time: new Date(data.ai.timestamp).toLocaleTimeString(),
            responseTime: data.ai.avgResponseTime || 0,
            errorRate: (data.ai.errorRate || 0) * 100,
            cpuUsage: data.performance.cpuUsage || 0,
            memoryUsage: data.performance.memoryUsage || 0,
            activeRequests: data.ai.activeRequests || 0
        }));

        return (
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Historical Trends
                    </Typography>
                    
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" />
                            <YAxis />
                            <RechartsTooltip />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey="responseTime" 
                                stroke={chartColors.primary} 
                                strokeWidth={2}
                                name="Response Time (ms)"
                            />
                            <Line 
                                type="monotone" 
                                dataKey="errorRate" 
                                stroke={chartColors.error} 
                                strokeWidth={2}
                                name="Error Rate (%)"
                            />
                            <Line 
                                type="monotone" 
                                dataKey="cpuUsage" 
                                stroke={chartColors.warning} 
                                strokeWidth={2}
                                name="CPU Usage (%)"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        );
    };

    // Initialize WebSocket on mount
    useEffect(() => {
        if (isRealTime) {
            initializeWebSocket();
        }

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [isRealTime, initializeWebSocket]);

    return (
        <Box sx={{ flexGrow: 1, p: 3 }}>
            {/* Header */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Typography variant="h4" component="h1" fontWeight="bold">
                    Advanced Analytics Dashboard
                </Typography>
                
                <Box display="flex" alignItems="center" gap={1}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={isRealTime}
                                onChange={(e) => setIsRealTime(e.target.checked)}
                                color="primary"
                            />
                        }
                        label="Real-time"
                    />
                    
                    <Chip 
                        icon={isConnected ? <CheckCircle /> : <ErrorOutline />}
                        label={isConnected ? 'Connected' : 'Disconnected'}
                        color={isConnected ? 'success' : 'error'}
                        variant="outlined"
                    />
                    
                    <IconButton onClick={() => setSettingsOpen(true)}>
                        <Settings />
                    </IconButton>
                    
                    <IconButton onClick={() => window.location.reload()}>
                        <Refresh />
                    </IconButton>
                </Box>
            </Box>

            {/* Metric Selection Tabs */}
            <Box mb={3}>
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>View</InputLabel>
                    <Select
                        value={selectedMetric}
                        label="View"
                        onChange={(e) => setSelectedMetric(e.target.value)}
                    >
                        <MenuItem value="ai">AI Metrics</MenuItem>
                        <MenuItem value="performance">Performance</MenuItem>
                        <MenuItem value="loadBalancer">Load Balancer</MenuItem>
                        <MenuItem value="overview">Overview</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {/* Content */}
            <Grid container spacing={3}>
                {/* Main Metrics */}
                <Grid item xs={12}>
                    {selectedMetric === 'ai' && renderAIMetrics()}
                    {selectedMetric === 'performance' && renderPerformanceMetrics()}
                    {selectedMetric === 'loadBalancer' && renderLoadBalancerMetrics()}
                    {selectedMetric === 'overview' && (
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                {renderAIMetrics()}
                            </Grid>
                        </Grid>
                    )}
                </Grid>

                {/* Historical Chart */}
                <Grid item xs={12} lg={8}>
                    {renderHistoricalChart()}
                </Grid>

                {/* Alerts Timeline */}
                <Grid item xs={12} lg={4}>
                    {renderAlertsTimeline()}
                </Grid>
            </Grid>

            {/* Settings Dialog */}
            <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Dashboard Settings</DialogTitle>
                <DialogContent>
                    <Box py={2}>
                        <Typography gutterBottom>Refresh Interval</Typography>
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Interval</InputLabel>
                            <Select
                                value={refreshInterval}
                                label="Interval"
                                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                            >
                                <MenuItem value={500}>500ms</MenuItem>
                                <MenuItem value={1000}>1 second</MenuItem>
                                <MenuItem value={2000}>2 seconds</MenuItem>
                                <MenuItem value={5000}>5 seconds</MenuItem>
                                <MenuItem value={10000}>10 seconds</MenuItem>
                            </Select>
                        </FormControl>
                        
                        <Typography gutterBottom sx={{ mt: 2 }}>Time Range</Typography>
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Range</InputLabel>
                            <Select
                                value={timeRange}
                                label="Range"
                                onChange={(e) => setTimeRange(e.target.value)}
                            >
                                <MenuItem value="5m">Last 5 minutes</MenuItem>
                                <MenuItem value="15m">Last 15 minutes</MenuItem>
                                <MenuItem value="1h">Last hour</MenuItem>
                                <MenuItem value="24h">Last 24 hours</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSettingsOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AdvancedAnalyticsDashboard;