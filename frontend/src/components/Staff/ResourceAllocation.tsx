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
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  CheckCircle,
  HourglassEmpty,
  Cancel,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import toast from 'react-hot-toast';
import { Resource, ResourceAllocation, ResourceType, ResourceStatus } from '../../types/staff.types';
import apiClient from '../../services/apiClient';

const ResourceAllocationComponent: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<ResourceAllocation | null>(null);

  const { control, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resourcesRes, allocationsRes] = await Promise.all([
        apiClient.get<Resource[]>('/api/staff/resources'),
        apiClient.get<ResourceAllocation[]>('/api/staff/resource-allocations'),
      ]);
      setResources(resourcesRes.data);
      setAllocations(allocationsRes.data);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (allocation?: ResourceAllocation) => {
    if (allocation) {
      setEditingAllocation(allocation);
      reset(allocation);
    } else {
      setEditingAllocation(null);
      reset({ status: 'pending', quantity: 1 });
    }
    setOpenDialog(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingAllocation) {
        await apiClient.put(`/api/staff/resource-allocations/${editingAllocation.id}`, data);
        toast.success('Allocation updated successfully!');
      } else {
        await apiClient.post('/api/staff/resource-allocations', data);
        toast.success('Resource allocated successfully!');
      }
      await fetchData();
      setOpenDialog(false);
    } catch (err: any) {
      console.error('Error saving allocation:', err);
      toast.error(err.response?.data?.message || 'Failed to save allocation');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this allocation?')) return;

    try {
      await apiClient.delete(`/api/staff/resource-allocations/${id}`);
      toast.success('Allocation deleted successfully!');
      await fetchData();
    } catch (err: any) {
      toast.error('Failed to delete allocation');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, any> = {
      pending: 'warning',
      approved: 'info',
      active: 'success',
      completed: 'default',
      cancelled: 'error',
    };
    return colors[status] || 'default';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" fontWeight="bold">
            Resource Allocation
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
            Allocate Resource
          </Button>
        </Box>

        {/* Stats */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Resources
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {resources.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Active Allocations
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {allocations.filter((a) => a.status === 'active').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Allocations Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Resource</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allocations.map((allocation) => (
                <TableRow key={allocation.id} hover>
                  <TableCell>{allocation.resourceName}</TableCell>
                  <TableCell>{allocation.assignedToName}</TableCell>
                  <TableCell>
                    <Chip label={allocation.assignmentType} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(allocation.startDate).toLocaleDateString()} -{' '}
                      {new Date(allocation.endDate).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>{allocation.quantity}</TableCell>
                  <TableCell>
                    <Chip
                      label={allocation.status}
                      size="small"
                      color={getStatusColor(allocation.status)}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpenDialog(allocation)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(allocation.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogTitle>
              {editingAllocation ? 'Edit Allocation' : 'Allocate Resource'}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Controller
                    name="resourceId"
                    control={control}
                    rules={{ required: 'Resource is required' }}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.resourceId}>
                        <InputLabel>Resource</InputLabel>
                        <Select {...field} label="Resource">
                          {resources.map((resource) => (
                            <MenuItem key={resource.id} value={resource.id}>
                              {resource.name} (Available: {resource.availableQuantity})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="assignedToName"
                    control={control}
                    rules={{ required: 'Assignment required' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Assigned To"
                        fullWidth
                        error={!!errors.assignedToName}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="startDate"
                    control={control}
                    rules={{ required: 'Start date required' }}
                    render={({ field }) => (
                      <DatePicker {...field} label="Start Date" slotProps={{ textField: { fullWidth: true } }} />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="endDate"
                    control={control}
                    rules={{ required: 'End date required' }}
                    render={({ field }) => (
                      <DatePicker {...field} label="End Date" slotProps={{ textField: { fullWidth: true } }} />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="quantity"
                    control={control}
                    defaultValue={1}
                    render={({ field }) => (
                      <TextField {...field} label="Quantity" type="number" fullWidth />
                    )}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
              <Button type="submit" variant="contained">
                {editingAllocation ? 'Update' : 'Allocate'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default ResourceAllocationComponent;
