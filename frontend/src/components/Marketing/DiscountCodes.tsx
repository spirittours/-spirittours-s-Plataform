import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  CircularProgress,
} from '@mui/material';
import { Add, Edit, Delete, ContentCopy } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { DiscountCode, CodeStatus } from '../../types/marketing.types';
import apiClient from '../../services/apiClient';

const DiscountCodes: React.FC = () => {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);

  const { control, handleSubmit, reset } = useForm();

  useEffect(() => { fetchCodes(); }, []);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<DiscountCode[]>('/api/marketing/discount-codes');
      setCodes(response.data);
    } catch (err) {
      toast.error('Failed to load codes');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      await apiClient.post('/api/marketing/discount-codes', data);
      toast.success('Code created!');
      await fetchCodes();
      setOpenDialog(false);
    } catch (err) {
      toast.error('Failed to create code');
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  if (loading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Discount Codes</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>New Code</Button>
      </Box>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Total Codes</Typography>
              <Typography variant="h4" fontWeight="bold">{codes.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Active</Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {codes.filter(c => c.status === CodeStatus.ACTIVE).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Total Usage</Typography>
              <Typography variant="h4" fontWeight="bold">
                {codes.reduce((sum, c) => sum + c.usageCount, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Discount</TableCell>
              <TableCell>Usage</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {codes.map((code) => (
              <TableRow key={code.id} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip label={code.code} size="small" color="primary" />
                    <IconButton size="small" onClick={() => copyToClipboard(code.code)}>
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell>{code.description}</TableCell>
                <TableCell>{code.value}{code.type === 'percentage' ? '%' : '$'}</TableCell>
                <TableCell>{code.usageCount} / {code.usageLimit}</TableCell>
                <TableCell>
                  <Chip label={code.status} size="small" color={code.status === CodeStatus.ACTIVE ? 'success' : 'default'} />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small"><Edit fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>New Discount Code</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}><Controller name="code" control={control} render={({ field }) => <TextField {...field} label="Code" fullWidth placeholder="SUMMER2024" />} /></Grid>
              <Grid item xs={12}><Controller name="description" control={control} render={({ field }) => <TextField {...field} label="Description" fullWidth />} /></Grid>
              <Grid item xs={12} md={6}><Controller name="value" control={control} render={({ field }) => <TextField {...field} label="Discount Value" type="number" fullWidth />} /></Grid>
              <Grid item xs={12} md={6}><Controller name="usageLimit" control={control} render={({ field }) => <TextField {...field} label="Usage Limit" type="number" fullWidth />} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Create</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default DiscountCodes;
