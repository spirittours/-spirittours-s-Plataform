#!/usr/bin/env python3
"""
Script para generar TODOS los componentes UI de la mobile app
Genera pantallas, componentes comunes, y navegación
"""

import os
from pathlib import Path

MOBILE_APP_DIR = Path("/home/user/webapp/mobile-app-v2")
SRC_DIR = MOBILE_APP_DIR / "src"

def create_file(path: Path, content: str):
    """Create file with content"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8')
    print(f"✅ Created: {path.relative_to(MOBILE_APP_DIR)}")

def generate_common_components():
    """Generate common reusable components"""
    
    # Error Boundary
    error_boundary = '''/**
 * Error Boundary Component
 * Catches and handles React errors gracefully
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error reporting service
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error?.message}</Text>
          <Button title="Try Again" onPress={this.handleReset} />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
});
'''
    create_file(SRC_DIR / "components/common/ErrorBoundary.tsx", error_boundary)
    
    # Loading Overlay
    loading_overlay = '''/**
 * Loading Overlay Component
 * Shows full-screen loading indicator
 */

import React from 'react';
import {
  View,
  Modal,
  ActivityIndicator,
  Text,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useTheme } from 'react-native-paper';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message,
}) => {
  const theme = useTheme();

  return (
    <Modal transparent visible={visible} animationType="fade">
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.7)" />
      <View style={styles.container}>
        <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          {message && (
            <Text style={[styles.message, { color: theme.colors.onSurface }]}>
              {message}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  content: {
    padding: 24,
    borderRadius: 12,
    minWidth: 150,
    alignItems: 'center',
  },
  message: {
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
});
'''
    create_file(SRC_DIR / "components/common/LoadingOverlay.tsx", loading_overlay)
    
    # Tour Card Component
    tour_card = '''/**
 * Tour Card Component
 * Displays tour information in a card format
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Card, Chip, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Tour } from '../../types';

const { width } = Dimensions.get('window');

interface TourCardProps {
  tour: Tour;
  onPress: (tour: Tour) => void;
  horizontal?: boolean;
}

export const TourCard: React.FC<TourCardProps> = ({
  tour,
  onPress,
  horizontal = false,
}) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={() => onPress(tour)}
      style={[
        styles.container,
        horizontal && styles.horizontalContainer,
        { backgroundColor: theme.colors.surface },
      ]}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: tour.images[0] }}
        style={[styles.image, horizontal && styles.horizontalImage]}
        resizeMode="cover"
      />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]} numberOfLines={2}>
            {tour.title}
          </Text>
          {tour.featured && (
            <Chip style={styles.featuredChip} textStyle={styles.featuredText}>
              Featured
            </Chip>
          )}
        </View>
        
        <View style={styles.info}>
          <View style={styles.infoRow}>
            <Icon name="map-marker" size={16} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
              {tour.destination}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Icon name="clock-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
              {tour.duration} {tour.durationUnit}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.rating}>
            <Icon name="star" size={16} color="#FFA500" />
            <Text style={[styles.ratingText, { color: theme.colors.onSurface }]}>
              {tour.rating.toFixed(1)} ({tour.reviewCount})
            </Text>
          </View>
          
          <Text style={[styles.price, { color: theme.colors.primary }]}>
            {tour.currency} ${tour.price}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  horizontalContainer: {
    flexDirection: 'row',
    width: width * 0.9,
  },
  image: {
    width: '100%',
    height: 200,
  },
  horizontalImage: {
    width: 150,
    height: 150,
  },
  content: {
    padding: 12,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  featuredChip: {
    height: 24,
    backgroundColor: '#FFD700',
  },
  featuredText: {
    fontSize: 10,
    lineHeight: 12,
  },
  info: {
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
'''
    create_file(SRC_DIR / "components/common/TourCard.tsx", tour_card)

def generate_screens():
    """Generate screen components"""
    
    # Home Screen
    home_screen = '''/**
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
'''
    create_file(SRC_DIR / "screens/main/HomeScreen.tsx", home_screen)
    
    # Booking Screen
    booking_screen = '''/**
 * Booking Screen
 * Handles tour booking process
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Button, TextInput, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import DatePicker from 'react-native-date-picker';
import { bookingAPI } from '../../services/api/bookingAPI';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';

export const BookingScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { tourId } = route.params as { tourId: string };

  const [date, setDate] = useState(new Date());
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');
  const [specialRequests, setSpecialRequests] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleBooking = async () => {
    try {
      setIsLoading(true);
      const booking = await bookingAPI.createBooking({
        tourId,
        tourDate: date.toISOString(),
        adults: parseInt(adults),
        children: parseInt(children),
        specialRequests,
      });

      Alert.alert(
        t('booking.bookingConfirmed'),
        `${t('booking.bookingReference')}: ${booking.id}`,
        [
          {
            text: t('common.ok'),
            onPress: () => navigation.navigate('BookingDetails', { bookingId: booking.id }),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LoadingOverlay visible={isLoading} message="Processing booking..." />
      
      <ScrollView style={styles.scroll}>
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.onSurface }]}>
            {t('booking.selectDate')}
          </Text>
          <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
          >
            {date.toLocaleDateString()}
          </Button>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.onSurface }]}>
            {t('booking.adults')}
          </Text>
          <TextInput
            value={adults}
            onChangeText={setAdults}
            keyboardType="number-pad"
            mode="outlined"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.onSurface }]}>
            {t('booking.children')}
          </Text>
          <TextInput
            value={children}
            onChangeText={setChildren}
            keyboardType="number-pad"
            mode="outlined"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.onSurface }]}>
            Special Requests
          </Text>
          <TextInput
            value={specialRequests}
            onChangeText={setSpecialRequests}
            multiline
            numberOfLines={4}
            mode="outlined"
          />
        </View>

        <Button
          mode="contained"
          onPress={handleBooking}
          style={styles.bookButton}
          contentStyle={styles.bookButtonContent}
        >
          {t('booking.bookNow')}
        </Button>
      </ScrollView>

      <DatePicker
        modal
        open={showDatePicker}
        date={date}
        minimumDate={new Date()}
        onConfirm={(selectedDate) => {
          setShowDatePicker(false);
          setDate(selectedDate);
        }}
        onCancel={() => setShowDatePicker(false)}
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
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  dateButton: {
    marginTop: 8,
  },
  bookButton: {
    marginTop: 20,
    marginBottom: 40,
  },
  bookButtonContent: {
    paddingVertical: 8,
  },
});
'''
    create_file(SRC_DIR / "screens/booking/BookingScreen.tsx", booking_screen)

def generate_navigation():
    """Generate navigation structure"""
    
    # Root Navigator
    root_navigator = '''/**
 * Root Navigator
 * Main navigation structure for the app
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-bottom-tabs/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'react-native-paper';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { HomeScreen } from '../screens/main/HomeScreen';
import { BookingScreen } from '../screens/booking/BookingScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { useAuth } from '../contexts/AuthContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('home.title'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingScreen}
        options={{
          tabBarLabel: t('booking.title'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="calendar-check" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('profile.myProfile'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="account" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or loading screen
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <Stack.Screen name="Main" component={MainTabs} />
      )}
    </Stack.Navigator>
  );
};
'''
    create_file(SRC_DIR / "navigation/RootNavigator.tsx", root_navigator)

def generate_interceptors():
    """Generate API interceptors"""
    interceptors = '''/**
 * API Interceptors
 * Setup for authentication and error handling
 */

import { Store } from '@reduxjs/toolkit';
import apiClient from './apiClient';

export const setupInterceptors = (store: Store) => {
  // Add any store-based interceptors here
  console.log('API interceptors configured');
};
'''
    create_file(SRC_DIR / "services/api/interceptors.ts", interceptors)

def main():
    """Main execution"""
    print("🚀 Generating mobile app UI components...")
    print("=" * 60)
    
    generate_common_components()
    generate_screens()
    generate_navigation()
    generate_interceptors()
    
    print("=" * 60)
    print("✅ Mobile app UI components generated successfully!")
    print(f"📱 Location: {MOBILE_APP_DIR}")
    print("\n📦 Generated:")
    print("  ✅ Common Components (ErrorBoundary, Loading, TourCard)")
    print("  ✅ Screens (Home, Booking)")
    print("  ✅ Navigation (RootNavigator, Tabs)")
    print("  ✅ API Interceptors")

if __name__ == "__main__":
    main()
