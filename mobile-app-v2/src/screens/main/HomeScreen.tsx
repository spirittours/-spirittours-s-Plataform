/**
 * Home Screen
 * Main dashboard showing featured tours and user info
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useTheme, Searchbar, FAB } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from 'react-query';
import { bookingAPI } from '../../services/api/bookingAPI';
import { TourCard } from '../../components/common/TourCard';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { Tour } from '../../types';

export const HomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: featuredTours, isLoading, refetch } = useQuery(
    'featuredTours',
    bookingAPI.getFeaturedTours
  );

  const { data: popularTours } = useQuery(
    'popularTours',
    bookingAPI.getPopularTours
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleTourPress = (tour: Tour) => {
    navigation.navigate('TourDetails', { tourId: tour.id });
  };

  const handleSearch = () => {
    navigation.navigate('SearchResults', { query: searchQuery });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LoadingOverlay visible={isLoading} message={t('common.loading')} />
      
      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: theme.colors.onSurface }]}>
            {t('home.greeting')}, {user?.name || 'Guest'}!
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            {t('home.exploreDestinations')}
          </Text>
        </View>

        {/* Search Bar */}
        <Searchbar
          placeholder={t('booking.searchDestination')}
          onChangeText={setSearchQuery}
          value={searchQuery}
          onSubmitEditing={handleSearch}
          style={styles.searchBar}
        />

        {/* Featured Tours */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            {t('home.popularTours')}
          </Text>
          <FlatList
            horizontal
            data={featuredTours || []}
            renderItem={({ item }) => (
              <TourCard
                tour={item}
                onPress={handleTourPress}
                horizontal
              />
            )}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

        {/* Popular Tours */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            {t('home.recommendations')}
          </Text>
          {popularTours?.map(tour => (
            <TourCard
              key={tour.id}
              tour={tour}
              onPress={handleTourPress}
            />
          ))}
        </View>
      </ScrollView>

      {/* FAB for Quick Booking */}
      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        onPress={() => navigation.navigate('SearchTours')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  searchBar: {
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  horizontalList: {
    paddingHorizontal: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
  },
});
