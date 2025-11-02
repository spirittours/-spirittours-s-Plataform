import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Divider,
  CircularProgress,
  Alert,
  SelectChangeEvent,
} from '@mui/material';
import {
  Download,
  PictureAsPdf,
  TableChart,
  InsertDriveFile,
  Assessment,
  CalendarToday,
  FilterList,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import toast from 'react-hot-toast';
import { ReportType, ReportConfig, ReportFormat } from '../../types/dashboard.types';
import apiClient from '../../services/apiClient';

interface ReportOption {
  type: ReportType;
  label: string;
  description: string;
  icon: React.ReactElement;
  availableFilters: string[];
}

const REPORT_OPTIONS: ReportOption[] = [
  {
    type: ReportType.REVENUE,
    label: 'Revenue Report',
    description: 'Detailed revenue analysis with trends and breakdowns',
    icon: <Assessment />,
    availableFilters: ['dateRange', 'tourCategory', 'paymentMethod'],
  },
  {
    type: ReportType.BOOKINGS,
    label: 'Bookings Report',
    description: 'Comprehensive booking statistics and patterns',
    icon: <CalendarToday />,
    availableFilters: ['dateRange', 'status', 'tourCategory', 'source'],
  },
  {
    type: ReportType.CUSTOMERS,
    label: 'Customers Report',
    description: 'Customer demographics, behavior, and segmentation',
    icon: <Assessment />,
    availableFilters: ['dateRange', 'tier', 'status', 'location'],
  },
  {
    type: ReportType.TOURS,
    label: 'Tours Report',
    description: 'Tour performance, ratings, and availability',
    icon: <Assessment />,
    availableFilters: ['dateRange', 'category', 'status', 'difficulty'],
  },
  {
    type: ReportType.PAYMENTS,
    label: 'Payments Report',
    description: 'Payment transactions, methods, and success rates',
    icon: <Assessment />,
    availableFilters: ['dateRange', 'status', 'method', 'gateway'],
  },
  {
    type: ReportType.CUSTOM,
    label: 'Custom Report',
    description: 'Build your own report with custom metrics',
    icon: <FilterList />,
    availableFilters: ['dateRange', 'metrics', 'dimensions', 'filters'],
  },
];

const FORMAT_OPTIONS = [
  { value: ReportFormat.PDF, label: 'PDF Document', icon: <PictureAsPdf /> },
  { value: ReportFormat.EXCEL, label: 'Excel Spreadsheet', icon: <TableChart /> },
  { value: ReportFormat.CSV, label: 'CSV File', icon: <InsertDriveFile /> },
];

const ReportsGenerator: React.FC = () => {
  const [selectedType, setSelectedType] = useState<ReportType>(ReportType.REVENUE);
  const [format, setFormat] = useState<ReportFormat>(ReportFormat.PDF);
  const [startDate, setStartDate] = useState<Date | null>(new Date(new Date().setMonth(new Date().getMonth() - 1)));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [filters, setFilters] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedReports, setGeneratedReports] = useState<
    Array<{ id: string; name: string; type: ReportType; format: ReportFormat; date: Date; url: string }>
  >([]);

  const handleTypeChange = (event: SelectChangeEvent) => {
    setSelectedType(event.target.value as ReportType);
    setFilters([]); // Reset filters when type changes
  };

  const handleFormatChange = (event: SelectChangeEvent) => {
    setFormat(event.target.value as ReportFormat);
  };

  const handleFilterToggle = (filter: string) => {
    setFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    if (startDate > endDate) {
      toast.error('Start date must be before end date');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const config: ReportConfig = {
        type: selectedType,
        format,
        dateRange: {
          start: startDate,
          end: endDate,
        },
        filters: filters.reduce((acc, filter) => {
          acc[filter] = true; // Simplified - in real app, filters would have specific values
          return acc;
        }, {} as Record<string, any>),
        includeCharts: format === ReportFormat.PDF,
        includeRawData: format === ReportFormat.CSV || format === ReportFormat.EXCEL,
      };

      const response = await apiClient.post<{ reportId: string; downloadUrl: string }>(
        '/api/analytics/reports/generate',
        config,
        {
          responseType: format === ReportFormat.PDF ? 'blob' : 'json',
        }
      );

      // Handle blob response for PDF
      if (format === ReportFormat.PDF && response.data instanceof Blob) {
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectedType}-report-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success('Report generated and downloaded successfully!');
      } else {
        // Handle JSON response with download URL
        const data = response.data as { reportId: string; downloadUrl: string };
        
        const newReport = {
          id: data.reportId,
          name: `${REPORT_OPTIONS.find((r) => r.type === selectedType)?.label} - ${startDate.toLocaleDateString()}`,
          type: selectedType,
          format,
          date: new Date(),
          url: data.downloadUrl,
        };

        setGeneratedReports((prev) => [newReport, ...prev]);
        toast.success('Report generated successfully!');

        // Auto-download
        window.open(data.downloadUrl, '_blank');
      }
    } catch (err: any) {
      console.error('Error generating report:', err);
      const errorMessage = err.response?.data?.message || 'Failed to generate report';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = (report: any) => {
    window.open(report.url, '_blank');
    toast.success('Downloading report...');
  };

  const selectedReportOption = REPORT_OPTIONS.find((r) => r.type === selectedType);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        {/* Header */}
        <Typography variant="h5" fontWeight="bold" mb={3}>
          Reports Generator
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Configuration Panel */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" mb={3}>
                  Report Configuration
                </Typography>

                {/* Report Type */}
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Report Type</InputLabel>
                  <Select value={selectedType} onChange={handleTypeChange} label="Report Type">
                    {REPORT_OPTIONS.map((option) => (
                      <MenuItem key={option.type} value={option.type}>
                        <Box display="flex" alignItems="center">
                          <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                            {option.icon}
                          </Box>
                          <Box>
                            <Typography variant="body1">{option.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.description}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Date Range */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="Start Date"
                      value={startDate}
                      onChange={setStartDate}
                      slotProps={{
                        textField: { fullWidth: true },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="End Date"
                      value={endDate}
                      onChange={setEndDate}
                      slotProps={{
                        textField: { fullWidth: true },
                      }}
                    />
                  </Grid>
                </Grid>

                {/* Format Selection */}
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Export Format</InputLabel>
                  <Select value={format} onChange={handleFormatChange} label="Export Format">
                    {FORMAT_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Box display="flex" alignItems="center">
                          <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                            {option.icon}
                          </Box>
                          {option.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Available Filters */}
                <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight="bold" mb={2}>
                    Available Filters
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {selectedReportOption?.availableFilters.map((filter) => (
                      <Chip
                        key={filter}
                        label={filter.replace(/([A-Z])/g, ' $1').trim()}
                        onClick={() => handleFilterToggle(filter)}
                        color={filters.includes(filter) ? 'primary' : 'default'}
                        variant={filters.includes(filter) ? 'filled' : 'outlined'}
                      />
                    ))}
                  </Box>
                </Paper>

                {/* Generate Button */}
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Download />}
                  onClick={handleGenerateReport}
                  disabled={loading || !startDate || !endDate}
                >
                  {loading ? 'Generating Report...' : 'Generate Report'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Reports Panel */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" mb={2}>
                  Recent Reports
                </Typography>

                {generatedReports.length === 0 ? (
                  <Box textAlign="center" py={4}>
                    <Assessment sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No reports generated yet
                    </Typography>
                  </Box>
                ) : (
                  <List>
                    {generatedReports.map((report, index) => (
                      <React.Fragment key={report.id}>
                        {index > 0 && <Divider />}
                        <ListItem
                          button
                          onClick={() => handleDownloadReport(report)}
                          sx={{ py: 2 }}
                        >
                          <ListItemIcon>
                            {FORMAT_OPTIONS.find((f) => f.value === report.format)?.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={report.name}
                            secondary={`Generated: ${report.date.toLocaleString()}`}
                            primaryTypographyProps={{ variant: 'body2' }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" mb={2}>
                  Quick Stats
                </Typography>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      Reports Generated
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {generatedReports.length}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      Most Used Format
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {generatedReports.length > 0
                        ? FORMAT_OPTIONS.find(
                            (f) =>
                              f.value ===
                              generatedReports.reduce(
                                (acc, r) => {
                                  acc[r.format] = (acc[r.format] || 0) + 1;
                                  return acc;
                                },
                                {} as Record<string, number>
                              )[
                                Object.keys(
                                  generatedReports.reduce(
                                    (acc, r) => {
                                      acc[r.format] = (acc[r.format] || 0) + 1;
                                      return acc;
                                    },
                                    {} as Record<string, number>
                                  )
                                ).sort(
                                  (a, b) =>
                                    generatedReports.reduce(
                                      (acc, r) => {
                                        acc[r.format] = (acc[r.format] || 0) + 1;
                                        return acc;
                                      },
                                      {} as Record<string, number>
                                    )[b] -
                                    generatedReports.reduce(
                                      (acc, r) => {
                                        acc[r.format] = (acc[r.format] || 0) + 1;
                                        return acc;
                                      },
                                      {} as Record<string, number>
                                    )[a]
                                )[0]
                              ]
                          )?.label
                        : 'N/A'}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Last Generated
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {generatedReports.length > 0
                        ? generatedReports[0].date.toLocaleDateString()
                        : 'N/A'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default ReportsGenerator;
