/**
 * AI Provider Management Panel - SPRINT 8
 * 
 * Admin interface for managing AI providers and configurations
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  Button,
  TextField,
  Chip,
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
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Speed,
  AttachMoney,
  CheckCircle,
  Error,
  Refresh,
  Compare,
  Assessment,
  Settings,
  Info,
} from '@mui/icons-material';
import axios from 'axios';

interface AIProviderPanelProps {
  workspaceId: string;
}

const AIProviderPanel: React.FC<AIProviderPanelProps> = ({ workspaceId }) => {
  const [providers, setProviders] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [comparePrompt, setComparePrompt] = useState('');
  const [compareResults, setCompareResults] = useState<any>(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [workspaceId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [providersRes, configRes, usageRes] = await Promise.all([
        axios.get('/api/ai/providers'),
        axios.get(`/api/ai/providers/config/${workspaceId}`),
        axios.get('/api/ai/providers/usage'),
      ]);

      setProviders(providersRes.data.data);
      setConfig(configRes.data.data);
      setUsage(usageRes.data.data);
    } catch (error) {
      console.error('Error fetching AI provider data:', error);
    } finally {
      setLoading(false);
    }
  }

;

  const updateConfig = async (updates: any) => {
    try {
      await axios.put(`/api/ai/providers/config/${workspaceId}`, updates);
      await fetchData();
    } catch (error) {
      console.error('Error updating config:', error);
    }
  };

  const handleStrategyChange = (strategy: string) => {
    updateConfig({ defaultStrategy: strategy });
  };

  const handleFeatureToggle = (feature: string, enabled: boolean) => {
    updateConfig({
      features: {
        ...config.features,
        [feature]: enabled,
      },
    });
  };

  const handleBudgetUpdate = (field: string, value: number) => {
    updateConfig({
      budgetControls: {
        ...config.budgetControls,
        [field]: value,
      },
    });
  };

  const handleCompare = async () => {
    try {
      setComparing(true);
      const response = await axios.post('/api/ai/providers/compare', {
        prompt: comparePrompt,
        providers: providers.flatMap((p) =>
          p.models.slice(0, 1).map((m: any) => ({
            provider: p.provider,
            model: m.name,
          }))
        ),
      });
      setCompareResults(response.data.data);
    } catch (error) {
      console.error('Error comparing providers:', error);
    } finally {
      setComparing(false);
    }
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 95) return 'success';
    if (quality >= 85) return 'primary';
    if (quality >= 75) return 'warning';
    return 'error';
  };

  const getSpeedIcon = (speed: string) => {
    switch (speed) {
      case 'ultra-fast':
        return <Speed color="success" />;
      case 'fast':
        return <Speed color="primary" />;
      case 'medium':
        return <Speed color="warning" />;
      default:
        return <Speed />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
    }).format(value);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading AI providers...</Typography>
      </Box>
    );
  }

  if (!config) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        Failed to load AI configuration
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            🤖 AI Provider Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure and monitor 10+ AI providers with dynamic selection
          </Typography>
        </Box>

        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Compare />}
            onClick={() => setCompareDialogOpen(true)}
          >
            Compare Providers
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchData}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Budget Alert */}
      {config.budgetControls.currentDailySpend >
        (config.budgetControls.dailyLimit * config.budgetControls.alertThreshold) / 100 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Daily budget alert: {Math.round((config.budgetControls.currentDailySpend / config.budgetControls.dailyLimit) * 100)}% of daily limit used
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)} sx={{ mb: 3 }}>
        <Tab label="Providers & Models" />
        <Tab label="Configuration" />
        <Tab label="Usage & Analytics" />
        <Tab label="Budget Controls" />
      </Tabs>

      {/* Tab 1: Providers & Models */}
      {selectedTab === 0 && (
        <Grid container spacing={3}>
          {providers.map((provider) => (
            <Grid item xs={12} key={provider.provider}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      {provider.provider.toUpperCase()}
                    </Typography>
                    <Chip
                      label={`${provider.models.length} models`}
                      color="primary"
                      size="small"
                    />
                  </Box>

                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Model</TableCell>
                          <TableCell>Context Window</TableCell>
                          <TableCell>Quality</TableCell>
                          <TableCell>Speed</TableCell>
                          <TableCell>Cost (Input)</TableCell>
                          <TableCell>Cost (Output)</TableCell>
                          <TableCell>Capabilities</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {provider.models.map((model: any) => (
                          <TableRow key={model.name}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {model.displayName || model.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {model.contextWindow.toLocaleString()} tokens
                            </TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Chip
                                  label={model.quality}
                                  color={getQualityColor(model.quality)}
                                  size="small"
                                />
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                {getSpeedIcon(model.speed)}
                                <Typography variant="caption">
                                  {model.speed}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              {formatCurrency(model.costPer1kTokens.input)}/1k
                            </TableCell>
                            <TableCell>
                              {formatCurrency(model.costPer1kTokens.output)}/1k
                            </TableCell>
                            <TableCell>
                              <Box display="flex" flexWrap="wrap" gap={0.5}>
                                {model.capabilities.map((cap: string) => (
                                  <Chip
                                    key={cap}
                                    label={cap}
                                    size="small"
                                    variant="outlined"
                                  />
                                ))}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tab 2: Configuration */}
      {selectedTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Selection Strategy
                </Typography>
                <Select
                  fullWidth
                  value={config.defaultStrategy}
                  onChange={(e) => handleStrategyChange(e.target.value)}
                >
                  <MenuItem value="auto">Auto (Balanced)</MenuItem>
                  <MenuItem value="cost-optimized">Cost Optimized</MenuItem>
                  <MenuItem value="quality-optimized">Quality Optimized</MenuItem>
                  <MenuItem value="speed-optimized">Speed Optimized</MenuItem>
                  <MenuItem value="custom">Custom Rules</MenuItem>
                </Select>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Auto mode balances quality, cost, and speed for optimal performance
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Features
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.features.fallbackEnabled}
                      onChange={(e) =>
                        handleFeatureToggle('fallbackEnabled', e.target.checked)
                      }
                    />
                  }
                  label="Fallback to alternative providers on failure"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.features.cacheEnabled}
                      onChange={(e) =>
                        handleFeatureToggle('cacheEnabled', e.target.checked)
                      }
                    />
                  }
                  label="Cache responses (1 hour TTL)"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.features.loadBalancingEnabled}
                      onChange={(e) =>
                        handleFeatureToggle('loadBalancingEnabled', e.target.checked)
                      }
                    />
                  }
                  label="Load balancing across providers"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.features.autoOptimization}
                      onChange={(e) =>
                        handleFeatureToggle('autoOptimization', e.target.checked)
                      }
                    />
                  }
                  label="Automatic cost optimization"
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Model Preferences by Use Case
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Configure which models to use for specific tasks
                </Typography>
                <Grid container spacing={2}>
                  {['chat', 'analysis', 'coding', 'reasoning', 'vision'].map((useCase) => (
                    <Grid item xs={12} md={6} key={useCase}>
                      <Typography variant="subtitle2" gutterBottom>
                        {useCase.charAt(0).toUpperCase() + useCase.slice(1)}
                      </Typography>
                      <Select
                        fullWidth
                        size="small"
                        value={config.modelPreferences?.[useCase]?.model || ''}
                        displayEmpty
                      >
                        <MenuItem value="">Auto Select</MenuItem>
                        {providers.flatMap((p) =>
                          p.models
                            .filter((m: any) => m.capabilities.includes(useCase))
                            .map((m: any) => (
                              <MenuItem key={`${p.provider}-${m.name}`} value={m.name}>
                                {p.provider.toUpperCase()}: {m.displayName || m.name}
                              </MenuItem>
                            ))
                        )}
                      </Select>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 3: Usage & Analytics */}
      {selectedTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Total Requests
                </Typography>
                <Typography variant="h3">
                  {usage?.totalRequests.toLocaleString() || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  All time
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Total Cost
                </Typography>
                <Typography variant="h3">
                  ${usage?.totalCost.toFixed(2) || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  All time
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Avg Cost/Request
                </Typography>
                <Typography variant="h3">
                  ${usage?.averageCostPerRequest?.toFixed(4) || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Per completion
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Cache Hit Rate
                </Typography>
                <Typography variant="h3">
                  N/A
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Coming soon
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Usage by Provider
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Provider</TableCell>
                        <TableCell align="right">Requests</TableCell>
                        <TableCell align="right">Cost</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(usage?.byProvider || {}).map(([provider, stats]: [string, any]) => (
                        <TableRow key={provider}>
                          <TableCell>{provider.toUpperCase()}</TableCell>
                          <TableCell align="right">{stats.requests}</TableCell>
                          <TableCell align="right">${stats.cost.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Usage by Model
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Model</TableCell>
                        <TableCell align="right">Requests</TableCell>
                        <TableCell align="right">Cost</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(usage?.byModel || {}).map(([model, stats]: [string, any]) => (
                        <TableRow key={model}>
                          <TableCell>{model}</TableCell>
                          <TableCell align="right">{stats.requests}</TableCell>
                          <TableCell align="right">${stats.cost.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 4: Budget Controls */}
      {selectedTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Daily Budget
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  label="Daily Limit (USD)"
                  value={config.budgetControls.dailyLimit}
                  onChange={(e) =>
                    handleBudgetUpdate('dailyLimit', parseFloat(e.target.value))
                  }
                  sx={{ mb: 2 }}
                />
                <LinearProgress
                  variant="determinate"
                  value={Math.min(
                    (config.budgetControls.currentDailySpend /
                      config.budgetControls.dailyLimit) *
                      100,
                    100
                  )}
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  ${config.budgetControls.currentDailySpend.toFixed(2)} / $
                  {config.budgetControls.dailyLimit.toFixed(2)} used today
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Monthly Budget
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  label="Monthly Limit (USD)"
                  value={config.budgetControls.monthlyLimit}
                  onChange={(e) =>
                    handleBudgetUpdate('monthlyLimit', parseFloat(e.target.value))
                  }
                  sx={{ mb: 2 }}
                />
                <LinearProgress
                  variant="determinate"
                  value={Math.min(
                    (config.budgetControls.currentMonthlySpend /
                      config.budgetControls.monthlyLimit) *
                      100,
                    100
                  )}
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  ${config.budgetControls.currentMonthlySpend.toFixed(2)} / $
                  {config.budgetControls.monthlyLimit.toFixed(2)} used this month
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Alert Threshold
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  label="Alert at percentage (%)"
                  value={config.budgetControls.alertThreshold}
                  onChange={(e) =>
                    handleBudgetUpdate('alertThreshold', parseFloat(e.target.value))
                  }
                  helperText="Receive alerts when budget usage reaches this percentage"
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Compare Dialog */}
      <Dialog
        open={compareDialogOpen}
        onClose={() => setCompareDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Compare AI Providers</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Enter prompt to compare"
            value={comparePrompt}
            onChange={(e) => setComparePrompt(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
          />

          {comparing && <LinearProgress sx={{ mb: 2 }} />}

          {compareResults && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Provider</TableCell>
                    <TableCell>Model</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Response Preview</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {compareResults.responses.map((result: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{result.provider.toUpperCase()}</TableCell>
                      <TableCell>{result.model}</TableCell>
                      <TableCell>
                        {result.success ? (
                          <CheckCircle color="success" />
                        ) : (
                          <Error color="error" />
                        )}
                      </TableCell>
                      <TableCell>
                        {result.success
                          ? result.response.text.substring(0, 100) + '...'
                          : result.error}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareDialogOpen(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={handleCompare}
            disabled={!comparePrompt || comparing}
          >
            Compare
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIProviderPanel;
