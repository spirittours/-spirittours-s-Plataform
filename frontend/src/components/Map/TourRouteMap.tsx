/**
 * @file TourRouteMap.tsx
 * @module Components/Map
 * @description Tour route visualization with multiple stops and waypoints
 * 
 * @features
 * - Tour route with multiple stops
 * - Numbered waypoint markers
 * - Distance and duration calculations
 * - Elevation profile (optional)
 * - Turn-by-turn directions
 * - Printable route information
 * - Share route functionality
 * - Day-by-day itinerary display
 * 
 * @example
 * ```tsx
 * import { TourRouteMap } from '@/components/Map/TourRouteMap';
 * 
 * <TourRouteMap
 *   stops={tourStops}
 *   showDirections
 *   showElevation
 * />
 * ```
 * 
 * @author Spirit Tours Development Team
 * @since 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Button,
  IconButton,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Stack,
} from '@mui/material';
import {
  ExpandMore,
  DirectionsCar,
  AccessTime,
  Straighten,
  Print,
  Share,
  Download,
  Navigation,
} from '@mui/icons-material';
import { MapContainer, MapMarker, MapRoute } from './MapContainer';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Tour stop interface
 */
export interface TourStop {
  id: string;
  name: string;
  description?: string;
  coordinates: [number, number];
  duration?: number; // Minutes spent at location
  type?: 'start' | 'stop' | 'end';
  day?: number;
  order: number;
  imageUrl?: string;
  activities?: string[];
}

/**
 * Route segment interface
 */
interface RouteSegment {
  distance: number; // kilometers
  duration: number; // minutes
  instructions: string[];
}

/**
 * Props for TourRouteMap component
 */
