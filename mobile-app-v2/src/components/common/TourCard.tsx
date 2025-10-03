/**
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
