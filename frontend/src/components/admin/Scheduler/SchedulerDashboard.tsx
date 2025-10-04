/**
 * Scheduler Dashboard Component
 * 
 * Main interface for automated post scheduling
 * 
 * Features:
 * - Schedule posts for specific times
 * - AI-powered content generation + scheduling
 * - Bulk scheduling
 * - Calendar view of scheduled posts
 * - Reschedule and cancel functionality
 * - Optimal time suggestions
 * 
 * Author: Spirit Tours Development Team
 * Created: 2025-10-04
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Alert,
  AlertTitle,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add,
  Schedule,
  AutoAwesome,
  CalendarMonth,
  Edit,
  Delete,
  Refresh,
  TrendingUp,
  AccessTime,
  CheckCircle,
  Error,
  Pending,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import * as schedulerApi from '../../../api/schedulerApi';

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
      id={`scheduler-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const SchedulerDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  
  // Tab state
  const [currentTab, setCurrentTab] = useState(0);
  
  // Schedule form state
  const [platform, setPlatform] = useState('instagram');
  const [content, setContent] = useState('');
  const [scheduledTime, setScheduledTime] = useState<Date | null>(new Date());
  const [recurring, setRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState('');
  
  // AI schedule form state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiPlatform, setAiPlatform] = useState('instagram');
  const [aiScheduledTime, setAiScheduledTime] = useState<Date | null>(new Date());
  const [language, setLanguage] = useState('en');
  const [tone, setTone] = useState('friendly');
  
  // Filter state
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Dialog state
  const [optimalTimesDialog, setOptimalTimesDialog] = useState(false);
  const [rescheduleDialog, setRescheduleDialog] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [newScheduledTime, setNewScheduledTime] = useState<Date | null>(null);
  
  // Fetch scheduled posts
  const { data: scheduledPostsData, isLoading: loadingPosts, refetch } = useQuery({
    queryKey: ['scheduledPosts', filterPlatform, filterStatus],
    queryFn: () => schedulerApi.getScheduledPosts({
      platform: filterPlatform || undefined,
      status: filterStatus || undefined,
      limit: 100,
    }),
  });
  
  // Fetch optimal times
  const { data: optimalTimes, isLoading: loadingOptimalTimes } = useQuery({
    queryKey: ['optimalTimes', platform, scheduledTime],
    queryFn: () => schedulerApi.getOptimalTimes({
      platform,
      date: format(scheduledTime || new Date(), 'yyyy-MM-dd'),
      count: 3,
    }),
    enabled: !!scheduledTime,
  });
  
  // Schedule post mutation
  const schedulePostMutation = useMutation({
    mutationFn: schedulerApi.schedulePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledPosts'] });
      setContent('');
      alert('Post scheduled successfully!');
    },
    onError: (error: any) => {
      alert(`Error: ${error.response?.data?.detail || 'Failed to schedule post'}`);
    },
  });
  
  // Schedule with AI mutation
  const scheduleWithAIMutation = useMutation({
    mutationFn: schedulerApi.scheduleWithAI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledPosts'] });
      setAiPrompt('');
      alert('AI content scheduled successfully!');
    },
    onError: (error: any) => {
      alert(`Error: ${error.response?.data?.detail || 'Failed to schedule AI content'}`);
    },
  });
  
  // Reschedule mutation
  const rescheduleMutation = useMutation({
    mutationFn: ({ postId, newTime }: { postId: number; newTime: string }) =>
      schedulerApi.reschedulePost(postId, newTime),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledPosts'] });
      setRescheduleDialog(false);
      alert('Post rescheduled successfully!');
    },
  });
  
  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: schedulerApi.cancelPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledPosts'] });
      alert('Post cancelled successfully!');
    },
  });
  
  // Handle schedule post
  const handleSchedulePost = () => {
    if (!content || !scheduledTime) {
      alert('Please fill in all required fields');
      return;
    }
    
    schedulePostMutation.mutate({
      platform,
      content,
      scheduled_time: scheduledTime.toISOString(),
      recurring,
      recurrence_pattern: recurring ? recurrencePattern : undefined,
    });
  };
  
  // Handle schedule with AI
  const handleScheduleWithAI = () => {
    if (!aiPrompt || !aiScheduledTime) {
      alert('Please fill in all required fields');
      return;
    }
    
    scheduleWithAIMutation.mutate({
      prompt: aiPrompt,
      platform: aiPlatform,
      scheduled_time: aiScheduledTime.toISOString(),
      language,
      tone,
    });
  };
  
  // Handle reschedule
  const handleReschedule = () => {
    if (!selectedPost || !newScheduledTime) return;
    
    rescheduleMutation.mutate({
      postId: selectedPost.id,
      newTime: newScheduledTime.toISOString(),
    });
  };
  
  // Handle cancel
  const handleCancel = (postId: number) => {
    if (window.confirm('Are you sure you want to cancel this scheduled post?')) {
      cancelMutation.mutate(postId);
    }
  };
  
  // Open reschedule dialog
  const openRescheduleDialog = (post: any) => {
    setSelectedPost(post);
    setNewScheduledTime(new Date(post.scheduled_time));
    setRescheduleDialog(true);
  };
  
  // Status chip color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'processing':
        return 'info';
      case 'published':
        return 'success';
      case 'failed':
        return 'error';
      case 'cancelled':
        return 'warning';
      default:
        return 'default';
    }
  };
  
  // Status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Pending />;
      case 'processing':
        return <CircularProgress size={20} />;
      case 'published':
        return <CheckCircle />;
      case 'failed':
        return <Error />;
      default:
        return <Schedule />;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
              <Schedule sx={{ mr: 1, verticalAlign: 'middle' }} />
              Automated Post Scheduler
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Schedule posts for optimal engagement times across all platforms
            </Typography>
          </Box>

          {/* Tabs */}
          <Paper sx={{ mb: 3 }}>
            <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)}>
              <Tab icon={<Add />} label="Schedule Post" iconPosition="start" />
              <Tab icon={<AutoAwesome />} label="Schedule with AI" iconPosition="start" />
              <Tab icon={<CalendarMonth />} label="Scheduled Posts" iconPosition="start" />
            </Tabs>
          </Paper>

          {/* Tab 1: Schedule Post */}
          <TabPanel value={currentTab} index={0}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Schedule a Post
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Platform</InputLabel>
                    <Select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      label="Platform"
                    >
                      <MenuItem value="facebook">Facebook</MenuItem>
                      <MenuItem value="instagram">Instagram</MenuItem>
                      <MenuItem value="twitter">Twitter</MenuItem>
                      <MenuItem value="linkedin">LinkedIn</MenuItem>
                      <MenuItem value="tiktok">TikTok</MenuItem>
                      <MenuItem value="youtube">YouTube</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <DateTimePicker
                    label="Scheduled Time"
                    value={scheduledTime}
                    onChange={(newValue) => setScheduledTime(newValue)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label="Post Content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter your post content here..."
                    helperText={`${content.length} characters`}
                  />
                </Grid>

                {/* Optimal Times Suggestion */}
                {optimalTimes && (
                  <Grid item xs={12}>
                    <Alert severity="info" icon={<TrendingUp />}>
                      <AlertTitle>Optimal Posting Times for {platform}</AlertTitle>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                        {optimalTimes.suggestions.map((time: string, idx: number) => (
                          <Chip
                            key={idx}
                            label={format(new Date(time), 'MMM dd, h:mm a')}
                            onClick={() => setScheduledTime(new Date(time))}
                            color="primary"
                            variant="outlined"
                            size="small"
                          />
                        ))}
                      </Box>
                    </Alert>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Schedule />}
                    onClick={handleSchedulePost}
                    disabled={schedulePostMutation.isPending}
                  >
                    {schedulePostMutation.isPending ? 'Scheduling...' : 'Schedule Post'}
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </TabPanel>

          {/* Tab 2: Schedule with AI */}
          <TabPanel value={currentTab} index={1}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Generate & Schedule with AI
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Platform</InputLabel>
                    <Select
                      value={aiPlatform}
                      onChange={(e) => setAiPlatform(e.target.value)}
                      label="Platform"
                    >
                      <MenuItem value="facebook">Facebook</MenuItem>
                      <MenuItem value="instagram">Instagram</MenuItem>
                      <MenuItem value="twitter">Twitter</MenuItem>
                      <MenuItem value="linkedin">LinkedIn</MenuItem>
                      <MenuItem value="tiktok">TikTok</MenuItem>
                      <MenuItem value="youtube">YouTube</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <DateTimePicker
                    label="Scheduled Time"
                    value={aiScheduledTime}
                    onChange={(newValue) => setAiScheduledTime(newValue)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Language</InputLabel>
                    <Select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      label="Language"
                    >
                      <MenuItem value="en">English</MenuItem>
                      <MenuItem value="es">Spanish</MenuItem>
                      <MenuItem value="fr">French</MenuItem>
                      <MenuItem value="de">German</MenuItem>
                      <MenuItem value="pt">Portuguese</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Tone</InputLabel>
                    <Select value={tone} onChange={(e) => setTone(e.target.value)} label="Tone">
                      <MenuItem value="professional">Professional</MenuItem>
                      <MenuItem value="friendly">Friendly</MenuItem>
                      <MenuItem value="casual">Casual</MenuItem>
                      <MenuItem value="enthusiastic">Enthusiastic</MenuItem>
                      <MenuItem value="inspirational">Inspirational</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Content Prompt"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Describe the post you want AI to generate..."
                    helperText="Be specific about the topic, key points, and desired outcome"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<AutoAwesome />}
                    onClick={handleScheduleWithAI}
                    disabled={scheduleWithAIMutation.isPending}
                  >
                    {scheduleWithAIMutation.isPending
                      ? 'Generating & Scheduling...'
                      : 'Generate & Schedule'}
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </TabPanel>

          {/* Tab 3: Scheduled Posts */}
          <TabPanel value={currentTab} index={2}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Scheduled Posts</Typography>
                <Button startIcon={<Refresh />} onClick={() => refetch()}>
                  Refresh
                </Button>
              </Box>

              {/* Filters */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Filter by Platform</InputLabel>
                    <Select
                      value={filterPlatform}
                      onChange={(e) => setFilterPlatform(e.target.value)}
                      label="Filter by Platform"
                    >
                      <MenuItem value="">All Platforms</MenuItem>
                      <MenuItem value="facebook">Facebook</MenuItem>
                      <MenuItem value="instagram">Instagram</MenuItem>
                      <MenuItem value="twitter">Twitter</MenuItem>
                      <MenuItem value="linkedin">LinkedIn</MenuItem>
                      <MenuItem value="tiktok">TikTok</MenuItem>
                      <MenuItem value="youtube">YouTube</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Filter by Status</InputLabel>
                    <Select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      label="Filter by Status"
                    >
                      <MenuItem value="">All Statuses</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="processing">Processing</MenuItem>
                      <MenuItem value="published">Published</MenuItem>
                      <MenuItem value="failed">Failed</MenuItem>
                      <MenuItem value="cancelled">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Divider sx={{ mb: 2 }} />

              {/* Posts List */}
              {loadingPosts ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : scheduledPostsData?.posts.length === 0 ? (
                <Alert severity="info">No scheduled posts found</Alert>
              ) : (
                <List>
                  {scheduledPostsData?.posts.map((post: any) => (
                    <Card key={post.id} sx={{ mb: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                          <Box>
                            <Chip
                              label={post.platform}
                              size="small"
                              color="primary"
                              sx={{ mr: 1, mb: 1 }}
                            />
                            <Chip
                              icon={getStatusIcon(post.status)}
                              label={post.status}
                              size="small"
                              color={getStatusColor(post.status)}
                            />
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            <AccessTime sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                            {format(new Date(post.scheduled_time), 'MMM dd, yyyy h:mm a')}
                          </Typography>
                        </Box>

                        <Typography variant="body1" sx={{ mb: 2 }}>
                          {post.content.length > 200
                            ? `${post.content.substring(0, 200)}...`
                            : post.content}
                        </Typography>

                        {post.error_message && (
                          <Alert severity="error" sx={{ mb: 2 }}>
                            {post.error_message}
                          </Alert>
                        )}
                      </CardContent>

                      <CardActions>
                        {post.status === 'pending' && (
                          <>
                            <Button
                              size="small"
                              startIcon={<Edit />}
                              onClick={() => openRescheduleDialog(post)}
                            >
                              Reschedule
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              startIcon={<Delete />}
                              onClick={() => handleCancel(post.id)}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                      </CardActions>
                    </Card>
                  ))}
                </List>
              )}
            </Paper>
          </TabPanel>

          {/* Reschedule Dialog */}
          <Dialog open={rescheduleDialog} onClose={() => setRescheduleDialog(false)}>
            <DialogTitle>Reschedule Post</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <DateTimePicker
                  label="New Scheduled Time"
                  value={newScheduledTime}
                  onChange={(newValue) => setNewScheduledTime(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRescheduleDialog(false)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleReschedule}
                disabled={rescheduleMutation.isPending}
              >
                {rescheduleMutation.isPending ? 'Rescheduling...' : 'Reschedule'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Container>
    </LocalizationProvider>
  );
};

export default SchedulerDashboard;
