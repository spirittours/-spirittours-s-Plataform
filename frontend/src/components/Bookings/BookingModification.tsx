import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Stack,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Chip,
  Paper,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CalendarToday as CalendarTodayIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { bookingsService } from '../../services/bookingsService';
import { Booking, Participant } from '../../types/booking.types';

const BookingModification: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newStartDate, setNewStartDate] = useState<Date | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [modificationReason, setModificationReason] = useState('');
  const [priceAdjustment, setPriceAdjustment] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [participantDialogOpen, setParticipantDialogOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);

  // Participant form
  const [participantForm, setParticipantForm] = useState<Participant>({
    id: '',
    firstName: '',
    lastName: '',
    age: 0,
  });

  // Load booking
  useEffect(() => {
    if (id) {
      loadBooking();
    }
  }, [id]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      const data = await bookingsService.getBooking(id!);
      setBooking(data);
      setNewStartDate(new Date(data.tourStartDate));
      setParticipants(data.participants);
    } catch (error) {
      console.error('Failed to load booking:', error);
      toast.error('Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  const handleAddParticipant = () => {
    setEditingParticipant(null);
    setParticipantForm({
      id: `participant_${Date.now()}`,
      firstName: '',
      lastName: '',
      age: 0,
    });
    setParticipantDialogOpen(true);
  };

  const handleEditParticipant = (participant: Participant) => {
    setEditingParticipant(participant);
    setParticipantForm(participant);
    setParticipantDialogOpen(true);
  };

  const handleSaveParticipant = () => {
    if (editingParticipant) {
      setParticipants(participants.map(p => 
        p.id === editingParticipant.id ? participantForm : p
      ));
    } else {
      setParticipants([...participants, participantForm]);
    }
    setParticipantDialogOpen(false);
  };

  const handleRemoveParticipant = (participantId: string) => {
    setParticipants(participants.filter(p => p.id !== participantId));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);

      const modifications = {
        bookingId: id!,
        newStartDate: newStartDate ? format(newStartDate, 'yyyy-MM-dd') : undefined,
        newParticipants: participants,
        priceAdjustment,
        reason: modificationReason,
      };

      await bookingsService.modifyBooking(modifications);
      
      toast.success('Booking modified successfully');
      setConfirmDialogOpen(false);
      navigate(`/bookings/${id}`);
    } catch (error) {
      console.error('Failed to modify booking:', error);
      toast.error('Failed to modify booking');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!booking) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">Booking not found</Typography>
      </Box>
    );
  }

  const hasChanges = 
    (newStartDate && format(newStartDate, 'yyyy-MM-dd') !== booking.tourStartDate) ||
    participants.length !== booking.participants.length ||
    priceAdjustment !== 0;

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          Modify Booking #{booking.bookingNumber}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<CancelIcon />}
          onClick={() => navigate(`/bookings/${id}`)}
        >
          Cancel
        </Button>
      </Box>

      <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
        Modifying a booking may result in price changes or cancellation fees. 
        Please review all changes carefully before confirming.
      </Alert>

      <Grid container spacing={3}>
        {/* Left Column - Modifications */}
        <Grid item xs={12} md={8}>
          {/* Change Tour Date */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarTodayIcon color="primary" />
                Change Tour Date
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary">
                      Current Date
                    </Typography>
                    <Typography variant="h6">
                      {format(new Date(booking.tourStartDate), 'MMM dd, yyyy')}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="New Tour Date"
                      value={newStartDate}
                      onChange={(date) => setNewStartDate(date)}
                      minDate={new Date()}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          helperText: newStartDate && format(newStartDate, 'yyyy-MM-dd') !== booking.tourStartDate
                            ? 'Date will be changed'
                            : 'Select a new date',
                        },
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Modify Participants */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon color="primary" />
                  Modify Participants
                </Typography>
                <Button
                  startIcon={<AddIcon />}
                  variant="outlined"
                  size="small"
                  onClick={handleAddParticipant}
                >
                  Add Participant
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <List>
                {participants.map((participant, index) => (
                  <Paper key={participant.id} sx={{ mb: 1, p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="subtitle2">
                          {participant.firstName} {participant.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Age: {participant.age}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <IconButton size="small" onClick={() => handleEditParticipant(participant)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleRemoveParticipant(participant.id)}
                          disabled={participants.length === 1}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>
                  </Paper>
                ))}
              </List>

              {participants.length !== booking.participants.length && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Participant count changed from {booking.participants.length} to {participants.length}
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Price Adjustment */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Price Adjustment
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <TextField
                fullWidth
                type="number"
                label="Adjustment Amount"
                value={priceAdjustment}
                onChange={(e) => setPriceAdjustment(parseFloat(e.target.value) || 0)}
                helperText="Positive for surcharge, negative for discount"
                InputProps={{
                  startAdornment: booking.pricing.currency,
                }}
              />
            </CardContent>
          </Card>

          {/* Modification Reason */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Reason for Modification
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <TextField
                fullWidth
                multiline
                rows={4}
                label="Reason"
                value={modificationReason}
                onChange={(e) => setModificationReason(e.target.value)}
                placeholder="Explain why this booking is being modified..."
                required
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Summary */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 16 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Modification Summary
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Original Booking
                  </Typography>
                  <Typography variant="body2">
                    #{booking.bookingNumber}
                  </Typography>
                </Box>

                {newStartDate && format(newStartDate, 'yyyy-MM-dd') !== booking.tourStartDate && (
                  <Box>
                    <Chip label="Date Changed" color="primary" size="small" sx={{ mb: 1 }} />
                    <Typography variant="caption" display="block" color="text.secondary">
                      From: {format(new Date(booking.tourStartDate), 'MMM dd, yyyy')}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      To: {format(newStartDate, 'MMM dd, yyyy')}
                    </Typography>
                  </Box>
                )}

                {participants.length !== booking.participants.length && (
                  <Box>
                    <Chip label="Participants Changed" color="primary" size="small" sx={{ mb: 1 }} />
                    <Typography variant="caption" display="block" color="text.secondary">
                      From: {booking.participants.length} people
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      To: {participants.length} people
                    </Typography>
                  </Box>
                )}

                {priceAdjustment !== 0 && (
                  <Box>
                    <Chip label="Price Adjustment" color="warning" size="small" sx={{ mb: 1 }} />
                    <Typography variant="body2">
                      {priceAdjustment > 0 ? '+' : ''}{booking.pricing.currency} {priceAdjustment.toFixed(2)}
                    </Typography>
                  </Box>
                )}

                <Divider />

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Original Amount
                  </Typography>
                  <Typography variant="h6">
                    {booking.pricing.currency} {booking.pricing.total.toFixed(2)}
                  </Typography>
                </Box>

                {priceAdjustment !== 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      New Total
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {booking.pricing.currency} {(booking.pricing.total + priceAdjustment).toFixed(2)}
                    </Typography>
                  </Box>
                )}
              </Stack>

              <Button
                fullWidth
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={() => setConfirmDialogOpen(true)}
                disabled={!hasChanges || !modificationReason.trim() || saving}
                sx={{ mt: 3 }}
              >
                {saving ? <CircularProgress size={24} /> : 'Confirm Modifications'}
              </Button>

              {!hasChanges && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No changes to save
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Participant Dialog */}
      <Dialog open={participantDialogOpen} onClose={() => setParticipantDialogOpen(false)}>
        <DialogTitle>
          {editingParticipant ? 'Edit Participant' : 'Add Participant'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="First Name"
                value={participantForm.firstName}
                onChange={(e) => setParticipantForm({ ...participantForm, firstName: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={participantForm.lastName}
                onChange={(e) => setParticipantForm({ ...participantForm, lastName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Age"
                value={participantForm.age || ''}
                onChange={(e) => setParticipantForm({ ...participantForm, age: parseInt(e.target.value) || 0 })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setParticipantDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveParticipant} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Confirm Booking Modification</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Are you sure you want to modify this booking? This action may affect pricing and availability.
            </Typography>
          </Alert>

          <Typography variant="body2" gutterBottom>
            <strong>Reason:</strong> {modificationReason}
          </Typography>

          {hasChanges && (
            <List dense sx={{ mt: 2 }}>
              {newStartDate && format(newStartDate, 'yyyy-MM-dd') !== booking.tourStartDate && (
                <ListItem>
                  <ListItemText
                    primary="Tour date will be changed"
                    secondary={`To ${format(newStartDate, 'MMM dd, yyyy')}`}
                  />
                </ListItem>
              )}
              {participants.length !== booking.participants.length && (
                <ListItem>
                  <ListItemText
                    primary="Number of participants will change"
                    secondary={`From ${booking.participants.length} to ${participants.length}`}
                  />
                </ListItem>
              )}
              {priceAdjustment !== 0 && (
                <ListItem>
                  <ListItemText
                    primary="Price adjustment"
                    secondary={`${priceAdjustment > 0 ? '+' : ''}${booking.pricing.currency} ${priceAdjustment.toFixed(2)}`}
                  />
                </ListItem>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={24} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BookingModification;
