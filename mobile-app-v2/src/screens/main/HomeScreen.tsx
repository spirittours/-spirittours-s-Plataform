import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import {
  Text,
  Card,
  Searchbar,
  Chip,
  Avatar,
  Surface,
  IconButton,
  Badge,
  Button,
} from 'react-native-paper';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';

import {useAuth} from '../../contexts/AuthContext';
import {TourService} from '../../services/TourService';
import {CategoryService} from '../../services/CategoryService';
import {PromotionBanner} from '../../components/common/PromotionBanner';
import {TourCard} from '../../components/tours/TourCard';
import {CategoryCard} from '../../components/common/CategoryCard';
import {WeatherWidget} from '../../components/common/WeatherWidget';
import {QuickActions} from '../../components/common/QuickActions';
import {theme} from '../../theme';

const {width: screenWidth} = Dimensions.get('window');

const HomeScreen: React.FC = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const {user} = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [featuredTours, setFeaturedTours] = useState([]);
  const [popularTours, setPopularTours] = useState([]);
  const [categories, setCategories] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  
  useEffect(() => {
    loadHomeData();
  }, []);
  
  const loadHomeData = async () => {
    try {
      const [featured, popular, cats, promos, recs] = await Promise.all([
        TourService.getFeaturedTours(),
        TourService.getPopularTours(),
        CategoryService.getCategories(),
        TourService.getPromotions(),
        TourService.getPersonalizedRecommendations(user?.id),
      ]);
      
      setFeaturedTours(featured);
      setPopularTours(popular);
      setCategories(cats);
      setPromotions(promos);
      setRecommendations(recs);
    } catch (error) {
      console.error('Error loading home data:', error);
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };
  
  const handleSearch = () => {
    navigation.navigate('Search', {query: searchQuery});
  };
  
  const handleCategoryPress = (categoryId: string) => {
    navigation.navigate('Tours', {categoryId});
  };
  
  const handleTourPress = (tourId: string) => {
    navigation.navigate('TourDetail', {tourId});
  };
  
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.userInfo}>
          <Avatar.Text 
            size={40} 
            label={user?.name?.substring(0, 2) || 'U'} 
            style={styles.avatar}
          />
          <View style={styles.greeting}>
            <Text style={styles.greetingText}>
              {t('home.greeting')}, {user?.name?.split(' ')[0]}! 👋
            </Text>
            <Text style={styles.locationText}>
              📍 {user?.location || 'Barcelona, España'}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <IconButton
            icon="bell"
            size={24}
            onPress={() => navigation.navigate('Notifications')}
            style={styles.iconButton}
          />
          <Badge style={styles.notificationBadge}>3</Badge>
        </View>
      </View>
      
      <Searchbar
        placeholder={t('home.searchPlaceholder')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        onSubmitEditing={handleSearch}
        style={styles.searchBar}
        icon="magnify"
        right={() => (
          <IconButton
            icon="tune"
            onPress={() => navigation.navigate('Filters')}
          />
        )}
      />
    </View>
  );
  
  const renderPromotions = () => (
    promotions.length > 0 && (
      <View style={styles.section}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={promotions}
          keyExtractor={(item) => item.id}
          renderItem={({item}) => (
            <PromotionBanner
              promotion={item}
              onPress={() => handleTourPress(item.tourId)}
            />
          )}
        />
      </View>
    )
  );
  
  const renderQuickActions = () => (
    <Surface style={styles.quickActionsContainer}>
      <QuickActions
        actions={[
          {
            icon: 'map-marker',
            label: t('home.nearMe'),
            onPress: () => navigation.navigate('NearbyTours'),
          },
          {
            icon: 'star',
            label: t('home.topRated'),
            onPress: () => navigation.navigate('Tours', {filter: 'top-rated'}),
          },
          {
            icon: 'percent',
            label: t('home.deals'),
            onPress: () => navigation.navigate('Deals'),
          },
          {
            icon: 'calendar-today',
            label: t('home.lastMinute'),
            onPress: () => navigation.navigate('LastMinute'),
          },
        ]}
      />
    </Surface>
  );
  
  const renderCategories = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('home.categories')}</Text>
        <Button 
          mode="text" 
          onPress={() => navigation.navigate('Categories')}
          compact
        >
          {t('common.viewAll')}
        </Button>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={({item}) => (
          <CategoryCard
            category={item}
            onPress={() => handleCategoryPress(item.id)}
          />
        )}
      />
    </View>
  );
  
  const renderFeaturedTours = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('home.featured')}</Text>
        <Button 
          mode="text" 
          onPress={() => navigation.navigate('Tours', {filter: 'featured'})}
          compact
        >
          {t('common.viewAll')}
        </Button>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={featuredTours}
        keyExtractor={(item) => item.id}
        renderItem={({item}) => (
          <TourCard
            tour={item}
            onPress={() => handleTourPress(item.id)}
            variant="large"
          />
        )}
      />
    </View>
  );
  
  const renderRecommendations = () => (
    recommendations.length > 0 && (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.forYou')} 💫</Text>
          <Chip icon="auto-fix" style={styles.aiChip}>AI</Chip>
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={recommendations}
          keyExtractor={(item) => item.id}
          renderItem={({item}) => (
            <TourCard
              tour={item}
              onPress={() => handleTourPress(item.id)}
              variant="medium"
              showReason={item.reason}
            />
          )}
        />
      </View>
    )
  );
  
  const renderPopularTours = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('home.popular')} 🔥</Text>
        <Button 
          mode="text" 
          onPress={() => navigation.navigate('Tours', {filter: 'popular'})}
          compact
        >
          {t('common.viewAll')}
        </Button>
      </View>
      {popularTours.map((tour) => (
        <TourCard
          key={tour.id}
          tour={tour}
          onPress={() => handleTourPress(tour.id)}
          variant="horizontal"
        />
      ))}
    </View>
  );
  
  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        <WeatherWidget location={user?.location} />
        {renderPromotions()}
        {renderQuickActions()}
        {renderCategories()}
        {renderFeaturedTours()}
        {renderRecommendations()}
        {renderPopularTours()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 20,
    paddingBottom: 15,
    paddingHorizontal: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: theme.colors.accent,
  },
  greeting: {
    marginLeft: 12,
  },
  greetingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  locationText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    margin: 0,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: theme.colors.error,
  },
  searchBar: {
    backgroundColor: '#fff',
    borderRadius: 25,
    elevation: 0,
  },
  quickActionsContainer: {
    margin: 15,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#fff',
  },
  section: {
    marginVertical: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  aiChip: {
    backgroundColor: theme.colors.primary,
  },
});

export default HomeScreen;