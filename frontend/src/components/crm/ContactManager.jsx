/**
 * ContactManager Component
 * 
 * Comprehensive contact and lead management interface.
 * Features include list view, search, filtering, lead scoring, and bulk operations.
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  TablePagination,
  Chip,
  IconButton,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Avatar,
  Tooltip,
  LinearProgress,
  Menu,
  Checkbox,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  WhatsApp as WhatsAppIcon,
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon,
  MoreVert as MoreVertIcon,
  Star as StarIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';

const ContactManager = ({ workspaceId }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterQuality, setFilterQuality] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalContacts, setTotalContacts] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    jobTitle: '',
    type: 'lead',
    leadQuality: 'warm',
    leadScore: 50,
    tags: [],
  });

  useEffect(() => {
    fetchContacts();
  }, [workspaceId, page, rowsPerPage, searchQuery, filterType, filterQuality]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const params = {
        workspace: workspaceId,
        limit: rowsPerPage,
        skip: page * rowsPerPage,
      };

      if (searchQuery) params.search = searchQuery;
      if (filterType !== 'all') params.type = filterType;
      if (filterQuality !== 'all') params.leadQuality = filterQuality;

      const response = await axios.get('/api/crm/contacts', {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      setContacts(response.data.data);
      setTotalContacts(response.data.total);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setLoading(false);
    }
  };

  const handleCreateContact = async () => {
    try {
      await axios.post(
        '/api/crm/contacts',
        { ...formData, workspace: workspaceId },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchContacts();
      setOpenDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error creating contact:', error);
    }
  };

  const handleUpdateContact = async () => {
    try {
      await axios.put(
        `/api/crm/contacts/${selectedContact._id}`,
        formData,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchContacts();
      setOpenDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error updating contact:', error);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      try {
        await axios.delete(`/api/crm/contacts/${contactId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        fetchContacts();
      } catch (error) {
        console.error('Error deleting contact:', error);
      }
    }
  };

  const handleRecordActivity = async (contactId, type) => {
    try {
      await axios.post(
        `/api/crm/contacts/${contactId}/activity`,
        { type },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchContacts(); // Refresh to show updated engagement
    } catch (error) {
      console.error('Error recording activity:', error);
    }
  };

  const handleConvertToCustomer = async (contactId) => {
    try {
      await axios.post(
        `/api/crm/contacts/${contactId}/convert`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchContacts();
    } catch (error) {
      console.error('Error converting contact:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedContacts.length} contacts?`)) {
      try {
        await axios.delete('/api/crm/contacts/bulk-delete', {
          data: { contactIds: selectedContacts, workspace: workspaceId },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setSelectedContacts([]);
        fetchContacts();
      } catch (error) {
        console.error('Error bulk deleting contacts:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company: '',
      jobTitle: '',
      type: 'lead',
      leadQuality: 'warm',
      leadScore: 50,
      tags: [],
    });
    setSelectedContact(null);
  };

  const openEditDialog = (contact) => {
    setSelectedContact(contact);
    setFormData({
      first_name: contact.first_name,
      last_name: contact.last_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      company: contact.company || '',
      jobTitle: contact.jobTitle || '',
      type: contact.type,
      leadQuality: contact.leadQuality,
      leadScore: contact.leadScore,
      tags: contact.tags || [],
    });
    setOpenDialog(true);
  };

  const getLeadQualityColor = (quality) => {
    const colors = { hot: 'error', warm: 'warning', cold: 'info' };
    return colors[quality] || 'default';
  };

  const getTypeColor = (type) => {
    const colors = {
      lead: 'primary',
      customer: 'success',
      partner: 'secondary',
      vendor: 'default',
    };
    return colors[type] || 'default';
  };

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Contacts & Leads</Typography>
        <Box display="flex" gap={2}>
          {selectedContacts.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleBulkDelete}
            >
              Delete {selectedContacts.length}
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            New Contact
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label="Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="lead">Leads</MenuItem>
                  <MenuItem value="customer">Customers</MenuItem>
                  <MenuItem value="partner">Partners</MenuItem>
                  <MenuItem value="vendor">Vendors</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Lead Quality</InputLabel>
                <Select
                  value={filterQuality}
                  onChange={(e) => setFilterQuality(e.target.value)}
                  label="Lead Quality"
                >
                  <MenuItem value="all">All Qualities</MenuItem>
                  <MenuItem value="hot">Hot</MenuItem>
                  <MenuItem value="warm">Warm</MenuItem>
                  <MenuItem value="cold">Cold</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Typography variant="body2" color="textSecondary">
                {totalContacts} contacts
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedContacts.length === contacts.length && contacts.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedContacts(contacts.map(c => c._id));
                      } else {
                        setSelectedContacts([]);
                      }
                    }}
                  />
                </TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Lead Score</TableCell>
                <TableCell>Quality</TableCell>
                <TableCell>Engagement</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <LinearProgress />
                  </TableCell>
                </TableRow>
              ) : contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="textSecondary">
                      No contacts found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact) => (
                  <TableRow
                    key={contact._id}
                    hover
                    selected={selectedContacts.includes(contact._id)}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedContacts.includes(contact._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedContacts([...selectedContacts, contact._id]);
                          } else {
                            setSelectedContacts(selectedContacts.filter(id => id !== contact._id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar>{contact.first_name?.[0]}</Avatar>
                        <Box>
                          <Typography variant="body1">
                            {contact.first_name} {contact.last_name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {contact.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {contact.company && (
                        <Box display="flex" alignItems="center" gap={1}>
                          <BusinessIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {contact.company?.agency_name || contact.company}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={contact.type}
                        size="small"
                        color={getTypeColor(contact.type)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LinearProgress
                          variant="determinate"
                          value={contact.leadScore}
                          sx={{ width: 60, height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="body2">{contact.leadScore}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={contact.leadQuality}
                        size="small"
                        color={getLeadQualityColor(contact.leadQuality)}
                        icon={<StarIcon />}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {contact.engagementScore} points
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        📧{contact.interactions?.emails} ☎️{contact.interactions?.calls} 🤝{contact.interactions?.meetings}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="Call">
                          <IconButton
                            size="small"
                            onClick={() => handleRecordActivity(contact._id, 'call')}
                          >
                            <PhoneIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Email">
                          <IconButton
                            size="small"
                            onClick={() => handleRecordActivity(contact._id, 'email')}
                          >
                            <EmailIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEditDialog(contact)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="More">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              setAnchorEl(e.currentTarget);
                              setSelectedContact(contact);
                            }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={totalContacts}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Card>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem
          onClick={() => {
            handleConvertToCustomer(selectedContact?._id);
            setAnchorEl(null);
          }}
        >
          Convert to Customer
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleDeleteContact(selectedContact?._id);
            setAnchorEl(null);
          }}
        >
          Delete
        </MenuItem>
      </Menu>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedContact ? 'Edit Contact' : 'Create New Contact'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={1}>
            <Grid item xs={12} md={6}>
              <TextField
                label="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Job Title"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  label="Type"
                >
                  <MenuItem value="lead">Lead</MenuItem>
                  <MenuItem value="customer">Customer</MenuItem>
                  <MenuItem value="partner">Partner</MenuItem>
                  <MenuItem value="vendor">Vendor</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Lead Quality</InputLabel>
                <Select
                  value={formData.leadQuality}
                  onChange={(e) => setFormData({ ...formData, leadQuality: e.target.value })}
                  label="Lead Quality"
                >
                  <MenuItem value="hot">Hot</MenuItem>
                  <MenuItem value="warm">Warm</MenuItem>
                  <MenuItem value="cold">Cold</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Lead Score"
                type="number"
                value={formData.leadScore}
                onChange={(e) => setFormData({ ...formData, leadScore: parseInt(e.target.value) })}
                fullWidth
                InputProps={{ inputProps: { min: 0, max: 100 } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={selectedContact ? handleUpdateContact : handleCreateContact}
            variant="contained"
            color="primary"
          >
            {selectedContact ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContactManager;
