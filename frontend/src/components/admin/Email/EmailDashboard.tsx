/**
 * Email Dashboard Component
 * 
 * Comprehensive email management and analytics dashboard
 * 
 * Features:
 * - Real-time email metrics
 * - Email list with filtering
 * - SLA monitoring
 * - Sentiment distribution
 * - Category/intent analytics
 * - Quick actions (classify, assign, respond)
 * 
 * Author: Spirit Tours Development Team
 * Created: 2025-10-04
 * Phase: 1 - Email Foundation
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Tooltip,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
  LinearProgress,
} from '@mui/material';
import {
  Email,
  TrendingUp,
  CheckCircle,
  AccessTime,
  Warning,
  Psychology,
  Refresh,
  FilterList,
  Assignment,
  Send,
  Inbox,
  PriorityHigh,
  ThumbUp,
  ThumbDown,
  SentimentNeutral,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import emailApi, {
  EmailMessage,
  EmailCategory,
  EmailPriority,
  EmailStatus,
  getCategoryLabel,
  getIntentLabel,
  getPriorityColor,
  getStatusColor,
  formatResponseTime,
} from '../../../api/emailApi';

// Chart colors
const CHART_COLORS = {
  positive: '#4CAF50',
  negative: '#F44336',
  neutral: '#FFC107',
  urgent: '#FF4842',
  high: '#FF9800',
  normal: '#4CAF50',
  low: '#2196F3',
};

const EmailDashboard: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<EmailCategory | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<EmailStatus | ''>('');
  const [selectedPriority, setSelectedPriority] = useState<EmailPriority | ''>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const queryClient = useQueryClient();

  // Fetch dashboard data
  const { data: dashboard, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['email-dashboard'],
    queryFn: () => emailApi.getDashboard(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch email list
  const { data: emailList, isLoading: emailsLoading, refetch: refetchEmails } = useQuery({
    queryKey: ['emails', selectedCategory, selectedStatus, selectedPriority, page, rowsPerPage],
    queryFn: () => emailApi.listEmails({
      category: selectedCategory || undefined,
      status: selectedStatus || undefined,
      priority: selectedPriority || undefined,
      limit: rowsPerPage,
      offset: page * rowsPerPage,
    }),
  });

  // Classify email mutation
  const classifyMutation = useMutation({
    mutationFn: (emailId: string) => emailApi.classifyEmail(emailId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-dashboard'] });
    },
  });

  const handleRefresh = () => {
    refetchDashboard();
    refetchEmails();
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleClassifyEmail = (emailId: string) => {
    classifyMutation.mutate(emailId);
  };

  // Prepare chart data
  const sentimentChartData = dashboard ? [
    { name: 'Positive', value: dashboard.sentiment_distribution.positive || 0, color: CHART_COLORS.positive },
    { name: 'Negative', value: dashboard.sentiment_distribution.negative || 0, color: CHART_COLORS.negative },
    { name: 'Neutral', value: dashboard.sentiment_distribution.neutral || 0, color: CHART_COLORS.neutral },
  ].filter(item => item.value > 0) : [];

  const priorityChartData = dashboard ? Object.entries(dashboard.priority_distribution).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: value,
    color: getPriorityColor(key as EmailPriority),
  })) : [];

  if (dashboardLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight="bold">
          📧 Email Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Received Today
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {dashboard?.total_received_today || 0}
                  </Typography>
                </Box>
                <Inbox sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Pending Response
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="warning.main">
                    {dashboard?.total_pending_response || 0}
                  </Typography>
                </Box>
                <AccessTime sx={{ fontSize: 48, color: 'warning.main', opacity: 0.3 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Urgent Emails
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="error.main">
                    {dashboard?.total_urgent || 0}
                  </Typography>
                </Box>
                <PriorityHigh sx={{ fontSize: 48, color: 'error.main', opacity: 0.3 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Avg Response Time
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {formatResponseTime(dashboard?.avg_response_time_minutes || 0)}
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* SLA Compliance */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            SLA Compliance
          </Typography>
          <Box mt={2}>
            <Stack direction="row" justifyContent="space-between" mb={1}>
              <Typography variant="body2">
                {dashboard?.within_sla || 0} within SLA · {dashboard?.breached_sla || 0} breached
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {dashboard?.sla_compliance_rate?.toFixed(1) || 0}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={dashboard?.sla_compliance_rate || 0}
              sx={{
                height: 10,
                borderRadius: 5,
                backgroundColor: 'error.light',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: dashboard && dashboard.sla_compliance_rate >= 80 ? 'success.main' : 
                                  dashboard && dashboard.sla_compliance_rate >= 60 ? 'warning.main' : 'error.main',
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Charts */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sentiment Distribution
              </Typography>
              {sentimentChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sentimentChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sentimentChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                  <Typography color="text.secondary">No data available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Priority Distribution
              </Typography>
              {priorityChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={priorityChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8">
                      {priorityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                  <Typography color="text.secondary">No data available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Email List */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              Email List
            </Typography>
            <Stack direction="row" spacing={2}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCategory}
                  label="Category"
                  onChange={(e) => setSelectedCategory(e.target.value as EmailCategory)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="sales">Sales</MenuItem>
                  <MenuItem value="support">Support</MenuItem>
                  <MenuItem value="reservations">Reservations</MenuItem>
                  <MenuItem value="pilgrimages">Pilgrimages</MenuItem>
                  <MenuItem value="b2b">B2B</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={selectedPriority}
                  label="Priority"
                  onChange={(e) => setSelectedPriority(e.target.value as EmailPriority)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={selectedStatus}
                  label="Status"
                  onChange={(e) => setSelectedStatus(e.target.value as EmailStatus)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="received">Received</MenuItem>
                  <MenuItem value="classified">Classified</MenuItem>
                  <MenuItem value="assigned">Assigned</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="responded">Responded</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Box>

          {emailsLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>From</TableCell>
                      <TableCell>Subject</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Sentiment</TableCell>
                      <TableCell>Received</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {emailList?.emails.map((email) => (
                      <TableRow key={email.id} hover>
                        <TableCell>
                          <Stack>
                            <Typography variant="body2" fontWeight={email.is_read ? 'normal' : 'bold'}>
                              {email.from_name || email.from_email}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {email.from_email}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={email.is_read ? 'normal' : 'bold'}>
                            {email.subject}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {email.category && (
                            <Chip
                              label={getCategoryLabel(email.category)}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={email.priority}
                            size="small"
                            sx={{
                              backgroundColor: getPriorityColor(email.priority),
                              color: 'white',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={email.status.replace('_', ' ')}
                            size="small"
                            sx={{
                              backgroundColor: getStatusColor(email.status),
                              color: 'white',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {email.sentiment && (
                            <Tooltip title={`Score: ${email.sentiment_score?.toFixed(2) || 'N/A'}`}>
                              <Chip
                                icon={
                                  email.sentiment === 'positive' ? <ThumbUp fontSize="small" /> :
                                  email.sentiment === 'negative' ? <ThumbDown fontSize="small" /> :
                                  <SentimentNeutral fontSize="small" />
                                }
                                label={email.sentiment}
                                size="small"
                                color={
                                  email.sentiment === 'positive' ? 'success' :
                                  email.sentiment === 'negative' ? 'error' : 'default'
                                }
                              />
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {format(new Date(email.received_at), 'MMM dd, HH:mm')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="Classify">
                              <IconButton
                                size="small"
                                onClick={() => handleClassifyEmail(email.id)}
                                disabled={classifyMutation.isPending}
                              >
                                <Psychology fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[10, 25, 50]}
                component="div"
                count={emailList?.total || 0}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
              />
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default EmailDashboard;
