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
  Avatar,
  Grid,
  Rating,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Person,
  Star,
  Phone,
  Email,
  WorkspacePremium,
  Language as LanguageIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  TourGuide,
  GuideStatus,
  StaffRole,
  GuideFormData,
  Language,
} from '../../types/staff.types';
import apiClient from '../../services/apiClient';

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

const TourGuides: React.FC = () => {
  const [guides, setGuides] = useState<TourGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [editingGuide, setEditingGuide] = useState<TourGuide | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<TourGuide | null>(null);
  const [filterStatus, setFilterStatus] = useState<GuideStatus | 'all'>('all');
  const [activeTab, setActiveTab] = useState(0);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<GuideFormData>();

  useEffect(() => {
    fetchGuides();
  }, [filterStatus]);

  const fetchGuides = async () => {
    try {
      setLoading(true);
      const params = filterStatus !== 'all' ? { status: filterStatus } : {};
      const response = await apiClient.get<TourGuide[]>('/api/staff/guides', { params });
      setGuides(response.data);
    } catch (err: any) {
      console.error('Error fetching guides:', err);
      toast.error('Failed to load tour guides');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (guide?: TourGuide) => {
    if (guide) {
      setEditingGuide(guide);
      reset({
        firstName: guide.firstName,
        lastName: guide.lastName,
        email: guide.email,
        phone: guide.phone,
        role: guide.role,
        specializations: guide.specializations,
        languages: guide.languages,
        bio: guide.bio,
        emergencyContact: guide.emergencyContact,
      });
    } else {
      setEditingGuide(null);
      reset({
        specializations: [],
        languages: [],
        emergencyContact: { name: '', relationship: '', phone: '', email: '' },
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingGuide(null);
  };

  const handleViewGuide = (guide: TourGuide) => {
    setSelectedGuide(guide);
    setOpenViewDialog(true);
  };

  const onSubmit = async (data: GuideFormData) => {
    try {
      if (editingGuide) {
        await apiClient.put(`/api/staff/guides/${editingGuide.id}`, data);
        toast.success('Guide updated successfully!');
      } else {
        await apiClient.post('/api/staff/guides', data);
        toast.success('Guide created successfully!');
      }
      await fetchGuides();
      handleCloseDialog();
    } catch (err: any) {
      console.error('Error saving guide:', err);
      toast.error(err.response?.data?.message || 'Failed to save guide');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this guide?')) return;

    try {
      await apiClient.delete(`/api/staff/guides/${id}`);
      toast.success('Guide deleted successfully!');
      await fetchGuides();
    } catch (err: any) {
      console.error('Error deleting guide:', err);
      toast.error('Failed to delete guide');
    }
  };

  const handleStatusChange = async (id: string, status: GuideStatus) => {
    try {
      await apiClient.patch(`/api/staff/guides/${id}/status`, { status });
      toast.success('Guide status updated!');
      await fetchGuides();
    } catch (err: any) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    }
  };

  const getStatusColor = (status: GuideStatus) => {
    const colors = {
      active: 'success',
      inactive: 'default',
      on_leave: 'warning',
      suspended: 'error',
      training: 'info',
    };
    return colors[status] || 'default';
  };

  const filteredGuides = guides;

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
            Tour Guides
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your tour guide team
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filter by Status</InputLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as GuideStatus | 'all')}
              label="Filter by Status"
            >
              <MenuItem value="all">All Status</MenuItem>
              {Object.values(GuideStatus).map((status) => (
                <MenuItem key={status} value={status}>
                  {status.replace('_', ' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
            Add Guide
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Total Guides
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {guides.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Active
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {guides.filter((g) => g.status === GuideStatus.ACTIVE).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Avg Rating
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h4" fontWeight="bold">
                  {(guides.reduce((sum, g) => sum + g.rating, 0) / guides.length || 0).toFixed(1)}
                </Typography>
                <Star fontSize="small" sx={{ color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Total Tours
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {guides.reduce((sum, g) => sum + g.totalTours, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Guides Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Guide</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Rating</TableCell>
              <TableCell>Tours</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredGuides.map((guide) => (
              <TableRow key={guide.id} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Badge
                      badgeContent={guide.certifications.length}
                      color="primary"
                      overlap="circular"
                    >
                      <Avatar src={guide.avatar} alt={guide.firstName}>
                        {guide.firstName[0]}
                      </Avatar>
                    </Badge>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {guide.firstName} {guide.lastName}
                      </Typography>
                      <Box display="flex" gap={0.5} mt={0.5}>
                        {guide.languages.slice(0, 3).map((lang, idx) => (
                          <Chip
                            key={idx}
                            label={lang.code.toUpperCase()}
                            size="small"
                            sx={{ height: 16, fontSize: '0.65rem' }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Email fontSize="small" sx={{ fontSize: 14 }} />
                      <Typography variant="caption">{guide.email}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Phone fontSize="small" sx={{ fontSize: 14 }} />
                      <Typography variant="caption">{guide.phone}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={guide.role.replace('_', ' ')} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Rating value={guide.rating} readOnly size="small" precision={0.1} />
                    <Typography variant="caption">({guide.rating.toFixed(1)})</Typography>
                  </Box>
                </TableCell>
                <TableCell>{guide.totalTours}</TableCell>
                <TableCell>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={guide.status}
                      onChange={(e) =>
                        handleStatusChange(guide.id, e.target.value as GuideStatus)
                      }
                      size="small"
                    >
                      {Object.values(GuideStatus).map((status) => (
                        <MenuItem key={status} value={status}>
                          {status.replace('_', ' ')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="View Details">
                    <IconButton size="small" onClick={() => handleViewGuide(guide)}>
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => handleOpenDialog(guide)}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => handleDelete(guide.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editingGuide ? 'Edit Guide' : 'Add New Guide'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="firstName"
                  control={control}
                  rules={{ required: 'First name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="First Name"
                      fullWidth
                      error={!!errors.firstName}
                      helperText={errors.firstName?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="lastName"
                  control={control}
                  rules={{ required: 'Last name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Last Name"
                      fullWidth
                      error={!!errors.lastName}
                      helperText={errors.lastName?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="email"
                  control={control}
                  rules={{
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email',
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email"
                      fullWidth
                      error={!!errors.email}
                      helperText={errors.email?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="phone"
                  control={control}
                  rules={{ required: 'Phone is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Phone"
                      fullWidth
                      error={!!errors.phone}
                      helperText={errors.phone?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="role"
                  control={control}
                  rules={{ required: 'Role is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.role}>
                      <InputLabel>Role</InputLabel>
                      <Select {...field} label="Role">
                        {Object.values(StaffRole).map((role) => (
                          <MenuItem key={role} value={role}>
                            {role.replace('_', ' ')}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="bio"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Bio" fullWidth multiline rows={3} />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingGuide ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedGuide && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar src={selectedGuide.avatar} sx={{ width: 56, height: 56 }}>
                  {selectedGuide.firstName[0]}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {selectedGuide.firstName} {selectedGuide.lastName}
                  </Typography>
                  <Chip
                    label={selectedGuide.status.replace('_', ' ')}
                    size="small"
                    color={getStatusColor(selectedGuide.status) as any}
                  />
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
                <Tab label="Overview" />
                <Tab label="Performance" />
                <Tab label="Documents" />
              </Tabs>

              <TabPanel value={activeTab} index={0}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Bio
                    </Typography>
                    <Typography variant="body2">{selectedGuide.bio}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Experience
                    </Typography>
                    <Typography variant="body2">{selectedGuide.experience} years</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Total Tours
                    </Typography>
                    <Typography variant="body2">{selectedGuide.totalTours}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" mb={1}>
                      Languages
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {selectedGuide.languages.map((lang, idx) => (
                        <Chip key={idx} label={`${lang.name} (${lang.proficiency})`} size="small" />
                      ))}
                    </Box>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={activeTab} index={1}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Average Rating
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Rating value={selectedGuide.rating} readOnly precision={0.1} />
                      <Typography>{selectedGuide.rating.toFixed(1)}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Completion Rate
                    </Typography>
                    <Typography variant="body2">
                      {selectedGuide.performance.completionRate}%
                    </Typography>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={activeTab} index={2}>
                <Typography variant="body2">
                  {selectedGuide.documents.length} document(s) on file
                </Typography>
              </TabPanel>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default TourGuides;
