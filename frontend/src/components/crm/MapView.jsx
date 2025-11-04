/**
 * Map View Component
 * 
 * Interactive map displaying contacts, deals, and meetings by location.
 * Uses geocoding to plot addresses on the map.
 * 
 * Features:
 * - Marker clustering for dense areas
 * - Info windows with contact/deal details
 * - Heatmap visualization
 * - Territory management
 * - Route planning
 * - Filter by type (contacts, deals, meetings)
 * 
 * Note: This component requires integration with a map library like:
 * - Google Maps (react-google-maps)
 * - Mapbox (react-map-gl)
 * - Leaflet (react-leaflet)
 * 
 * For this implementation, we'll use a placeholder UI that can be
 * connected to any of these libraries.
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Avatar,
  Button,
  ButtonGroup,
  TextField,
  InputAdornment,
  Stack,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  MyLocation as MyLocationIcon,
  Layers as LayersIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Place as PlaceIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Event as EventIcon,
  Route as RouteIcon,
} from '@mui/icons-material';
import { formatCurrency, formatDate } from '../../utils/formatters';

/**
 * Map Marker Component (simplified representation)
 */
const MapMarker = ({ item, onClick }) => {
  const getMarkerColor = (type) => {
    switch (type) {
      case 'contact':
        return 'primary.main';
      case 'deal':
        return 'success.main';
      case 'meeting':
        return 'warning.main';
      case 'territory':
        return 'info.main';
      default:
        return 'grey.500';
    }
  };

  const getMarkerIcon = (type) => {
    switch (type) {
      case 'contact':
        return <PersonIcon />;
      case 'deal':
        return <MoneyIcon />;
      case 'meeting':
        return <EventIcon />;
      case 'territory':
        return <BusinessIcon />;
      default:
        return <PlaceIcon />;
    }
  };

  return (
    <Tooltip title={item.title}>
      <IconButton
        onClick={() => onClick(item)}
        sx={{
          bgcolor: getMarkerColor(item.type),
          color: 'white',
          '&:hover': {
            bgcolor: getMarkerColor(item.type),
            opacity: 0.8,
          },
        }}
        size="small"
      >
        {getMarkerIcon(item.type)}
      </IconButton>
    </Tooltip>
  );
};

/**
 * Location Details Panel
 */
const LocationDetails = ({ item, onClose }) => {
  if (!item) return null;

  return (
    <Card sx={{ position: 'absolute', right: 16, top: 80, zIndex: 1000, minWidth: 300, maxWidth: 400 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
          <Box>
            <Chip
              label={item.type}
              size="small"
              color={
                item.type === 'contact' ? 'primary' :
                item.type === 'deal' ? 'success' :
                item.type === 'meeting' ? 'warning' : 'default'
              }
              sx={{ mb: 1 }}
            />
            <Typography variant="h6" fontWeight="bold">
              {item.title}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose}>
            ×
          </IconButton>
        </Box>

        <Stack spacing={2}>
          {item.company && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Company
              </Typography>
              <Typography variant="body2">{item.company}</Typography>
            </Box>
          )}

          {item.location && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Location
              </Typography>
              <Typography variant="body2">{item.location}</Typography>
            </Box>
          )}

          {item.value && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Value
              </Typography>
              <Typography variant="h6" color="success.main" fontWeight="bold">
                {formatCurrency(item.value)}
              </Typography>
            </Box>
          )}

          {item.date && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Date
              </Typography>
              <Typography variant="body2">{formatDate(item.date)}</Typography>
            </Box>
          )}

          {item.assignee && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                src={item.assignee.avatar}
                alt={item.assignee.name}
                sx={{ width: 32, height: 32 }}
              >
                {item.assignee.name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Assigned to
                </Typography>
                <Typography variant="body2">{item.assignee.name}</Typography>
              </Box>
            </Box>
          )}

          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" fullWidth>
              View Details
            </Button>
            <Button size="small" variant="contained" fullWidth>
              Get Directions
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

/**
 * Location List Sidebar
 */
