import React, { useState, useEffect } from 'react';
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
  Switch,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import { authStore } from '../stores/authStore';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  bio: string;
  location: string;
  date_joined: string;
  preferences: {
    currency: string;
    language: string;
    notifications: {
      booking_updates: boolean;
      promotions: boolean;
      recommendations: boolean;
      reminders: boolean;
    };
    accessibility: {
      screen_reader: boolean;
      high_contrast: boolean;
      large_text: boolean;
    };
    privacy: {
      profile_visibility: 'public' | 'friends' | 'private';
      location_sharing: boolean;
      activity_visibility: boolean;
    };
  };
  stats: {
    bookings_count: number;
    reviews_count: number;
    favorite_destinations: string[];
    total_spent: number;
    loyalty_points: number;
  };
}

interface BookingHistory {
  id: string;
  tour_title: string;
  destination: string;
  date: string;
  status: 'confirmed' | 'completed' | 'cancelled' | 'pending';
  amount: number;
  currency: string;
  image: string;
}

interface ReviewData {
  id: string;
  tour_title: string;
  rating: number;
  comment: string;
  date: string;
  images: string[];
}

const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookingHistory, setBookingHistory] = useState<BookingHistory[]>([]);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [activeTab, setActiveTab] = useState<'bookings' | 'reviews' | 'favorites'>('bookings');

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [profileRes, bookingsRes, reviewsRes] = await Promise.all([
        apiService.get('/user/profile'),
        apiService.get('/user/bookings'),
        apiService.get('/user/reviews')
      ]);

      setProfile(profileRes.data);
      setBookingHistory(bookingsRes.data);
      setReviews(reviewsRes.data);
      setEditedProfile(profileRes.data);
    } catch (error) {
      console.error('Error loading profile data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  };

  const updateProfile = async () => {
    try {
      const response = await apiService.put('/user/profile', editedProfile);
      setProfile(response.data);
      setShowEditModal(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const updateNotificationSettings = async (key: string, value: boolean) => {
    if (!profile) return;

    try {
      const updatedPreferences = {
        ...profile.preferences,
        notifications: {
          ...profile.preferences.notifications,
          [key]: value
        }
      };

      await apiService.put('/user/preferences', { preferences: updatedPreferences });
      setProfile(prev => prev ? { ...prev, preferences: updatedPreferences } : prev);
    } catch (error) {
      console.error('Error updating notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const updatePrivacySettings = async (key: string, value: any) => {
    if (!profile) return;

    try {
      const updatedPreferences = {
        ...profile.preferences,
        privacy: {
          ...profile.preferences.privacy,
          [key]: value
        }
      };

      await apiService.put('/user/preferences', { preferences: updatedPreferences });
      setProfile(prev => prev ? { ...prev, preferences: updatedPreferences } : prev);
    } catch (error) {
      console.error('Error updating privacy:', error);
      Alert.alert('Error', 'Failed to update privacy settings');
    }
  };

  const logout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await authStore.logout();
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  const renderBookingItem = ({ item }: { item: BookingHistory }) => (
    <TouchableOpacity 
      style={styles.historyItem}
      onPress={() => navigation.navigate('BookingDetails', { bookingId: item.id })}
    >
      <Image source={{ uri: item.image }} style={styles.historyImage} />
      <View style={styles.historyContent}>
        <Text style={styles.historyTitle}>{item.tour_title}</Text>
        <Text style={styles.historyLocation}>📍 {item.destination}</Text>
        <Text style={styles.historyDate}>📅 {new Date(item.date).toLocaleDateString()}</Text>
        <View style={styles.historyFooter}>
          <Text style={styles.historyAmount}>
            {item.currency} {item.amount}
          </Text>
          <View style={[
            styles.statusBadge,
            styles[`status${item.status.charAt(0).toUpperCase() + item.status.slice(1)}` as keyof typeof styles]
          ]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderReviewItem = ({ item }: { item: ReviewData }) => (
    <View style={styles.reviewItem}>
      <Text style={styles.reviewTour}>{item.tour_title}</Text>
      <View style={styles.reviewHeader}>
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map(star => (
            <Ionicons
              key={star}
              name={star <= item.rating ? 'star' : 'star-outline'}
              size={16}
              color="#FFD700"
            />
          ))}
        </View>
        <Text style={styles.reviewDate}>
          {new Date(item.date).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.reviewComment}>{item.comment}</Text>
      {item.images.length > 0 && (
        <ScrollView horizontal style={styles.reviewImages}>
          {item.images.map((image, index) => (
            <Image key={index} source={{ uri: image }} style={styles.reviewImage} />
          ))}
        </ScrollView>
      )}
    </View>
  );

  const EditProfileModal = () => (
    <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowEditModal(false)}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={updateProfile}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.avatarSection}>
            <Image 
              source={{ uri: editedProfile.avatar || 'https://via.placeholder.com/100' }} 
              style={styles.editAvatar} 
            />
            <TouchableOpacity style={styles.changeAvatarButton}>
              <Text style={styles.changeAvatarText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editedProfile.name}
              onChangeText={(text) => setEditedProfile(prev => ({ ...prev, name: text }))}
              placeholder="Enter your full name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.modalInput}
              value={editedProfile.email}
              onChangeText={(text) => setEditedProfile(prev => ({ ...prev, email: text }))}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              style={styles.modalInput}
              value={editedProfile.phone}
              onChangeText={(text) => setEditedProfile(prev => ({ ...prev, phone: text }))}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              style={styles.modalInput}
              value={editedProfile.location}
              onChangeText={(text) => setEditedProfile(prev => ({ ...prev, location: text }))}
              placeholder="Enter your location"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bio</Text>
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              value={editedProfile.bio}
              onChangeText={(text) => setEditedProfile(prev => ({ ...prev, bio: text }))}
              placeholder="Tell us about yourself..."
              multiline
              numberOfLines={4}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  const SettingsModal = () => (
    <Modal visible={showSettingsModal} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Notification Settings */}
          <View style={styles.settingsSection}>
            <Text style={styles.settingsTitle}>Notifications</Text>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Booking Updates</Text>
              <Switch
                value={profile?.preferences.notifications.booking_updates}
                onValueChange={(value) => updateNotificationSettings('booking_updates', value)}
                trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
                thumbColor="white"
              />
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Promotions & Offers</Text>
              <Switch
                value={profile?.preferences.notifications.promotions}
                onValueChange={(value) => updateNotificationSettings('promotions', value)}
                trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
                thumbColor="white"
              />
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Recommendations</Text>
              <Switch
                value={profile?.preferences.notifications.recommendations}
                onValueChange={(value) => updateNotificationSettings('recommendations', value)}
                trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
                thumbColor="white"
              />
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Trip Reminders</Text>
              <Switch
                value={profile?.preferences.notifications.reminders}
                onValueChange={(value) => updateNotificationSettings('reminders', value)}
                trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
                thumbColor="white"
              />
            </View>
          </View>

          {/* Privacy Settings */}
          <View style={styles.settingsSection}>
            <Text style={styles.settingsTitle}>Privacy</Text>
            
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingLabel}>Profile Visibility</Text>
              <View style={styles.settingValue}>
                <Text style={styles.settingValueText}>
                  {profile?.preferences.privacy.profile_visibility}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#666" />
              </View>
            </TouchableOpacity>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Share Location</Text>
              <Switch
                value={profile?.preferences.privacy.location_sharing}
                onValueChange={(value) => updatePrivacySettings('location_sharing', value)}
                trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
                thumbColor="white"
              />
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Activity Visibility</Text>
              <Switch
                value={profile?.preferences.privacy.activity_visibility}
                onValueChange={(value) => updatePrivacySettings('activity_visibility', value)}
                trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
                thumbColor="white"
              />
            </View>
          </View>

          {/* Account Actions */}
          <View style={styles.settingsSection}>
            <Text style={styles.settingsTitle}>Account</Text>
            
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingLabel}>Change Password</Text>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingLabel}>Payment Methods</Text>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingLabel}>Download Data</Text>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.settingItem, styles.dangerItem]} onPress={logout}>
              <Text style={[styles.settingLabel, styles.dangerText]}>Logout</Text>
              <Ionicons name="log-out-outline" size={16} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="person-circle-outline" size={64} color="#CCC" />
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProfileData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: profile.avatar || 'https://via.placeholder.com/100' }} 
              style={styles.avatar} 
            />
            <View style={styles.loyaltyBadge}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.loyaltyPoints}>{profile.stats.loyalty_points}</Text>
            </View>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileEmail}>{profile.email}</Text>
            {profile.location && (
              <Text style={styles.profileLocation}>📍 {profile.location}</Text>
            )}
            <Text style={styles.memberSince}>
              Member since {new Date(profile.date_joined).getFullYear()}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => setShowSettingsModal(true)}
          >
            <Ionicons name="settings-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Bio */}
        {profile.bio && (
          <View style={styles.bioSection}>
            <Text style={styles.bio}>{profile.bio}</Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile.stats.bookings_count}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile.stats.reviews_count}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile.stats.favorite_destinations.length}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>${profile.stats.total_spent}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => setShowEditModal(true)}
          >
            <Ionicons name="create-outline" size={20} color="#007AFF" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={() => {/* Implement share functionality */}}
          >
            <Ionicons name="share-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'bookings' && styles.activeTab]}
            onPress={() => setActiveTab('bookings')}
          >
            <Text style={[styles.tabText, activeTab === 'bookings' && styles.activeTabText]}>
              Bookings ({bookingHistory.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
            onPress={() => setActiveTab('reviews')}
          >
            <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>
              Reviews ({reviews.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'favorites' && styles.activeTab]}
            onPress={() => setActiveTab('favorites')}
          >
            <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>
              Favorites ({profile.stats.favorite_destinations.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'bookings' && (
            <View>
              {bookingHistory.length > 0 ? (
                bookingHistory.map(item => (
                  <View key={item.id}>
                    {renderBookingItem({ item })}
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={48} color="#CCC" />
                  <Text style={styles.emptyStateTitle}>No bookings yet</Text>
                  <Text style={styles.emptyStateText}>
                    Start exploring amazing destinations
                  </Text>
                  <TouchableOpacity 
                    style={styles.exploreButton}
                    onPress={() => navigation.navigate('Search')}
                  >
                    <Text style={styles.exploreButtonText}>Explore Tours</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {activeTab === 'reviews' && (
            <View>
              {reviews.length > 0 ? (
                reviews.map(item => (
                  <View key={item.id}>
                    {renderReviewItem({ item })}
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="star-outline" size={48} color="#CCC" />
                  <Text style={styles.emptyStateTitle}>No reviews yet</Text>
                  <Text style={styles.emptyStateText}>
                    Complete a tour to leave your first review
                  </Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'favorites' && (
            <View>
              {profile.stats.favorite_destinations.length > 0 ? (
                profile.stats.favorite_destinations.map((destination, index) => (
                  <TouchableOpacity key={index} style={styles.favoriteItem}>
                    <Text style={styles.favoriteDestination}>📍 {destination}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#666" />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="heart-outline" size={48} color="#CCC" />
                  <Text style={styles.emptyStateTitle}>No favorites yet</Text>
                  <Text style={styles.emptyStateText}>
                    Save destinations you love for easy access
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <EditProfileModal />
      <SettingsModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  content: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'white',
    padding: 20,
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E5E5'
  },
  loyaltyBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2
  },
  loyaltyPoints: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
    marginLeft: 2
  },
  profileInfo: {
    flex: 1
  },
  profileName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  profileLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  memberSince: {
    fontSize: 12,
    color: '#999'
  },
  settingsButton: {
    padding: 8
  },
  bioSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  bio: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 12
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderColor: '#007AFF',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8
  },
  shareButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center'
  },
  activeTab: {
    backgroundColor: '#007AFF'
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  activeTabText: {
    color: 'white',
    fontWeight: '500'
  },
  tabContent: {
    marginTop: 16,
    paddingBottom: 40
  },
  historyItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  historyImage: {
    width: 80,
    height: 80,
    resizeMode: 'cover'
  },
  historyContent: {
    flex: 1,
    padding: 12
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  historyLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden'
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white'
  },
  statusConfirmed: {
    backgroundColor: '#4CAF50'
  },
  statusCompleted: {
    backgroundColor: '#2196F3'
  },
  statusCancelled: {
    backgroundColor: '#FF6B6B'
  },
  statusPending: {
    backgroundColor: '#FF9800'
  },
  reviewItem: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  reviewTour: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  ratingContainer: {
    flexDirection: 'row'
  },
  reviewDate: {
    fontSize: 12,
    color: '#666'
  },
  reviewComment: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12
  },
  reviewImages: {
    flexDirection: 'row'
  },
  reviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    resizeMode: 'cover'
  },
  favoriteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  favoriteDestination: {
    fontSize: 16,
    color: '#333'
  },
  emptyState: {
    alignItems: 'center',
    padding: 40
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  exploreButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8
  },
  exploreButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
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
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600'
  },
  modalContent: {
    flex: 1,
    padding: 16
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32
  },
  editAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E5E5E5',
    marginBottom: 16
  },
  changeAvatarButton: {
    backgroundColor: '#F1F3F4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16
  },
  changeAvatarText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500'
  },
  inputGroup: {
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F8F9FA'
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  settingsSection: {
    marginBottom: 32
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4'
  },
  settingLabel: {
    fontSize: 16,
    color: '#333'
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  settingValueText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
    textTransform: 'capitalize'
  },
  dangerItem: {
    borderBottomWidth: 0,
    marginTop: 16
  },
  dangerText: {
    color: '#FF6B6B'
  }
});

export default ProfileScreen;