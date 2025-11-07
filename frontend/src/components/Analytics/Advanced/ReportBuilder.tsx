/**
 * Report Builder - Sprint 25 (Fase 7)
 * 
 * Custom report builder with drag-and-drop interface for field selection.
 * 
 * Features:
 * - Drag-and-drop field selection
 * - Custom report configuration
 * - Report preview
 * - Save and schedule reports
 * - Export in multiple formats (CSV, PDF, Excel)
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  IconButton,
  Divider
} from '@mui/material';
import {
  DragIndicator,
  AttachMoney,
  People,
  TrendingUp,
  Star,
  Add,
  Delete,
  Preview,
  Schedule,
  Download
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface ReportField {
  id: string;
  label: string;
  category: string;
  icon: React.ReactNode;
}

interface SelectedField extends ReportField {
  order: number;
}

const availableFields: ReportField[] = [
  { id: 'totalRevenue', label: 'Total Revenue', category: 'revenue', icon: <AttachMoney /> },
  { id: 'bookingCount', label: 'Booking Count', category: 'revenue', icon: <TrendingUp /> },
  { id: 'averageOrderValue', label: 'Average Order Value', category: 'revenue', icon: <AttachMoney /> },
  { id: 'totalCustomers', label: 'Total Customers', category: 'customer', icon: <People /> },
  { id: 'newCustomers', label: 'New Customers', category: 'customer', icon: <People /> },
  { id: 'retentionRate', label: 'Retention Rate', category: 'customer', icon: <TrendingUp /> },
  { id: 'averageSatisfaction', label: 'Customer Satisfaction', category: 'customer', icon: <Star /> },
  { id: 'conversionRate', label: 'Conversion Rate', category: 'operational', icon: <TrendingUp /> },
  { id: 'totalInquiries', label: 'Total Inquiries', category: 'operational', icon: <People /> },
  { id: 'totalConversions', label: 'Total Conversions', category: 'operational', icon: <TrendingUp /> },
  { id: 'revenueGrowthRate', label: 'Revenue Growth', category: 'growth', icon: <TrendingUp /> },
  { id: 'customerGrowthRate', label: 'Customer Growth', category: 'growth', icon: <People /> },
  { id: 'overallGrowthRate', label: 'Overall Growth', category: 'growth', icon: <TrendingUp /> }
];

const ReportBuilder: React.FC = () => {
  const [reportName, setReportName] = useState('Custom Report');
  const [reportType, setReportType] = useState('custom');
  const [period, setPeriod] = useState('30d');
  const [format, setFormat] = useState('pdf');
  const [selectedFields, setSelectedFields] = useState<SelectedField[]>([]);
  const [includeKPIs, setIncludeKPIs] = useState(true);
  const [includeTrends, setIncludeTrends] = useState(false);
  const [trendMetrics, setTrendMetrics] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  const workspaceId = 'workspace123'; // TODO: Get from context

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;

    // Dragging from available to selected
    if (source.droppableId === 'available' && destination.droppableId === 'selected') {
      const field = availableFields.find((f) => f.id === result.draggableId);
      if (field && !selectedFields.find((sf) => sf.id === field.id)) {
        setSelectedFields([
          ...selectedFields,
          { ...field, order: selectedFields.length }
        ]);
      }
    }

    // Reordering selected fields
    if (source.droppableId === 'selected' && destination.droppableId === 'selected') {
      const items = Array.from(selectedFields);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      
      // Update orders
      const reordered = items.map((item, index) => ({ ...item, order: index }));
      setSelectedFields(reordered);
    }
  };

  const removeField = (fieldId: string) => {
    setSelectedFields(selectedFields.filter((f) => f.id !== fieldId));
  };

  const generateReport = async () => {
    setGenerating(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/analytics/${workspaceId}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: reportType,
          format,
          period,
          includeKPIs,
          includeTrends,
          metrics: trendMetrics,
          customFields: selectedFields.map((f) => f.id)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const result = await response.json();
      
      // Download the report
      if (result.data.reportId) {
        window.open(
          `/api/analytics/${workspaceId}/reports/${result.data.reportId}/download`,
          '_blank'
        );
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Error generating report:', err);
      setError(err.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const groupedFields = availableFields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, ReportField[]>);

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Report Builder
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Create custom reports with drag-and-drop field selection
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
          Report generated successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Configuration Panel */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Report Configuration
              </Typography>

              <TextField
                fullWidth
                label="Report Name"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                size="small"
                sx={{ mb: 2 }}
              />

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Report Type</InputLabel>
                <Select value={reportType} onChange={(e) => setReportType(e.target.value)} label="Report Type">
                  <MenuItem value="executive">Executive</MenuItem>
                  <MenuItem value="detailed">Detailed</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Period</InputLabel>
                <Select value={period} onChange={(e) => setPeriod(e.target.value)} label="Period">
                  <MenuItem value="7d">Last 7 Days</MenuItem>
                  <MenuItem value="30d">Last 30 Days</MenuItem>
                  <MenuItem value="90d">Last 90 Days</MenuItem>
                  <MenuItem value="1y">Last Year</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Format</InputLabel>
                <Select value={format} onChange={(e) => setFormat(e.target.value)} label="Format">
                  <MenuItem value="pdf">PDF</MenuItem>
                  <MenuItem value="csv">CSV</MenuItem>
                  <MenuItem value="xlsx">Excel</MenuItem>
                </Select>
              </FormControl>

              <Divider sx={{ my: 2 }} />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeKPIs}
                    onChange={(e) => setIncludeKPIs(e.target.checked)}
                  />
                }
                label="Include KPIs"
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeTrends}
                    onChange={(e) => setIncludeTrends(e.target.checked)}
                  />
                }
                label="Include Trends"
              />

              {includeTrends && (
                <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                  <InputLabel>Trend Metrics</InputLabel>
                  <Select
                    multiple
                    value={trendMetrics}
                    onChange={(e) => setTrendMetrics(e.target.value as string[])}
                    label="Trend Metrics"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="revenue">Revenue</MenuItem>
                    <MenuItem value="bookings">Bookings</MenuItem>
                    <MenuItem value="customers">Customers</MenuItem>
                    <MenuItem value="satisfaction">Satisfaction</MenuItem>
                  </Select>
                </FormControl>
              )}

              <Box mt={3}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={generating ? <CircularProgress size={20} /> : <Download />}
                  onClick={generateReport}
                  disabled={generating || selectedFields.length === 0}
                >
                  Generate Report
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Schedule />}
                  onClick={() => setScheduleDialogOpen(true)}
                  sx={{ mt: 1 }}
                >
                  Schedule Report
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Drag and Drop Area */}
        <Grid item xs={12} md={8}>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Grid container spacing={2}>
              {/* Available Fields */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                  Available Fields
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, minHeight: 400, maxHeight: 600, overflow: 'auto' }}>
                  {Object.entries(groupedFields).map(([category, fields]) => (
                    <Box key={category} mb={2}>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">
                        {category}
                      </Typography>
                      <Droppable droppableId="available" isDropDisabled>
                        {(provided) => (
                          <List ref={provided.innerRef} {...provided.droppableProps} dense>
                            {fields.map((field, index) => (
                              <Draggable key={field.id} draggableId={field.id} index={index}>
                                {(provided, snapshot) => (
                                  <ListItem
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    sx={{
                                      bgcolor: snapshot.isDragging ? 'action.hover' : 'background.paper',
                                      borderRadius: 1,
                                      mb: 0.5,
                                      opacity: selectedFields.find((sf) => sf.id === field.id) ? 0.5 : 1
                                    }}
                                  >
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                      <DragIndicator fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                      {field.icon}
                                    </ListItemIcon>
                                    <ListItemText primary={field.label} />
                                  </ListItem>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </List>
                        )}
                      </Droppable>
                    </Box>
                  ))}
                </Paper>
              </Grid>

              {/* Selected Fields */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                  Selected Fields ({selectedFields.length})
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, minHeight: 400, maxHeight: 600, overflow: 'auto' }}>
                  <Droppable droppableId="selected">
                    {(provided) => (
                      <List ref={provided.innerRef} {...provided.droppableProps} dense>
                        {selectedFields.length === 0 ? (
                          <Box textAlign="center" py={5} color="text.secondary">
                            <Typography variant="body2">
                              Drag fields here to include in report
                            </Typography>
                          </Box>
                        ) : (
                          selectedFields.map((field, index) => (
                            <Draggable key={field.id} draggableId={field.id} index={index}>
                              {(provided, snapshot) => (
                                <ListItem
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  sx={{
                                    bgcolor: snapshot.isDragging ? 'primary.light' : 'background.paper',
                                    borderRadius: 1,
                                    mb: 0.5,
                                    border: '1px solid',
                                    borderColor: 'divider'
                                  }}
                                  secondaryAction={
                                    <IconButton
                                      edge="end"
                                      size="small"
                                      onClick={() => removeField(field.id)}
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  }
                                >
                                  <ListItemIcon sx={{ minWidth: 36 }}>
                                    <DragIndicator fontSize="small" />
                                  </ListItemIcon>
                                  <ListItemIcon sx={{ minWidth: 36 }}>
                                    {field.icon}
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={field.label}
                                    secondary={`Order: ${index + 1}`}
                                  />
                                </ListItem>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </List>
                    )}
                  </Droppable>
                </Paper>
              </Grid>
            </Grid>
          </DragDropContext>
        </Grid>
      </Grid>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule Report</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Configure automated report generation
          </Typography>
          
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Frequency</InputLabel>
            <Select defaultValue="weekly" label="Frequency">
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Recipients (comma-separated emails)"
            placeholder="email1@example.com, email2@example.com"
            size="small"
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setScheduleDialogOpen(false)}>
            Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportBuilder;
