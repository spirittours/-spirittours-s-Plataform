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
  Avatar,
  Rating,
} from '@mui/material';
import { Add, Edit, Visibility, Message } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { SupportTicket, TicketStatus, TicketPriority, TicketCategory } from '../../types/support.types';
import apiClient from '../../services/apiClient';

const SupportTickets: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const { control, handleSubmit, reset } = useForm();

  useEffect(() => { fetchTickets(); }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<SupportTicket[]>('/api/support/tickets');
      setTickets(response.data);
    } catch (err) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      await apiClient.post('/api/support/tickets', data);
      toast.success('Ticket created!');
      await fetchTickets();
      setOpenDialog(false);
    } catch (err) {
      toast.error('Failed to create ticket');
    }
  };

  const getPriorityColor = (priority: TicketPriority) => {
    const colors: Record<TicketPriority, any> = {
      low: 'default',
      medium: 'info',
      high: 'warning',
      urgent: 'error',
      critical: 'error',
    };
    return colors[priority];
  };

  const getStatusColor = (status: TicketStatus) => {
    const colors: Record<TicketStatus, any> = {
      open: 'error',
      in_progress: 'warning',
      waiting_customer: 'info',
      waiting_internal: 'info',
      resolved: 'success',
      closed: 'default',
      cancelled: 'default',
    };
    return colors[status];
  };

  if (loading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === TicketStatus.OPEN).length,
    inProgress: tickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length,
    resolved: tickets.filter(t => t.status === TicketStatus.RESOLVED).length,
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Support Tickets</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>New Ticket</Button>
      </Box>

      <Grid container spacing={3} mb={3}>
        {[
          { label: 'Total', value: stats.total, color: 'primary.main' },
          { label: 'Open', value: stats.open, color: 'error.main' },
          { label: 'In Progress', value: stats.inProgress, color: 'warning.main' },
          { label: 'Resolved', value: stats.resolved, color: 'success.main' },
        ].map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
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
              <TableCell>Ticket #</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id} hover>
                <TableCell><Chip label={ticket.ticketNumber} size="small" /></TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">{ticket.subject}</Typography>
                  {ticket.rating && <Rating value={ticket.rating} size="small" readOnly />}
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar sx={{ width: 24, height: 24 }}>{ticket.customerName[0]}</Avatar>
                    <Typography variant="caption">{ticket.customerName}</Typography>
                  </Box>
                </TableCell>
                <TableCell><Chip label={ticket.priority} size="small" color={getPriorityColor(ticket.priority)} /></TableCell>
                <TableCell><Chip label={ticket.status.replace('_', ' ')} size="small" color={getStatusColor(ticket.status)} /></TableCell>
                <TableCell>{ticket.category}</TableCell>
                <TableCell><Typography variant="caption">{new Date(ticket.createdAt).toLocaleDateString()}</Typography></TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => setSelectedTicket(ticket)}><Visibility fontSize="small" /></IconButton>
                  <IconButton size="small"><Message fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>New Support Ticket</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}><Controller name="subject" control={control} render={({ field }) => <TextField {...field} label="Subject" fullWidth />} /></Grid>
              <Grid item xs={12}><Controller name="description" control={control} render={({ field }) => <TextField {...field} label="Description" multiline rows={4} fullWidth />} /></Grid>
              <Grid item xs={12} md={6}>
                <Controller name="priority" control={control} render={({ field }) => (
                  <FormControl fullWidth><InputLabel>Priority</InputLabel><Select {...field} label="Priority">{Object.values(TicketPriority).map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}</Select></FormControl>
                )} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller name="category" control={control} render={({ field }) => (
                  <FormControl fullWidth><InputLabel>Category</InputLabel><Select {...field} label="Category">{Object.values(TicketCategory).map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</Select></FormControl>
                )} />
              </Grid>
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

export default SupportTickets;
