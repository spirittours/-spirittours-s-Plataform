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
  LinearProgress,
} from '@mui/material';
import { Add, Edit, Send, Visibility } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Newsletter as NewsletterType, NewsletterStatus } from '../../types/marketing.types';
import apiClient from '../../services/apiClient';

const Newsletter: React.FC = () => {
  const [newsletters, setNewsletters] = useState<NewsletterType[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);

  const { control, handleSubmit, reset } = useForm();

  useEffect(() => { fetchNewsletters(); }, []);

  const fetchNewsletters = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<NewsletterType[]>('/api/marketing/newsletters');
      setNewsletters(response.data);
    } catch (err) {
      toast.error('Failed to load newsletters');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      await apiClient.post('/api/marketing/newsletters', data);
      toast.success('Newsletter created!');
      await fetchNewsletters();
      setOpenDialog(false);
    } catch (err) {
      toast.error('Failed to create newsletter');
    }
  };

  const handleSend = async (id: string) => {
    if (!window.confirm('Send this newsletter now?')) return;
    try {
      await apiClient.post(`/api/marketing/newsletters/${id}/send`);
      toast.success('Newsletter sent!');
      await fetchNewsletters();
    } catch (err) {
      toast.error('Failed to send newsletter');
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Newsletter</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>New Newsletter</Button>
      </Box>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Total Newsletters</Typography>
              <Typography variant="h4" fontWeight="bold">{newsletters.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Sent</Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {newsletters.filter(n => n.status === NewsletterStatus.SENT).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Avg Open Rate</Typography>
              <Typography variant="h4" fontWeight="bold">
                {newsletters.length > 0 ? (newsletters.reduce((sum, n) => sum + n.stats.openRate, 0) / newsletters.length).toFixed(1) : 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Recipients</TableCell>
              <TableCell>Open Rate</TableCell>
              <TableCell>Sent Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {newsletters.map((newsletter) => (
              <TableRow key={newsletter.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">{newsletter.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{newsletter.subject}</Typography>
                </TableCell>
                <TableCell>
                  <Chip label={newsletter.status} size="small" color={newsletter.status === NewsletterStatus.SENT ? 'success' : 'default'} />
                </TableCell>
                <TableCell>{newsletter.stats.totalRecipients.toLocaleString()}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LinearProgress variant="determinate" value={newsletter.stats.openRate} sx={{ flex: 1, height: 6, borderRadius: 1 }} />
                    <Typography variant="caption">{newsletter.stats.openRate.toFixed(1)}%</Typography>
                  </Box>
                </TableCell>
                <TableCell>{newsletter.sentAt ? new Date(newsletter.sentAt).toLocaleDateString() : '-'}</TableCell>
                <TableCell align="right">
                  {newsletter.status === NewsletterStatus.DRAFT && (
                    <IconButton size="small" onClick={() => handleSend(newsletter.id)}><Send fontSize="small" /></IconButton>
                  )}
                  <IconButton size="small"><Edit fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>New Newsletter</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}><Controller name="title" control={control} render={({ field }) => <TextField {...field} label="Title" fullWidth />} /></Grid>
              <Grid item xs={12}><Controller name="subject" control={control} render={({ field }) => <TextField {...field} label="Email Subject" fullWidth />} /></Grid>
              <Grid item xs={12}><Controller name="content" control={control} render={({ field }) => <TextField {...field} label="Content" multiline rows={8} fullWidth />} /></Grid>
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

export default Newsletter;
