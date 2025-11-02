/**
 * @file mapbox.utils.ts
 * @module Utils/Mapbox
 * @description Utility functions for Mapbox integration
 * 
 * @features
 * - Geocoding (address to coordinates)
 * - Reverse geocoding (coordinates to address)
 * - Directions API integration
 * - Distance matrix calculations
 * - Coordinate validation and formatting
 * - Bounding box calculations
 * 
 * @author Spirit Tours Development Team
 * @since 1.0.0
 */

import axios from 'axios';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || '';
const MAPBOX_API_BASE = 'https://api.mapbox.com';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Geocoding result interface
 */
export interface GeocodingResult {
  id: string;
  place_name: string;
  center: [number, number];
  place_type: string[];
  relevance: number;
  properties: Record<string, any>;
  text: string;
  address?: string;
  context?: Array<{
    id: string;
    text: string;
  }>;
}

/**
 * Directions route interface
 */
export interface DirectionsRoute {
  distance: number; // meters
  duration: number; // seconds
  geometry: {
    coordinates: [number, number][];
    type: 'LineString';
  };
  legs: Array<{
    distance: number;
    duration: number;
    steps: Array<{
      distance: number;
      duration: number;
      instruction: string;
      name: string;
    }>;
  }>;
}

/**
 * Distance matrix result
 */
export interface DistanceMatrixResult {
  distances: number[][]; // kilometers
  durations: number[][]; // minutes
}

// ============================================================================
// GEOCODING
// ============================================================================

/**
 * Forward geocoding: Convert address to coordinates
 * 
 * @param {string} address - Address to geocode
 * @param {Object} options - Geocoding options
 * @returns {Promise<GeocodingResult[]>} Array of geocoding results
 * 
 * @example
 * ```ts
 * const results = await geocodeAddress('Jerusalem, Israel');
 * const coords = results[0].center; // [35.2137, 31.7683]
 * ```
 */
export async function geocodeAddress(
  address: string,
  options: {
    country?: string;
    language?: string;
    limit?: number;
    bbox?: [number, number, number, number];
  } = {}
): Promise<GeocodingResult[]> {
  try {
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      limit: (options.limit || 5).toString(),
      ...(options.country && { country: options.country }),
      ...(options.language && { language: options.language }),
      ...(options.bbox && { bbox: options.bbox.join(',') }),
    });

    const response = await axios.get(
      `${MAPBOX_API_BASE}/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?${params}`
    );

    return response.data.features;
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error('Failed to geocode address');
  }
}

/**
 * Reverse geocoding: Convert coordinates to address
 * 
 * @param {[number, number]} coordinates - [longitude, latitude]
 * @param {Object} options - Reverse geocoding options
 * @returns {Promise<GeocodingResult[]>} Array of geocoding results
 * 
 * @example
 * ```ts
 * const results = await reverseGeocode([35.2137, 31.7683]);
 * const address = results[0].place_name; // "Jerusalem, Israel"
 * ```
 */
export async function reverseGeocode(
  coordinates: [number, number],
  options: {
    types?: string[];
    language?: string;
    limit?: number;
  } = {}
): Promise<GeocodingResult[]> {
  try {
    const [lng, lat] = coordinates;
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      limit: (options.limit || 1).toString(),
      ...(options.types && { types: options.types.join(',') }),
      ...(options.language && { language: options.language }),
    });

    const response = await axios.get(
      `${MAPBOX_API_BASE}/geocoding/v5/mapbox.places/${lng},${lat}.json?${params}`
    );

    return response.data.features;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw new Error('Failed to reverse geocode coordinates');
  }
}

// ============================================================================
// DIRECTIONS
// ============================================================================

/**
 * Get directions between multiple waypoints
 * 
 * @param {[number, number][]} waypoints - Array of coordinates
 * @param {Object} options - Directions options
 * @returns {Promise<DirectionsRoute>} Route with distance, duration, and geometry
 * 
 * @example
 * ```ts
 * const route = await getDirections([
 *   [34.7818, 32.0853], // Tel Aviv
 *   [35.2137, 31.7683]  // Jerusalem
 * ]);
 * console.log(`Distance: ${route.distance / 1000} km`);
 * ```
 */
export async function getDirections(
  waypoints: [number, number][],
  options: {
    profile?: 'driving' | 'walking' | 'cycling';
    alternatives?: boolean;
    steps?: boolean;
    geometries?: 'geojson' | 'polyline';
    overview?: 'full' | 'simplified' | 'false';
  } = {}
): Promise<DirectionsRoute> {
  try {
    const profile = options.profile || 'driving';
    const coordinates = waypoints.map((wp) => wp.join(',')).join(';');

    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      alternatives: (options.alternatives || false).toString(),
      steps: (options.steps !== false).toString(),
      geometries: options.geometries || 'geojson',
      overview: options.overview || 'full',
    });

    const response = await axios.get(
      `${MAPBOX_API_BASE}/directions/v5/mapbox/${profile}/${coordinates}?${params}`
    );

    return response.data.routes[0];
  } catch (error) {
    console.error('Directions error:', error);
    throw new Error('Failed to get directions');
  }
}

