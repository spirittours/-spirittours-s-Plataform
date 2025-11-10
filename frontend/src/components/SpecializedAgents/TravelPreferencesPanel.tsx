/**
 * Travel Preferences Agent Panel
 * UI for analyzing customer travel preferences and generating recommendations
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Chip,
  LinearProgress,
  Autocomplete,
  Alert
} from '@mui/material';
import {
  TrendingUp,
  LocalActivity,
  AttachMoney,
  CalendarMonth,
  Groups,
  Lightbulb
} from '@mui/icons-material';
import { Line, Radar } from 'react-chartjs-2';

interface CustomerPreference {
  customerId: string;
  bookingCount: number;
  patterns: {
    destinations: Record<string, number>;
    averageBudget: number;
    preferredSeasons: Record<string, number>;
    averageGroupSize: number;
    averageDuration: number;
  };
  analysis: {
    personality: string;
    budgetStyle: string;
    planningStyle: string;
  };
  recommendations: Array<{
    destination: string;
    description: string;
    estimated_cost: number;
  }>;
  confidence: number;
}

const TravelPreferencesPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<CustomerPreference | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const analyzePreferences = async () => {
    if (!selectedCustomer) return;

    try {
      setAnalyzing(true);
      setError(null);
      
      const response = await fetch(
        `/api/agents/workspace123/travel-preferences/analyze/${selectedCustomer}`,
        { method: 'POST' }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setPreferences(data.data);
      } else {
        setError(data.message || 'Analysis failed');
      }
    } catch (err) {
      setError('Failed to analyze preferences');
      console.error('Error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const getDestinationChartData = () => {
    if (!preferences) return null;

    const destinations = preferences.patterns.destinations;
    return {
      labels: Object.keys(destinations),
      datasets: [{
        label: 'Destination Preferences',
        data: Object.values(destinations),
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        borderColor: 'rgba(76, 175, 80, 1)',
        borderWidth: 2,
        fill: true
      }]
    };
  };

  const getSeasonChartData = () => {
    if (!preferences) return null;

    const seasons = preferences.patterns.preferredSeasons;
    return {
      labels: Object.keys(seasons),
      datasets: [{
        label: 'Travel by Season',
        data: Object.values(seasons),
        fill: true,
        backgroundColor: 'rgba(33, 150, 243, 0.2)',
        borderColor: 'rgba(33, 150, 243, 1)',
        pointBackgroundColor: 'rgba(33, 150, 243, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(33, 150, 243, 1)'
      }]
    };
  };

  return (
    <Box>
      {/* Customer Selection */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={8}>
          <Autocomplete
            options={customers}
            getOptionLabel={(option) => `${option.name} (${option.email})`}
            onChange={(e, value) => setSelectedCustomer(value?.id || null)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Customer"
                placeholder="Search by name or email"
              />
            )}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Button
            variant="contained"
            fullWidth
            size="medium"
            onClick={analyzePreferences}
            disabled={!selectedCustomer || analyzing}
            startIcon={analyzing ? <CircularProgress size={20} /> : <TrendingUp />}
          >
            {analyzing ? 'Analyzing...' : 'Analyze Preferences'}
          </Button>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {preferences && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <CalendarMonth sx={{ mr: 1, color: '#4CAF50' }} />
                    <Typography variant="h6">Bookings</Typography>
                  </Box>
                  <Typography variant="h4">{preferences.bookingCount}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total trips analyzed
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <AttachMoney sx={{ mr: 1, color: '#2196F3' }} />
                    <Typography variant="h6">Avg Budget</Typography>
                  </Box>
                  <Typography variant="h4">
                    ${preferences.patterns.averageBudget.toFixed(0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Per trip
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Groups sx={{ mr: 1, color: '#FF9800' }} />
                    <Typography variant="h6">Group Size</Typography>
                  </Box>
                  <Typography variant="h4">
                    {preferences.patterns.averageGroupSize}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average travelers
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <LocalActivity sx={{ mr: 1, color: '#9C27B0' }} />
                    <Typography variant="h6">Duration</Typography>
                  </Box>
                  <Typography variant="h4">
                    {preferences.patterns.averageDuration}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Days per trip
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Analysis & Confidence */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <Lightbulb sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Customer Profile
                  </Typography>
                  
                  <Box my={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Personality
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {preferences.analysis.personality}
                    </Typography>
                  </Box>

                  <Box display="flex" gap={1} mb={2}>
                    <Chip 
                      label={`Budget: ${preferences.analysis.budgetStyle}`}
                      color="primary"
                      size="small"
                    />
                    <Chip 
                      label={`Planning: ${preferences.analysis.planningStyle}`}
                      color="secondary"
                      size="small"
                    />
                  </Box>

                  <Box mt={3}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Analysis Confidence
                    </Typography>
                    <Box display="flex" alignItems="center">
                      <Box flex={1} mr={2}>
                        <LinearProgress 
                          variant="determinate" 
                          value={preferences.confidence}
                          sx={{ height: 10, borderRadius: 5 }}
                        />
                      </Box>
                      <Typography variant="h6">
                        {preferences.confidence.toFixed(0)}%
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Travel Patterns
                  </Typography>
                  {getSeasonChartData() && (
                    <Radar 
                      data={getSeasonChartData()!}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        scales: {
                          r: {
                            beginAtZero: true,
                            ticks: { display: false }
                          }
                        }
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Destination Distribution */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Destination Preferences
                  </Typography>
                  {getDestinationChartData() && (
                    <Line 
                      data={getDestinationChartData()!}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: { beginAtZero: true }
                        }
                      }}
                      height={200}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Recommendations */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Lightbulb sx={{ mr: 1, verticalAlign: 'middle' }} />
                Personalized Recommendations
              </Typography>
              <Grid container spacing={2}>
                {preferences.recommendations.map((rec, index) => (
                  <Grid item xs={12} md={4} key={index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {rec.destination}
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {rec.description}
                        </Typography>
                        <Typography variant="h6" color="primary">
                          ${rec.estimated_cost.toFixed(0)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </>
      )}

      {!preferences && !analyzing && (
        <Box textAlign="center" py={8}>
          <TrendingUp sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Select a customer to analyze their travel preferences
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default TravelPreferencesPanel;
