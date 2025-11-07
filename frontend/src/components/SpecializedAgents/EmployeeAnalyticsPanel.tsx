/**
 * Employee Analytics Agent Panel
 * Comprehensive employee performance monitoring and tracking
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Autocomplete,
  TextField,
  Chip,
  LinearProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Analytics,
  Schedule,
  TrendingUp,
  Star,
  ChatBubble,
  Psychology,
  Warning,
  CheckCircle,
  Info,
  Phone,
  AttachMoney,
  Assessment
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { format } from 'date-fns';

interface EmployeePerformance {
  employeeId: string;
  period: { startDate: string; endDate: string };
  timeMetrics: {
    totalHours: number;
    activeHours: number;
    averageDailyHours: number;
    punctualityScore: number;
    meetsMinimumHours: boolean;
    score: number;
  };
  productivityMetrics: {
    tasksCompleted: number;
    callsMade: number;
    salesCompleted: number;
    revenueGenerated: number;
    conversionRate: number;
    score: number;
  };
  qualityMetrics: {
    customerSatisfactionScore: number;
    averageRating: number;
    errorRate: number;
    firstCallResolution: number;
    score: number;
  };
  communicationMetrics: {
    averageResponseTime: number;
    communicationClarity: number;
    professionalismScore: number;
    empathyScore: number;
    score: number;
  };
  attitudeMetrics: {
    punctualityScore: number;
    attendanceRate: number;
    teamworkScore: number;
    motivationLevel: number;
    score: number;
  };
  overallScore: {
    total: number;
    category: string;
    breakdown: Record<string, number>;
  };
  insights: {
    overall: string;
    strengths: string[];
    improvements: string[];
    trend: string;
  };
  recommendations: {
    training: string[];
    coachingAreas: string[];
    recognition: string[];
  };
}

const EmployeeAnalyticsPanel: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [performance, setPerformance] = useState<EmployeePerformance | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [dateRange, setDateRange] = useState({
    start: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const calculateMetrics = async () => {
    if (!selectedEmployee) return;

    try {
      setLoading(true);
      
      const response = await fetch(
        `/api/agents/workspace123/analytics/calculate/${selectedEmployee}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: dateRange.start,
            endDate: dateRange.end
          })
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setPerformance(data.data);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      exceptional: '#4CAF50',
      exceeds_expectations: '#8BC34A',
      meets_expectations: '#FFC107',
      needs_improvement: '#FF9800',
      unsatisfactory: '#F44336'
    };
    return colors[category] || '#9E9E9E';
  };

  const getPerformanceChartData = () => {
    if (!performance) return null;

    return {
      labels: ['Time', 'Productivity', 'Quality', 'Communication', 'Attitude'],
      datasets: [{
        label: 'Performance Scores',
        data: [
          performance.timeMetrics.score,
          performance.productivityMetrics.score,
          performance.qualityMetrics.score,
          performance.communicationMetrics.score,
          performance.attitudeMetrics.score
        ],
        backgroundColor: [
          'rgba(76, 175, 80, 0.6)',
          'rgba(33, 150, 243, 0.6)',
          'rgba(255, 152, 0, 0.6)',
          'rgba(156, 39, 176, 0.6)',
          'rgba(244, 67, 54, 0.6)'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };
  };

  const getOverallScoreData = () => {
    if (!performance) return null;

    const breakdown = performance.overallScore.breakdown;
    return {
      labels: Object.keys(breakdown).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
      datasets: [{
        data: Object.values(breakdown),
        backgroundColor: [
          '#4CAF50',
          '#2196F3',
          '#FF9800',
          '#9C27B0',
          '#F44336'
        ]
      }]
    };
  };

  return (
    <Box>
      {/* Employee Selection */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={4}>
          <Autocomplete
            options={employees}
            getOptionLabel={(option) => `${option.name} - ${option.role}`}
            onChange={(e, value) => setSelectedEmployee(value?.id || null)}
            renderInput={(params) => (
              <TextField {...params} label="Select Employee" />
            )}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            type="date"
            label="Start Date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            type="date"
            label="End Date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} md={2}>
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={calculateMetrics}
            disabled={!selectedEmployee || loading}
            startIcon={<Analytics />}
          >
            Calculate
          </Button>
        </Grid>
      </Grid>

      {performance && (
        <>
          {/* Overall Performance Score */}
          <Card sx={{ mb: 3, borderTop: `4px solid ${getCategoryColor(performance.overallScore.category)}` }}>
            <CardContent>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={3} textAlign="center">
                  <Typography variant="h2" fontWeight="bold" color={getCategoryColor(performance.overallScore.category)}>
                    {performance.overallScore.total}
                  </Typography>
                  <Typography variant="h6" textTransform="capitalize">
                    {performance.overallScore.category.replace(/_/g, ' ')}
                  </Typography>
                  <Chip 
                    label={performance.insights.trend.toUpperCase()}
                    color={performance.insights.trend === 'improving' ? 'success' : performance.insights.trend === 'declining' ? 'error' : 'default'}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={9}>
                  <Grid container spacing={2}>
                    {Object.entries(performance.overallScore.breakdown).map(([key, value]) => (
                      <Grid item xs={6} md={2.4} key={key}>
                        <Box>
                          <Typography variant="body2" color="text.secondary" textTransform="capitalize">
                            {key}
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={value}
                            sx={{ height: 8, borderRadius: 4, my: 1 }}
                          />
                          <Typography variant="h6">{value}/100</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Performance Charts */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Performance Breakdown
                  </Typography>
                  {getPerformanceChartData() && (
                    <Bar 
                      data={getPerformanceChartData()!}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: { beginAtZero: true, max: 100 }
                        }
                      }}
                      height={250}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Score Distribution
                  </Typography>
                  {getOverallScoreData() && (
                    <Doughnut 
                      data={getOverallScoreData()!}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Detailed Metrics Tabs */}
          <Card>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                <Tab icon={<Schedule />} label="Time" />
                <Tab icon={<TrendingUp />} label="Productivity" />
                <Tab icon={<Star />} label="Quality" />
                <Tab icon={<ChatBubble />} label="Communication" />
                <Tab icon={<Psychology />} label="Attitude" />
              </Tabs>
            </Box>

            {/* Time Metrics */}
            {activeTab === 0 && (
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Box p={2} bgcolor="background.default" borderRadius={2}>
                      <Typography variant="body2" color="text.secondary">Total Hours</Typography>
                      <Typography variant="h5">{performance.timeMetrics.totalHours.toFixed(1)}h</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box p={2} bgcolor="background.default" borderRadius={2}>
                      <Typography variant="body2" color="text.secondary">Active Hours</Typography>
                      <Typography variant="h5">{performance.timeMetrics.activeHours.toFixed(1)}h</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box p={2} bgcolor="background.default" borderRadius={2}>
                      <Typography variant="body2" color="text.secondary">Daily Average</Typography>
                      <Typography variant="h5">{performance.timeMetrics.averageDailyHours.toFixed(1)}h</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box p={2} bgcolor="background.default" borderRadius={2}>
                      <Typography variant="body2" color="text.secondary">Punctuality</Typography>
                      <Typography variant="h5">{performance.timeMetrics.punctualityScore.toFixed(0)}%</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="center" gap={1} p={2} bgcolor={performance.timeMetrics.meetsMinimumHours ? 'success.light' : 'error.light'} borderRadius={2}>
                      {performance.timeMetrics.meetsMinimumHours ? <CheckCircle /> : <Warning />}
                      <Typography>
                        {performance.timeMetrics.meetsMinimumHours 
                          ? 'Meets minimum work hour requirements' 
                          : 'Below minimum work hour requirements'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            )}

            {/* Productivity Metrics */}
            {activeTab === 1 && (
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Box p={2} bgcolor="background.default" borderRadius={2}>
                      <Typography variant="body2" color="text.secondary">Tasks Completed</Typography>
                      <Typography variant="h5">{performance.productivityMetrics.tasksCompleted}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box p={2} bgcolor="background.default" borderRadius={2}>
                      <Phone sx={{ color: 'primary.main', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">Calls Made</Typography>
                      <Typography variant="h5">{performance.productivityMetrics.callsMade}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box p={2} bgcolor="background.default" borderRadius={2}>
                      <AttachMoney sx={{ color: 'success.main', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">Sales Completed</Typography>
                      <Typography variant="h5">{performance.productivityMetrics.salesCompleted}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box p={2} bgcolor="background.default" borderRadius={2}>
                      <Typography variant="body2" color="text.secondary">Revenue Generated</Typography>
                      <Typography variant="h5">${performance.productivityMetrics.revenueGenerated.toFixed(0)}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box p={2} bgcolor="background.default" borderRadius={2}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Conversion Rate</Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={performance.productivityMetrics.conversionRate}
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                      <Typography variant="h6" mt={1}>{performance.productivityMetrics.conversionRate.toFixed(1)}%</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            )}

            {/* Quality Metrics */}
            {activeTab === 2 && (
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={4}>
                    <Box p={2} bgcolor="background.default" borderRadius={2}>
                      <Star sx={{ color: 'warning.main', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">Customer Satisfaction</Typography>
                      <Typography variant="h5">{performance.qualityMetrics.customerSatisfactionScore.toFixed(1)}/5</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={4}>
                    <Box p={2} bgcolor="background.default" borderRadius={2}>
                      <Typography variant="body2" color="text.secondary">Average Rating</Typography>
                      <Typography variant="h5">{performance.qualityMetrics.averageRating.toFixed(2)}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={4}>
                    <Box p={2} bgcolor="background.default" borderRadius={2}>
                      <Typography variant="body2" color="text.secondary">Error Rate</Typography>
                      <Typography variant="h5" color={performance.qualityMetrics.errorRate < 5 ? 'success.main' : 'error.main'}>
                        {performance.qualityMetrics.errorRate.toFixed(1)}%
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box p={2} bgcolor="background.default" borderRadius={2}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>First Call Resolution</Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={performance.qualityMetrics.firstCallResolution}
                        color="success"
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                      <Typography variant="h6" mt={1}>{performance.qualityMetrics.firstCallResolution.toFixed(0)}%</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            )}

            {/* Communication Metrics */}
            {activeTab === 3 && (
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Box p={2} bgcolor="background.default" borderRadius={2}>
                      <Typography variant="body2" color="text.secondary">Avg Response Time</Typography>
                      <Typography variant="h5">{performance.communicationMetrics.averageResponseTime}min</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box p={2} bgcolor="background.default" borderRadius={2}>
                      <Typography variant="body2" color="text.secondary">Clarity</Typography>
                      <Typography variant="h5">{performance.communicationMetrics.communicationClarity}/100</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box p={2} bgcolor="background.default" borderRadius={2}>
                      <Typography variant="body2" color="text.secondary">Professionalism</Typography>
                      <Typography variant="h5">{performance.communicationMetrics.professionalismScore}/100</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box p={2} bgcolor="background.default" borderRadius={2}>
                      <Typography variant="body2" color="text.secondary">Empathy</Typography>
                      <Typography variant="h5">{performance.communicationMetrics.empathyScore}/100</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            )}

            {/* Attitude Metrics */}
            {activeTab === 4 && (
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Box p={2} bgcolor="background.default" borderRadius={2}>
                      <Typography variant="body2" color="text.secondary">Punctuality</Typography>
                      <Typography variant="h5">{performance.attitudeMetrics.punctualityScore}/100</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box p={2} bgcolor="background.default" borderRadius={2}>
                      <Typography variant="body2" color="text.secondary">Attendance Rate</Typography>
                      <Typography variant="h5">{performance.attitudeMetrics.attendanceRate.toFixed(0)}%</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box p={2} bgcolor="background.default" borderRadius={2}>
                      <Typography variant="body2" color="text.secondary">Teamwork</Typography>
                      <Typography variant="h5">{performance.attitudeMetrics.teamworkScore}/100</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box p={2} bgcolor="background.default" borderRadius={2}>
                      <Typography variant="body2" color="text.secondary">Motivation</Typography>
                      <Typography variant="h5">{performance.attitudeMetrics.motivationLevel}/100</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            )}
          </Card>

          {/* Insights & Recommendations */}
          <Grid container spacing={3} mt={2}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <Info sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Insights
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {performance.insights.overall}
                  </Typography>
                  
                  <Box mb={2}>
                    <Typography variant="subtitle2" color="success.main" gutterBottom>
                      Strengths:
                    </Typography>
                    {performance.insights.strengths.map((strength, i) => (
                      <Chip key={i} label={strength} size="small" color="success" sx={{ mr: 1, mb: 1 }} />
                    ))}
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" color="warning.main" gutterBottom>
                      Areas for Improvement:
                    </Typography>
                    {performance.insights.improvements.map((improvement, i) => (
                      <Chip key={i} label={improvement} size="small" color="warning" sx={{ mr: 1, mb: 1 }} />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Recommendations
                  </Typography>
                  
                  <Box mb={2}>
                    <Typography variant="subtitle2" gutterBottom>Training Needed:</Typography>
                    <ul>
                      {performance.recommendations.training.map((item, i) => (
                        <li key={i}><Typography variant="body2">{item}</Typography></li>
                      ))}
                    </ul>
                  </Box>

                  <Box mb={2}>
                    <Typography variant="subtitle2" gutterBottom>Coaching Focus:</Typography>
                    <ul>
                      {performance.recommendations.coachingAreas.map((item, i) => (
                        <li key={i}><Typography variant="body2">{item}</Typography></li>
                      ))}
                    </ul>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Recognition Opportunities:</Typography>
                    <ul>
                      {performance.recommendations.recognition.map((item, i) => (
                        <li key={i}><Typography variant="body2">{item}</Typography></li>
                      ))}
                    </ul>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {!performance && !loading && (
        <Box textAlign="center" py={8}>
          <Analytics sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Select an employee and date range to view performance analytics
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default EmployeeAnalyticsPanel;
