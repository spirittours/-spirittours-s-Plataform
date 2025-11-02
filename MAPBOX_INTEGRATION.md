# 🗺️ Mapbox Integration Guide

## Overview

Complete Mapbox GL JS integration for Spirit Tours with interactive maps, route visualization, geocoding, and directions.

## 📦 Components

### 1. MapContainer
Interactive map component with custom controls and markers.

**Features:**
- Multiple map styles (streets, satellite, outdoors, light, dark)
- Custom markers with popups
- Route visualization
- Geocoding search
- Geolocation support
- Fullscreen mode
- Touch and gesture support

**Usage:**
```tsx
import { MapContainer } from '@/components/Map/MapContainer';

const markers = [
  {
    id: '1',
    coordinates: [35.2137, 31.7683], // [lng, lat]
    title: 'Old City Jerusalem',
    description: 'Historic sites and Western Wall',
    type: 'tour',
  }
];

<MapContainer
  center={[35.2137, 31.7683]}
  zoom={12}
  markers={markers}
  showControls
  showGeocoder
  onMarkerClick={(marker) => console.log(marker)}
/>
```

### 2. TourRouteMap
Specialized component for displaying tour routes with multiple stops.

**Features:**
- Multi-stop route visualization
- Numbered waypoint markers
- Distance and duration calculations
- Day-by-day itinerary
- Turn-by-turn directions
- Print functionality
- Share route
- Google Maps navigation link

**Usage:**
```tsx
import { TourRouteMap } from '@/components/Map/TourRouteMap';

const stops = [
  {
    id: '1',
    name: 'Tel Aviv',
    coordinates: [34.7818, 32.0853],
    type: 'start',
    order: 0,
    day: 1,
    duration: 120, // minutes
    activities: ['City tour', 'Beach walk'],
  },
  {
    id: '2',
    name: 'Jerusalem',
    coordinates: [35.2137, 31.7683],
    type: 'stop',
    order: 1,
    day: 1,
    duration: 240,
    activities: ['Old City', 'Western Wall'],
  },
];

<TourRouteMap
  stops={stops}
  showDirections
  showTimeline
  onStopClick={(stop) => console.log(stop)}
/>
```

## 🔧 Utilities

### Geocoding

**Forward Geocoding** (Address → Coordinates):
```ts
import { geocodeAddress } from '@/utils/mapbox.utils';

const results = await geocodeAddress('Jerusalem, Israel', {
  country: 'il',
  limit: 5
});

console.log(results[0].center); // [35.2137, 31.7683]
```

**Reverse Geocoding** (Coordinates → Address):
```ts
import { reverseGeocode } from '@/utils/mapbox.utils';

const results = await reverseGeocode([35.2137, 31.7683]);
console.log(results[0].place_name); // "Jerusalem, Israel"
```

### Directions

**Get Route Between Points**:
```ts
import { getDirections } from '@/utils/mapbox.utils';

const route = await getDirections([
  [34.7818, 32.0853], // Tel Aviv
  [35.2137, 31.7683]  // Jerusalem
], {
  profile: 'driving',
  steps: true
});

console.log(`Distance: ${route.distance / 1000} km`);
console.log(`Duration: ${route.duration / 60} minutes`);
```

**Optimized Route** (TSP):
```ts
import { getOptimizedRoute } from '@/utils/mapbox.utils';

const stops = [
  [34.78, 32.08], // Tel Aviv
  [35.21, 31.77], // Jerusalem
  [35.50, 32.80]  // Haifa
];

const optimized = await getOptimizedRoute(stops);
// Returns best order to visit all stops
```

### Distance Calculations

**Distance Matrix**:
```ts
import { getDistanceMatrix } from '@/utils/mapbox.utils';

const matrix = await getDistanceMatrix(
  [[34.78, 32.08]], // Origins
  [[35.21, 31.77], [35.50, 32.80]] // Destinations
);

console.log(matrix.distances); // [[54.3, 95.2]] km
console.log(matrix.durations); // [[62, 110]] minutes
```

**Haversine Distance**:
```ts
import { calculateHaversineDistance } from '@/utils/mapbox.utils';

const distance = calculateHaversineDistance(
  [34.7818, 32.0853],
  [35.2137, 31.7683]
);
console.log(`${distance.toFixed(1)} km`); // 54.3 km
```