/**
 * Calculate optimized route (Traveling Salesman Problem)
 * 
 * @param {[number, number][]} waypoints - Array of coordinates to visit
 * @param {[number, number]} [start] - Optional starting point
 * @returns {Promise<DirectionsRoute>} Optimized route
 * 
 * @example
 * ```ts
 * const stops = [[34.78, 32.08], [35.21, 31.77], [35.50, 32.80]];
 * const optimized = await getOptimizedRoute(stops);
 * ```
 */
export async function getOptimizedRoute(
  waypoints: [number, number][],
  start?: [number, number]
): Promise<DirectionsRoute> {
  try {
    const allPoints = start ? [start, ...waypoints] : waypoints;
    const coordinates = allPoints.map((wp) => wp.join(',')).join(';');

    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      source: start ? 'first' : 'any',
      destination: 'any',
      roundtrip: 'true',
      steps: 'true',
      geometries: 'geojson',
    });

    const response = await axios.get(
      `${MAPBOX_API_BASE}/optimized-trips/v1/mapbox/driving/${coordinates}?${params}`
    );

    return response.data.trips[0];
  } catch (error) {
    console.error('Route optimization error:', error);
    throw new Error('Failed to optimize route');
  }
}

// ============================================================================
// DISTANCE CALCULATIONS
// ============================================================================

/**
 * Calculate distance matrix between multiple points
 * 
 * @param {[number, number][]} origins - Origin coordinates
 * @param {[number, number][]} destinations - Destination coordinates
 * @returns {Promise<DistanceMatrixResult>} Distance and duration matrices
 * 
 * @example
 * ```ts
 * const matrix = await getDistanceMatrix(
 *   [[34.78, 32.08]], // Tel Aviv
 *   [[35.21, 31.77], [35.50, 32.80]] // Jerusalem, Haifa
 * );
 * ```
 */
export async function getDistanceMatrix(
  origins: [number, number][],
  destinations: [number, number][]
): Promise<DistanceMatrixResult> {
  try {
    const allCoords = [...origins, ...destinations];
    const coordinates = allCoords.map((c) => c.join(',')).join(';');
    const sourcesIndices = origins.map((_, i) => i).join(';');
    const destinationsIndices = destinations
      .map((_, i) => i + origins.length)
      .join(';');

    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      sources: sourcesIndices,
      destinations: destinationsIndices,
    });

    const response = await axios.get(
      `${MAPBOX_API_BASE}/directions-matrix/v1/mapbox/driving/${coordinates}?${params}`
    );

    // Convert to kilometers and minutes
    const distances = response.data.distances.map((row: number[]) =>
      row.map((d: number) => d / 1000)
    );
    const durations = response.data.durations.map((row: number[]) =>
      row.map((d: number) => d / 60)
    );

    return { distances, durations };
  } catch (error) {
    console.error('Distance matrix error:', error);
    throw new Error('Failed to calculate distance matrix');
  }
}

/**
 * Calculate Haversine distance between two points
 * 
 * @param {[number, number]} coord1 - First coordinate [lng, lat]
 * @param {[number, number]} coord2 - Second coordinate [lng, lat]
 * @returns {number} Distance in kilometers
 * 
 * @example
 * ```ts
 * const distance = calculateHaversineDistance(
 *   [34.7818, 32.0853], // Tel Aviv
 *   [35.2137, 31.7683]  // Jerusalem
 * );
 * console.log(`${distance.toFixed(1)} km`); // ~54.3 km
 * ```
 */
export function calculateHaversineDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
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
}

// ============================================================================
// COORDINATE UTILITIES
// ============================================================================

/**
 * Validate coordinate format
 * 
 * @param {[number, number]} coordinates - Coordinates to validate
 * @returns {boolean} True if valid
 */
