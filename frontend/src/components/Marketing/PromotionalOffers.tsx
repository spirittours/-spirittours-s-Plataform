import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Add, Edit, Delete, Visibility } from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { PromotionalOffer, OfferStatus, OfferType } from '../../types/marketing.types';
import apiClient from '../../services/apiClient';

const PromotionalOffers: React.FC = () => {
  const [offers, setOffers] = useState<PromotionalOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingOffer, setEditingOffer] = useState<PromotionalOffer | null>(null);

  const { control, handleSubmit, reset } = useForm();

  useEffect(() => { fetchOffers(); }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<PromotionalOffer[]>('/api/marketing/offers');
      setOffers(response.data);
    } catch (err) {
      toast.error('Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (offer?: PromotionalOffer) => {
    if (offer) {
      setEditingOffer(offer);
      reset(offer);
    } else {
      setEditingOffer(null);
      reset({ status: OfferStatus.ACTIVE, isPublic: true });
    }
    setOpenDialog(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingOffer) {
        await apiClient.put(`/api/marketing/offers/${editingOffer.id}`, data);
        toast.success('Offer updated!');
      } else {
        await apiClient.post('/api/marketing/offers', data);
        toast.success('Offer created!');
      }
      await fetchOffers();
      setOpenDialog(false);
    } catch (err) {
      toast.error('Failed to save offer');
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" fontWeight="bold">Promotional Offers</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>New Offer</Button>
        </Box>

        <Grid container spacing={3}>
          {offers.map((offer) => (
            <Grid item xs={12} md={6} lg={4} key={offer.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">{offer.title}</Typography>
                      <Chip label={offer.status} size="small" color={offer.status === OfferStatus.ACTIVE ? 'success' : 'default'} sx={{ mt: 1 }} />
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => handleOpenDialog(offer)}><Edit fontSize="small" /></IconButton>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" mb={2}>{offer.description}</Typography>
                  <Box display="flex" gap={1} mb={2}>
                    <Chip label={offer.type} size="small" variant="outlined" />
                    <Chip label={`${offer.discountValue}${offer.discountType === 'percentage' ? '%' : '$'} OFF`} size="small" color="primary" />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Valid: {new Date(offer.validFrom).toLocaleDateString()} - {new Date(offer.validUntil).toLocaleDateString()}
                  </Typography>
                  <Box mt={2}>
                    <Typography variant="caption">Usage: {offer.usageCount} / {offer.usageLimit}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogTitle>{editingOffer ? 'Edit Offer' : 'New Offer'}</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}><Controller name="title" control={control} render={({ field }) => <TextField {...field} label="Title" fullWidth />} /></Grid>
                <Grid item xs={12}><Controller name="description" control={control} render={({ field }) => <TextField {...field} label="Description" multiline rows={2} fullWidth />} /></Grid>
                <Grid item xs={12} md={6}>
                  <Controller name="type" control={control} render={({ field }) => (
                    <FormControl fullWidth><InputLabel>Type</InputLabel><Select {...field} label="Type">{Object.values(OfferType).map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</Select></FormControl>
                  )} />
                </Grid>
                <Grid item xs={12} md={6}><Controller name="discountValue" control={control} render={({ field }) => <TextField {...field} label="Discount Value" type="number" fullWidth />} /></Grid>
                <Grid item xs={12} md={6}><Controller name="validFrom" control={control} render={({ field }) => <DatePicker {...field} label="Valid From" slotProps={{ textField: { fullWidth: true } }} />} /></Grid>
                <Grid item xs={12} md={6}><Controller name="validUntil" control={control} render={({ field }) => <DatePicker {...field} label="Valid Until" slotProps={{ textField: { fullWidth: true } }} />} /></Grid>
                <Grid item xs={12}><Controller name="isPublic" control={control} render={({ field }) => <FormControlLabel control={<Switch {...field} checked={field.value} />} label="Public" />} /></Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
              <Button type="submit" variant="contained">{editingOffer ? 'Update' : 'Create'}</Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default PromotionalOffers;