## 🇮🇱 Israel-Specific Features

### Common Locations
```ts
import { ISRAEL_LOCATIONS } from '@/utils/mapbox.utils';

console.log(ISRAEL_LOCATIONS.JERUSALEM);  // [35.2137, 31.7683]
console.log(ISRAEL_LOCATIONS.TEL_AVIV);   // [34.7818, 32.0853]
console.log(ISRAEL_LOCATIONS.DEAD_SEA);   // [35.4836, 31.5590]
```

### Check if in Israel
```ts
import { isInIsrael } from '@/utils/mapbox.utils';

isInIsrael([35.2137, 31.7683]); // true (Jerusalem)
isInIsrael([0, 0]); // false
```

### Nearest City
```ts
import { getNearestCity } from '@/utils/mapbox.utils';

const nearest = getNearestCity([35.0, 31.5]);
console.log(nearest.name); // "Jerusalem"
console.log(nearest.distance); // 23.4 km
```

## 📝 Configuration

### Environment Variables

Add to `.env`:
```bash
REACT_APP_MAPBOX_TOKEN=your_mapbox_token_here
```

### Get Mapbox Token

1. Create account at [mapbox.com](https://mapbox.com)
2. Go to [Account → Tokens](https://account.mapbox.com/access-tokens/)
3. Create new token with these scopes:
   - `styles:read`
   - `fonts:read`
   - `datasets:read`
   - `geocoding:read`
   - `directions:read`

### Install Dependencies

```bash
npm install mapbox-gl @mapbox/mapbox-gl-geocoder
npm install -D @types/mapbox-gl @types/mapbox__mapbox-gl-geocoder
```

## 🎨 Styling

### Map Styles

Available styles:
- `streets` - Default street map
- `satellite` - Satellite imagery with roads
- `outdoors` - Topographic style
- `light` - Light color scheme
- `dark` - Dark color scheme

### Custom CSS

```css
/* Custom marker styling */
.custom-marker {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  cursor: pointer;
}

/* Popup styling */
.mapboxgl-popup-content {
  padding: 12px;
  border-radius: 8px;
}
```

## 🚀 Advanced Features

### Custom Markers

```tsx
const markers = [
  {
    id: '1',
    coordinates: [35.21, 31.77],
    title: 'Tour Stop',
    type: 'tour',
    color: '#4CAF50', // Custom color
    icon: '/icons/tour.svg', // Custom icon
  }
];
```

### Draw on Map

```tsx
const [routes, setRoutes] = useState<MapRoute[]>([]);

const addRoute = () => {
  setRoutes([...routes, {
    id: 'route-1',
    coordinates: [[34.78, 32.08], [35.21, 31.77]],
    color: '#2196F3',
    width: 4,
  }]);
};
```

### Handle Map Events

```tsx
<MapContainer
  onMapClick={(coords) => {
    console.log('Clicked at:', coords);
  }}
  onMarkerClick={(marker) => {
    console.log('Marker clicked:', marker);
  }}
  onLoad={(map) => {
    console.log('Map loaded:', map);
    // Access Mapbox GL JS map instance
  }}
/>
```

## 📱 Responsive Design

Maps automatically adapt to screen size:

```tsx
<MapContainer
  height={{
    xs: '300px',  // Mobile
    sm: '400px',  // Tablet
    md: '500px'   // Desktop
  }}
/>
```

## ♿ Accessibility

Maps include accessibility features:
- Keyboard navigation
- ARIA labels
- Screen reader support
- Focus indicators

```tsx
<MapContainer
  interactive={true}  // Enable keyboard navigation
  aria-label="Tour route map"
/>
```

## 🧪 Testing

### Mock Mapbox in Tests

```tsx
// __mocks__/mapbox-gl.ts
export default {
  Map: jest.fn(() => ({
    on: jest.fn(),
    remove: jest.fn(),
    addControl: jest.fn(),
  })),
  NavigationControl: jest.fn(),
  Marker: jest.fn(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
  })),
};
```

### Test Component

```tsx
import { render, screen } from '@testing-library/react';
import { MapContainer } from './MapContainer';

test('renders map container', () => {
  render(<MapContainer />);
  expect(screen.getByRole('region')).toBeInTheDocument();
});
```

## 📊 Performance

### Optimization Tips

1. **Lazy Load Maps**
```tsx
const MapContainer = lazy(() => import('@/components/Map/MapContainer'));
```

2. **Limit Markers**
```tsx
// Cluster markers when zoomed out
const visibleMarkers = markers.slice(0, 100);
```

3. **Cache Geocoding**
```tsx
const cache = new Map();
const cachedGeocode = async (address) => {
  if (cache.has(address)) return cache.get(address);
  const result = await geocodeAddress(address);
  cache.set(address, result);
  return result;
};
```

## 🔒 Security

### Token Security

**DO:**
- ✅ Use environment variables
- ✅ Restrict token to your domain
- ✅ Set URL restrictions in Mapbox dashboard

**DON'T:**
- ❌ Commit tokens to Git
- ❌ Use tokens in public URLs
- ❌ Share tokens publicly

### Token Scopes

Minimum required scopes:
- `styles:read`
- `fonts:read`
- `geocoding:read` (if using geocoding)
- `directions:read` (if using directions)

## 📚 Resources

- [Mapbox GL JS Docs](https://docs.mapbox.com/mapbox-gl-js/)
- [Geocoding API](https://docs.mapbox.com/api/search/geocoding/)
- [Directions API](https://docs.mapbox.com/api/navigation/directions/)
- [Map Design](https://www.mapbox.com/maps)

## 🐛 Troubleshooting

### Map Not Loading

**Issue**: Blank map or error

**Solutions:**
1. Check Mapbox token is set
2. Verify token has correct scopes
3. Check browser console for errors
4. Ensure CSS is imported

### Markers Not Appearing

**Issue**: Markers don't show

**Solutions:**
1. Verify coordinates format `[lng, lat]`
2. Check coordinates are valid
3. Ensure map is loaded before adding markers
4. Check marker data structure

### Geocoding Fails

**Issue**: Address search doesn't work

**Solutions:**
1. Verify token has `geocoding:read` scope
2. Check network requests
3. Verify address format
4. Try with simpler query

## 💡 Best Practices

1. **Always validate coordinates** before using
2. **Cache geocoding results** to reduce API calls
3. **Use bounding boxes** to limit search area
4. **Implement error handling** for all API calls
5. **Show loading states** during async operations
6. **Optimize marker rendering** for large datasets
7. **Test on mobile devices** for touch gestures
8. **Provide fallback** for when map fails to load

## 🎓 Examples

### Complete Tour Map

```tsx
import { TourRouteMap, TourStop } from '@/components/Map/TourRouteMap';

const HolyLandTour = () => {
  const stops: TourStop[] = [
    {
      id: '1',
      name: 'Ben Gurion Airport',
      coordinates: [34.8869, 32.0114],
      type: 'start',
      order: 0,
      day: 1,
    },
    {
      id: '2',
      name: 'Jerusalem Old City',
      coordinates: [35.2345, 31.7767],
      type: 'stop',
      order: 1,
      day: 1,
      duration: 240,
      activities: ['Western Wall', 'Via Dolorosa', 'Church of Holy Sepulchre'],
    },
    {
      id: '3',
      name: 'Dead Sea',
      coordinates: [35.4836, 31.5590],
      type: 'stop',
      order: 2,
      day: 2,
      duration: 180,
      activities: ['Float in Dead Sea', 'Masada visit'],
    },
    {
      id: '4',
      name: 'Sea of Galilee',
      coordinates: [35.5803, 32.8156],
      type: 'end',
      order: 3,
      day: 3,
      duration: 120,
      activities: ['Boat ride', 'Capernaum visit'],
    },
  ];

  return (
    <TourRouteMap
      stops={stops}
      routeColor="#4CAF50"
      showDirections
      showTimeline
      onStopClick={(stop) => {
        console.log('Stop clicked:', stop.name);
      }}
    />
  );
};
```

---

**Last Updated**: 2024-11-02  
**Version**: 1.0.0  
**Maintainer**: Spirit Tours Development Team
