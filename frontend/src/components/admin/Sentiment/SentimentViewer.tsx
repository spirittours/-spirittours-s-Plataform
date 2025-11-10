/**
 * Sentiment Viewer Component
 * 
 * View and manage sentiment analysis for social media interactions
 * 
 * Features:
 * - View analyzed comments and messages
 * - Filter by sentiment (positive/negative/neutral)
 * - Filter by intent (query/complaint/praise/purchase)
 * - Filter by platform
 * - View auto-response suggestions
 * - Sentiment trends visualization
 * - Intent distribution chart
 * - Real-time analysis
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
} from '@mui/material';
import {
  SentimentVerySatisfied,
  SentimentDissatisfied,
  SentimentNeutral,
  Psychology,
  TrendingUp,
  FilterList,
  Refresh,
  Analytics,
  QuestionAnswer,
  Warning,
  ThumbUp,
  ShoppingCart,
} from '@mui/icons-material';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import * as sentimentApi from '../../../api/sentimentApi';

// Chart colors
const COLORS = {
  positive: '#00C49F',
  negative: '#FF8042',
  neutral: '#FFBB28',
  query: '#0088FE',
  complaint: '#FF6B6B',
  praise: '#51CF66',
  purchase_intent: '#845EC2',
};

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
      id={`sentiment-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const SentimentViewer: React.FC = () => {
  // Tab state
  const [currentTab, setCurrentTab] = useState(0);

  // Analyze form state
  const [analyzeText, setAnalyzeText] = useState('');
  const [analyzePlatform, setAnalyzePlatform] = useState('instagram');
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Batch analyze state
  const [batchTexts, setBatchTexts] = useState('');

  // Summary filters
  const [summaryPlatform, setSummaryPlatform] = useState('');
  const [summaryDays, setSummaryDays] = useState(30);

  // Response dialog
  const [responseDialog, setResponseDialog] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<any>(null);

  // Fetch summary
  const { data: summary, isLoading: loadingSummary, refetch } = useQuery({
    queryKey: ['sentiment-summary', summaryPlatform, summaryDays],
    queryFn: () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - summaryDays);

      return sentimentApi.getSentimentSummary({
        platform: summaryPlatform || undefined,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });
    },
  });

  // Fetch intents
  const { data: intentsData } = useQuery({
    queryKey: ['sentiment-intents'],
    queryFn: sentimentApi.getIntents,
  });

  // Fetch templates
  const { data: templatesData } = useQuery({
    queryKey: ['response-templates'],
    queryFn: sentimentApi.getResponseTemplates,
  });

  // Analyze text mutation
  const analyzeMutation = useMutation({
    mutationFn: sentimentApi.analyzeText,
    onSuccess: (data) => {
      setAnalysisResult(data);
    },
    onError: (error: any) => {
      alert(`Error: ${error.response?.data?.detail || 'Analysis failed'}`);
    },
  });

  // Batch analyze mutation
  const batchAnalyzeMutation = useMutation({
    mutationFn: sentimentApi.batchAnalyze,
    onSuccess: (data) => {
      alert(`Analyzed ${data.total_analyzed} texts successfully!`);
    },
    onError: (error: any) => {
      alert(`Error: ${error.response?.data?.detail || 'Batch analysis failed'}`);
    },
  });

  // Handle analyze
  const handleAnalyze = () => {
    if (!analyzeText.trim()) {
      alert('Please enter text to analyze');
      return;
    }

    analyzeMutation.mutate({
      text: analyzeText,
      platform: analyzePlatform,
    });
  };

  // Handle batch analyze
  const handleBatchAnalyze = () => {
    if (!batchTexts.trim()) {
      alert('Please enter texts to analyze (one per line)');
      return;
    }

    const lines = batchTexts.split('\n').filter((line) => line.trim());
    const texts = lines.map((text) => ({
      text: text.trim(),
      platform: analyzePlatform,
    }));

    if (texts.length > 100) {
      alert('Maximum 100 texts per batch');
      return;
    }

    batchAnalyzeMutation.mutate({ texts });
  };

  // Get sentiment icon
  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <SentimentVerySatisfied sx={{ color: COLORS.positive }} />;
      case 'negative':
        return <SentimentDissatisfied sx={{ color: COLORS.negative }} />;
      case 'neutral':
        return <SentimentNeutral sx={{ color: COLORS.neutral }} />;
      default:
        return <SentimentNeutral />;
    }
  };

  // Get intent icon
  const getIntentIcon = (intent: string) => {
    switch (intent) {
      case 'query':
        return <QuestionAnswer sx={{ color: COLORS.query }} />;
      case 'complaint':
        return <Warning sx={{ color: COLORS.complaint }} />;
      case 'praise':
        return <ThumbUp sx={{ color: COLORS.praise }} />;
      case 'purchase_intent':
        return <ShoppingCart sx={{ color: COLORS.purchase_intent }} />;
      default:
        return <Psychology />;
    }
  };

  // Prepare sentiment pie chart data
  const sentimentChartData = summary
    ? [
        {
          name: 'Positive',
          value: summary.sentiment_breakdown.positive,
          color: COLORS.positive,
        },
        {
          name: 'Negative',
          value: summary.sentiment_breakdown.negative,
          color: COLORS.negative,
        },
        {
          name: 'Neutral',
          value: summary.sentiment_breakdown.neutral,
          color: COLORS.neutral,
        },
      ]
    : [];

  // Prepare intent bar chart data
  const intentChartData = summary
    ? Object.entries(summary.intent_breakdown || {}).map(([intent, count]) => ({
        intent: intent.replace('_', ' '),
        count,
      }))
    : [];

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
              <Psychology sx={{ mr: 1, verticalAlign: 'middle' }} />
              Sentiment Analysis
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Analyze customer sentiment and intent to improve engagement
            </Typography>
          </Box>

          <Tooltip title="Refresh">
            <IconButton onClick={() => refetch()}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)}>
            <Tab icon={<Psychology />} label="Analyze Text" iconPosition="start" />
            <Tab icon={<FilterList />} label="Batch Analyze" iconPosition="start" />
            <Tab icon={<Analytics />} label="Summary & Trends" iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Tab 1: Analyze Text */}
        <TabPanel value={currentTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Analyze Single Text
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Platform</InputLabel>
                    <Select
                      value={analyzePlatform}
                      onChange={(e) => setAnalyzePlatform(e.target.value)}
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

                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label="Text to Analyze"
                    value={analyzeText}
                    onChange={(e) => setAnalyzeText(e.target.value)}
                    placeholder="Enter comment or message to analyze..."
                    helperText={`${analyzeText.length} characters`}
                  />

                  <Button
                    variant="contained"
                    size="medium"
                    startIcon={<Psychology />}
                    onClick={handleAnalyze}
                    disabled={analyzeMutation.isPending}
                    fullWidth
                  >
                    {analyzeMutation.isPending ? 'Analyzing...' : 'Analyze Sentiment'}
                  </Button>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              {analysisResult ? (
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Analysis Results
                  </Typography>
                  <Divider sx={{ mb: 3 }} />

                  <Stack spacing={2}>
                    {/* Sentiment */}
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          {getSentimentIcon(analysisResult.sentiment)}
                          <Box>
                            <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                              {analysisResult.sentiment}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Sentiment
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Chip
                            label={`Score: ${analysisResult.sentiment_score.toFixed(2)}`}
                            size="small"
                          />
                          <Chip
                            label={`Confidence: ${(analysisResult.confidence * 100).toFixed(0)}%`}
                            size="small"
                            color="primary"
                          />
                        </Box>
                      </CardContent>
                    </Card>

                    {/* Intent */}
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          {getIntentIcon(analysisResult.intent)}
                          <Box>
                            <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                              {analysisResult.intent.replace('_', ' ')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Intent
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={`Confidence: ${(analysisResult.intent_confidence * 100).toFixed(0)}%`}
                          size="small"
                          color="secondary"
                        />
                      </CardContent>
                    </Card>

                    {/* Keywords */}
                    {analysisResult.keywords && analysisResult.keywords.length > 0 && (
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" gutterBottom>
                            Keywords Detected
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {analysisResult.keywords.map((keyword: string, idx: number) => (
                              <Chip key={idx} label={keyword} size="small" variant="outlined" />
                            ))}
                          </Box>
                        </CardContent>
                      </Card>
                    )}

                    {/* Auto Response */}
                    {analysisResult.auto_response && (
                      <Card variant="outlined" sx={{ bgcolor: 'primary.light' }}>
                        <CardContent>
                          <Typography variant="subtitle2" gutterBottom>
                            🤖 Suggested Auto-Response
                          </Typography>
                          <Typography variant="body2">{analysisResult.auto_response}</Typography>
                        </CardContent>
                        <CardActions>
                          <Button
                            size="small"
                            onClick={() => {
                              setSelectedResponse(analysisResult);
                              setResponseDialog(true);
                            }}
                          >
                            Review Response
                          </Button>
                        </CardActions>
                      </Card>
                    )}

                    {/* Requires Response Badge */}
                    {analysisResult.requires_response && (
                      <Alert severity="warning" icon={<Warning />}>
                        <AlertTitle>Response Recommended</AlertTitle>
                        This interaction requires human attention and response.
                      </Alert>
                    )}

                    {/* Analysis Time */}
                    <Typography variant="caption" color="text.secondary">
                      Analysis completed in {analysisResult.analysis_time_ms}ms
                    </Typography>
                  </Stack>
                </Paper>
              ) : (
                <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
                  <Typography color="text.secondary">
                    Enter text and click "Analyze Sentiment" to see results
                  </Typography>
                </Paper>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 2: Batch Analyze */}
        <TabPanel value={currentTab} index={1}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Batch Analyze (Up to 100 texts)
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={15}
                  label="Texts to Analyze (one per line)"
                  value={batchTexts}
                  onChange={(e) => setBatchTexts(e.target.value)}
                  placeholder="Enter each text on a new line..."
                  helperText={`${batchTexts.split('\n').filter((l) => l.trim()).length} texts entered`}
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  size="medium"
                  startIcon={<FilterList />}
                  onClick={handleBatchAnalyze}
                  disabled={batchAnalyzeMutation.isPending}
                >
                  {batchAnalyzeMutation.isPending ? 'Analyzing...' : 'Batch Analyze'}
                </Button>
              </Grid>

              {batchAnalyzeMutation.data && (
                <Grid item xs={12}>
                  <Alert severity="success">
                    <AlertTitle>Batch Analysis Complete</AlertTitle>
                    <Typography variant="body2">
                      Analyzed {batchAnalyzeMutation.data.total_analyzed} texts:
                    </Typography>
                    <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                      <Chip
                        icon={<SentimentVerySatisfied />}
                        label={`Positive: ${batchAnalyzeMutation.data.statistics.positive}`}
                        color="success"
                      />
                      <Chip
                        icon={<SentimentDissatisfied />}
                        label={`Negative: ${batchAnalyzeMutation.data.statistics.negative}`}
                        color="error"
                      />
                      <Chip
                        icon={<SentimentNeutral />}
                        label={`Neutral: ${batchAnalyzeMutation.data.statistics.neutral}`}
                        color="default"
                      />
                    </Box>
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Paper>
        </TabPanel>

        {/* Tab 3: Summary & Trends */}
        <TabPanel value={currentTab} index={2}>
          {/* Filters */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Platform</InputLabel>
                  <Select
                    value={summaryPlatform}
                    onChange={(e) => setSummaryPlatform(e.target.value)}
                    label="Platform"
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
                  <InputLabel>Time Period</InputLabel>
                  <Select
                    value={summaryDays}
                    onChange={(e) => setSummaryDays(Number(e.target.value))}
                    label="Time Period"
                  >
                    <MenuItem value={7}>Last 7 Days</MenuItem>
                    <MenuItem value={30}>Last 30 Days</MenuItem>
                    <MenuItem value={90}>Last 90 Days</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {loadingSummary ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
              <CircularProgress size={60} />
            </Box>
          ) : summary ? (
            <>
              {/* Summary Cards */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" variant="body2" gutterBottom>
                        Total Interactions
                      </Typography>
                      <Typography variant="h4">{summary.total_interactions}</Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" variant="body2" gutterBottom>
                        Positive
                      </Typography>
                      <Typography variant="h4" sx={{ color: COLORS.positive }}>
                        {summary.sentiment_breakdown.positive_percentage.toFixed(1)}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" variant="body2" gutterBottom>
                        Negative
                      </Typography>
                      <Typography variant="h4" sx={{ color: COLORS.negative }}>
                        {summary.sentiment_breakdown.negative_percentage.toFixed(1)}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" variant="body2" gutterBottom>
                        Avg. Score
                      </Typography>
                      <Typography variant="h4">{summary.average_sentiment_score.toFixed(2)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Charts */}
              <Grid container spacing={3}>
                {/* Sentiment Distribution */}
                <Grid item xs={12} lg={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Sentiment Distribution
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={sentimentChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={80}
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
                  </Paper>
                </Grid>

                {/* Intent Breakdown */}
                <Grid item xs={12} lg={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Intent Breakdown
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={intentChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="intent" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="count" fill={COLORS.query} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>

                {/* Requires Response */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Interactions Requiring Response
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                      <Badge badgeContent={summary.requires_response_count} color="error" max={999}>
                        <Warning sx={{ fontSize: 48, color: 'warning.main' }} />
                      </Badge>
                      <Box>
                        <Typography variant="h4">{summary.requires_response_count}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          interactions need attention
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </>
          ) : (
            <Alert severity="info">No sentiment data available for the selected filters</Alert>
          )}
        </TabPanel>

        {/* Response Dialog */}
        <Dialog open={responseDialog} onClose={() => setResponseDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Review Auto-Response</DialogTitle>
          <DialogContent>
            {selectedResponse && (
              <Stack spacing={2}>
                <Alert severity="info">
                  <AlertTitle>Original Text</AlertTitle>
                  <Typography variant="body2">{analyzeText}</Typography>
                </Alert>

                <Alert severity="success">
                  <AlertTitle>Suggested Response</AlertTitle>
                  <Typography variant="body2">{selectedResponse.auto_response}</Typography>
                </Alert>

                <Typography variant="caption" color="text.secondary">
                  You can approve this response or modify it before sending.
                </Typography>
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResponseDialog(false)}>Close</Button>
            <Button variant="outlined" onClick={() => setResponseDialog(false)}>
              Edit Response
            </Button>
            <Button variant="contained" onClick={() => setResponseDialog(false)}>
              Approve & Send
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default SentimentViewer;
