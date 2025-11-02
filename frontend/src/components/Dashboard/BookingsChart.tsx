import React, { useState, useEffect } from 'react';
import { Paper, Typography, CircularProgress } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiClient from '../../services/apiClient';

const BookingsChart: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/analytics/bookings').then(res => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <CircularProgress />;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant=\"h6\" gutterBottom>Bookings Trends</Typography>
      <ResponsiveContainer width=\"100%\" height={300}>
        <BarChart data={data?.data || []}>
          <CartesianGrid strokeDasharray=\"3 3\" />
          <XAxis dataKey=\"date\" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey=\"confirmed\" fill=\"#4caf50\" />
          <Bar dataKey=\"pending\" fill=\"#ff9800\" />
          <Bar dataKey=\"cancelled\" fill=\"#f44336\" />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default BookingsChart;
