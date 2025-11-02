/**
 * @file MapContainer.tsx
 * @module Components/Map
 * @description Interactive map component using Mapbox GL JS
 * 
 * @features
 * - Interactive Mapbox GL map with custom controls
 * - Multiple marker types (default, tour, hotel, restaurant, etc.)
 * - Popup support with custom content
 * - Geolocation support
 * - Map style switching (streets, satellite, terrain)
 * - Drawing tools for routes and areas
 * - Responsive design
 * - Touch and gesture support
 * - Accessibility features
 * 
 * @example
 * ```tsx
 * import { MapContainer } from '@/components/Map/MapContainer';
 * 
 * <MapContainer
 *   center={[35.2137, 31.7683]} // Jerusalem
 *   zoom={12}
 *   markers={tourMarkers}
 *   onMarkerClick={handleMarkerClick}
 * />
 * ```
 * 
 * @requires mapbox-gl - Mapbox GL JS library
 * @requires @mapbox/mapbox-gl-geocoder - Geocoding plugin
 * 
 * @author Spirit Tours Development Team
 * @since 1.0.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import {
  Box,
  IconButton,
  ButtonGroup,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  MyLocation,
  ZoomIn,
  ZoomOut,
  Layers,
  Route,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material';

import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

// Set Mapbox access token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || '';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Map marker interface
 * 
 * @interface MapMarker
 * @property {string} id - Unique marker identifier
 * @property {[number, number]} coordinates - [longitude, latitude]
 * @property {string} [title] - Marker title for popup
 * @property {string} [description] - Marker description
 * @property {string} [type] - Marker type (default, tour, hotel, restaurant)
 * @property {string} [icon] - Custom icon URL
 * @property {string} [color] - Marker color (hex)
 * @property {any} [data] - Additional marker data
 */
export interface MapMarker {
  id: string;
  coordinates: [number, number];
  title?: string;
  description?: string;
  type?: 'default' | 'tour' | 'hotel' | 'restaurant' | 'attraction' | 'transport';
  icon?: string;
  color?: string;
  data?: any;
}

/**
 * Route interface for displaying paths
 */
export interface MapRoute {
  id: string;
  coordinates: [number, number][];
  color?: string;
  width?: number;
  label?: string;
}

/**
 * Props for MapContainer component
 */
interface MapContainerProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  routes?: MapRoute[];
  style?: 'streets' | 'satellite' | 'outdoors' | 'light' | 'dark';
  height?: string | number;
  showControls?: boolean;
  showGeocoder?: boolean;
  showGeolocate?: boolean;
  interactive?: boolean;
  onMarkerClick?: (marker: MapMarker) => void;
  onMapClick?: (coordinates: [number, number]) => void;
  onLoad?: (map: mapboxgl.Map) => void;
}

// ============================================================================
// MARKER COLORS
// ============================================================================

