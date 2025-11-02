import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, FormControl, Select, MenuItem, CircularProgress } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiClient from '../../services/apiClient';
import { RevenueData } from '../../types/dashboard.types';

const RevenueChart: React.FC = () => {
  const [data, setData] = useState<RevenueData | null>(null);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueData();
  }, [period]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/analytics/revenue?period=${period}`);
      setData(response.data);
    } catch (err) {
      console.error('Error fetching revenue data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;
  if (!data) return <Typography>No data</Typography>;

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant=\"h6\">Revenue Analytics</Typography>
        <FormControl size=\"small\">
          <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <MenuItem value=\"day\">Daily</MenuItem>
            <MenuItem value=\"week\">Weekly</MenuItem>
            <MenuItem value=\"month\">Monthly</MenuItem>
            <MenuItem value=\"year\">Yearly</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <ResponsiveContainer width=\"100%\" height={300}>
        <LineChart data={data.data}>
          <CartesianGrid strokeDasharray=\"3 3\" />
          <XAxis dataKey=\"date\" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type=\"monotone\" dataKey=\"revenue\" stroke=\"#8884d8\" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-around' }}>
        <Box>
          <Typography variant=\"caption\" color=\"textSecondary\">Total Revenue</Typography>
          <Typography variant=\"h6\">${data.total.toLocaleString()}</Typography>
        </Box>
        <Box>
          <Typography variant=\"caption\" color=\"textSecondary\">Average</Typography>
          <Typography variant=\"h6\">${data.average.toFixed(2)}</Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default RevenueChart;
