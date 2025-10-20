import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Autocomplete,
  DateTimePicker,
  Alert,
  AlertTitle,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Tooltip,
  Badge,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
  TimelineOppositeContent,
  Collapse,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  Checkbox,
  FormGroup,
  RadioGroup,
  Radio,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';

import {
  Lock,
  LockOpen,
  AccessTime,
  Block,
  CheckCircle,
  Warning,
  Error,
  Person,
  Group,
  Business,
  Email,
  CalendarToday,
  Schedule,
  LocationOn,
  VpnKey,
  Security,
  VerifiedUser,
  Shield,
  AdminPanelSettings,
  ManageAccounts,
  Timer,
  TimerOff,
  EventAvailable,
  EventBusy,
  TravelExplore,
  Flight,
  Hotel,
  LocalActivity,
  QrCode2,
  Fingerprint,
  DeviceHub,
  PhoneAndroid,
  Computer,
  CloudSync,
  CloudOff,
  PlayCircleOutline,
  PauseCircleOutline,
  StopCircle,
  Refresh,
  Download,
  Upload,
  Settings,
  MoreVert,
  Add,
  Remove,
  Edit,
  Delete,
  Save,
  Cancel,
  Send,
  History,
  Analytics,
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays, differenceInDays, isPast, isFuture } from 'date-fns';

// Types
interface AccessGrant {
  grant_id: string;
  user_id: string;
  user_email?: string;
  access_level: string;
  access_type: string;
  status: string;
  activation_date: Date;
  expiration_date?: Date;
  trip_id?: string;
  allowed_destinations?: number[];
  usage_count: number;
  usage_limit?: number;
  granted_by?: string;
  agency_id?: string;
  notes?: string;
}

interface Agency {
  id: string;
  name: string;
  email: string;
  access_enabled: boolean;
  client_limit?: number;
  active_clients: number;
  valid_until?: Date;
}

interface AccessRequest {
  id: string;
  requester: string;
  type: string;
  status: string;
  requested_date: Date;
  details: any;
}

