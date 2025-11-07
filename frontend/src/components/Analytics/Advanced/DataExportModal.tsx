/**
 * Data Export Modal - Sprint 25 (Fase 7)
 * 
 * Reusable modal for exporting analytics data in multiple formats.
 * 
 * Features:
 * - Multiple export formats (CSV, PDF, Excel)
 * - Field selection
 * - Date range configuration
 * - Progress tracking
 * - Download management
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Typography,
  Box,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  Stack,
  Divider,
  Grid
} from '@mui/material';
import {
  Download,
  Close,
  CheckCircle,
  Description,
  TableChart,
  PictureAsPdf
} from '@mui/icons-material';
import { saveAs } from 'file-saver';

interface DataExportModalProps {
  open: boolean;
  onClose: () => void;
  data?: any;
  defaultFormat?: 'csv' | 'pdf' | 'xlsx';
  title?: string;
}

const DataExportModal: React.FC<DataExportModalProps> = ({
  open,
  onClose,
  data,
  defaultFormat = 'pdf',
  title = 'Export Data'
}) => {
  const [format, setFormat] = useState<'csv' | 'pdf' | 'xlsx'>(defaultFormat);
  const [reportType, setReportType] = useState('executive');
  const [period, setPeriod] = useState('30d');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [includeKPIs, setIncludeKPIs] = useState(true);
  const [includeTrends, setIncludeTrends] = useState(false);
  const [includeCharts, setIncludeCharts] = useState(format === 'pdf');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const workspaceId = 'workspace123'; // TODO: Get from context

  const formatOptions = [
    { value: 'pdf', label: 'PDF', icon: <PictureAsPdf />, description: 'Best for reports with charts' },
    { value: 'csv', label: 'CSV', icon: <Description />, description: 'Best for data analysis' },
    { value: 'xlsx', label: 'Excel', icon: <TableChart />, description: 'Best for spreadsheets' }
  ];

  const handleFormatChange = (newFormat: 'csv' | 'pdf' | 'xlsx') => {
    setFormat(newFormat);
    // Auto-disable charts for CSV
    if (newFormat === 'csv') {
      setIncludeCharts(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setSuccess(false);
    setProgress(0);

    try {
      // Simulate progress
      setProgress(20);

      const response = await fetch(`/api/analytics/${workspaceId}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: reportType,
          format,
          period,
          startDate,
          endDate,
          includeKPIs,
          includeTrends,
          includeCharts,
          metrics: includeTrends ? ['revenue', 'customers', 'bookings'] : []
        })
      });

      setProgress(60);

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const result = await response.json();
      setProgress(80);

      // Download the report
      if (result.data.reportId) {
        const downloadResponse = await fetch(
          `/api/analytics/${workspaceId}/reports/${result.data.reportId}/download`
        );

        if (!downloadResponse.ok) {
          throw new Error('Failed to download report');
        }

        const blob = await downloadResponse.blob();
        saveAs(blob, result.data.fileName);

        setProgress(100);
        setSuccess(true);

        // Close after delay
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setProgress(0);
        }, 2000);
      }
    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.message || 'Failed to export data');
      setProgress(0);
    } finally {
      setExporting(false);
    }
  };

  const handleClose = () => {
    if (!exporting) {
      onClose();
      setError(null);
      setSuccess(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{title}</Typography>
          <Button
            onClick={handleClose}
            disabled={exporting}
            size="small"
            sx={{ minWidth: 'auto' }}
          >
            <Close />
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            severity="success"
            icon={<CheckCircle />}
            sx={{ mb: 2 }}
          >
            Report exported successfully!
          </Alert>
        )}

        {exporting && (
          <Box mb={3}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Generating report... {progress}%
            </Typography>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        )}

        {/* Format Selection */}
        <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
          Export Format
        </Typography>
        <Stack direction="row" spacing={1} mb={3}>
          {formatOptions.map((option) => (
            <Box
              key={option.value}
              onClick={() => !exporting && handleFormatChange(option.value as any)}
              sx={{
                flex: 1,
                p: 2,
                border: 2,
                borderColor: format === option.value ? 'primary.main' : 'divider',
                borderRadius: 2,
                cursor: exporting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                bgcolor: format === option.value ? 'primary.light' : 'background.paper',
                opacity: exporting ? 0.6 : 1,
                '&:hover': {
                  borderColor: exporting ? 'divider' : 'primary.main',
                  bgcolor: exporting ? 'background.paper' : 'primary.light'
                }
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                {option.icon}
                <Typography variant="body2" fontWeight="bold">
                  {option.label}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {option.description}
              </Typography>
            </Box>
          ))}
        </Stack>

        {/* Report Configuration */}
        <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
          Report Configuration
        </Typography>

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Report Type</InputLabel>
          <Select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            label="Report Type"
            disabled={exporting}
          >
            <MenuItem value="executive">Executive Summary</MenuItem>
            <MenuItem value="detailed">Detailed Analytics</MenuItem>
            <MenuItem value="custom">Custom Report</MenuItem>
          </Select>
        </FormControl>

        <Grid container spacing={2} mb={2}>
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Period</InputLabel>
              <Select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                label="Period"
                disabled={exporting}
              >
                <MenuItem value="7d">Last 7 Days</MenuItem>
                <MenuItem value="30d">Last 30 Days</MenuItem>
                <MenuItem value="90d">Last 90 Days</MenuItem>
                <MenuItem value="1y">Last Year</MenuItem>
                <MenuItem value="custom">Custom Range</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {period === 'custom' && (
            <>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  disabled={exporting}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  disabled={exporting}
                />
              </Grid>
            </>
          )}
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Export Options */}
        <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
          Include in Export
        </Typography>

        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={includeKPIs}
                onChange={(e) => setIncludeKPIs(e.target.checked)}
                disabled={exporting}
              />
            }
            label="Key Performance Indicators (KPIs)"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includeTrends}
                onChange={(e) => setIncludeTrends(e.target.checked)}
                disabled={exporting}
              />
            }
            label="Trend Analysis"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
                disabled={exporting || format === 'csv'}
              />
            }
            label={`Charts & Visualizations ${format === 'csv' ? '(Not available for CSV)' : ''}`}
          />
        </FormGroup>

        {/* File Size Estimate */}
        <Box mt={2} p={1.5} bgcolor="grey.50" borderRadius={1}>
          <Typography variant="caption" color="text.secondary">
            <strong>Estimated file size:</strong> {format === 'pdf' ? '2-5 MB' : format === 'xlsx' ? '1-3 MB' : '< 1 MB'}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={exporting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={exporting ? <CircularProgress size={20} color="inherit" /> : <Download />}
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? 'Exporting...' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DataExportModal;
