/**
 * ContactManager Component
 * 
 * Complete contact and lead management interface.
 * Features: list view, search, filters, lead scoring, bulk actions
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Menu,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Tabs,
  Tab,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  WhatsApp as WhatsAppIcon,
  Business as BusinessIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
} from '@mui/icons-material';

const ContactManager = ({ workspaceId }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    leadQuality: '',
  });
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [currentContact, setCurrentContact] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuContact, setMenuContact] = useState(null);

  // New contact form state
  const [newContact, setNewContact] = useState({
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

  // Load contacts
  useEffect(() => {
    loadContacts();
  }, [page, rowsPerPage, searchTerm, filters, tabValue]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      
      const params = {
        workspace: workspaceId,
        skip: page * rowsPerPage,
        limit: rowsPerPage,
        search: searchTerm,
        ...filters,
      };

      // Add tab-specific filters
      if (tabValue === 1) params.type = 'lead';
      if (tabValue === 2) params.type = 'customer';
      if (tabValue === 3) params.leadQuality = 'hot';

      const response = await axios.get('/api/crm/contacts', { params });
      
      setContacts(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle create/update contact
  const handleSaveContact = async () => {
    try {
      if (currentContact) {
        // Update
        await axios.put(`/api/crm/contacts/${currentContact._id}`, newContact);
      } else {
        // Create
        await axios.post('/api/crm/contacts', {
          ...newContact,
          workspace: workspaceId,
        });
      }

      loadContacts();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving contact:', error);
    }
  };

  // Handle delete contact
  const handleDeleteContact = async (contactId) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) {
      return;
    }

    try {
      await axios.delete(`/api/crm/contacts/${contactId}`);
      loadContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action) => {
    try {
      switch (action) {
        case 'delete':
          if (!window.confirm(`Delete ${selectedContacts.length} contacts?`)) {
            return;
          }
          await axios.delete('/api/crm/contacts/bulk-delete', {
            data: {
              workspace: workspaceId,
              contactIds: selectedContacts,
            },
          });
          break;
        
        case 'export':
          // TODO: Implement export functionality
          alert('Export functionality coming soon');
          break;

        default:
          break;
      }

      setSelectedContacts([]);
      loadContacts();
    } catch (error) {
      console.error('Error performing bulk action:', error);
    }
  };

  // Handle convert to customer
  const handleConvertToCustomer = async (contactId) => {
    try {
      await axios.post(`/api/crm/contacts/${contactId}/convert`);
      loadContacts();
    } catch (error) {
      console.error('Error converting contact:', error);
    }
  };

  // Open dialog for new contact
  const handleOpenDialog = (contact = null) => {
    if (contact) {
      setCurrentContact(contact);
      setNewContact({
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company?._id || '',
        jobTitle: contact.jobTitle,
        type: contact.type,
        leadQuality: contact.leadQuality,
        leadScore: contact.leadScore,
        tags: contact.tags,
      });
    } else {
      setCurrentContact(null);
      setNewContact({
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
    }
    setContactDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setContactDialogOpen(false);
    setCurrentContact(null);
  };

  // Get lead quality color
  const getLeadQualityColor = (quality) => {
    switch (quality) {
      case 'hot':
        return 'error';
      case 'warm':
        return 'warning';
      case 'cold':
        return 'info';
      default:
        return 'default';
    }
  };

  // Get type color
  const getTypeColor = (type) => {
    switch (type) {
      case 'lead':
        return 'primary';
      case 'customer':
        return 'success';
      case 'partner':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Contacts
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            startIcon={<ImportIcon />}
            variant="outlined"
          >
            Import
          </Button>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => handleOpenDialog()}
          >
            New Contact
          </Button>
        </Box>
      </Box>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  label="Type"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="lead">Lead</MenuItem>
                  <MenuItem value="customer">Customer</MenuItem>
                  <MenuItem value="partner">Partner</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="converted">Converted</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Lead Quality</InputLabel>
                <Select
                  value={filters.leadQuality}
                  onChange={(e) => setFilters({ ...filters, leadQuality: e.target.value })}
                  label="Lead Quality"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="hot">Hot</MenuItem>
                  <MenuItem value="warm">Warm</MenuItem>
                  <MenuItem value="cold">Cold</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterIcon />}
              >
                More Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab label="All Contacts" />
        <Tab
          label={
            <Badge badgeContent={contacts.filter(c => c.type === 'lead').length} color="primary">
              Leads
            </Badge>
          }
        />
        <Tab
          label={
            <Badge badgeContent={contacts.filter(c => c.type === 'customer').length} color="success">
              Customers
            </Badge>
          }
        />
        <Tab
          label={
            <Badge badgeContent={contacts.filter(c => c.leadQuality === 'hot').length} color="error">
              Hot Leads
            </Badge>
          }
        />
      </Tabs>

      {/* Bulk Actions */}
      {selectedContacts.length > 0 && (
        <Card sx={{ mb: 2, bgcolor: 'primary.light' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography>
                {selectedContacts.length} contacts selected
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ExportIcon />}
                  onClick={() => handleBulkAction('export')}
                >
                  Export
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleBulkAction('delete')}
                >
                  Delete
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Contacts Table */}
      <Card>
        {loading && <LinearProgress />}
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
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Lead Quality</TableCell>
                <TableCell>Lead Score</TableCell>
                <TableCell>Engagement</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact._id} hover>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {contact.first_name?.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {contact.first_name} {contact.last_name}
                        </Typography>
                        {contact.jobTitle && (
                          <Typography variant="caption" color="text.secondary">
                            {contact.jobTitle}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{contact.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{contact.phone}</Typography>
                  </TableCell>
                  <TableCell>
                    {contact.company && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <BusinessIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {contact.company.agency_name || contact.company}
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
                    <Chip
                      label={contact.leadQuality}
                      size="small"
                      color={getLeadQualityColor(contact.leadQuality)}
                      icon={<StarIcon />}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={contact.leadScore}
                        sx={{ flexGrow: 1, height: 6, borderRadius: 1 }}
                      />
                      <Typography variant="caption">{contact.leadScore}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{contact.engagementScore || 0}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <Tooltip title="Call">
                        <IconButton size="small">
                          <PhoneIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Email">
                        <IconButton size="small">
                          <EmailIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="WhatsApp">
                        <IconButton size="small">
                          <WhatsAppIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setMenuContact(contact);
                        }}
                      >
                        <MoreIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
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
            handleOpenDialog(menuContact);
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        {menuContact?.type === 'lead' && (
          <MenuItem
            onClick={() => {
              handleConvertToCustomer(menuContact._id);
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <TrendingUpIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Convert to Customer</ListItemText>
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            handleDeleteContact(menuContact?._id);
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create/Edit Dialog */}
      <Dialog
        open={contactDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {currentContact ? 'Edit Contact' : 'New Contact'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
                fullWidth
                required
                value={newContact.first_name}
                onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Last Name"
                fullWidth
                value={newContact.last_name}
                onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Phone"
                fullWidth
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Job Title"
                fullWidth
                value={newContact.jobTitle}
                onChange={(e) => setNewContact({ ...newContact, jobTitle: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newContact.type}
                  onChange={(e) => setNewContact({ ...newContact, type: e.target.value })}
                  label="Type"
                >
                  <MenuItem value="lead">Lead</MenuItem>
                  <MenuItem value="customer">Customer</MenuItem>
                  <MenuItem value="partner">Partner</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Lead Quality</InputLabel>
                <Select
                  value={newContact.leadQuality}
                  onChange={(e) => setNewContact({ ...newContact, leadQuality: e.target.value })}
                  label="Lead Quality"
                >
                  <MenuItem value="hot">Hot</MenuItem>
                  <MenuItem value="warm">Warm</MenuItem>
                  <MenuItem value="cold">Cold</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Lead Score"
                type="number"
                fullWidth
                value={newContact.leadScore}
                onChange={(e) => setNewContact({ ...newContact, leadScore: parseInt(e.target.value) })}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveContact} variant="contained">
            {currentContact ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContactManager;