const LocationList = ({ items, onItemClick, selectedItem }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    return items.filter(item =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  return (
    <Paper
      elevation={2}
      sx={{
        position: 'absolute',
        left: 16,
        top: 80,
        bottom: 16,
        width: 320,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search locations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {filteredItems.map((item, index) => (
          <React.Fragment key={item.id}>
            <ListItem
              button
              selected={selectedItem?.id === item.id}
              onClick={() => onItemClick(item)}
            >
              <ListItemAvatar>
                <Avatar
                  sx={{
                    bgcolor:
                      item.type === 'contact' ? 'primary.main' :
                      item.type === 'deal' ? 'success.main' :
                      item.type === 'meeting' ? 'warning.main' : 'grey.500',
                  }}
                >
                  {item.type === 'contact' ? <PersonIcon /> :
                   item.type === 'deal' ? <MoneyIcon /> :
                   item.type === 'meeting' ? <EventIcon /> : <PlaceIcon />}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={item.title}
                secondary={
                  <Stack spacing={0.5}>
                    <Typography variant="caption">{item.location}</Typography>
                    {item.value && (
                      <Typography variant="caption" color="success.main" fontWeight="bold">
                        {formatCurrency(item.value)}
                      </Typography>
                    )}
                  </Stack>
                }
              />
            </ListItem>
            {index < filteredItems.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>

      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          {filteredItems.length} location{filteredItems.length !== 1 ? 's' : ''} found
        </Typography>
      </Box>
    </Paper>
  );
};

/**
 * Main Map View Component
 */
const MapView = ({ locations: initialLocations, onRouteCreate }) => {
  const [locations] = useState(initialLocations);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [activeFilters, setActiveFilters] = useState(['contact', 'deal', 'meeting', 'territory']);
  const [showSidebar, setShowSidebar] = useState(true);

  const filteredLocations = useMemo(() => {
    return locations.filter(loc => activeFilters.includes(loc.type));
  }, [locations, activeFilters]);

  const handleMarkerClick = (item) => {
    setSelectedItem(item);
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    // In a real implementation, center map on this location
  };

  const toggleFilter = (type) => {
    setActiveFilters(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleLocate = () => {
    // In a real implementation, get user's current location
    console.log('Get current location');
  };

  const stats = useMemo(() => {
    return {
      contacts: locations.filter(l => l.type === 'contact').length,
      deals: locations.filter(l => l.type === 'deal').length,
      meetings: locations.filter(l => l.type === 'meeting').length,
      totalValue: locations
        .filter(l => l.value)
        .reduce((sum, l) => sum + l.value, 0),
    };
  }, [locations]);

  return (
    <Box sx={{ position: 'relative', height: 'calc(100vh - 150px)' }}>
      {/* Map Controls */}
      <Paper
        elevation={2}
        sx={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          top: 16,
          zIndex: 1000,
          px: 2,
          py: 1,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <ButtonGroup size="small">
            <Button
              variant={activeFilters.includes('contact') ? 'contained' : 'outlined'}
              onClick={() => toggleFilter('contact')}
              startIcon={<PersonIcon />}
            >
              Contacts ({stats.contacts})
            </Button>
            <Button
              variant={activeFilters.includes('deal') ? 'contained' : 'outlined'}
              onClick={() => toggleFilter('deal')}
              startIcon={<MoneyIcon />}
            >
              Deals ({stats.deals})
            </Button>
            <Button
              variant={activeFilters.includes('meeting') ? 'contained' : 'outlined'}
              onClick={() => toggleFilter('meeting')}
              startIcon={<EventIcon />}
            >
              Meetings ({stats.meetings})
            </Button>
          </ButtonGroup>

          <Divider orientation="vertical" flexItem />

          <Tooltip title="Heatmap">
            <IconButton
              size="small"
              color={showHeatmap ? 'primary' : 'default'}
              onClick={() => setShowHeatmap(!showHeatmap)}
            >
              <LayersIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="My Location">
            <IconButton size="small" onClick={handleLocate}>
              <MyLocationIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Create Route">
            <IconButton size="small" onClick={onRouteCreate}>
              <RouteIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {/* Stats Card */}
      <Paper
        elevation={2}
        sx={{
          position: 'absolute',
          right: 16,
          top: 16,
          zIndex: 1000,
          p: 2,
          minWidth: 200,
        }}
      >
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          Overview
        </Typography>
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption">Total Locations</Typography>
            <Typography variant="caption" fontWeight="bold">{filteredLocations.length}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption">Pipeline Value</Typography>
            <Typography variant="caption" fontWeight="bold" color="success.main">
              {formatCurrency(stats.totalValue)}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Zoom Controls */}
      <Paper
        elevation={2}
        sx={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          zIndex: 1000,
        }}
      >
        <Stack>
          <IconButton size="small">
            <ZoomInIcon />
          </IconButton>
          <Divider />
          <IconButton size="small">
            <ZoomOutIcon />
          </IconButton>
        </Stack>
      </Paper>

      {/* Location List Sidebar */}
      {showSidebar && (
        <LocationList
          items={filteredLocations}
          onItemClick={handleItemClick}
          selectedItem={selectedItem}
        />
      )}

      {/* Location Details */}
      <LocationDetails
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />

      {/* Map Container (Placeholder) */}
      <Box
        sx={{
          width: '100%',
          height: '100%',
          bgcolor: 'grey.200',
          backgroundImage: 'linear-gradient(45deg, #f5f5f5 25%, transparent 25%), linear-gradient(-45deg, #f5f5f5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f5f5f5 75%), linear-gradient(-45deg, transparent 75%, #f5f5f5 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Placeholder markers */}
        <Box
          sx={{
            width: '80%',
            height: '80%',
            position: 'relative',
          }}
        >
          {filteredLocations.map((item, index) => (
            <Box
              key={item.id}
              sx={{
                position: 'absolute',
                left: `${(index * 37) % 80}%`,
                top: `${(index * 53) % 80}%`,
              }}
            >
              <MapMarker item={item} onClick={handleMarkerClick} />
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <PlaceIcon sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" fontWeight="bold">
            Map Integration Placeholder
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Connect with Google Maps, Mapbox, or Leaflet
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default MapView;