// Main Component
const AccessControlPanel: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState(0);
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [selectedGrant, setSelectedGrant] = useState<AccessGrant | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  
  // Dialogs
  const [grantAccessDialog, setGrantAccessDialog] = useState(false);
  const [bulkAccessDialog, setBulkAccessDialog] = useState(false);
  const [agencyDialog, setAgencyDialog] = useState(false);
  const [revokeDialog, setRevokeDialog] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Load data
  useEffect(() => {
    loadAccessGrants();
    loadAgencies();
    loadAccessRequests();
  }, []);
  
  const loadAccessGrants = async () => {
    try {
      const response = await fetch('/api/admin/access/grants');
      const data = await response.json();
      setGrants(data);
    } catch (error) {
      console.error('Failed to load grants:', error);
    }
  };
  
  const loadAgencies = async () => {
    try {
      const response = await fetch('/api/admin/access/agencies');
      const data = await response.json();
      setAgencies(data);
    } catch (error) {
      console.error('Failed to load agencies:', error);
    }
  };
  
  const loadAccessRequests = async () => {
    try {
      const response = await fetch('/api/admin/access/requests');
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Failed to load requests:', error);
    }
  };
  
  // Grant Access Dialog Component
  const GrantAccessDialog: React.FC = () => {
    const [formData, setFormData] = useState({
      email: '',
      access_level: 'standard',
      access_type: 'time_limited',
      duration_days: 30,
      trip_id: '',
      destinations: [] as number[],
      features: [] as string[],
      activation_date: new Date(),
      expiration_date: addDays(new Date(), 30),
      usage_limit: null as number | null,
      daily_limit: null as number | null,
      ip_whitelist: [] as string[],
      device_whitelist: [] as string[],
      require_2fa: false,
      watermark: true,
      notes: ''
    });
    
    const availableFeatures = [
      'virtual_guide',
      'navigation',
      'offline_maps',
      'voice_interaction',
      'multi_language',
      'personality_selection',
      'ar_mode',
      'group_sync',
      'analytics',
      'api_access'
    ];
    
    const handleSubmit = async () => {
      try {
        await fetch('/api/admin/access/grant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        setGrantAccessDialog(false);
        loadAccessGrants();
      } catch (error) {
        console.error('Failed to grant access:', error);
      }
    };
    
    return (
      <Dialog open={grantAccessDialog} onClose={() => setGrantAccessDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Grant Virtual Guide Access</DialogTitle>
        <DialogContent>
          <Stepper activeStep={0} orientation="vertical">
            <Step>
              <StepLabel>User Information</StepLabel>
              <StepContent>
                <TextField
                  fullWidth
                  label="User Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  sx={{ mt: 2 }}
                />
                
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Access Level</InputLabel>
                  <Select
                    value={formData.access_level}
                    onChange={(e) => setFormData({ ...formData, access_level: e.target.value })}
                    label="Access Level"
                  >
                    <MenuItem value="demo">Demo</MenuItem>
                    <MenuItem value="basic">Basic</MenuItem>
                    <MenuItem value="standard">Standard</MenuItem>
                    <MenuItem value="premium">Premium</MenuItem>
                    <MenuItem value="vip">VIP</MenuItem>
                    <MenuItem value="unlimited">Unlimited</MenuItem>
                  </Select>
                </FormControl>
              </StepContent>
            </Step>
            
            <Step>
              <StepLabel>Access Period</StepLabel>
              <StepContent>
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Access Type</InputLabel>
                  <Select
                    value={formData.access_type}
                    onChange={(e) => setFormData({ ...formData, access_type: e.target.value })}
                    label="Access Type"
                  >
                    <MenuItem value="trip_based">Trip Based</MenuItem>
                    <MenuItem value="time_limited">Time Limited</MenuItem>
                    <MenuItem value="usage_limited">Usage Limited</MenuItem>
                    <MenuItem value="subscription">Subscription</MenuItem>
                    <MenuItem value="promotional">Promotional</MenuItem>
                  </Select>
                </FormControl>
                
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <DateTimePicker
                        label="Activation Date"
                        value={formData.activation_date}
                        onChange={(date) => setFormData({ ...formData, activation_date: date || new Date() })}
                        renderInput={(params) => <TextField {...params} fullWidth />}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <DateTimePicker
                        label="Expiration Date"
                        value={formData.expiration_date}
                        onChange={(date) => setFormData({ ...formData, expiration_date: date || new Date() })}
                        renderInput={(params) => <TextField {...params} fullWidth />}
                      />
                    </Grid>
                  </Grid>
                </LocalizationProvider>
                
                {formData.access_type === 'trip_based' && (
                  <TextField
                    fullWidth
                    label="Trip ID"
                    value={formData.trip_id}
                    onChange={(e) => setFormData({ ...formData, trip_id: e.target.value })}
                    sx={{ mt: 2 }}
                  />
                )}
                
                {formData.access_type === 'usage_limited' && (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Usage Limit"
                        type="number"
                        value={formData.usage_limit || ''}
                        onChange={(e) => setFormData({ ...formData, usage_limit: parseInt(e.target.value) })}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Daily Limit"
                        type="number"
                        value={formData.daily_limit || ''}
                        onChange={(e) => setFormData({ ...formData, daily_limit: parseInt(e.target.value) })}
                      />
                    </Grid>
                  </Grid>
                )}
              </StepContent>
            </Step>
            
            <Step>
              <StepLabel>Features & Destinations</StepLabel>
              <StepContent>
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Allowed Features</InputLabel>
                  <Select
                    multiple
                    value={formData.features}
                    onChange={(e) => setFormData({ ...formData, features: e.target.value as string[] })}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {availableFeatures.map((feature) => (
                      <MenuItem key={feature} value={feature}>
                        <Checkbox checked={formData.features.includes(feature)} />
                        <ListItemText primary={feature.replace('_', ' ')} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Autocomplete
                  multiple
                  options={[1, 2, 3, 4, 5]} // Would load from destinations API
                  value={formData.destinations}
                  onChange={(_, value) => setFormData({ ...formData, destinations: value })}
                  renderInput={(params) => (
                    <TextField {...params} label="Allowed Destinations" sx={{ mt: 2 }} />
                  )}
                />
              </StepContent>
            </Step>
            
            <Step>
              <StepLabel>Security Settings</StepLabel>
              <StepContent>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.require_2fa}
                        onChange={(e) => setFormData({ ...formData, require_2fa: e.target.checked })}
                      />
                    }
                    label="Require 2FA"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.watermark}
                        onChange={(e) => setFormData({ ...formData, watermark: e.target.checked })}
                      />
                    }
                    label="Enable Watermark"
                  />
                </FormGroup>
                
                <TextField
                  fullWidth
                  label="IP Whitelist (comma separated)"
                  value={formData.ip_whitelist.join(', ')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    ip_whitelist: e.target.value.split(',').map(ip => ip.trim()).filter(ip => ip)
                  })}
                  sx={{ mt: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="Device Whitelist (comma separated)"
                  value={formData.device_whitelist.join(', ')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    device_whitelist: e.target.value.split(',').map(d => d.trim()).filter(d => d)
                  })}
                  sx={{ mt: 2 }}
                />
                
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  sx={{ mt: 2 }}
                />
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGrantAccessDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" startIcon={<CheckCircle />}>
            Grant Access
          </Button>
        </DialogActions>
      </Dialog>
    );
  };
  
  // Active Grants Tab
  const ActiveGrantsTab: React.FC = () => {
    const filteredGrants = grants.filter(grant => {
      if (statusFilter !== 'all' && grant.status !== statusFilter) return false;
      if (levelFilter !== 'all' && grant.access_level !== levelFilter) return false;
      if (searchTerm && !grant.user_email?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
    
    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" gap={2}>
            <TextField
              size="small"
              placeholder="Search by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Email sx={{ mr: 1 }} />
              }}
            />
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="expired">Expired</MenuItem>
                <MenuItem value="revoked">Revoked</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Level</InputLabel>
              <Select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                label="Level"
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="demo">Demo</MenuItem>
                <MenuItem value="basic">Basic</MenuItem>
                <MenuItem value="standard">Standard</MenuItem>
                <MenuItem value="premium">Premium</MenuItem>
                <MenuItem value="vip">VIP</MenuItem>
                <MenuItem value="unlimited">Unlimited</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<Upload />}
              onClick={() => setBulkAccessDialog(true)}
            >
              Bulk Import
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setGrantAccessDialog(true)}
            >
              Grant Access
            </Button>
          </Box>
        </Box>
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Access Level</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Valid Period</TableCell>
                <TableCell>Usage</TableCell>
                <TableCell>Destinations</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredGrants.map((grant) => (
                <TableRow key={grant.grant_id}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Person sx={{ mr: 1 }} />
                      <Box>
                        <Typography variant="body2">{grant.user_email || grant.user_id}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {grant.grant_id}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={grant.access_level}
                      size="small"
                      color={getAccessLevelColor(grant.access_level)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {grant.access_type.replace('_', ' ')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={grant.status}
                      size="small"
                      color={getStatusColor(grant.status)}
                      icon={getStatusIcon(grant.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {format(grant.activation_date, 'MMM dd, yyyy')}
                      </Typography>
                      {grant.expiration_date && (
                        <>
                          <Typography variant="caption" color="textSecondary">
                            to {format(grant.expiration_date, 'MMM dd, yyyy')}
                          </Typography>
                          <Typography variant="caption" display="block" color={
                            isPast(grant.expiration_date) ? 'error' : 'textSecondary'
                          }>
                            ({differenceInDays(grant.expiration_date, new Date())} days)
                          </Typography>
                        </>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {grant.usage_limit ? (
                      <Box display="flex" alignItems="center">
                        <Typography variant="body2">
                          {grant.usage_count}/{grant.usage_limit}
                        </Typography>
                        <Box sx={{ ml: 1, width: 50 }}>
                          <LinearProgress
                            variant="determinate"
                            value={(grant.usage_count / grant.usage_limit) * 100}
                            color={grant.usage_count >= grant.usage_limit ? 'error' : 'primary'}
                          />
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body2">{grant.usage_count}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {grant.allowed_destinations?.length ? (
                      <Chip
                        label={`${grant.allowed_destinations.length} destinations`}
                        size="small"
                      />
                    ) : (
                      <Chip label="All" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => {
                          setSelectedGrant(grant);
                          setGrantAccessDialog(true);
                        }}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      
                      {grant.status === 'active' && (
                        <Tooltip title="Suspend">
                          <IconButton size="small" onClick={() => handleSuspend(grant)}>
                            <PauseCircleOutline />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {grant.status === 'suspended' && (
                        <Tooltip title="Resume">
                          <IconButton size="small" onClick={() => handleResume(grant)}>
                            <PlayCircleOutline />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      <Tooltip title="Revoke">
                        <IconButton size="small" color="error" onClick={() => {
                          setSelectedGrant(grant);
                          setRevokeDialog(true);
                        }}>
                          <Block />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };
  
  // Agency Management Tab
  const AgencyManagementTab: React.FC = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Travel Agencies</Typography>
          <Button
            variant="contained"
            startIcon={<Business />}
            onClick={() => setAgencyDialog(true)}
          >
            Add Agency
          </Button>
        </Box>
      </Grid>
      
      {agencies.map((agency) => (
        <Grid item xs={12} md={6} lg={4} key={agency.id}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">{agency.name}</Typography>
                <Switch
                  checked={agency.access_enabled}
                  onChange={(e) => handleAgencyToggle(agency, e.target.checked)}
                />
              </Box>
              
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {agency.email}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Client Limit
                  </Typography>
                  <Typography variant="body1">
                    {agency.client_limit || 'Unlimited'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Active Clients
                  </Typography>
                  <Typography variant="body1">
                    {agency.active_clients}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">
                    Valid Until
                  </Typography>
                  <Typography variant="body1">
                    {agency.valid_until ? format(agency.valid_until, 'MMM dd, yyyy') : 'No expiration'}
                  </Typography>
                </Grid>
              </Grid>
              
              <Box mt={2} display="flex" gap={1}>
                <Button size="small" startIcon={<Group />}>
                  View Clients
                </Button>
                <Button size="small" startIcon={<Settings />}>
                  Configure
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
  
  // Analytics Tab
  const AccessAnalyticsTab: React.FC = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Active Grants
            </Typography>
            <Typography variant="h3">
              {grants.filter(g => g.status === 'active').length}
            </Typography>
            <Typography variant="body2" color="success.main">
              <TrendingUp /> +15% this week
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Fraud Attempts Blocked
            </Typography>
            <Typography variant="h3">
              23
            </Typography>
            <Typography variant="body2" color="error.main">
              Last 30 days
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Agency Clients
            </Typography>
            <Typography variant="h3">
              {agencies.reduce((sum, a) => sum + a.active_clients, 0)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Across {agencies.length} agencies
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Revenue Impact
            </Typography>
            <Typography variant="h3">
              $45.2K
            </Typography>
            <Typography variant="body2" color="success.main">
              <TrendingUp /> +32% vs last month
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
  
  // Helper functions
  const getAccessLevelColor = (level: string): any => {
    const colors: Record<string, any> = {
      demo: 'default',
      basic: 'info',
      standard: 'primary',
      premium: 'secondary',
      vip: 'warning',
      unlimited: 'success'
    };
    return colors[level] || 'default';
  };
  
  const getStatusColor = (status: string): any => {
    const colors: Record<string, any> = {
      active: 'success',
      pending: 'warning',
      expired: 'default',
      revoked: 'error',
      suspended: 'warning'
    };
    return colors[status] || 'default';
  };
  
  const getStatusIcon = (status: string) => {
    const icons: Record<string, JSX.Element> = {
      active: <CheckCircle />,
      pending: <Schedule />,
      expired: <TimerOff />,
      revoked: <Block />,
      suspended: <PauseCircleOutline />
    };
    return icons[status] || null;
  };
  
  const handleSuspend = async (grant: AccessGrant) => {
    await fetch(`/api/admin/access/grants/${grant.grant_id}/suspend`, {
      method: 'POST'
    });
    loadAccessGrants();
  };
  
  const handleResume = async (grant: AccessGrant) => {
    await fetch(`/api/admin/access/grants/${grant.grant_id}/resume`, {
      method: 'POST'
    });
    loadAccessGrants();
  };
  
  const handleAgencyToggle = async (agency: Agency, enabled: boolean) => {
    await fetch(`/api/admin/access/agencies/${agency.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_enabled: enabled })
    });
    loadAgencies();
  };
  
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Access Control Management
      </Typography>
      
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Active Grants" icon={<VpnKey />} />
        <Tab label="Agencies" icon={<Business />} />
        <Tab label="Pending Requests" icon={<Schedule />} />
        <Tab label="Analytics" icon={<Analytics />} />
        <Tab label="Fraud Detection" icon={<Security />} />
      </Tabs>
      
      {activeTab === 0 && <ActiveGrantsTab />}
      {activeTab === 1 && <AgencyManagementTab />}
      {activeTab === 2 && <PendingRequestsTab />}
      {activeTab === 3 && <AccessAnalyticsTab />}
      {activeTab === 4 && <FraudDetectionTab />}
      
      {/* Dialogs */}
      <GrantAccessDialog />
    </Box>
  );
};

// Additional tab components
const PendingRequestsTab: React.FC = () => <Box>Pending Requests</Box>;
const FraudDetectionTab: React.FC = () => <Box>Fraud Detection</Box>;

// Missing import
import { LinearProgress } from '@mui/material';

export default AccessControlPanel;