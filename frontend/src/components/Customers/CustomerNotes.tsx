import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  PushPin as PinIcon,
  Lock as PrivateIcon,
  Description as NoteIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import customersService from '../../services/customersService';
import {
  CustomerNote,
  NoteCategory,
} from '../../types/customer.types';

// ============================================================================
// Props Interface
// ============================================================================

interface CustomerNotesProps {
  customerId: string;
}

// ============================================================================
// Component
// ============================================================================

const CustomerNotes: React.FC<CustomerNotesProps> = ({ customerId }) => {
  // ==========================================================================
  // State Management
  // ==========================================================================

  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add/Edit note dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<CustomerNote | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<NoteCategory>(NoteCategory.GENERAL);
  const [isPinned, setIsPinned] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuNoteId, setMenuNoteId] = useState<string | null>(null);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<CustomerNote | null>(null);

  // ==========================================================================
  // Fetch Notes
  // ==========================================================================

  const fetchNotes = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await customersService.getCustomerNotes(customerId);
      
      // Sort: pinned first, then by date (newest first)
      const sortedNotes = data.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setNotes(sortedNotes);
    } catch (err: any) {
      console.error('Error fetching notes:', err);
      setError(err.message || 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [customerId]);

  // ==========================================================================
  // Handlers - Dialog
  // ==========================================================================

  const handleOpenAddDialog = () => {
    setEditingNote(null);
    setNoteContent('');
    setNoteCategory(NoteCategory.GENERAL);
    setIsPinned(false);
    setIsPrivate(false);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (note: CustomerNote) => {
    setEditingNote(note);
    setNoteContent(note.content);
    setNoteCategory(note.category);
    setIsPinned(note.isPinned);
    setIsPrivate(note.isPrivate);
    setDialogOpen(true);
    handleMenuClose();
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingNote(null);
  };

  // ==========================================================================
  // Handlers - Save Note
  // ==========================================================================

  const handleSaveNote = async () => {
    if (!noteContent.trim()) {
      toast.error('Note content cannot be empty');
      return;
    }

    try {
      setSavingNote(true);

      if (editingNote) {
        // Update existing note
        await customersService.updateCustomerNote(customerId, editingNote.id, {
          content: noteContent,
          category: noteCategory,
          isPinned,
          isPrivate,
        } as any);
        toast.success('Note updated successfully');
      } else {
        // Add new note
        await customersService.addCustomerNote(
          customerId,
          noteContent,
          noteCategory,
          isPinned,
          isPrivate
        );
        toast.success('Note added successfully');
      }

      handleCloseDialog();
      fetchNotes();
    } catch (err: any) {
      console.error('Error saving note:', err);
      toast.error(err.message || 'Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  // ==========================================================================
  // Handlers - Delete Note
  // ==========================================================================

  const handleDeleteClick = (note: CustomerNote) => {
    setNoteToDelete(note);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;

    try {
      await customersService.deleteCustomerNote(customerId, noteToDelete.id);
      toast.success('Note deleted successfully');
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
      fetchNotes();
    } catch (err: any) {
      console.error('Error deleting note:', err);
      toast.error(err.message || 'Failed to delete note');
    }
  };

  // ==========================================================================
  // Handlers - Menu
  // ==========================================================================

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, noteId: string) => {
    setAnchorEl(event.currentTarget);
    setMenuNoteId(noteId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuNoteId(null);
  };

  // ==========================================================================
  // Handlers - Quick Actions
  // ==========================================================================

  const handleTogglePin = async (note: CustomerNote) => {
    try {
      await customersService.updateCustomerNote(customerId, note.id, {
        isPinned: !note.isPinned,
      } as any);
      toast.success(note.isPinned ? 'Note unpinned' : 'Note pinned');
      fetchNotes();
    } catch (err: any) {
      console.error('Error toggling pin:', err);
      toast.error('Failed to update note');
    }
  };

  // ==========================================================================
  // Utility Functions
  // ==========================================================================

  const getCategoryColor = (category: NoteCategory): "default" | "primary" | "error" | "warning" | "success" | "info" => {
    switch (category) {
      case NoteCategory.GENERAL: return 'default';
      case NoteCategory.PREFERENCE: return 'info';
      case NoteCategory.COMPLAINT: return 'error';
      case NoteCategory.COMPLIMENT: return 'success';
      case NoteCategory.PAYMENT: return 'warning';
      case NoteCategory.SPECIAL_REQUEST: return 'primary';
      case NoteCategory.MEDICAL: return 'error';
      case NoteCategory.BEHAVIORAL: return 'warning';
      default: return 'default';
    }
  };

  const formatCategory = (category: NoteCategory): string => {
    return category
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // ==========================================================================
  // Render Loading State
  // ==========================================================================

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // ==========================================================================
  // Render Error State
  // ==========================================================================

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <Box>
      {/* Header with Add Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Customer Notes ({notes.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
        >
          Add Note
        </Button>
      </Box>

      {/* Notes List */}
      {notes.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: 'center' }}>
          <NoteIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No notes yet
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Add internal notes to track important information about this customer
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
            sx={{ mt: 2 }}
          >
            Add First Note
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {notes.map((note) => (
            <Grid item xs={12} key={note.id}>
              <Card variant="outlined" sx={{ position: 'relative' }}>
                {/* Pinned indicator */}
                {note.isPinned && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'warning.light',
                      borderRadius: '50%',
                      p: 0.5,
                    }}
                  >
                    <PinIcon fontSize="small" />
                  </Box>
                )}

                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={formatCategory(note.category)}
                        color={getCategoryColor(note.category)}
                        size="small"
                      />
                      {note.isPrivate && (
                        <Chip
                          label="Private"
                          icon={<PrivateIcon />}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>

                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, note.id)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>

                  <Typography variant="body1" sx={{ whiteSpace: 'pre-line', mb: 2 }}>
                    {note.content}
                  </Typography>

                  <Divider sx={{ my: 1 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                        {note.createdByName?.charAt(0) || '?'}
                      </Avatar>
                      <Typography variant="caption" color="text.secondary">
                        {note.createdByName || 'Unknown'}
                      </Typography>
                    </Box>

                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(note.createdAt), 'MMM dd, yyyy HH:mm')}
                      {note.updatedAt && note.updatedAt !== note.createdAt && ' (edited)'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            const note = notes.find((n) => n.id === menuNoteId);
            if (note) handleTogglePin(note);
            handleMenuClose();
          }}
        >
          <PinIcon sx={{ mr: 1 }} />
          {notes.find((n) => n.id === menuNoteId)?.isPinned ? 'Unpin' : 'Pin'} Note
        </MenuItem>
        <MenuItem
          onClick={() => {
            const note = notes.find((n) => n.id === menuNoteId);
            if (note) handleOpenEditDialog(note);
          }}
        >
          <EditIcon sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            const note = notes.find((n) => n.id === menuNoteId);
            if (note) handleDeleteClick(note);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Add/Edit Note Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingNote ? 'Edit Note' : 'Add Note'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Note Content"
              multiline
              rows={6}
              fullWidth
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Enter note details..."
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={noteCategory}
                label="Category"
                onChange={(e) => setNoteCategory(e.target.value as NoteCategory)}
              >
                {Object.values(NoteCategory).map((category) => (
                  <MenuItem key={category} value={category}>
                    {formatCategory(category)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Checkbox
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                />
              }
              label="Pin this note"
              sx={{ mb: 1 }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                />
              }
              label="Mark as private (visible to admins only)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={savingNote}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveNote}
            variant="contained"
            disabled={savingNote}
            startIcon={savingNote ? <CircularProgress size={20} /> : null}
          >
            {savingNote ? 'Saving...' : editingNote ? 'Update' : 'Add Note'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Note</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this note? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerNotes;
