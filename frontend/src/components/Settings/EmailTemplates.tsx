import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Grid,
  Select,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Tooltip,
  CircularProgress,
  Alert,
  SelectChangeEvent,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  ContentCopy,
  Send,
  MoreVert,
  Code,
  Preview,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  EmailTemplate,
  EmailTemplateType,
  EmailCategory,
  EmailVariable,
  EmailTestRequest,
} from '../../types/settings.types';
import apiClient from '../../services/apiClient';

const TEMPLATE_VARIABLES: EmailVariable[] = [
  { key: '{{customerName}}', label: 'Customer Name', description: 'Full name of the customer', example: 'John Doe' },
  { key: '{{bookingId}}', label: 'Booking ID', description: 'Unique booking identifier', example: 'BK-12345' },
  { key: '{{tourName}}', label: 'Tour Name', description: 'Name of the tour', example: 'Paris City Tour' },
  { key: '{{tourDate}}', label: 'Tour Date', description: 'Date of the tour', example: '2024-12-25' },
  { key: '{{amount}}', label: 'Amount', description: 'Payment amount', example: '$299.99' },
  { key: '{{confirmationLink}}', label: 'Confirmation Link', description: 'Link to booking confirmation', example: 'https://...' },
];

const EmailTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<EmailTemplate[]>('/api/settings/email-templates');
      setTemplates(response.data);
    } catch (err: any) {
      console.error('Error fetching templates:', err);
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (template?: EmailTemplate) => {
    if (template) {
      setEditingTemplate(template);
      reset(template);
    } else {
      setEditingTemplate(null);
      reset({ isActive: true, isDefault: false, language: 'en' });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTemplate(null);
    reset({});
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingTemplate) {
        await apiClient.put(`/api/settings/email-templates/${editingTemplate.id}`, data);
        toast.success('Template updated successfully!');
      } else {
        await apiClient.post('/api/settings/email-templates', data);
        toast.success('Template created successfully!');
      }
      await fetchTemplates();
      handleCloseDialog();
    } catch (err: any) {
      console.error('Error saving template:', err);
      toast.error(err.response?.data?.message || 'Failed to save template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      await apiClient.delete(`/api/settings/email-templates/${id}`);
      toast.success('Template deleted successfully!');
      await fetchTemplates();
    } catch (err: any) {
      console.error('Error deleting template:', err);
      toast.error('Failed to delete template');
    }
  };

  const handleDuplicate = async (template: EmailTemplate) => {
    try {
      const { id, createdAt, updatedAt, createdBy, ...templateData } = template;
      await apiClient.post('/api/settings/email-templates', {
        ...templateData,
        name: `${template.name} (Copy)`,
        isDefault: false,
      });
      toast.success('Template duplicated successfully!');
      await fetchTemplates();
    } catch (err: any) {
      console.error('Error duplicating template:', err);
      toast.error('Failed to duplicate template');
    }
  };

  const handleSendTest = async () => {
    if (!selectedTemplate || !testEmail) return;

    try {
      const testRequest: EmailTestRequest = {
        templateId: selectedTemplate.id,
        recipientEmail: testEmail,
        variables: {
          customerName: 'Test Customer',
          bookingId: 'BK-TEST-123',
          tourName: 'Sample Tour',
          tourDate: new Date().toLocaleDateString(),
          amount: '$299.99',
          confirmationLink: 'https://example.com/confirm',
        },
      };

      await apiClient.post('/api/settings/email-templates/test', testRequest);
      toast.success(`Test email sent to ${testEmail}`);
      setTestDialogOpen(false);
      setTestEmail('');
    } catch (err: any) {
      console.error('Error sending test email:', err);
      toast.error('Failed to send test email');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, template: EmailTemplate) => {
    setAnchorEl(event.currentTarget);
    setSelectedTemplate(template);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTemplate(null);
  };

  const getCategoryColor = (category: EmailCategory) => {
    const colors = {
      transactional: 'primary',
      marketing: 'success',
      notification: 'info',
      system: 'warning',
    };
    return colors[category] || 'default';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Email Templates
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage email templates for automated communications
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          New Template
        </Button>
      </Box>

      {/* Templates Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Language</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {template.name}
                    </Typography>
                    {template.isDefault && (
                      <Chip label="Default" size="small" color="primary" sx={{ mt: 0.5 }} />
                    )}
                  </Box>
                </TableCell>
                <TableCell>{template.type.replace(/_/g, ' ')}</TableCell>
                <TableCell>
                  <Chip
                    label={template.category}
                    size="small"
                    color={getCategoryColor(template.category) as any}
                  />
                </TableCell>
                <TableCell>{template.language.toUpperCase()}</TableCell>
                <TableCell>
                  <Chip
                    label={template.isActive ? 'Active' : 'Inactive'}
                    size="small"
                    color={template.isActive ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="More Actions">
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, template)}>
                      <MoreVert />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            handleOpenDialog(selectedTemplate!);
            handleMenuClose();
          }}
        >
          <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleDuplicate(selectedTemplate!);
            handleMenuClose();
          }}
        >
          <ContentCopy fontSize="small" sx={{ mr: 1 }} /> Duplicate
        </MenuItem>
        <MenuItem
          onClick={() => {
            setTestDialogOpen(true);
            handleMenuClose();
          }}
        >
          <Send fontSize="small" sx={{ mr: 1 }} /> Send Test
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleDelete(selectedTemplate!.id);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Template Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {editingTemplate ? 'Edit Template' : 'Create Template'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Template Name"
                      fullWidth
                      error={!!errors.name}
                      helperText={errors.name?.message?.toString()}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="type"
                  control={control}
                  rules={{ required: 'Type is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.type}>
                      <InputLabel>Type</InputLabel>
                      <Select {...field} label="Type">
                        {Object.values(EmailTemplateType).map((type) => (
                          <MenuItem key={type} value={type}>
                            {type.replace(/_/g, ' ')}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="category"
                  control={control}
                  rules={{ required: 'Category is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.category}>
                      <InputLabel>Category</InputLabel>
                      <Select {...field} label="Category">
                        {Object.values(EmailCategory).map((cat) => (
                          <MenuItem key={cat} value={cat}>
                            {cat}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="language"
                  control={control}
                  defaultValue="en"
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Language</InputLabel>
                      <Select {...field} label="Language">
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="es">Spanish</MenuItem>
                        <MenuItem value="fr">French</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="subject"
                  control={control}
                  rules={{ required: 'Subject is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email Subject"
                      fullWidth
                      error={!!errors.subject}
                      helperText={errors.subject?.message?.toString()}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="body"
                  control={control}
                  rules={{ required: 'Body is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email Body"
                      multiline
                      rows={8}
                      fullWidth
                      error={!!errors.body}
                      helperText={errors.body?.message?.toString()}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2" fontWeight="bold" mb={1}>
                    Available Variables:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {TEMPLATE_VARIABLES.map((variable) => (
                      <Tooltip key={variable.key} title={variable.description}>
                        <Chip
                          label={variable.key}
                          size="small"
                          variant="outlined"
                          onClick={() => navigator.clipboard.writeText(variable.key)}
                        />
                      </Tooltip>
                    ))}
                  </Box>
                </Alert>
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="isActive"
                  control={control}
                  defaultValue={true}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Active"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="isDefault"
                  control={control}
                  defaultValue={false}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Set as Default"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingTemplate ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Test Email</DialogTitle>
        <DialogContent>
          <TextField
            label="Recipient Email"
            type="email"
            fullWidth
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            sx={{ mt: 2 }}
          />
          <Alert severity="info" sx={{ mt: 2 }}>
            A test email will be sent with sample data.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSendTest}
            variant="contained"
            disabled={!testEmail}
            startIcon={<Send />}
          >
            Send Test
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmailTemplates;