export function validateCoordinates(coordinates: [number, number]): boolean {
  const [lng, lat] = coordinates;
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

/**
 * Format coordinates for display
 * 
 * @param {[number, number]} coordinates - Coordinates to format
 * @param {number} precision - Decimal places
 * @returns {string} Formatted coordinates
 * 
 * @example
 * ```ts
 * formatCoordinates([35.2137, 31.7683], 4); // "35.2137, 31.7683"
 * ```
 */
export function formatCoordinates(
  coordinates: [number, number],
  precision: number = 4
): string {
  const [lng, lat] = coordinates;
  return `${lng.toFixed(precision)}, ${lat.toFixed(precision)}`;
}

/**
 * Calculate bounding box for multiple coordinates
 * 
 * @param {[number, number][]} coordinates - Array of coordinates
 * @param {number} padding - Padding in degrees
 * @returns {[number, number, number, number]} Bounding box [minLng, minLat, maxLng, maxLat]
 * 
 * @example
 * ```ts
 * const bbox = calculateBoundingBox([
 *   [34.78, 32.08],
 *   [35.21, 31.77]
 * ]);
 * ```
 */
export function calculateBoundingBox(
  coordinates: [number, number][],
  padding: number = 0.1
): [number, number, number, number] {
  if (coordinates.length === 0) {
    return [0, 0, 0, 0];
  }

  let minLng = coordinates[0][0];
  let minLat = coordinates[0][1];
  let maxLng = coordinates[0][0];
  let maxLat = coordinates[0][1];

  coordinates.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  });

  return [
    minLng - padding,
    minLat - padding,
    maxLng + padding,
    maxLat + padding,
  ];
}

/**
 * Get center point of multiple coordinates
 * 
 * @param {[number, number][]} coordinates - Array of coordinates
 * @returns {[number, number]} Center coordinate
 * 
 * @example
 * ```ts
 * const center = getCenterPoint([
 *   [34.78, 32.08],
 *   [35.21, 31.77]
 * ]);
 * ```
 */
export function getCenterPoint(coordinates: [number, number][]): [number, number] {
  if (coordinates.length === 0) {
    return [0, 0];
  }

  const sum = coordinates.reduce(
    (acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat],
    [0, 0]
  );

  return [sum[0] / coordinates.length, sum[1] / coordinates.length];
}

// ============================================================================
// ISRAEL-SPECIFIC UTILITIES
// ============================================================================

/**
 * Common locations in Israel
 */
export const ISRAEL_LOCATIONS = {
  JERUSALEM: [35.2137, 31.7683] as [number, number],
  TEL_AVIV: [34.7818, 32.0853] as [number, number],
  HAIFA: [34.9896, 32.7940] as [number, number],
  EILAT: [34.9518, 29.5577] as [number, number],
  DEAD_SEA: [35.4836, 31.5590] as [number, number],
  SEA_OF_GALILEE: [35.5803, 32.8156] as [number, number],
  NAZARETH: [35.2972, 32.7046] as [number, number],
  BETHLEHEM: [35.2033, 31.7054] as [number, number],
  JAFFA: [34.7520, 32.0543] as [number, number],
  CAESAREA: [34.8925, 32.5014] as [number, number],
};

/**
 * Israel bounding box
 */
export const ISRAEL_BBOX: [number, number, number, number] = [
  34.2654, // minLng
  29.4969, // minLat
  35.8363, // maxLng
  33.2774, // maxLat
];

/**
 * Check if coordinates are within Israel
 * 
 * @param {[number, number]} coordinates - Coordinates to check
 * @returns {boolean} True if within Israel
 */
export function isInIsrael(coordinates: [number, number]): boolean {
  const [lng, lat] = coordinates;
  const [minLng, minLat, maxLng, maxLat] = ISRAEL_BBOX;
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

/**
 * Get nearest major city in Israel
 * 
 * @param {[number, number]} coordinates - Input coordinates
 * @returns {Object} Nearest city with name and distance
 */
export function getNearestCity(coordinates: [number, number]): {
  name: string;
  coordinates: [number, number];
  distance: number;
} {
  const cities = [
    { name: 'Jerusalem', coordinates: ISRAEL_LOCATIONS.JERUSALEM },
    { name: 'Tel Aviv', coordinates: ISRAEL_LOCATIONS.TEL_AVIV },
    { name: 'Haifa', coordinates: ISRAEL_LOCATIONS.HAIFA },
    { name: 'Eilat', coordinates: ISRAEL_LOCATIONS.EILAT },
  ];

  let nearest = cities[0];
  let minDistance = calculateHaversineDistance(coordinates, cities[0].coordinates);

  cities.forEach((city) => {
    const distance = calculateHaversineDistance(coordinates, city.coordinates);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = city;
    }
  });

  return {
    ...nearest,
    distance: minDistance,
  };
}

export default {
  geocodeAddress,
  reverseGeocode,
  getDirections,
  getOptimizedRoute,
  getDistanceMatrix,
  calculateHaversineDistance,
  validateCoordinates,
  formatCoordinates,
  calculateBoundingBox,
  getCenterPoint,
  ISRAEL_LOCATIONS,
  ISRAEL_BBOX,
  isInIsrael,
  getNearestCity,
};
