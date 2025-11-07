/**
 * Pipeline Charts Component
 * Visual analytics for pipeline performance and forecasting
 * 
 * Features:
 * - Deal distribution by stage (pie chart)
 * - Revenue forecast by month (bar chart)
 * - Pipeline velocity trends (line chart)
 * - Conversion funnel visualization
 * - Win/Loss analysis
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';
import axios from 'axios';

interface PipelineChartsProps {
  workspaceId: string;
  pipelineId?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const PipelineCharts: React.FC<PipelineChartsProps> = ({ workspaceId, pipelineId }) => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedPipeline, setSelectedPipeline] = useState<string>(pipelineId || '');
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chart data states
  const [stageData, setStageData] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [velocityData, setVelocityData] = useState<any[]>([]);
  const [conversionData, setConversionData] = useState<any[]>([]);
  const [winLossData, setWinLossData] = useState<any[]>([]);

  const COLORS = [
    '#0088FE',
    '#00C49F',
    '#FFBB28',
    '#FF8042',
    '#8884D8',
    '#82CA9D',
    '#FFC658',
    '#FF6B9D',
  ];

  useEffect(() => {
    loadPipelines();
  }, [workspaceId]);

  useEffect(() => {
    if (selectedPipeline) {
      loadChartData();
    }
  }, [selectedPipeline]);

  const loadPipelines = async () => {
    try {
      const response = await axios.get(`/api/crm/workspaces/${workspaceId}/pipelines`);
      setPipelines(response.data);
      
      if (response.data.length > 0 && !selectedPipeline) {
        setSelectedPipeline(response.data[0]._id);
      }
    } catch (err: any) {
      console.error('Error loading pipelines:', err);
      setError('Error al cargar pipelines');
    }
  };

  const loadChartData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all chart data in parallel
      const [statsRes, velocityRes, conversionRes] = await Promise.all([
        axios.get(`/api/crm/pipelines/${selectedPipeline}/stats`),
        axios.get(`/api/crm/pipelines/${selectedPipeline}/velocity`),
        axios.get(`/api/crm/pipelines/${selectedPipeline}/conversion`),
      ]);

      // Process stage distribution data
      const stats = statsRes.data;
      if (stats.dealsByStage) {
        const stageChartData = stats.dealsByStage.map((item: any) => ({
          name: item.stageName,
          value: item.count,
          totalValue: item.totalValue,
        }));
        setStageData(stageChartData);
      }

      // Process forecast data (mock for now - implement with real API)
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
      const forecastChartData = months.map((month, index) => ({
        month,
        expected: Math.random() * 100000 + 50000,
        actual: index < 3 ? Math.random() * 100000 + 40000 : 0,
      }));
      setForecastData(forecastChartData);

      // Process velocity data
      if (velocityRes.data) {
        const velocityChartData = velocityRes.data.map((item: any) => ({
          stage: item.stageName,
          avgDays: item.averageDaysInStage,
          dealCount: item.dealCount,
        }));
        setVelocityData(velocityChartData);
      }

      // Process conversion funnel data
      if (conversionRes.data) {
        const funnelData = conversionRes.data.map((item: any, index: number) => ({
          name: item.stageName,
          value: item.dealCount,
          fill: COLORS[index % COLORS.length],
        }));
        setConversionData(funnelData);
      }

      // Process win/loss data
      const winLossChartData = [
        { name: 'Ganados', value: stats.wonDeals || 0, fill: '#00C49F' },
        { name: 'Perdidos', value: stats.lostDeals || 0, fill: '#FF8042' },
        { name: 'En Proceso', value: stats.activeDeals || 0, fill: '#0088FE' },
      ];
      setWinLossData(winLossChartData);
    } catch (err: any) {
      console.error('Error loading chart data:', err);
      setError('Error al cargar datos de gráficos');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handlePipelineChange = (event: any) => {
    setSelectedPipeline(event.target.value);
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Análisis de Pipeline
        </Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Pipeline</InputLabel>
          <Select value={selectedPipeline} onChange={handlePipelineChange} label="Pipeline">
            {pipelines.map((pipeline) => (
              <MenuItem key={pipeline._id} value={pipeline._id}>
                {pipeline.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Card>
        <CardContent>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Distribución" />
            <Tab label="Pronóstico" />
            <Tab label="Velocidad" />
            <Tab label="Conversión" />
            <Tab label="Win/Loss" />
          </Tabs>

          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Stage Distribution */}
              <TabPanel value={tabValue} index={0}>
                <Typography variant="h6" gutterBottom>
                  Distribución de Negocios por Etapa
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={stageData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [`${value} negocios`, 'Cantidad']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </TabPanel>

              {/* Forecast */}
              <TabPanel value={tabValue} index={1}>
                <Typography variant="h6" gutterBottom>
                  Pronóstico de Ingresos
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={forecastData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="expected" fill="#0088FE" name="Esperado" />
                    <Bar dataKey="actual" fill="#00C49F" name="Real" />
                  </BarChart>
                </ResponsiveContainer>
              </TabPanel>

              {/* Velocity */}
              <TabPanel value={tabValue} index={2}>
                <Typography variant="h6" gutterBottom>
                  Velocidad de Pipeline (Días Promedio por Etapa)
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={velocityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avgDays"
                      stroke="#8884d8"
                      strokeWidth={2}
                      name="Días Promedio"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabPanel>

              {/* Conversion Funnel */}
              <TabPanel value={tabValue} index={3}>
                <Typography variant="h6" gutterBottom>
                  Embudo de Conversión
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <FunnelChart>
                    <Tooltip />
                    <Funnel dataKey="value" data={conversionData} isAnimationActive>
                      <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </TabPanel>

              {/* Win/Loss */}
              <TabPanel value={tabValue} index={4}>
                <Typography variant="h6" gutterBottom>
                  Análisis Win/Loss
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={winLossData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {winLossData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box display="flex" flexDirection="column" gap={2} mt={4}>
                      {winLossData.map((item) => (
                        <Card key={item.name} variant="outlined">
                          <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="h6">{item.name}</Typography>
                              <Typography variant="h4" fontWeight="bold" color={item.fill}>
                                {item.value}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  </Grid>
                </Grid>
              </TabPanel>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default PipelineCharts;
