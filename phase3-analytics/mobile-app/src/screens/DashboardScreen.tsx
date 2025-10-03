/**
 * PHASE 3: Mobile Analytics App - Dashboard Screen
 * Executive Dashboard Screen with comprehensive analytics visualization
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { 
  Card, 
  Title, 
  Paragraph, 
  Chip, 
  FAB,
  Portal,
  Modal,
  Button,
  Menu,
  Divider,
  ActivityIndicator
} from 'react-native-paper';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

import { 
  BusinessMetrics, 
  SystemMetrics, 
  DashboardConfig, 
  MetricData, 
  TimeRange,
  ChartData,
  User
} from '../types';
import { api } from '../services/api';
import { useStore } from '../utils/store';
import { formatCurrency, formatNumber, formatPercentage } from '../utils/formatters';
import MetricCard from '../components/MetricCard';
import ChartWidget from '../components/ChartWidget';
import AlertsPanel from '../components/AlertsPanel';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface DashboardScreenProps {
  navigation: any;
  route: any;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation, route }) => {
  // State management
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>({ 
    preset: 'last7days',
    start: startOfDay(subDays(new Date(), 7)),
    end: endOfDay(new Date())
  });
  
  // Data state
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [chartData, setChartData] = useState<{ [key: string]: ChartData }>({});
  
  // UI state
  const [menuVisible, setMenuVisible] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [alertsVisible, setAlertsVisible] = useState(false);
  const [selectedMetricType, setSelectedMetricType] = useState<'business' | 'system'>('business');

  // Store
  const { 
    user, 
    currentDashboard, 
    alerts,
    theme,
    isOnline,
    updateMetrics,
    updateAlerts,
    setError
  } = useStore();

  // Load dashboard data
  const loadDashboardData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      // Load metrics based on selected type
      const promises = [];
      
      if (selectedMetricType === 'business') {
        promises.push(api.getBusinessMetrics(selectedTimeRange));
      } else {
        promises.push(api.getSystemMetrics(selectedTimeRange));
      }

      // Load alerts
      promises.push(api.getAlerts(10));

      const results = await Promise.all(promises);
      
      if (selectedMetricType === 'business') {
        setBusinessMetrics(results[0].data);
      } else {
        setSystemMetrics(results[0].data);
      }

      updateAlerts(results[1].data);
      
      // Load chart data
      await loadChartData();

    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      setError(error.message);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      if (refreshing) setRefreshing(false);
    }
  }, [selectedTimeRange, selectedMetricType, refreshing, updateAlerts, setError]);

  const loadChartData = useCallback(async () => {
    try {
      // Load revenue trend data
      const revenueData = await api.getWidgetData('revenue-chart', {
        type: 'line',
        groupBy: 'day'
      }, selectedTimeRange);

      // Load user analytics
      const userAnalytics = await api.getUserAnalytics(selectedTimeRange);

      // Format chart data
      const newChartData: { [key: string]: ChartData } = {};

      // Revenue chart
      if (revenueData.success && revenueData.data.length > 0) {
        newChartData.revenue = {
          labels: revenueData.data.map((item: any) => format(new Date(item.date), 'MMM dd')),
          datasets: [{
            label: 'Revenue',
            data: revenueData.data.map((item: any) => item.value),
            borderColor: theme.colors.primary,
            backgroundColor: theme.colors.primary + '20',
          }]
        };
      }

      // User analytics chart
      if (userAnalytics.success && userAnalytics.data.activeUsers.length > 0) {
        newChartData.users = {
          labels: userAnalytics.data.activeUsers.map(item => 
            format(new Date(item.timestamp), 'MMM dd')
          ),
          datasets: [
            {
              label: 'Active Users',
              data: userAnalytics.data.activeUsers.map(item => 
                item.metrics.activeUsers || 0
              ),
              borderColor: theme.colors.secondary,
              backgroundColor: theme.colors.secondary + '20',
            },
            {
              label: 'New Users',
              data: userAnalytics.data.newUsers.map(item => 
                item.metrics.newUsers || 0
              ),
              borderColor: theme.colors.accent,
              backgroundColor: theme.colors.accent + '20',
            }
          ]
        };
      }

      setChartData(newChartData);

    } catch (error) {
      console.error('Failed to load chart data:', error);
    }
  }, [selectedTimeRange, theme]);

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData(false);
  }, [loadDashboardData]);

  // Time range selection
  const handleTimeRangeChange = useCallback((preset: string) => {
    let start: Date, end: Date;
    const now = new Date();

    switch (preset) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'yesterday':
        start = startOfDay(subDays(now, 1));
        end = endOfDay(subDays(now, 1));
        break;
      case 'last7days':
        start = startOfDay(subDays(now, 7));
        end = endOfDay(now);
        break;
      case 'last30days':
        start = startOfDay(subDays(now, 30));
        end = endOfDay(now);
        break;
      default:
        start = startOfDay(subDays(now, 7));
        end = endOfDay(now);
    }

    setSelectedTimeRange({ preset, start, end });
    setMenuVisible(false);
  }, []);

  // Metric type toggle
  const toggleMetricType = useCallback(() => {
    setSelectedMetricType(prev => prev === 'business' ? 'system' : 'business');
  }, []);

  // Render metric cards
  const renderMetricCards = useMemo(() => {
    const metrics = selectedMetricType === 'business' ? businessMetrics : systemMetrics;
    if (!metrics) return null;

    return Object.values(metrics).map((metric: MetricData, index: number) => (
      <MetricCard
        key={metric.id}
        metric={metric}
        style={[
          styles.metricCard,
          index % 2 === 0 ? styles.metricCardLeft : styles.metricCardRight
        ]}
        onPress={() => navigation.navigate('MetricDetail', { metric })}
      />
    ));
  }, [businessMetrics, systemMetrics, selectedMetricType, navigation, theme]);

  // Render charts
  const renderCharts = useMemo(() => {
    if (Object.keys(chartData).length === 0) {
      return (
        <Card style={styles.chartCard}>
          <Card.Content style={styles.chartPlaceholder}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.placeholderText, { color: theme.colors.text }]}>
              Loading chart data...
            </Text>
          </Card.Content>
        </Card>
      );
    }

    return (
      <View>
        {/* Revenue Chart */}
        {chartData.revenue && (
          <ChartWidget
            title="Revenue Trend"
            subtitle={`${selectedTimeRange.preset?.replace(/([A-Z])/g, ' $1').toLowerCase()}`}
            data={chartData.revenue}
            type="line"
            config={{
              backgroundColor: theme.colors.surface,
              backgroundGradientFrom: theme.colors.surface,
              backgroundGradientTo: theme.colors.surface,
              color: (opacity = 1) => theme.colors.primary + Math.round(opacity * 255).toString(16),
              strokeWidth: 2,
              barPercentage: 0.5,
              useShadowColorFromDataset: false,
              decimalPlaces: 0,
            }}
            style={styles.chartCard}
          />
        )}

        {/* Users Chart */}
        {chartData.users && (
          <ChartWidget
            title="User Analytics"
            subtitle="Active vs New Users"
            data={chartData.users}
            type="line"
            config={{
              backgroundColor: theme.colors.surface,
              backgroundGradientFrom: theme.colors.surface,
              backgroundGradientTo: theme.colors.surface,
              color: (opacity = 1) => theme.colors.secondary + Math.round(opacity * 255).toString(16),
              strokeWidth: 2,
              barPercentage: 0.5,
              useShadowColorFromDataset: false,
              decimalPlaces: 0,
            }}
            style={styles.chartCard}
          />
        )}
      </View>
    );
  }, [chartData, selectedTimeRange, theme]);

  // Header component
  const DashboardHeader = useMemo(() => (
    <LinearGradient
      colors={[theme.colors.primary, theme.colors.secondary]}
      style={styles.header}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerGreeting}>
              Good {getTimeOfDayGreeting()}, {user?.name?.split(' ')[0] || 'Executive'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {format(new Date(), 'EEEE, MMMM do')}
            </Text>
          </View>
          
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setAlertsVisible(true)}
            >
              <Ionicons name="notifications" size={24} color="#fff" />
              {alerts.filter(alert => !alert.resolved).length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {alerts.filter(alert => !alert.resolved).length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => setMenuVisible(true)}
                >
                  <Ionicons name="options" size={24} color="#fff" />
                </TouchableOpacity>
              }
            >
              <Menu.Item onPress={() => handleTimeRangeChange('today')} title="Today" />
              <Menu.Item onPress={() => handleTimeRangeChange('yesterday')} title="Yesterday" />
              <Menu.Item onPress={() => handleTimeRangeChange('last7days')} title="Last 7 Days" />
              <Menu.Item onPress={() => handleTimeRangeChange('last30days')} title="Last 30 Days" />
              <Divider />
              <Menu.Item onPress={toggleMetricType} title={
                `Switch to ${selectedMetricType === 'business' ? 'System' : 'Business'} Metrics`
              } />
            </Menu>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  ), [theme, user, alerts, menuVisible, selectedMetricType, handleTimeRangeChange, toggleMetricType]);

  // Loading screen
  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading dashboard...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      
      {DashboardHeader}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Status indicators */}
        <View style={styles.statusContainer}>
          <Chip
            icon={isOnline ? "wifi" : "wifi-off"}
            style={[
              styles.statusChip,
              { backgroundColor: isOnline ? theme.colors.success + '20' : theme.colors.error + '20' }
            ]}
            textStyle={{ 
              color: isOnline ? theme.colors.success : theme.colors.error,
              fontSize: 12
            }}
          >
            {isOnline ? 'Online' : 'Offline'}
          </Chip>
          
          <Chip
            icon="chart-line"
            style={[styles.statusChip, { backgroundColor: theme.colors.primary + '20' }]}
            textStyle={{ color: theme.colors.primary, fontSize: 12 }}
          >
            {selectedMetricType === 'business' ? 'Business' : 'System'} Metrics
          </Chip>
        </View>

        {/* Metrics cards */}
        <View style={styles.metricsContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Key Metrics
          </Text>
          <View style={styles.metricsGrid}>
            {renderMetricCards}
          </View>
        </View>

        {/* Charts section */}
        <View style={styles.chartsContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Trends & Analytics
          </Text>
          {renderCharts}
        </View>

        {/* Quick actions */}
        <View style={styles.actionsContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Quick Actions
          </Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => navigation.navigate('Reports')}
            >
              <Ionicons name="document-text" size={24} color={theme.colors.primary} />
              <Text style={[styles.actionText, { color: theme.colors.text }]}>
                Generate Report
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => navigation.navigate('Analytics')}
            >
              <Ionicons name="analytics" size={24} color={theme.colors.secondary} />
              <Text style={[styles.actionText, { color: theme.colors.text }]}>
                Deep Analytics
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="settings" size={24} color={theme.colors.accent} />
              <Text style={[styles.actionText, { color: theme.colors.text }]}>
                Settings
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => {/* Export functionality */}}
            >
              <Ionicons name="share" size={24} color={theme.colors.info} />
              <Text style={[styles.actionText, { color: theme.colors.text }]}>
                Export Data
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="refresh"
        onPress={() => onRefresh()}
        color="#fff"
      />

      {/* Alerts Modal */}
      <Portal>
        <Modal
          visible={alertsVisible}
          onDismiss={() => setAlertsVisible(false)}
          contentContainerStyle={[
            styles.modalContent,
            { backgroundColor: theme.colors.surface }
          ]}
        >
          <AlertsPanel
            alerts={alerts}
            onClose={() => setAlertsVisible(false)}
            onAlertAction={(action, alert) => {
              // Handle alert actions
              console.log(`Alert action: ${action}`, alert);
            }}
          />
        </Modal>
      </Portal>
    </View>
  );
};

// Helper function
const getTimeOfDayGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerLeft: {
    flex: 1,
  },
  headerGreeting: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.9,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 12,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statusChip: {
    height: 32,
  },
  metricsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  metricCard: {
    width: (screenWidth - 52) / 2,
    marginBottom: 12,
  },
  metricCardLeft: {
    marginLeft: 6,
    marginRight: 6,
  },
  metricCardRight: {
    marginLeft: 6,
    marginRight: 6,
  },
  chartsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  chartCard: {
    marginBottom: 16,
  },
  chartPlaceholder: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 16,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  actionButton: {
    width: (screenWidth - 52) / 2,
    height: 80,
    margin: 6,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  modalContent: {
    margin: 20,
    borderRadius: 12,
    maxHeight: screenHeight * 0.8,
  },
});

export default DashboardScreen;