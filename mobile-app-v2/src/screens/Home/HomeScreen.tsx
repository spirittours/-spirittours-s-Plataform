/**
 * Pantalla Principal de la Aplicación Móvil
 * Dashboard con estadísticas, accesos rápidos y recomendaciones IA
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/api.service';

const { width } = Dimensions.get('window');

interface DashboardStats {
  totalBookings: number;
  activeBookings: number;
  upcomingTrips: number;
  savedFavorites: number;
  rewardPoints: number;
}

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  screen: string;
}

const HomeScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    activeBookings: 0,
    upcomingTrips: 0,
    savedFavorites: 0,
    rewardPoints: 0,
  });

  const quickActions: QuickAction[] = [
    {
      id: '1',
      title: 'Buscar Viajes',
      icon: 'airplane-search',
      color: '#3b82f6',
      screen: 'Search',
    },
    {
      id: '2',
      title: 'Mis Reservas',
      icon: 'calendar-check',
      color: '#10b981',
      screen: 'Bookings',
    },
    {
      id: '3',
      title: 'Asistente IA',
      icon: 'robot',
      color: '#8b5cf6',
      screen: 'AI',
    },
    {
      id: '4',
      title: 'Chat Soporte',
      icon: 'chat',
      color: '#f59e0b',
      screen: 'Chat',
    },
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await apiService.get('/api/dashboard/stats');
      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, []);

  const StatCard = ({ title, value, icon, color }: any) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statIconContainer}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  const QuickActionButton = ({ action }: { action: QuickAction }) => (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={() => navigation.navigate(action.screen as never)}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
        <Icon name={action.icon} size={28} color="#fff" />
      </View>
      <Text style={styles.quickActionText}>{action.title}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>¡Hola!</Text>
          <Text style={styles.userName}>{user?.name || 'Usuario'}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications' as never)}
        >
          <View style={styles.notificationBadge}>
            <Icon name="bell" size={24} color="#1f2937" />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Resumen</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Reservas Totales"
            value={stats.totalBookings}
            icon="calendar-multiple"
            color="#3b82f6"
          />
          <StatCard
            title="Viajes Activos"
            value={stats.activeBookings}
            icon="airplane"
            color="#10b981"
          />
          <StatCard
            title="Próximos Viajes"
            value={stats.upcomingTrips}
            icon="calendar-clock"
            color="#f59e0b"
          />
          <StatCard
            title="Puntos Rewards"
            value={stats.rewardPoints}
            icon="star"
            color="#8b5cf6"
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Acceso Rápido</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <QuickActionButton key={action.id} action={action} />
          ))}
        </View>
      </View>

      {/* AI Recommendations */}
      <View style={styles.recommendationsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recomendaciones IA</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Recommendations' as never)}
          >
            <Text style={styles.seeAll}>Ver todas</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[1, 2, 3].map((item) => (
            <View key={item} style={styles.recommendationCard}>
              <View style={styles.recommendationImage}>
                <Icon name="image" size={40} color="#9ca3af" />
              </View>
              <Text style={styles.recommendationTitle}>
                Destino Recomendado {item}
              </Text>
              <Text style={styles.recommendationSubtitle}>
                Basado en tus preferencias
              </Text>
              <View style={styles.recommendationPrice}>
                <Text style={styles.priceText}>Desde $599</Text>
                <Icon name="arrow-right" size={20} color="#3b82f6" />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Recent Activity */}
      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Actividad Reciente</Text>
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Icon name="check-circle" size={20} color="#10b981" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Reserva confirmada</Text>
              <Text style={styles.activitySubtitle}>
                Hotel Paradise - Cancún
              </Text>
              <Text style={styles.activityTime}>Hace 2 horas</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 16,
    color: '#6b7280',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 4,
  },
  notificationBadge: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
  },
  statsGrid: {
    gap: 10,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 10,
  },
  statIconContainer: {
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  quickActionsSection: {
    padding: 20,
    paddingTop: 0,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  recommendationsSection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  seeAll: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  recommendationCard: {
    width: 200,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendationImage: {
    height: 120,
    backgroundColor: '#f3f4f6',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    padding: 12,
    paddingBottom: 4,
  },
  recommendationSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    paddingHorizontal: 12,
  },
  recommendationPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingTop: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  activitySection: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  activityItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityIcon: {
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  activitySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
});

export default HomeScreen;
