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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import { Add, Edit, Delete, Send, Visibility, TrendingUp } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { EmailCampaign, CampaignStatus, CampaignType } from '../../types/marketing.types';
import apiClient from '../../services/apiClient';

const EmailCampaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);

  const { control, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<EmailCampaign[]>('/api/marketing/campaigns');
      setCampaigns(response.data);
    } catch (err: any) {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (campaign?: EmailCampaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
      reset(campaign);
    } else {
      setEditingCampaign(null);
      reset({ status: CampaignStatus.DRAFT, type: CampaignType.PROMOTIONAL });
    }
    setOpenDialog(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingCampaign) {
        await apiClient.put(`/api/marketing/campaigns/${editingCampaign.id}`, data);
        toast.success('Campaign updated!');
      } else {
        await apiClient.post('/api/marketing/campaigns', data);
        toast.success('Campaign created!');
      }
      await fetchCampaigns();
      setOpenDialog(false);
    } catch (err: any) {
      toast.error('Failed to save campaign');
    }
  };

  const handleSend = async (id: string) => {
    if (!window.confirm('Send this campaign now?')) return;
    try {
      await apiClient.post(`/api/marketing/campaigns/${id}/send`);
      toast.success('Campaign sent!');
      await fetchCampaigns();
    } catch (err: any) {
      toast.error('Failed to send campaign');
    }
  };

  const getStatusColor = (status: CampaignStatus) => {
    const colors: Record<CampaignStatus, any> = {
      draft: 'default',
      scheduled: 'info',
      sending: 'warning',
      sent: 'success',
      paused: 'warning',
      cancelled: 'error',
    };
    return colors[status];
  };

  if (loading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Email Campaigns</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          New Campaign
        </Button>
      </Box>

      <Grid container spacing={3} mb={3}>
        {[
          { label: 'Total Campaigns', value: campaigns.length, color: 'primary.main' },
          { label: 'Sent', value: campaigns.filter(c => c.status === CampaignStatus.SENT).length, color: 'success.main' },
          { label: 'Scheduled', value: campaigns.filter(c => c.status === CampaignStatus.SCHEDULED).length, color: 'info.main' },
        ].map((stat, idx) => (
          <Grid item xs={12} sm={4} key={idx}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">{stat.label}</Typography>
                <Typography variant="h4" fontWeight="bold" sx={{ color: stat.color }}>{stat.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Campaign</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Sent</TableCell>
              <TableCell>Open Rate</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {campaigns.map((campaign) => (
              <TableRow key={campaign.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">{campaign.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{campaign.subject}</Typography>
                </TableCell>
                <TableCell><Chip label={campaign.type} size="small" variant="outlined" /></TableCell>
                <TableCell><Chip label={campaign.status} size="small" color={getStatusColor(campaign.status)} /></TableCell>
                <TableCell>{campaign.stats.sent.toLocaleString()}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LinearProgress variant="determinate" value={campaign.stats.openRate} sx={{ flex: 1, height: 6, borderRadius: 1 }} />
                    <Typography variant="caption">{campaign.stats.openRate.toFixed(1)}%</Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  {campaign.status === CampaignStatus.DRAFT && (
                    <IconButton size="small" onClick={() => handleSend(campaign.id)}><Send fontSize="small" /></IconButton>
                  )}
                  <IconButton size="small" onClick={() => handleOpenDialog(campaign)}><Edit fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editingCampaign ? 'Edit Campaign' : 'New Campaign'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Controller name="name" control={control} rules={{ required: 'Name required' }} render={({ field }) => (
                  <TextField {...field} label="Campaign Name" fullWidth error={!!errors.name} helperText={errors.name?.message?.toString()} />
                )} />
              </Grid>
              <Grid item xs={12}>
                <Controller name="subject" control={control} rules={{ required: 'Subject required' }} render={({ field }) => (
                  <TextField {...field} label="Email Subject" fullWidth error={!!errors.subject} />
                )} />
              </Grid>
              <Grid item xs={12}>
                <Controller name="content" control={control} render={({ field }) => (
                  <TextField {...field} label="Content" multiline rows={6} fullWidth />
                )} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller name="type" control={control} render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Type</InputLabel>
                    <Select {...field} label="Type">
                      {Object.values(CampaignType).map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                    </Select>
                  </FormControl>
                )} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained">{editingCampaign ? 'Update' : 'Create'}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default EmailCampaigns;
