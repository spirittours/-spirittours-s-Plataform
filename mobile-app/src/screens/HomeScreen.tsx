import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Card,
  Title,
  Paragraph,
  Button,
  FAB,
  Searchbar,
  Avatar,
  Chip,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'react-query';

// Components
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

// Services & Stores
import { useAuthStore } from '../stores/authStore';
import { apiService } from '../services/apiService';
import { theme } from '../utils/theme';

const { width } = Dimensions.get('window');

interface Destination {
  id: string;
  name: string;
  country: string;
  image_url: string;
  price_from: number;
  rating: number;
  description: string;
}

interface AIRecommendation {
  id: string;
  type: 'destination' | 'activity' | 'package';
  title: string;
  description: string;
  confidence: number;
  price?: number;
}

export default function HomeScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuthStore();

  // Fetch featured destinations
  const { data: destinations, isLoading: destinationsLoading } = useQuery(
    'featuredDestinations',
    () => apiService.get('/destinations/featured'),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch AI recommendations
  const { data: recommendations, isLoading: recommendationsLoading } = useQuery(
    ['aiRecommendations', user?.id],
    () => apiService.get('/ai/recommendations/personalized'),
    {
      enabled: !!user?.id,
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    // Refetch data
    setTimeout(() => setRefreshing(false), 2000);
  };

  const handleSearch = () => {
    navigation.navigate('Search', { query: searchQuery });
  };

  const handleDestinationPress = (destination: Destination) => {
    navigation.navigate('DestinationDetail', { destination });
  };

  if (destinationsLoading || recommendationsLoading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.greeting}>
              <Avatar.Text
                size={40}
                label={user?.first_name?.[0] || 'U'}
                style={styles.avatar}
              />
              <View style={styles.greetingText}>
                <Text style={styles.welcomeText}>Welcome back,</Text>
                <Text style={styles.userName}>{user?.first_name || 'Traveler'}</Text>
              </View>
            </View>
            <Ionicons
              name="notifications-outline"
              size={24}
              color="white"
              onPress={() => navigation.navigate('Notifications')}
            />
          </View>

          {/* Search Bar */}
          <Searchbar
            placeholder="Where do you want to go?"
            onChangeText={setSearchQuery}
            value={searchQuery}
            onIconPress={handleSearch}
            onSubmitEditing={handleSearch}
            style={styles.searchBar}
            iconColor={theme.colors.primary}
          />
        </LinearGradient>

        {/* AI Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>🤖 AI Recommendations</Title>
              <Chip icon="sparkles" mode="outlined" compact>
                Personalized
              </Chip>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recommendations.map((rec: AIRecommendation) => (
                <Card key={rec.id} style={styles.recommendationCard}>
                  <Card.Content>
                    <View style={styles.recommendationHeader}>
                      <Text style={styles.recommendationType}>
                        {rec.type.toUpperCase()}
                      </Text>
                      <Text style={styles.confidence}>
                        {Math.round(rec.confidence * 100)}% match
                      </Text>
                    </View>
                    <Title style={styles.recommendationTitle}>{rec.title}</Title>
                    <Paragraph numberOfLines={2}>{rec.description}</Paragraph>
                    {rec.price && (
                      <Text style={styles.price}>From ${rec.price}</Text>
                    )}
                  </Card.Content>
                  <Card.Actions>
                    <Button mode="contained" compact>
                      Explore
                    </Button>
                  </Card.Actions>
                </Card>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Quick Actions</Title>
          <View style={styles.quickActions}>
            <Button
              mode="outlined"
              icon="ticket"
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Tickets')}
            >
              My Tickets
            </Button>
            <Button
              mode="outlined"
              icon="map"
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Map')}
            >
              Explore Map
            </Button>
            <Button
              mode="outlined"
              icon="chat"
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Chat')}
            >
              AI Assistant
            </Button>
          </View>
        </View>

        {/* Featured Destinations */}
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>✨ Featured Destinations</Title>
          {destinations?.map((destination: Destination) => (
            <Card
              key={destination.id}
              style={styles.destinationCard}
              onPress={() => handleDestinationPress(destination)}
            >
              <Card.Cover source={{ uri: destination.image_url }} />
              <Card.Content style={styles.destinationContent}>
                <View style={styles.destinationHeader}>
                  <View>
                    <Title style={styles.destinationName}>{destination.name}</Title>
                    <Text style={styles.destinationCountry}>{destination.country}</Text>
                  </View>
                  <View style={styles.destinationMeta}>
                    <Text style={styles.rating}>
                      ⭐ {destination.rating}
                    </Text>
                    <Text style={styles.price}>
                      From ${destination.price_from}
                    </Text>
                  </View>
                </View>
                <Paragraph numberOfLines={2}>{destination.description}</Paragraph>
              </Card.Content>
              <Card.Actions>
                <Button mode="contained">View Details</Button>
                <Button mode="outlined">Add to Wishlist</Button>
              </Card.Actions>
            </Card>
          ))}
        </View>

        {/* Spacer for FAB */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateBooking')}
        label="New Booking"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 12,
  },
  greetingText: {
    flex: 1,
  },
  welcomeText: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
  },
  userName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchBar: {
    marginTop: 10,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  recommendationCard: {
    width: width * 0.8,
    marginRight: 15,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  confidence: {
    fontSize: 12,
    color: theme.colors.success,
  },
  recommendationTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionButton: {
    flex: 1,
    minWidth: 100,
  },
  destinationCard: {
    marginBottom: 15,
  },
  destinationContent: {
    paddingTop: 15,
  },
  destinationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  destinationName: {
    fontSize: 18,
    marginBottom: 4,
  },
  destinationCountry: {
    fontSize: 14,
    color: theme.colors.text,
    opacity: 0.7,
  },
  destinationMeta: {
    alignItems: 'flex-end',
  },
  rating: {
    fontSize: 14,
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});