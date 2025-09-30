import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import { authStore } from '../stores/authStore';

interface SearchFilters {
  destination: string;
  dateFrom: string;
  dateTo: string;
  guests: number;
  priceMin: number;
  priceMax: number;
  categories: string[];
  accessibility: boolean;
  sustainability: boolean;
}

interface SearchResult {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  location: string;
  images: string[];
  rating: number;
  reviews_count: number;
  duration: string;
  category: string;
  availability: boolean;
  accessibility_features: string[];
  sustainability_score: number;
}

interface PopularDestination {
  id: string;
  name: string;
  country: string;
  image: string;
  tours_count: number;
  avg_price: number;
}

const CATEGORIES = [
  { id: 'adventure', name: 'Adventure', icon: '🏔️' },
  { id: 'cultural', name: 'Cultural', icon: '🏛️' },
  { id: 'nature', name: 'Nature', icon: '🌿' },
  { id: 'food', name: 'Food & Wine', icon: '🍷' },
  { id: 'wellness', name: 'Wellness', icon: '🧘' },
  { id: 'family', name: 'Family', icon: '👨‍👩‍👧‍👦' },
  { id: 'luxury', name: 'Luxury', icon: '💎' },
  { id: 'budget', name: 'Budget', icon: '💰' }
];

const SearchScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    destination: '',
    dateFrom: '',
    dateTo: '',
    guests: 1,
    priceMin: 0,
    priceMax: 10000,
    categories: [],
    accessibility: false,
    sustainability: false
  });
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [popularDestinations, setPopularDestinations] = useState<PopularDestination[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    loadPopularDestinations();
    loadRecentSearches();
  }, []);

  const loadPopularDestinations = async () => {
    try {
      const response = await apiService.get('/tours/popular-destinations');
      setPopularDestinations(response.data);
    } catch (error) {
      console.error('Error loading popular destinations:', error);
    }
  };

  const loadRecentSearches = async () => {
    try {
      const userId = authStore.user?.id;
      if (userId) {
        const response = await apiService.get(`/users/${userId}/recent-searches`);
        setRecentSearches(response.data);
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const performSearch = async (query: string = searchQuery) => {
    if (!query.trim() && !filters.destination) {
      Alert.alert('Search Required', 'Please enter a search term or select filters');
      return;
    }

    setLoading(true);
    try {
      const searchParams = {
        q: query,
        ...filters,
        categories: filters.categories.join(',')
      };

      const response = await apiService.post('/tours/search', searchParams);
      setSearchResults(response.data.results);

      // Save search to recent searches
      if (query.trim()) {
        saveRecentSearch(query);
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', 'Failed to perform search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveRecentSearch = async (query: string) => {
    try {
      const userId = authStore.user?.id;
      if (userId) {
        await apiService.post(`/users/${userId}/recent-searches`, { query });
        setRecentSearches(prev => [query, ...prev.filter(s => s !== query).slice(0, 4)]);
      }
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };

  const clearFilters = () => {
    setFilters({
      destination: '',
      dateFrom: '',
      dateTo: '',
      guests: 1,
      priceMin: 0,
      priceMax: 10000,
      categories: [],
      accessibility: false,
      sustainability: false
    });
  };

  const toggleCategory = (categoryId: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(c => c !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity style={styles.resultCard} onPress={() => {}}>
      <Image source={{ uri: item.images[0] }} style={styles.resultImage} />
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle}>{item.title}</Text>
        <Text style={styles.resultLocation}>📍 {item.location}</Text>
        <Text style={styles.resultDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.resultMeta}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.rating}>{item.rating}</Text>
            <Text style={styles.reviewsCount}>({item.reviews_count})</Text>
          </View>
          <Text style={styles.duration}>⏱️ {item.duration}</Text>
        </View>
        <View style={styles.resultFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{item.currency} {item.price}</Text>
            <Text style={styles.priceLabel}>per person</Text>
          </View>
          <View style={styles.badges}>
            {item.accessibility_features.length > 0 && (
              <Text style={styles.badge}>♿ Accessible</Text>
            )}
            {item.sustainability_score > 80 && (
              <Text style={[styles.badge, styles.sustainableBadge]}>🌱 Eco</Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPopularDestination = ({ item }: { item: PopularDestination }) => (
    <TouchableOpacity 
      style={styles.destinationCard}
      onPress={() => {
        setFilters(prev => ({ ...prev, destination: item.name }));
        performSearch();
      }}
    >
      <Image source={{ uri: item.image }} style={styles.destinationImage} />
      <Text style={styles.destinationName}>{item.name}</Text>
      <Text style={styles.destinationCountry}>{item.country}</Text>
      <Text style={styles.destinationMeta}>
        {item.tours_count} tours from ${item.avg_price}
      </Text>
    </TouchableOpacity>
  );

  const FiltersModal = () => (
    <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.filtersContainer}>
        <View style={styles.filtersHeader}>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.filtersTitle}>Search Filters</Text>
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearButton}>Clear</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.filtersContent}>
          {/* Destination Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Destination</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="Enter destination"
              value={filters.destination}
              onChangeText={(text) => setFilters(prev => ({ ...prev, destination: text }))}
            />
          </View>

          {/* Categories Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Categories</Text>
            <View style={styles.categoriesGrid}>
              {CATEGORIES.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    filters.categories.includes(category.id) && styles.selectedChip
                  ]}
                  onPress={() => toggleCategory(category.id)}
                >
                  <Text style={styles.categoryEmoji}>{category.icon}</Text>
                  <Text style={[
                    styles.categoryName,
                    filters.categories.includes(category.id) && styles.selectedChipText
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Price Range */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Price Range</Text>
            <View style={styles.priceRange}>
              <TextInput
                style={styles.priceInput}
                placeholder="Min"
                value={filters.priceMin.toString()}
                onChangeText={(text) => setFilters(prev => ({ ...prev, priceMin: parseInt(text) || 0 }))}
                keyboardType="numeric"
              />
              <Text style={styles.priceSeparator}>to</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Max"
                value={filters.priceMax.toString()}
                onChangeText={(text) => setFilters(prev => ({ ...prev, priceMax: parseInt(text) || 10000 }))}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Accessibility & Sustainability */}
          <View style={styles.filterSection}>
            <TouchableOpacity
              style={styles.toggleOption}
              onPress={() => setFilters(prev => ({ ...prev, accessibility: !prev.accessibility }))}
            >
              <Text style={styles.toggleLabel}>♿ Accessibility Features</Text>
              <Ionicons
                name={filters.accessibility ? "checkbox" : "checkbox-outline"}
                size={24}
                color={filters.accessibility ? "#007AFF" : "#666"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleOption}
              onPress={() => setFilters(prev => ({ ...prev, sustainability: !prev.sustainability }))}
            >
              <Text style={styles.toggleLabel}>🌱 Sustainable Tours Only</Text>
              <Ionicons
                name={filters.sustainability ? "checkbox" : "checkbox-outline"}
                size={24}
                color={filters.sustainability ? "#007AFF" : "#666"}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.filtersFooter}>
          <TouchableOpacity
            style={styles.applyFiltersButton}
            onPress={() => {
              setShowFilters(false);
              performSearch();
            }}
          >
            <Text style={styles.applyFiltersText}>Apply Filters</Text>
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
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search destinations, activities..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => performSearch()}
            returnKeyType="search"
          />
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Recent Searches */}
        {recentSearches.length > 0 && searchResults.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentSearches.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recentSearch}
                  onPress={() => {
                    setSearchQuery(search);
                    performSearch(search);
                  }}
                >
                  <Text style={styles.recentSearchText}>{search}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Popular Destinations */}
        {popularDestinations.length > 0 && searchResults.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Popular Destinations</Text>
            <FlatList
              data={popularDestinations}
              renderItem={renderPopularDestination}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.destinationsList}
            />
          </View>
        )}

        {/* Search Results */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Searching for the perfect tours...</Text>
          </View>
        )}

        {searchResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Search Results ({searchResults.length})
            </Text>
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* No Results */}
        {!loading && searchQuery && searchResults.length === 0 && (
          <View style={styles.noResults}>
            <Ionicons name="search" size={64} color="#CCC" />
            <Text style={styles.noResultsTitle}>No tours found</Text>
            <Text style={styles.noResultsText}>
              Try adjusting your search criteria or explore our popular destinations
            </Text>
          </View>
        )}
      </ScrollView>

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
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F4',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333'
  },
  filterButton: {
    padding: 8
  },
  content: {
    flex: 1
  },
  section: {
    marginTop: 20
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
    marginBottom: 12
  },
  recentSearch: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginLeft: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5'
  },
  recentSearchText: {
    fontSize: 14,
    color: '#666'
  },
  destinationsList: {
    paddingHorizontal: 16
  },
  destinationCard: {
    width: 160,
    backgroundColor: 'white',
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  destinationImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover'
  },
  destinationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    margin: 12,
    marginBottom: 4
  },
  destinationCountry: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 12,
    marginBottom: 8
  },
  destinationMeta: {
    fontSize: 12,
    color: '#999',
    marginHorizontal: 12,
    marginBottom: 12
  },
  resultCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  resultImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover'
  },
  resultContent: {
    padding: 16
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  resultLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  resultDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12
  },
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4
  },
  reviewsCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4
  },
  duration: {
    fontSize: 14,
    color: '#666'
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  price: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF'
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4
  },
  badges: {
    flexDirection: 'row',
    gap: 8
  },
  badge: {
    backgroundColor: '#E3F2FD',
    color: '#1976D2',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden'
  },
  sustainableBadge: {
    backgroundColor: '#E8F5E8',
    color: '#2E7D32'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center'
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  noResultsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24
  },
  // Filters Modal Styles
  filtersContainer: {
    flex: 1,
    backgroundColor: 'white'
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5'
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
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
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F8F9FA'
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8
  },
  selectedChip: {
    backgroundColor: '#007AFF'
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: 8
  },
  categoryName: {
    fontSize: 14,
    color: '#333'
  },
  selectedChipText: {
    color: 'white'
  },
  priceRange: {
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
  toggleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4'
  },
  toggleLabel: {
    fontSize: 16,
    color: '#333'
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

export default SearchScreen;