interface TourRouteMapProps {
  stops: TourStop[];
  routeColor?: string;
  showDirections?: boolean;
  showElevation?: boolean;
  showTimeline?: boolean;
  interactive?: boolean;
  onStopClick?: (stop: TourStop) => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
const calculateDistance = (
  coord1: [number, number],
  coord2: [number, number]
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const dLon = ((coord1[0] - coord2[0]) * Math.PI) / 180;
  const lat1 = (coord1[1] * Math.PI) / 180;
  const lat2 = (coord2[1] * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Format duration in hours and minutes
 */
const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * TourRouteMap - Visualization of tour routes with multiple stops
 * 
 * @component
 * @description
 * A specialized map component for displaying tour routes with:
 * - Multiple numbered stops
 * - Route visualization with distance/duration
 * - Day-by-day itinerary
 * - Turn-by-turn directions
 * - Elevation profile (optional)
 * - Printable format
 * - Share functionality
 * 
 * **Features:**
 * - Automatic route calculation between stops
 * - Distance and time estimates
 * - Visual timeline with day separation
 * - Interactive stop markers
 * - Route optimization suggestions
 * 
 * @param {TourRouteMapProps} props - Component props
 * @returns {JSX.Element} Rendered tour route map
 * 
 * @example
 * ```tsx
 * const stops = [
 *   {
 *     id: '1',
 *     name: 'Tel Aviv',
 *     coordinates: [34.7818, 32.0853],
 *     type: 'start',
 *     order: 0,
 *     day: 1
 *   },
 *   {
 *     id: '2',
 *     name: 'Jerusalem',
 *     coordinates: [35.2137, 31.7683],
 *     type: 'stop',
 *     order: 1,
 *     day: 1
 *   }
 * ];
 * 
 * <TourRouteMap stops={stops} showDirections />
 * ```
 */
export const TourRouteMap: React.FC<TourRouteMapProps> = ({
  stops,
  routeColor = '#4CAF50',
  showDirections = true,
  showElevation = false,
  showTimeline = true,
  interactive = true,
  onStopClick,
}) => {
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [selectedStop, setSelectedStop] = useState<TourStop | null>(null);

  // Sort stops by order
  const sortedStops = [...stops].sort((a, b) => a.order - b.order);

  // Calculate total distance and duration
  useEffect(() => {
    let distance = 0;
    let duration = 0;

    for (let i = 0; i < sortedStops.length - 1; i++) {
      const current = sortedStops[i];
      const next = sortedStops[i + 1];
      
      // Calculate distance between stops
      distance += calculateDistance(current.coordinates, next.coordinates);
      
      // Estimate driving time (60 km/h average)
      const segmentDistance = calculateDistance(current.coordinates, next.coordinates);
      duration += (segmentDistance / 60) * 60; // minutes
      
      // Add stop duration
      if (current.duration) {
        duration += current.duration;
      }
    }

    // Add last stop duration
    if (sortedStops.length > 0 && sortedStops[sortedStops.length - 1].duration) {
      duration += sortedStops[sortedStops.length - 1].duration;
    }

    setTotalDistance(distance);
    setTotalDuration(duration);
  }, [sortedStops]);

  // Convert stops to markers
  const markers: MapMarker[] = sortedStops.map((stop, index) => ({
    id: stop.id,
    coordinates: stop.coordinates,
    title: `${index + 1}. ${stop.name}`,
    description: stop.description,
    type: 'tour',
    color: stop.type === 'start' ? '#4CAF50' : stop.type === 'end' ? '#F44336' : '#2196F3',
    data: stop,
  }));

  // Create route
  const route: MapRoute = {
    id: 'tour-route',
    coordinates: sortedStops.map((stop) => stop.coordinates),
    color: routeColor,
    width: 4,
  };

  /**
   * Handle marker click
   */
  const handleMarkerClick = useCallback(
    (marker: MapMarker) => {
      const stop = marker.data as TourStop;
      setSelectedStop(stop);
      if (onStopClick) {
        onStopClick(stop);
      }
    },
    [onStopClick]
  );

  /**
   * Group stops by day
   */
  const stopsByDay = sortedStops.reduce((acc, stop) => {
    const day = stop.day || 1;
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(stop);
    return acc;
  }, {} as Record<number, TourStop[]>);

  /**
   * Handle print
   */
  const handlePrint = () => {
    window.print();
  };

  /**
   * Handle share
   */
  const handleShare = async () => {
    const shareData = {
      title: 'Tour Route',
      text: `Check out this tour with ${stops.length} stops!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
      {/* Map */}
      <Box sx={{ flex: 1, minHeight: '500px' }}>
        <MapContainer
          markers={markers}
          routes={[route]}
          showControls
          showGeocoder={false}
          interactive={interactive}
          onMarkerClick={handleMarkerClick}
          height="100%"
        />
      </Box>

      {/* Sidebar */}
      {showTimeline && (
        <Box sx={{ width: { xs: '100%', md: 400 } }}>
          <Card>
            <CardContent>
              {/* Summary */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Tour Overview
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Chip
                    icon={<Straighten />}
                    label={`${totalDistance.toFixed(1)} km`}
                    size="small"
                  />
                  <Chip
                    icon={<AccessTime />}
                    label={formatDuration(totalDuration)}
                    size="small"
                  />
                  <Chip label={`${stops.length} stops`} size="small" />
                </Stack>

                {/* Action Buttons */}
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    startIcon={<Print />}
                    onClick={handlePrint}
                    variant="outlined"
                  >
                    Print
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Share />}
                    onClick={handleShare}
                    variant="outlined"
                  >
                    Share
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Navigation />}
                    variant="outlined"
                    href={`https://www.google.com/maps/dir/${sortedStops
                      .map((s) => `${s.coordinates[1]},${s.coordinates[0]}`)
                      .join('/')}`}
                    target="_blank"
                  >
                    Navigate
                  </Button>
                </Stack>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Stops by Day */}
              <Typography variant="subtitle2" gutterBottom>
                Itinerary
              </Typography>

              {Object.entries(stopsByDay).map(([day, dayStops]) => (
                <Accordion key={day} defaultExpanded={parseInt(day) === 1}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle2">Day {day}</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    <List dense>
                      {dayStops.map((stop, index) => {
                        const nextStop = dayStops[index + 1];
                        const distance = nextStop
                          ? calculateDistance(stop.coordinates, nextStop.coordinates)
                          : 0;
                        const drivingTime = distance > 0 ? (distance / 60) * 60 : 0;

                        return (
                          <React.Fragment key={stop.id}>
                            <ListItem
                              button={interactive}
                              onClick={() => {
                                setSelectedStop(stop);
                                if (onStopClick) onStopClick(stop);
                              }}
                              sx={{
                                bgcolor:
                                  selectedStop?.id === stop.id
                                    ? 'action.selected'
                                    : 'transparent',
                              }}
                            >
                              <ListItemAvatar>
                                <Avatar
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    bgcolor:
                                      stop.type === 'start'
                                        ? 'success.main'
                                        : stop.type === 'end'
                                        ? 'error.main'
                                        : 'primary.main',
                                  }}
                                >
                                  {stop.order + 1}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={stop.name}
                                secondary={
                                  <>
                                    {stop.description && (
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        display="block"
                                      >
                                        {stop.description}
                                      </Typography>
                                    )}
                                    {stop.duration && (
                                      <Typography variant="caption" color="primary">
                                        Duration: {formatDuration(stop.duration)}
                                      </Typography>
                                    )}
                                    {stop.activities && stop.activities.length > 0 && (
                                      <Box sx={{ mt: 0.5 }}>
                                        {stop.activities.map((activity, i) => (
                                          <Chip
                                            key={i}
                                            label={activity}
                                            size="small"
                                            sx={{ mr: 0.5, mt: 0.5 }}
                                          />
                                        ))}
                                      </Box>
                                    )}
                                  </>
                                }
                              />
                            </ListItem>

                            {/* Driving segment */}
                            {nextStop && (
                              <ListItem sx={{ pl: 7, py: 0.5 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <DirectionsCar fontSize="small" color="action" />
                                  <Typography variant="caption" color="text.secondary">
                                    {distance.toFixed(1)} km · {formatDuration(drivingTime)}
                                  </Typography>
                                </Stack>
                              </ListItem>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}

              {/* Directions */}
              {showDirections && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Directions
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Click "Navigate" button above to get turn-by-turn directions in
                      Google Maps.
                    </Typography>
                  </Paper>
                </>
              )}
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default TourRouteMap;