const MARKER_COLORS: Record<string, string> = {
  default: '#2196F3',
  tour: '#4CAF50',
  hotel: '#FF9800',
  restaurant: '#F44336',
  attraction: '#9C27B0',
  transport: '#00BCD4',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * MapContainer - Interactive Mapbox GL map component
 * 
 * @component
 * @description
 * A comprehensive map component with:
 * - Interactive controls (zoom, geolocate, style switcher)
 * - Custom markers with popups
 * - Route visualization
 * - Geocoding search
 * - Fullscreen mode
 * - Touch and gesture support
 * 
 * **Map Styles:**
 * - Streets (default)
 * - Satellite
 * - Outdoors
 * - Light
 * - Dark
 * 
 * **Marker Types:**
 * - Default (blue)
 * - Tour (green)
 * - Hotel (orange)
 * - Restaurant (red)
 * - Attraction (purple)
 * - Transport (cyan)
 * 
 * @param {MapContainerProps} props - Component props
 * @returns {JSX.Element} Rendered map component
 * 
 * @example
 * ```tsx
 * const markers = [
 *   {
 *     id: '1',
 *     coordinates: [35.2137, 31.7683],
 *     title: 'Old City',
 *     type: 'tour'
 *   }
 * ];
 * 
 * <MapContainer
 *   center={[35.2137, 31.7683]}
 *   zoom={12}
 *   markers={markers}
 *   showGeocoder
 * />
 * ```
 */
export const MapContainer: React.FC<MapContainerProps> = ({
  center = [35.2137, 31.7683], // Default: Jerusalem
  zoom = 10,
  markers = [],
  routes = [],
  style = 'streets',
  height = '500px',
  showControls = true,
  showGeocoder = true,
  showGeolocate = true,
  interactive = true,
  onMarkerClick,
  onMapClick,
  onLoad,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState(style);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  /**
   * Get Mapbox style URL
   */
  const getStyleUrl = useCallback((styleName: string) => {
    const styles: Record<string, string> = {
      streets: 'mapbox://styles/mapbox/streets-v12',
      satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
      outdoors: 'mapbox://styles/mapbox/outdoors-v12',
      light: 'mapbox://styles/mapbox/light-v11',
      dark: 'mapbox://styles/mapbox/dark-v11',
    };
    return styles[styleName] || styles.streets;
  }, []);

  /**
   * Initialize map
   */
  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return; // Initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: getStyleUrl(mapStyle),
      center: center,
      zoom: zoom,
      interactive: interactive,
    });

    // Add navigation controls
    if (showControls) {
      map.current.addControl(
        new mapboxgl.NavigationControl({ showCompass: true }),
        'top-right'
      );
    }

    // Add fullscreen control
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    // Add geolocate control
    if (showGeolocate) {
      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
        showUserHeading: true,
      });
      map.current.addControl(geolocate, 'top-right');
    }

    // Add geocoder
    if (showGeocoder) {
      const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl as any,
        marker: false,
        placeholder: 'Search for places...',
      });
      map.current.addControl(geocoder, 'top-left');
    }

    // Handle map click
    if (onMapClick) {
      map.current.on('click', (e) => {
        onMapClick([e.lngLat.lng, e.lngLat.lat]);
      });
    }

    // Map loaded
    map.current.on('load', () => {
      setMapLoaded(true);
      if (onLoad && map.current) {
        onLoad(map.current);
      }
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [
    center,
    zoom,
    mapStyle,
    showControls,
    showGeocoder,
    showGeolocate,
    interactive,
    onMapClick,
    onLoad,
    getStyleUrl,
  ]);

  /**
   * Update markers
   */
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add new markers
    markers.forEach((markerData) => {
      if (!map.current) return;

      // Create marker element
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = markerData.color || MARKER_COLORS[markerData.type || 'default'];
      el.style.border = '2px solid white';
      el.style.cursor = 'pointer';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

      // Create popup
      let popup: mapboxgl.Popup | undefined;
      if (markerData.title || markerData.description) {
        const popupContent = `
          <div style="padding: 8px;">
            ${markerData.title ? `<h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600;">${markerData.title}</h3>` : ''}
            ${markerData.description ? `<p style="margin: 0; font-size: 12px; color: #666;">${markerData.description}</p>` : ''}
          </div>
        `;
        popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent);
      }

      // Create marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat(markerData.coordinates)
        .addTo(map.current);

      if (popup) {
        marker.setPopup(popup);
      }

      // Handle marker click
      el.addEventListener('click', () => {
        if (onMarkerClick) {
          onMarkerClick(markerData);
        }
      });

      markersRef.current.push(marker);
    });
  }, [markers, mapLoaded, onMarkerClick]);

  /**
   * Update routes
   */
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    routes.forEach((route, index) => {
      const sourceId = `route-${route.id}`;
      const layerId = `route-layer-${route.id}`;

      // Remove existing route
      if (map.current!.getLayer(layerId)) {
        map.current!.removeLayer(layerId);
      }
      if (map.current!.getSource(sourceId)) {
        map.current!.removeSource(sourceId);
      }

      // Add route source
      map.current!.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: route.coordinates,
          },
        },
      });

      // Add route layer
      map.current!.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': route.color || '#2196F3',
          'line-width': route.width || 4,
        },
      });
    });
  }, [routes, mapLoaded]);

  /**
   * Handle style change
   */
  const handleStyleChange = useCallback((newStyle: string) => {
    if (map.current) {
      setMapStyle(newStyle);
      map.current.setStyle(getStyleUrl(newStyle));
    }
  }, [getStyleUrl]);

  /**
   * Handle zoom
   */
  const handleZoomIn = useCallback(() => {
    if (map.current) {
      map.current.zoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (map.current) {
      map.current.zoomOut();
    }
  }, []);

  /**
   * Handle geolocate
   */
  const handleGeolocate = useCallback(() => {
    if (navigator.geolocation && map.current) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          map.current!.flyTo({
            center: [longitude, latitude],
            zoom: 14,
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  }, []);

  /**
   * Fit bounds to markers
   */
  useEffect(() => {
    if (!map.current || !mapLoaded || markers.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    markers.forEach((marker) => {
      bounds.extend(marker.coordinates);
    });

    map.current.fitBounds(bounds, {
      padding: 50,
      maxZoom: 15,
    });
  }, [markers, mapLoaded]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height }}>
      {/* Map Container */}
      <Box
        ref={mapContainer}
        sx={{
          width: '100%',
          height: '100%',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      />

      {/* Loading Indicator */}
      {!mapLoaded && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.9)',
            zIndex: 1000,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {/* Custom Controls */}
      {showControls && (
        <Paper
          elevation={2}
          sx={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            p: 1,
            display: 'flex',
            gap: 1,
            alignItems: 'center',
          }}
        >
          {/* Style Selector */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={mapStyle}
              onChange={(e) => handleStyleChange(e.target.value)}
              displayEmpty
            >
              <MenuItem value="streets">Streets</MenuItem>
              <MenuItem value="satellite">Satellite</MenuItem>
              <MenuItem value="outdoors">Outdoors</MenuItem>
              <MenuItem value="light">Light</MenuItem>
              <MenuItem value="dark">Dark</MenuItem>
            </Select>
          </FormControl>

          {/* Zoom Controls */}
          <ButtonGroup size="small" variant="outlined">
            <Tooltip title="Zoom In">
              <IconButton onClick={handleZoomIn}>
                <ZoomIn />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom Out">
              <IconButton onClick={handleZoomOut}>
                <ZoomOut />
              </IconButton>
            </Tooltip>
          </ButtonGroup>

          {/* Geolocate */}
          {showGeolocate && (
            <Tooltip title="My Location">
              <IconButton onClick={handleGeolocate}>
                <MyLocation />
              </IconButton>
            </Tooltip>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default MapContainer;
