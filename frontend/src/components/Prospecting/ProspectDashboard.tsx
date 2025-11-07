/**
 * Prospect Dashboard
 * Fase 8 - B2B Prospecting System
 * 
 * Complete lead management UI for the 24/7 automated prospecting system.
 * 
 * Features:
 * - Real-time prospect discovery monitoring
 * - Lead quality visualization
 * - Geographic distribution maps
 * - Business type breakdown
 * - Outreach campaign management
 * - Performance analytics
 * - Prospect search and filtering
 * - Bulk actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid, Paper, Typography, Box, Card, CardContent, Button,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Chip, IconButton, Tooltip, LinearProgress, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Dialog, DialogTitle, DialogContent,
  DialogActions, Tabs, Tab, Alert, Badge, Divider, Switch,
  FormControlLabel
} from '@mui/material';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
  Search, FilterList, Download, Email, Phone, WhatsApp,
  Business, LocationOn, Star, TrendingUp, Refresh,
  PlayArrow, Pause, Edit, Delete, Visibility, Close,
  Check, Campaign as CampaignIcon, Add, Settings
} from '@mui/icons-material';

// Types
interface Prospect {
  _id: string;
  business_name: string;
  business_type: string;
  city: string;
  state_province?: string;
  country: string;
  country_code: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  lead_score: number;
  quality_score: number;
  status: 'new' | 'verified' | 'contacted' | 'responded' | 'converted' | 'rejected';
  source: string;
  created_at: string;
  outreach?: {
    email_sent: boolean;
    whatsapp_sent: boolean;
    call_attempted: boolean;
    response_received: boolean;
    interested: boolean;
  };
}

interface Campaign {
  _id: string;
  name: string;
  status: string;
  stats: {
    totalProspects: number;
    contacted: number;
    responded: number;
    converted: number;
  };
  startDate: string;
}

interface ProspectingStats {
  total: number;
  byStatus: Record<string, number>;
  byCountry: Record<string, number>;
  byType: Record<string, number>;
  averageLeadScore: number;
  conversionRate: number;
}

const ProspectDashboard: React.FC = () => {
  // State
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<ProspectingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [prospectingRunning, setProspectingRunning] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [minLeadScore, setMinLeadScore] = useState(0);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [newCampaignData, setNewCampaignData] = useState({
    name: '',
    targetCountries: [] as string[],
    targetTypes: [] as string[],
    minLeadScore: 50
  });
  
  // Tab
  const [activeTab, setActiveTab] = useState(0);

  // Colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  // Business type labels (matching backend)
  const businessTypeLabels: Record<string, string> = {
    travel_agency_receptive: 'Agencia de viaje receptiva',
    travel_agency_wholesale: 'Agencia mayorista',
    tour_operator_receptive: 'Tour operador receptivo',
    tour_operator_wholesale: 'Tour operador mayorista',
    tour_operator_airline: 'Tour operador aéreo',
    tour_operator_cruise: 'Tour operador de cruceros',
    service_platform: 'Plataforma de servicios',
    church_catholic: 'Iglesia Católica',
    church_evangelical: 'Iglesia Evangélica',
    church_assembly_of_god: 'Asamblea de Dios',
    church_other: 'Otra denominación',
    tour_leader: 'Líder de tours',
    religious_leader: 'Líder religioso',
    university: 'Universidad'
  };

  // Load data
  useEffect(() => {
    loadProspects();
    loadCampaigns();
    loadStats();
    checkProspectingStatus();
  }, [filterCountry, filterType, filterStatus, minLeadScore]);

  const loadProspects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCountry !== 'all') params.append('country', filterCountry);
      if (filterType !== 'all') params.append('type', filterType);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (minLeadScore > 0) params.append('minScore', minLeadScore.toString());
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/prospects?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProspects(data.prospects || []);
      }
    } catch (error) {
      console.error('Error loading prospects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/prospects/stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const checkProspectingStatus = async () => {
    try {
      const response = await fetch('/api/prospecting/status', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProspectingRunning(data.running);
      }
    } catch (error) {
      console.error('Error checking prospecting status:', error);
    }
  };

  const toggleProspecting = async () => {
    try {
      const endpoint = prospectingRunning ? '/api/prospecting/stop' : '/api/prospecting/start';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        setProspectingRunning(!prospectingRunning);
      }
    } catch (error) {
      console.error('Error toggling prospecting:', error);
    }
  };

  const handleViewProspect = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setViewDialogOpen(true);
  };

  const handleStartOutreach = async (prospectId: string, channel: string) => {
    try {
      const response = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ prospectId, channel })
      });
      
      if (response.ok) {
        loadProspects();
      }
    } catch (error) {
      console.error('Error starting outreach:', error);
    }
  };

  const handleCreateCampaign = async () => {
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newCampaignData)
      });
      
      if (response.ok) {
        setCampaignDialogOpen(false);
        loadCampaigns();
        setNewCampaignData({
          name: '',
          targetCountries: [],
          targetTypes: [],
          minLeadScore: 50
        });
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const getLeadScoreColor = (score: number) => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    return '#f44336';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: '#2196f3',
      verified: '#4caf50',
      contacted: '#ff9800',
      responded: '#9c27b0',
      converted: '#4caf50',
      rejected: '#f44336'
    };
    return colors[status] || '#757575';
  };

  // Render statistics cards
  const renderStatsCards = () => {
    if (!stats) return null;

    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Business sx={{ color: '#2196f3', mr: 1 }} />
                <Typography variant="h6">Total Prospects</Typography>
              </Box>
              <Typography variant="h4">{stats.total.toLocaleString()}</Typography>
              <Typography variant="body2" color="textSecondary">
                Across {Object.keys(stats.byCountry).length} countries
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Star sx={{ color: '#ff9800', mr: 1 }} />
                <Typography variant="h6">Avg Lead Score</Typography>
              </Box>
              <Typography variant="h4">{stats.averageLeadScore.toFixed(0)}</Typography>
              <LinearProgress
                variant="determinate"
                value={stats.averageLeadScore}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp sx={{ color: '#4caf50', mr: 1 }} />
                <Typography variant="h6">Conversion Rate</Typography>
              </Box>
              <Typography variant="h4">{(stats.conversionRate * 100).toFixed(1)}%</Typography>
              <Typography variant="body2" color="textSecondary">
                {stats.byStatus.converted || 0} converted
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CampaignIcon sx={{ color: '#9c27b0', mr: 1 }} />
                <Typography variant="h6">Active Campaigns</Typography>
              </Box>
              <Typography variant="h4">{campaigns.filter(c => c.status === 'active').length}</Typography>
              <Typography variant="body2" color="textSecondary">
                {campaigns.length} total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  // Render charts
  const renderCharts = () => {
    if (!stats) return null;

    const countryData = Object.entries(stats.byCountry).map(([country, count]) => ({
      name: country,
      value: count
    }));

    const typeData = Object.entries(stats.byType).map(([type, count]) => ({
      name: businessTypeLabels[type] || type,
      value: count
    }));

    const statusData = Object.entries(stats.byStatus).map(([status, count]) => ({
      name: status,
      value: count
    }));

    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>By Country</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={countryData.slice(0, 10)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {countryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>By Business Type</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={typeData.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>By Status</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  // Render prospect table
  const renderProspectTable = () => {
    const filteredProspects = prospects.filter(p => 
      p.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.city.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const paginatedProspects = filteredProspects.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );

    return (
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search prospects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: <Search sx={{ color: 'action.active', mr: 1 }} />
            }}
            sx={{ flex: 1 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Country</InputLabel>
            <Select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)}>
              <MenuItem value="all">All Countries</MenuItem>
              <MenuItem value="ES">Spain</MenuItem>
              <MenuItem value="MX">Mexico</MenuItem>
              <MenuItem value="AR">Argentina</MenuItem>
              <MenuItem value="CO">Colombia</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="new">New</MenuItem>
              <MenuItem value="verified">Verified</MenuItem>
              <MenuItem value="contacted">Contacted</MenuItem>
              <MenuItem value="responded">Responded</MenuItem>
              <MenuItem value="converted">Converted</MenuItem>
            </Select>
          </FormControl>
          
          <Button variant="outlined" onClick={loadProspects} startIcon={<Refresh />}>
            Refresh
          </Button>
        </Box>
        
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Business</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Lead Score</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Outreach</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <LinearProgress />
                  </TableCell>
                </TableRow>
              ) : paginatedProspects.map((prospect) => (
                <TableRow key={prospect._id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {prospect.business_name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {prospect.source}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {businessTypeLabels[prospect.business_type] || prospect.business_type}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <LocationOn fontSize="small" sx={{ mr: 0.5 }} />
                      <Typography variant="caption">
                        {prospect.city}, {prospect.country_code}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={prospect.lead_score}
                        sx={{ width: 60, height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption" fontWeight="bold"
                        sx={{ color: getLeadScoreColor(prospect.lead_score) }}>
                        {prospect.lead_score}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={prospect.status}
                      size="small"
                      sx={{
                        backgroundColor: getStatusColor(prospect.status),
                        color: 'white',
                        textTransform: 'capitalize'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {prospect.outreach?.email_sent && (
                        <Chip icon={<Email />} label="Email" size="small" color="primary" />
                      )}
                      {prospect.outreach?.whatsapp_sent && (
                        <Chip icon={<WhatsApp />} label="WA" size="small" color="success" />
                      )}
                      {prospect.outreach?.call_attempted && (
                        <Chip icon={<Phone />} label="Call" size="small" color="secondary" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleViewProspect(prospect)}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {!prospect.outreach?.email_sent && prospect.email && (
                        <Tooltip title="Send Email">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleStartOutreach(prospect._id, 'email')}
                          >
                            <Email fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {!prospect.outreach?.whatsapp_sent && prospect.whatsapp && (
                        <Tooltip title="Send WhatsApp">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleStartOutreach(prospect._id, 'whatsapp')}
                          >
                            <WhatsApp fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          component="div"
          count={filteredProspects.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
        />
      </Paper>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          B2B Prospecting Dashboard
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={prospectingRunning}
                onChange={toggleProspecting}
                color="primary"
              />
            }
            label={prospectingRunning ? "24/7 Prospecting: ON" : "24/7 Prospecting: OFF"}
          />
          
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCampaignDialogOpen(true)}
          >
            New Campaign
          </Button>
        </Box>
      </Box>

      {/* Alert for prospecting status */}
      {prospectingRunning && (
        <Alert severity="info" sx={{ mb: 2 }}>
          🔄 Automated prospecting is running 24/7. New leads are being discovered across 20 Spanish-speaking countries.
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab label="Overview" />
        <Tab label="Prospects" />
        <Tab label="Campaigns" />
      </Tabs>

      {/* Tab Content */}
      {activeTab === 0 && (
        <>
          {renderStatsCards()}
          {renderCharts()}
        </>
      )}

      {activeTab === 1 && renderProspectTable()}

      {activeTab === 2 && (
        <Grid container spacing={2}>
          {campaigns.map((campaign) => (
            <Grid item xs={12} md={6} key={campaign._id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{campaign.name}</Typography>
                  <Chip label={campaign.status} size="small" sx={{ mt: 1, mb: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Prospects: {campaign.stats.totalProspects}</Typography>
                    <Typography variant="body2">Contacted: {campaign.stats.contacted}</Typography>
                    <Typography variant="body2">Responded: {campaign.stats.responded}</Typography>
                    <Typography variant="body2">Converted: {campaign.stats.converted}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* View Prospect Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Prospect Details
          <IconButton
            onClick={() => setViewDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedProspect && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="h6">{selectedProspect.business_name}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {businessTypeLabels[selectedProspect.business_type]}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Location</Typography>
                <Typography variant="body2">
                  {selectedProspect.city}, {selectedProspect.state_province}, {selectedProspect.country}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Lead Score</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={selectedProspect.lead_score}
                    sx={{ flex: 1, height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body2" fontWeight="bold">
                    {selectedProspect.lead_score}/100
                  </Typography>
                </Box>
              </Grid>
              {selectedProspect.email && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Email</Typography>
                  <Typography variant="body2">{selectedProspect.email}</Typography>
                </Grid>
              )}
              {selectedProspect.phone && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Phone</Typography>
                  <Typography variant="body2">{selectedProspect.phone}</Typography>
                </Grid>
              )}
              {selectedProspect.website && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Website</Typography>
                  <Typography variant="body2">
                    <a href={selectedProspect.website} target="_blank" rel="noopener noreferrer">
                      {selectedProspect.website}
                    </a>
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Create Campaign Dialog */}
      <Dialog open={campaignDialogOpen} onClose={() => setCampaignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Campaign</DialogTitle>
        <DialogContent>
          <TextField
            label="Campaign Name"
            fullWidth
            value={newCampaignData.name}
            onChange={(e) => setNewCampaignData({ ...newCampaignData, name: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Minimum Lead Score</InputLabel>
            <Select
              value={newCampaignData.minLeadScore}
              onChange={(e) => setNewCampaignData({ ...newCampaignData, minLeadScore: Number(e.target.value) })}
            >
              <MenuItem value={30}>30 - Low threshold</MenuItem>
              <MenuItem value={50}>50 - Medium threshold</MenuItem>
              <MenuItem value={70}>70 - High threshold</MenuItem>
              <MenuItem value={80}>80 - Very high threshold</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCampaignDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateCampaign}>
            Create Campaign
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProspectDashboard;
