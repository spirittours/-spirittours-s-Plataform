/**
 * Enterprise Analytics Dashboard
 * Advanced analytics and business intelligence for Phase 2 Extended
 * $100K IA Multi-Modelo Upgrade - Analytics Frontend
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Grid,
    Typography,
    Tabs,
    Tab,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert,
    Chip,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Switch,
    FormControlLabel,
    Tooltip,
    IconButton
} from '@mui/material';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
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
    ScatterChart,
    Scatter,
    RadialBarChart,
    RadialBar
} from 'recharts';
import {
    Dashboard,
    TrendingUp,
    Analytics,
    Assessment,
    Warning,
    CheckCircle,
    Error,
    Info,
    Download,
    Refresh,
    Settings,
    PredictiveAnalytics,
    BusinessCenter,
    Speed,
    MonetizationOn,
    People,
    Timeline,
    InsertChart,
    TableChart,
    FilterList,
    Fullscreen,
    ExpandMore,
    ExpandLess
} from '@mui/icons-material';

interface AnalyticsData {
    kpis: {
        aiPerformance: {
            averageResponseTime: number;
            successRate: number;
            errorRate: number;
            costPerRequest: number;
            throughputPerHour: number;
        };
        business: {
            totalRevenue: number;
            costSavings: number;
            customerSatisfaction: number;
            operationalEfficiency: number;
            roi: number;
        };
        technical: {
            systemUptime: number;
            loadBalancerEfficiency: number;
            cacheHitRate: number;
            apiResponseTime: number;
        };
    };
    alerts: Array<{
        type: string;
        severity: string;
        message: string;
        value: number;
        threshold: number;
    }>;
    trends: any;
    predictions: any;
    insights: any;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`analytics-tabpanel-${index}`}
            aria-labelledby={`analytics-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

const EnterpriseAnalyticsDashboard: React.FC = () => {
    // State Management
    const [activeTab, setActiveTab] = useState(0);
    const [timeFrame, setTimeFrame] = useState('24h');
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(30000);
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState('executive');
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
    
    const wsRef = useRef<WebSocket | null>(null);
    const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Colors for charts
    const chartColors = {
        primary: '#1976d2',
        secondary: '#dc004e',
        success: '#2e7d32',
        warning: '#ed6c02',
        error: '#d32f2f',
        info: '#0288d1'
    };

    // Initialize analytics data
    useEffect(() => {
        initializeAnalytics();
        if (autoRefresh) {
            startAutoRefresh();
        }
        return () => {
            stopAutoRefresh();
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [autoRefresh, refreshInterval]);

    const initializeAnalytics = async () => {
        try {
            setLoading(true);
            const data = await fetchAnalyticsData();
            setAnalyticsData(data);
            setError(null);
        } catch (err) {
            setError('Failed to load analytics data');
            console.error('Analytics initialization error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalyticsData = async (): Promise<AnalyticsData> => {
        // Mock data - In production, this would fetch from the analytics API
        return {
            kpis: {
                aiPerformance: {
                    averageResponseTime: Math.floor(Math.random() * 2000) + 500,
                    successRate: 95 + Math.random() * 5,
                    errorRate: Math.random() * 3,
                    costPerRequest: Math.random() * 0.1,
                    throughputPerHour: Math.floor(Math.random() * 1000) + 500
                },
                business: {
                    totalRevenue: Math.floor(Math.random() * 100000) + 50000,
                    costSavings: Math.floor(Math.random() * 20000) + 5000,
                    customerSatisfaction: 80 + Math.random() * 20,
                    operationalEfficiency: 70 + Math.random() * 30,
                    roi: Math.floor(Math.random() * 200) + 100
                },
                technical: {
                    systemUptime: 99.5 + Math.random() * 0.5,
                    loadBalancerEfficiency: 85 + Math.random() * 15,
                    cacheHitRate: 80 + Math.random() * 20,
                    apiResponseTime: Math.floor(Math.random() * 1000) + 200
                }
            },
            alerts: [
                {
                    type: 'performance',
                    severity: 'medium',
                    message: 'Response time slightly elevated',
                    value: 1750,
                    threshold: 2000
                },
                {
                    type: 'cost',
                    severity: 'low',
                    message: 'Monthly budget at 75%',
                    value: 75,
                    threshold: 80
                }
            ],
            trends: {},
            predictions: {},
            insights: {}
        };
    };

    const startAutoRefresh = () => {
        if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
        }
        refreshIntervalRef.current = setInterval(() => {
            fetchAnalyticsData().then(setAnalyticsData);
        }, refreshInterval);
    };

    const stopAutoRefresh = () => {
        if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
            refreshIntervalRef.current = null;
        }
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    const handleTimeFrameChange = (event: any) => {
        setTimeFrame(event.target.value);
        // Refresh data with new timeframe
        initializeAnalytics();
    };

    const handleRefresh = () => {
        initializeAnalytics();
    };

    const handleAutoRefreshChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setAutoRefresh(event.target.checked);
        if (event.target.checked) {
            startAutoRefresh();
        } else {
            stopAutoRefresh();
        }
    };

    const toggleCardExpansion = (cardId: string) => {
        const newExpanded = new Set(expandedCards);
        if (newExpanded.has(cardId)) {
            newExpanded.delete(cardId);
        } else {
            newExpanded.add(cardId);
        }
        setExpandedCards(newExpanded);
    };

    const generateReport = async () => {
        try {
            // In production, this would call the backend to generate reports
            console.log(`Generating ${selectedReport} report...`);
            setReportDialogOpen(false);
        } catch (err) {
            console.error('Report generation error:', err);
        }
    };

    // Generate mock time series data
    const generateTimeSeriesData = (points: number = 24) => {
        return Array.from({ length: points }, (_, i) => ({
            time: `${i}:00`,
            requests: Math.floor(Math.random() * 1000) + 200,
            responseTime: Math.floor(Math.random() * 500) + 300,
            errorRate: Math.random() * 5,
            cost: Math.random() * 10
        }));
    };

    // Generate model usage data
    const generateModelUsageData = () => [
        { name: 'GPT-4', value: 35, cost: 45 },
        { name: 'Claude 3.5', value: 28, cost: 32 },
        { name: 'Gemini 2.0', value: 18, cost: 15 },
        { name: 'Perplexity', value: 12, cost: 8 },
        { name: 'Others', value: 7, cost: 5 }
    ];

    if (loading) {
        return (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="400px">
                <Typography variant="h6" gutterBottom>Loading Analytics Dashboard...</Typography>
                <LinearProgress sx={{ width: '300px', mt: 2 }} />
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={3}>
                <Alert severity="error" action={
                    <Button color="inherit" size="small" onClick={handleRefresh}>
                        Retry
                    </Button>
                }>
                    {error}
                </Alert>
            </Box>
        );
    }

    const timeSeriesData = generateTimeSeriesData();
    const modelUsageData = generateModelUsageData();

    return (
        <Box sx={{ width: '100%', p: 3 }}>
            {/* Header */}
            <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1" gutterBottom>
                    <Dashboard sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Enterprise Analytics Dashboard
                </Typography>
                
                <Box display="flex" alignItems="center" gap={2}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={autoRefresh}
                                onChange={handleAutoRefreshChange}
                                size="small"
                            />
                        }
                        label="Auto Refresh"
                    />
                    
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Time Frame</InputLabel>
                        <Select
                            value={timeFrame}
                            onChange={handleTimeFrameChange}
                            label="Time Frame"
                        >
                            <MenuItem value="1h">Last Hour</MenuItem>
                            <MenuItem value="24h">Last 24 Hours</MenuItem>
                            <MenuItem value="7d">Last 7 Days</MenuItem>
                            <MenuItem value="30d">Last 30 Days</MenuItem>
                        </Select>
                    </FormControl>
                    
                    <Button
                        variant="outlined"
                        onClick={() => setReportDialogOpen(true)}
                        startIcon={<Download />}
                    >
                        Export Report
                    </Button>
                    
                    <Tooltip title="Refresh Data">
                        <IconButton onClick={handleRefresh}>
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Alerts */}
            {analyticsData?.alerts && analyticsData.alerts.length > 0 && (
                <Box mb={3}>
                    {analyticsData.alerts.map((alert, index) => (
                        <Alert
                            key={index}
                            severity={alert.severity as 'error' | 'warning' | 'info' | 'success'}
                            sx={{ mb: 1 }}
                            icon={alert.severity === 'high' ? <Error /> : <Warning />}
                        >
                            {alert.message} (Current: {alert.value}, Threshold: {alert.threshold})
                        </Alert>
                    ))}
                </Box>
            )}

            {/* Main Content Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={handleTabChange} aria-label="analytics tabs">
                    <Tab icon={<Dashboard />} label="Overview" />
                    <Tab icon={<Assessment />} label="AI Performance" />
                    <Tab icon={<BusinessCenter />} label="Business Intelligence" />
                    <Tab icon={<PredictiveAnalytics />} label="Predictive Analytics" />
                    <Tab icon={<MonetizationOn />} label="Cost Analysis" />
                    <Tab icon={<Speed />} label="Technical Metrics" />
                </Tabs>
            </Box>

            {/* Overview Tab */}
            <TabPanel value={activeTab} index={0}>
                <Grid container spacing={3}>
                    {/* KPI Cards */}
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" justifyContent="between">
                                    <Box>
                                        <Typography color="textSecondary" gutterBottom variant="body2">
                                            System Uptime
                                        </Typography>
                                        <Typography variant="h4">
                                            {analyticsData?.kpis.technical.systemUptime.toFixed(2)}%
                                        </Typography>
                                    </Box>
                                    <CheckCircle color="success" fontSize="large" />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" justifyContent="between">
                                    <Box>
                                        <Typography color="textSecondary" gutterBottom variant="body2">
                                            Requests/Hour
                                        </Typography>
                                        <Typography variant="h4">
                                            {analyticsData?.kpis.aiPerformance.throughputPerHour.toLocaleString()}
                                        </Typography>
                                    </Box>
                                    <TrendingUp color="primary" fontSize="large" />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" justifyContent="between">
                                    <Box>
                                        <Typography color="textSecondary" gutterBottom variant="body2">
                                            Success Rate
                                        </Typography>
                                        <Typography variant="h4">
                                            {analyticsData?.kpis.aiPerformance.successRate.toFixed(1)}%
                                        </Typography>
                                    </Box>
                                    <Analytics color="success" fontSize="large" />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" justifyContent="between">
                                    <Box>
                                        <Typography color="textSecondary" gutterBottom variant="body2">
                                            ROI
                                        </Typography>
                                        <Typography variant="h4">
                                            {analyticsData?.kpis.business.roi}%
                                        </Typography>
                                    </Box>
                                    <MonetizationOn color="warning" fontSize="large" />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Performance Chart */}
                    <Grid item xs={12} lg={8}>
                        <Card>
                            <CardHeader 
                                title="Performance Trends"
                                subheader={`Last ${timeFrame}`}
                                action={
                                    <IconButton onClick={() => toggleCardExpansion('performance-trends')}>
                                        {expandedCards.has('performance-trends') ? <ExpandLess /> : <ExpandMore />}
                                    </IconButton>
                                }
                            />
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={timeSeriesData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="time" />
                                        <YAxis />
                                        <RechartsTooltip />
                                        <Legend />
                                        <Line 
                                            type="monotone" 
                                            dataKey="requests" 
                                            stroke={chartColors.primary} 
                                            name="Requests"
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="responseTime" 
                                            stroke={chartColors.secondary} 
                                            name="Response Time (ms)"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Model Usage */}
                    <Grid item xs={12} lg={4}>
                        <Card>
                            <CardHeader title="AI Model Usage" />
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={modelUsageData}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                            label
                                        >
                                            {modelUsageData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={Object.values(chartColors)[index]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* AI Performance Tab */}
            <TabPanel value={activeTab} index={1}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Card>
                            <CardHeader title="AI Performance Metrics" />
                            <CardContent>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="h6" gutterBottom>Response Time Distribution</Typography>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <AreaChart data={timeSeriesData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="time" />
                                                <YAxis />
                                                <RechartsTooltip />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="responseTime" 
                                                    stroke={chartColors.primary} 
                                                    fill={chartColors.primary}
                                                    fillOpacity={0.3}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </Grid>
                                    
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="h6" gutterBottom>Error Rate Tracking</Typography>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <LineChart data={timeSeriesData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="time" />
                                                <YAxis />
                                                <RechartsTooltip />
                                                <Line 
                                                    type="monotone" 
                                                    dataKey="errorRate" 
                                                    stroke={chartColors.error} 
                                                    strokeWidth={3}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* Business Intelligence Tab */}
            <TabPanel value={activeTab} index={2}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardHeader title="Revenue Impact" />
                            <CardContent>
                                <Box mb={2}>
                                    <Typography variant="body2" color="textSecondary">
                                        Total Revenue (Monthly)
                                    </Typography>
                                    <Typography variant="h4">
                                        ${analyticsData?.kpis.business.totalRevenue.toLocaleString()}
                                    </Typography>
                                </Box>
                                <Box mb={2}>
                                    <Typography variant="body2" color="textSecondary">
                                        Cost Savings
                                    </Typography>
                                    <Typography variant="h5" color="success.main">
                                        +${analyticsData?.kpis.business.costSavings.toLocaleString()}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" color="textSecondary">
                                        Operational Efficiency
                                    </Typography>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={analyticsData?.kpis.business.operationalEfficiency} 
                                        sx={{ mt: 1 }}
                                    />
                                    <Typography variant="body2" align="right">
                                        {analyticsData?.kpis.business.operationalEfficiency.toFixed(0)}%
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardHeader title="Customer Insights" />
                            <CardContent>
                                <Box mb={2}>
                                    <Typography variant="body2" color="textSecondary">
                                        Satisfaction Score
                                    </Typography>
                                    <Typography variant="h4">
                                        {analyticsData?.kpis.business.customerSatisfaction.toFixed(0)}/100
                                    </Typography>
                                </Box>
                                <Box mb={2}>
                                    <Chip label="High Engagement" color="success" size="small" />
                                    <Chip label="Growing User Base" color="info" size="small" sx={{ ml: 1 }} />
                                </Box>
                                <Typography variant="body2" color="textSecondary">
                                    Key Performance Indicators show positive growth across all customer metrics.
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* Other tabs would continue with similar structure */}
            <TabPanel value={activeTab} index={3}>
                <Typography variant="h6">Predictive Analytics (Coming Soon)</Typography>
            </TabPanel>
            
            <TabPanel value={activeTab} index={4}>
                <Typography variant="h6">Cost Analysis (Coming Soon)</Typography>
            </TabPanel>
            
            <TabPanel value={activeTab} index={5}>
                <Typography variant="h6">Technical Metrics (Coming Soon)</Typography>
            </TabPanel>

            {/* Report Generation Dialog */}
            <Dialog open={reportDialogOpen} onClose={() => setReportDialogOpen(false)}>
                <DialogTitle>Generate Report</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Report Type</InputLabel>
                        <Select
                            value={selectedReport}
                            onChange={(e) => setSelectedReport(e.target.value)}
                            label="Report Type"
                        >
                            <MenuItem value="executive">Executive Dashboard</MenuItem>
                            <MenuItem value="technical">Technical Performance</MenuItem>
                            <MenuItem value="business">Business Analytics</MenuItem>
                            <MenuItem value="cost">Cost Optimization</MenuItem>
                            <MenuItem value="predictive">Predictive Insights</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReportDialogOpen(false)}>Cancel</Button>
                    <Button onClick={generateReport} variant="contained">Generate</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EnterpriseAnalyticsDashboard;