/**
 * Home Screen - Main landing screen with featured destinations
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { API } from '../services/ApiService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

const { width } = Dimensions.get('window');

interface Destination {
  id: string;
  name: string;
  country: string;
  description: string;
  image_url: string;
  price_from: number;
  rating: number;
  featured: boolean;
}

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  action_url: string;
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load featured destinations
      const destResponse = await API.get('/destinations/featured');
      setDestinations(destResponse.data.destinations || []);

      // Load promotional banners
      const bannersResponse = await API.get('/marketing/banners/active');
      setBanners(bannersResponse.data.banners || []);

    } catch (err) {
      console.error('Error loading home data:', err);
      setError('Error al cargar los datos. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  const handleDestinationPress = (destination: Destination) => {
    navigation.navigate('DestinationDetail', { destinationId: destination.id });
  };

  const handleBannerPress = (banner: Banner) => {
    // Navigate to specific screen based on action URL
    console.log('Banner pressed:', banner.action_url);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'flights':
        navigation.navigate('Search', { type: 'flights' });
        break;
      case 'hotels':
        navigation.navigate('Search', { type: 'hotels' });
        break;
      case 'packages':
        navigation.navigate('Search', { type: 'packages' });
        break;
      case 'activities':
        navigation.navigate('Search', { type: 'activities' });
        break;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadHomeData} />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Spirit Tours</Text>
        <Text style={styles.headerSubtitle}>
          Tu próxima aventura comienza aquí
        </Text>
      </View>

      {/* Promotional Banners */}
      {banners.length > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.bannersContainer}
        >
          {banners.map(banner => (
            <TouchableOpacity
              key={banner.id}
              onPress={() => handleBannerPress(banner)}
              style={styles.banner}
            >
              <Image
                source={{ uri: banner.image_url }}
                style={styles.bannerImage}
              />
              <View style={styles.bannerOverlay}>
                <Text style={styles.bannerTitle}>{banner.title}</Text>
                <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Buscar por categoría</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => handleQuickAction('flights')}
          >
            <Icon name="flight" size={32} color="#2E7D32" />
            <Text style={styles.quickActionText}>Vuelos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => handleQuickAction('hotels')}
          >
            <Icon name="hotel" size={32} color="#2E7D32" />
            <Text style={styles.quickActionText}>Hoteles</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => handleQuickAction('packages')}
          >
            <Icon name="card-travel" size={32} color="#2E7D32" />
            <Text style={styles.quickActionText}>Paquetes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => handleQuickAction('activities')}
          >
            <Icon name="explore" size={32} color="#2E7D32" />
            <Text style={styles.quickActionText}>Actividades</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Featured Destinations */}
      <View style={styles.destinationsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Destinos destacados</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Search')}>
            <Text style={styles.seeAllText}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        {destinations.map(destination => (
          <TouchableOpacity
            key={destination.id}
            style={styles.destinationCard}
            onPress={() => handleDestinationPress(destination)}
          >
            <Image
              source={{ uri: destination.image_url }}
              style={styles.destinationImage}
            />
            <View style={styles.destinationInfo}>
              <Text style={styles.destinationName}>{destination.name}</Text>
              <Text style={styles.destinationCountry}>
                {destination.country}
              </Text>
              <Text style={styles.destinationDescription} numberOfLines={2}>
                {destination.description}
              </Text>
              <View style={styles.destinationFooter}>
                <View style={styles.rating}>
                  <Icon name="star" size={16} color="#FFD700" />
                  <Text style={styles.ratingText}>{destination.rating}</Text>
                </View>
                <Text style={styles.price}>
                  Desde €{destination.price_from}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Special Offers */}
      <View style={styles.offersSection}>
        <Text style={styles.sectionTitle}>Ofertas especiales</Text>
        <TouchableOpacity style={styles.offerCard}>
          <Icon name="local-offer" size={48} color="#2E7D32" />
          <Text style={styles.offerTitle}>
            ¡Hasta 30% de descuento en paquetes!
          </Text>
          <Text style={styles.offerSubtitle}>
            Reserva ahora y ahorra en tu próximo viaje
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#2E7D32',
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E0E0E0',
    marginTop: 5,
  },
  bannersContainer: {
    height: 200,
    marginVertical: 10,
  },
  banner: {
    width: width - 40,
    marginHorizontal: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: 200,
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 15,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#E0E0E0',
    marginTop: 5,
  },
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  destinationsSection: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  seeAllText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
  destinationCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  destinationImage: {
    width: '100%',
    height: 200,
  },
  destinationInfo: {
    padding: 15,
  },
  destinationName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  destinationCountry: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
  },
  destinationDescription: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    lineHeight: 20,
  },
  destinationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  offersSection: {
    padding: 20,
  },
  offerCard: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 10,
    textAlign: 'center',
  },
  offerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
});

export default HomeScreen;
