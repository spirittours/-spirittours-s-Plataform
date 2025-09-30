import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { apiService } from '../services/apiService';

const { width, height } = Dimensions.get('window');

interface MapLocation {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  type: 'tour' | 'destination' | 'accommodation' | 'restaurant' | 'attraction';
  price?: number;
  currency?: string;
  rating?: number;
  reviews_count?: number;
  image: string;
  availability?: boolean;
  category?: string;
  provider?: {
    name: string;
    verified: boolean;
  };
  distance_from_user?: number;
}

interface MapFilters {
  types: string[];
  priceRange: [number, number];
  rating: number;
  radius: number;
  categories: string[];
}

interface UserLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

const LOCATION_TYPES = [
  { id: 'tour', name: 'Tours', icon: '🎯', color: '#007AFF' },
  { id: 'destination', name: 'Destinations', icon: '📍', color: '#4CAF50' },
  { id: 'accommodation', name: 'Hotels', icon: '🏨', color: '#FF9800' },
  { id: 'restaurant', name: 'Restaurants', icon: '🍽️', color: '#F44336' },
  { id: 'attraction', name: 'Attractions', icon: '🎡', color: '#9C27B0' }
];

const CATEGORIES = [
  { id: 'adventure', name: 'Adventure', color: '#FF5722' },
  { id: 'cultural', name: 'Cultural', color: '#795548' },
  { id: 'nature', name: 'Nature', color: '#4CAF50' },
  { id: 'food', name: 'Food & Wine', color: '#FF9800' },
  { id: 'wellness', name: 'Wellness', color: '#E91E63' },
  { id: 'family', name: 'Family', color: '#2196F3' },
  { id: 'luxury', name: 'Luxury', color: '#9C27B0' },
  { id: 'budget', name: 'Budget', color: '#607D8B' }
];

const MapScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
  const mapRef = useRef<MapView>(null);
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const [filters, setFilters] = useState<MapFilters>({
    types: ['tour', 'destination'],
    priceRange: [0, 1000],
    rating: 0,
    radius: 50, // km
    categories: []
  });

  useEffect(() => {
    initializeMap();
    if (route?.params?.searchQuery) {
      setSearchQuery(route.params.searchQuery);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [filters, mapRegion]);

  const initializeMap = async () => {
    try {
      // Get user's current location
      // In a real app, you would use react-native-geolocation-service
      const mockUserLocation = {
        latitude: 37.7749,
        longitude: -122.4194,
        address: 'San Francisco, CA'
      };
      
      setUserLocation(mockUserLocation);
      setMapRegion({
        latitude: mockUserLocation.latitude,
        longitude: mockUserLocation.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });
      
      // If there's a specific location from navigation params
      if (route?.params?.location) {
        const { latitude, longitude } = route.params.location;
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

  const loadLocations = async () => {
    try {
      setLoading(true);
      
      const params = {
        latitude: mapRegion.latitude,
        longitude: mapRegion.longitude,
        radius: filters.radius,
        types: filters.types.join(','),
        min_price: filters.priceRange[0],
        max_price: filters.priceRange[1],
        min_rating: filters.rating,
        categories: filters.categories.join(','),
        search: searchQuery
      };

      const response = await apiService.get('/map/locations', { params });
      setLocations(response.data);
    } catch (error) {
      console.error('Error loading locations:', error);
      Alert.alert('Error', 'Failed to load map locations');
    } finally {
      setLoading(false);
    }
  };

  const getMarkerColor = (type: string) => {
    const typeConfig = LOCATION_TYPES.find(t => t.id === type);
    return typeConfig?.color || '#007AFF';
  };

  const onMarkerPress = (location: MapLocation) => {
    setSelectedLocation(location);
    setShowLocationDetails(true);
  };

  const onRegionChangeComplete = (region: any) => {
    setMapRegion(region);
  };

  const zoomToUserLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const response = await apiService.get('/map/search', {
        params: { query: searchQuery }
      });
      
      if (response.data.length > 0) {
        const location = response.data[0];
        const newRegion = {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        };
        
        setMapRegion(newRegion);
        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 1000);
        }
      }
    } catch (error) {
      console.error('Error searching location:', error);
      Alert.alert('Error', 'Location not found');
    } finally {
      setLoading(false);
    }
  };

  const toggleFilter = (filterType: 'types' | 'categories', value: string) => {
    setFilters(prev => {
      const currentArray = prev[filterType];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      
      return { ...prev, [filterType]: newArray };
    });
  };

  const renderMarkers = () => {
    return locations.map(location => (
      <Marker
        key={location.id}
        coordinate={{
          latitude: location.latitude,
          longitude: location.longitude
        }}
        pinColor={getMarkerColor(location.type)}
        onPress={() => onMarkerPress(location)}
      >
        <View style={[
          styles.customMarker,
          { backgroundColor: getMarkerColor(location.type) }
        ]}>
          <Text style={styles.markerIcon}>
            {LOCATION_TYPES.find(t => t.id === location.type)?.icon || '📍'}
          </Text>
        </View>
        
        <Callout tooltip>
          <View style={styles.callout}>
            <Text style={styles.calloutTitle}>{location.title}</Text>
            <Text style={styles.calloutType}>
              {LOCATION_TYPES.find(t => t.id === location.type)?.name}
            </Text>
            {location.rating && (
              <View style={styles.calloutRating}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.ratingText}>{location.rating}</Text>
                <Text style={styles.reviewsText}>({location.reviews_count})</Text>
              </View>
            )}
            {location.price && (
              <Text style={styles.calloutPrice}>
                {location.currency} {location.price}
              </Text>
            )}
          </View>
        </Callout>
      </Marker>
    ));
  };

  const LocationDetailsModal = () => {
    if (!selectedLocation) return null;

    return (
      <Modal 
        visible={showLocationDetails} 
        animationType="slide" 
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLocationDetails(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Location Details</Text>
            <TouchableOpacity onPress={() => {
              // Add to favorites
              Alert.alert('Added to favorites!');
            }}>
              <Ionicons name="heart-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Image source={{ uri: selectedLocation.image }} style={styles.detailImage} />
            
            <View style={styles.detailInfo}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>{selectedLocation.title}</Text>
                <View style={[
                  styles.typeBadge,
                  { backgroundColor: getMarkerColor(selectedLocation.type) }
                ]}>
                  <Text style={styles.typeBadgeText}>
                    {LOCATION_TYPES.find(t => t.id === selectedLocation.type)?.name}
                  </Text>
                </View>
              </View>

              <Text style={styles.detailDescription}>{selectedLocation.description}</Text>

              {selectedLocation.rating && (
                <View style={styles.ratingSection}>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={16} color="#FFD700" />
                    <Text style={styles.ratingValue}>{selectedLocation.rating}</Text>
                    <Text style={styles.reviewsCount}>
                      ({selectedLocation.reviews_count} reviews)
                    </Text>
                  </View>
                </View>
              )}

              {selectedLocation.price && (
                <View style={styles.priceSection}>
                  <Text style={styles.priceLabel}>Starting from</Text>
                  <Text style={styles.priceValue}>
                    {selectedLocation.currency} {selectedLocation.price}
                  </Text>
                  <Text style={styles.priceNote}>per person</Text>
                </View>
              )}

              {selectedLocation.distance_from_user && (
                <View style={styles.distanceSection}>
                  <Ionicons name="location" size={16} color="#666" />
                  <Text style={styles.distanceText}>
                    {selectedLocation.distance_from_user.toFixed(1)} km away
                  </Text>
                </View>
              )}

              {selectedLocation.provider && (
                <View style={styles.providerSection}>
                  <Text style={styles.providerLabel}>Provided by</Text>
                  <View style={styles.providerInfo}>
                    <Text style={styles.providerName}>
                      {selectedLocation.provider.name}
                    </Text>
                    {selectedLocation.provider.verified && (
                      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    )}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.directionsButton}
              onPress={() => {
                // Open directions in maps app
                const url = `https://maps.google.com/?q=${selectedLocation.latitude},${selectedLocation.longitude}`;
                // Linking.openURL(url);
                Alert.alert('Directions', 'Would open directions in maps app');
              }}
            >
              <Ionicons name="navigate" size={20} color="#007AFF" />
              <Text style={styles.directionsText}>Directions</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.viewDetailsButton}
              onPress={() => {
                setShowLocationDetails(false);
                if (selectedLocation.type === 'tour') {
                  navigation.navigate('TourDetails', { tourId: selectedLocation.id });
                } else {
                  navigation.navigate('LocationDetails', { locationId: selectedLocation.id });
                }
              }}
            >
              <Text style={styles.viewDetailsText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const FiltersModal = () => (
    <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.filtersContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Map Filters</Text>
          <TouchableOpacity onPress={() => {
            setFilters({
              types: ['tour', 'destination'],
              priceRange: [0, 1000],
              rating: 0,
              radius: 50,
              categories: []
            });
          }}>
            <Text style={styles.clearButton}>Clear</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.filtersContent}>
          {/* Location Types */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Location Types</Text>
            <View style={styles.filterGrid}>
              {LOCATION_TYPES.map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.filterChip,
                    filters.types.includes(type.id) && styles.selectedChip,
                    { borderColor: type.color }
                  ]}
                  onPress={() => toggleFilter('types', type.id)}
                >
                  <Text style={styles.filterChipIcon}>{type.icon}</Text>
                  <Text style={[
                    styles.filterChipText,
                    filters.types.includes(type.id) && { color: type.color }
                  ]}>
                    {type.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Categories */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Categories</Text>
            <View style={styles.filterGrid}>
              {CATEGORIES.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    filters.categories.includes(category.id) && [
                      styles.selectedCategoryChip,
                      { backgroundColor: category.color }
                    ]
                  ]}
                  onPress={() => toggleFilter('categories', category.id)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    filters.categories.includes(category.id) && styles.selectedCategoryText
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Price Range */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Price Range</Text>
            <View style={styles.priceInputs}>
              <TextInput
                style={styles.priceInput}
                placeholder="Min"
                value={filters.priceRange[0].toString()}
                onChangeText={(text) => setFilters(prev => ({
                  ...prev,
                  priceRange: [parseInt(text) || 0, prev.priceRange[1]]
                }))}
                keyboardType="numeric"
              />
              <Text style={styles.priceSeparator}>to</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Max"
                value={filters.priceRange[1].toString()}
                onChangeText={(text) => setFilters(prev => ({
                  ...prev,
                  priceRange: [prev.priceRange[0], parseInt(text) || 1000]
                }))}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Minimum Rating */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Minimum Rating</Text>
            <View style={styles.ratingFilter}>
              {[0, 3, 4, 4.5].map(rating => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingOption,
                    filters.rating === rating && styles.selectedRating
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, rating }))}
                >
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.ratingOptionText}>
                    {rating === 0 ? 'Any' : `${rating}+`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Search Radius */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Search Radius</Text>
            <View style={styles.radiusOptions}>
              {[10, 25, 50, 100].map(radius => (
                <TouchableOpacity
                  key={radius}
                  style={[
                    styles.radiusOption,
                    filters.radius === radius && styles.selectedRadius
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, radius }))}
                >
                  <Text style={[
                    styles.radiusOptionText,
                    filters.radius === radius && styles.selectedRadiusText
                  ]}>
                    {radius} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.filtersFooter}>
          <TouchableOpacity
            style={styles.applyFiltersButton}
            onPress={() => setShowFilters(false)}
          >
            <Text style={styles.applyFiltersText}>
              Apply Filters ({locations.length} locations)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search locations..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={searchLocation}
            returnKeyType="search"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={mapRegion}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
      >
        {renderMarkers()}
        
        {/* User location marker */}
        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude
            }}
            title="Your Location"
            pinColor="#007AFF"
          />
        )}
      </MapView>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}

      {/* Floating Action Buttons */}
      <View style={styles.floatingButtons}>
        <TouchableOpacity style={styles.floatingButton} onPress={zoomToUserLocation}>
          <Ionicons name="locate" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.floatingButton} 
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="filter" size={24} color="#007AFF" />
          {(filters.types.length < LOCATION_TYPES.length || 
            filters.categories.length > 0 || 
            filters.rating > 0) && (
            <View style={styles.filterBadge} />
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet with Location Summary */}
      {locations.length > 0 && (
        <View style={styles.bottomSheet}>
          <Text style={styles.locationCount}>
            {locations.length} locations found
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.locationsList}
          >
            {locations.slice(0, 10).map(location => (
              <TouchableOpacity
                key={location.id}
                style={styles.locationCard}
                onPress={() => onMarkerPress(location)}
              >
                <Image source={{ uri: location.image }} style={styles.locationCardImage} />
                <View style={styles.locationCardInfo}>
                  <Text style={styles.locationCardTitle} numberOfLines={1}>
                    {location.title}
                  </Text>
                  <Text style={styles.locationCardType}>
                    {LOCATION_TYPES.find(t => t.id === location.type)?.name}
                  </Text>
                  {location.rating && (
                    <View style={styles.locationCardRating}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.locationCardRatingText}>{location.rating}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <LocationDetailsModal />
      <FiltersModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5'
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F4',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    marginRight: 12
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 8
  },
  filterButton: {
    padding: 8
  },
  map: {
    flex: 1
  },
  customMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  markerIcon: {
    fontSize: 16
  },
  callout: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    minWidth: 150,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  calloutType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  calloutRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  ratingText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 4
  },
  reviewsText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 2
  },
  calloutPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF'
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  floatingButtons: {
    position: 'absolute',
    right: 16,
    bottom: 160,
    gap: 12
  },
  floatingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B'
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  locationCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 12
  },
  locationsList: {
    paddingLeft: 16
  },
  locationCard: {
    width: 140,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden'
  },
  locationCardImage: {
    width: '100%',
    height: 80,
    resizeMode: 'cover'
  },
  locationCardInfo: {
    padding: 8
  },
  locationCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  locationCardType: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4
  },
  locationCardRating: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  locationCardRatingText: {
    fontSize: 10,
    color: '#333',
    marginLeft: 2
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  modalContent: {
    flex: 1
  },
  detailImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover'
  },
  detailInfo: {
    padding: 16
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  detailTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginRight: 12
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: 'hidden'
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },
  detailDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16
  },
  ratingSection: {
    marginBottom: 16
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4
  },
  reviewsCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 4
  },
  priceNote: {
    fontSize: 12,
    color: '#666'
  },
  distanceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  distanceText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4
  },
  providerSection: {
    marginBottom: 16
  },
  providerLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  providerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginRight: 8
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 12
  },
  directionsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F3F4',
    paddingVertical: 12,
    borderRadius: 8
  },
  directionsText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  viewDetailsText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  // Filter Modal Styles
  filtersContainer: {
    flex: 1,
    backgroundColor: 'white'
  },
  clearButton: {
    fontSize: 16,
    color: '#007AFF'
  },
  filtersContent: {
    flex: 1,
    padding: 16
  },
  filterSection: {
    marginBottom: 24
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8
  },
  selectedChip: {
    backgroundColor: '#E3F2FD'
  },
  filterChipIcon: {
    fontSize: 14,
    marginRight: 6
  },
  filterChipText: {
    fontSize: 14,
    color: '#333'
  },
  categoryChip: {
    backgroundColor: '#F1F3F4',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8
  },
  selectedCategoryChip: {
    // backgroundColor set dynamically
  },
  categoryChipText: {
    fontSize: 12,
    color: '#666'
  },
  selectedCategoryText: {
    color: 'white',
    fontWeight: '500'
  },
  priceInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F8F9FA'
  },
  priceSeparator: {
    fontSize: 16,
    color: '#666'
  },
  ratingFilter: {
    flexDirection: 'row',
    gap: 8
  },
  ratingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F4',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  selectedRating: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#007AFF'
  },
  ratingOptionText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 4
  },
  radiusOptions: {
    flexDirection: 'row',
    gap: 8
  },
  radiusOption: {
    backgroundColor: '#F1F3F4',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  selectedRadius: {
    backgroundColor: '#007AFF'
  },
  radiusOptionText: {
    fontSize: 14,
    color: '#333'
  },
  selectedRadiusText: {
    color: 'white',
    fontWeight: '500'
  },
  filtersFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5'
  },
  applyFiltersButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },
  applyFiltersText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default MapScreen;