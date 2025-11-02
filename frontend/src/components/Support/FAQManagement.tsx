import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Add, Edit, Delete, ExpandMore, ThumbUp, ThumbDown } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FAQ, FAQCategory } from '../../types/support.types';
import apiClient from '../../services/apiClient';

const FAQManagement: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);

  const { control, handleSubmit, reset } = useForm();

  useEffect(() => { fetchFAQs(); }, []);

  const fetchFAQs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<FAQ[]>('/api/support/faqs');
      setFaqs(response.data);
    } catch (err) {
      toast.error('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (faq?: FAQ) => {
    if (faq) {
      setEditingFaq(faq);
      reset(faq);
    } else {
      setEditingFaq(null);
      reset({ isPublished: true });
    }
    setOpenDialog(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingFaq) {
        await apiClient.put(`/api/support/faqs/${editingFaq.id}`, data);
        toast.success('FAQ updated!');
      } else {
        await apiClient.post('/api/support/faqs', data);
        toast.success('FAQ created!');
      }
      await fetchFAQs();
      setOpenDialog(false);
    } catch (err) {
      toast.error('Failed to save FAQ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this FAQ?')) return;
    try {
      await apiClient.delete(`/api/support/faqs/${id}`);
      toast.success('FAQ deleted!');
      await fetchFAQs();
    } catch (err) {
      toast.error('Failed to delete FAQ');
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

  const groupedFaqs = faqs.reduce((acc, faq) => {
    if (!acc[faq.category]) acc[faq.category] = [];
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">FAQ Management</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>New FAQ</Button>
      </Box>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Total FAQs</Typography>
              <Typography variant="h4" fontWeight="bold">{faqs.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Published</Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {faqs.filter(f => f.isPublished).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Total Views</Typography>
              <Typography variant="h4" fontWeight="bold">
                {faqs.reduce((sum, f) => sum + f.views, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {Object.entries(groupedFaqs).map(([category, categoryFaqs]) => (
        <Box key={category} mb={3}>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            {category.replace('_', ' ').toUpperCase()}
          </Typography>
          {categoryFaqs.map((faq) => (
            <Accordion key={faq.id}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" gap={2} flex={1}>
                  <Typography fontWeight="medium">{faq.question}</Typography>
                  {!faq.isPublished && <Chip label="Draft" size="small" />}
                  <Box ml="auto" display="flex" alignItems="center" gap={1}>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <ThumbUp fontSize="small" sx={{ fontSize: 14 }} />
                      <Typography variant="caption">{faq.helpful}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <ThumbDown fontSize="small" sx={{ fontSize: 14 }} />
                      <Typography variant="caption">{faq.notHelpful}</Typography>
                    </Box>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenDialog(faq); }}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(faq.id); }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">{faq.answer}</Typography>
                <Box mt={2} display="flex" gap={1}>
                  {faq.tags.map((tag, idx) => (
                    <Chip key={idx} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ))}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editingFaq ? 'Edit FAQ' : 'New FAQ'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Controller name="question" control={control} render={({ field }) => <TextField {...field} label="Question" fullWidth />} />
              </Grid>
              <Grid item xs={12}>
                <Controller name="answer" control={control} render={({ field }) => <TextField {...field} label="Answer" multiline rows={6} fullWidth />} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller name="category" control={control} render={({ field }) => (
                  <FormControl fullWidth><InputLabel>Category</InputLabel><Select {...field} label="Category">{Object.values(FAQCategory).map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</Select></FormControl>
                )} />
              </Grid>
              <Grid item xs={12}>
                <Controller name="isPublished" control={control} render={({ field }) => (
                  <FormControlLabel control={<Switch {...field} checked={field.value} />} label="Published" />
                )} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained">{editingFaq ? 'Update' : 'Create'}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default FAQManagement;
