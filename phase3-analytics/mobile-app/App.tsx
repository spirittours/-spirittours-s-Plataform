/**
 * PHASE 3: Mobile Analytics App - Main App Component
 * Executive Mobile Analytics Dashboard for GenSpark AI Platform
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, View, Alert, AppState as RNAppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';

// Screens
import DashboardScreen from './src/screens/DashboardScreen';
import LoginScreen from './src/screens/LoginScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import MetricDetailScreen from './src/screens/MetricDetailScreen';
import AlertsScreen from './src/screens/AlertsScreen';

// Services & Utils
import { useStore, useAuth, useTheme, useAppState, storeActions } from './src/utils/store';
import { api } from './src/services/api';
import { User } from './src/types';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator Component
const TabNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'analytics' : 'analytics-outline';
              break;
            case 'Reports':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            case 'Alerts':
              iconName = focused ? 'notifications' : 'notifications-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Reports" 
        component={ReportsScreen}
        options={{ title: 'Reports' }}
      />
      <Tab.Screen 
        name="Alerts" 
        component={AlertsScreen}
        options={{ title: 'Alerts' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

// Main App Component
const App: React.FC = () => {
  const [initializing, setInitializing] = useState(true);
  const { isAuthenticated, user, setUser, setAuthenticated, logout } = useAuth();
  const { theme } = useTheme();
  const { setOnlineStatus } = useAppState();

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setOnlineStatus(state.isConnected ?? false);
    });

    return unsubscribe;
  }, [setOnlineStatus]);

  // Monitor app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // App came to foreground, check authentication
        checkAuthenticationStatus();
      } else if (nextAppState === 'background') {
        // App went to background, implement security measures if needed
        handleAppBackground();
      }
    };

    const subscription = RNAppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const initializeApp = async () => {
    try {
      // Check for existing authentication
      const token = await SecureStore.getItemAsync('access_token');
      
      if (token) {
        // Verify token and get user data
        const userResponse = await api.getCurrentUser();
        
        if (userResponse.success) {
          await storeActions.initializeApp(userResponse.data);
        } else {
          // Token invalid, clear it
          await logout();
        }
      }
    } catch (error) {
      console.error('App initialization failed:', error);
      storeActions.handleError(error as Error, 'initialization');
    } finally {
      setInitializing(false);
    }
  };

  const checkAuthenticationStatus = async () => {
    try {
      if (isAuthenticated) {
        // Verify that the user session is still valid
        const healthResponse = await api.healthCheck();
        
        if (!healthResponse.success) {
          // Session expired or server issues
          Alert.alert(
            'Session Expired',
            'Your session has expired. Please log in again.',
            [{ text: 'OK', onPress: logout }]
          );
        }
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
    }
  };

  const handleAppBackground = () => {
    // Implement any security measures when app goes to background
    // For example, show privacy screen, lock app, etc.
    
    const { securityConfig } = useStore.getState();
    
    if (securityConfig.autoLock) {
      // Could implement app locking logic here
      console.log('App going to background, security measures applied');
    }
  };

  // Show loading screen while initializing
  if (initializing) {
    return (
      <PaperProvider theme={{
        colors: {
          primary: theme.colors.primary,
          accent: theme.colors.accent,
          background: theme.colors.background,
          surface: theme.colors.surface,
          text: theme.colors.text,
          disabled: theme.colors.disabled,
          placeholder: theme.colors.placeholder,
          backdrop: 'rgba(0, 0, 0, 0.5)',
          notification: theme.colors.primary,
        },
      }}>
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background,
        }}>
          {/* You could add a proper splash screen component here */}
        </View>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={{
      colors: {
        primary: theme.colors.primary,
        accent: theme.colors.accent,
        background: theme.colors.background,
        surface: theme.colors.surface,
        text: theme.colors.text,
        disabled: theme.colors.disabled,
        placeholder: theme.colors.placeholder,
        backdrop: 'rgba(0, 0, 0, 0.5)',
        notification: theme.colors.primary,
      },
    }}>
      <StatusBar
        barStyle={theme.colors.background === '#111827' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.primary}
      />
      
      <NavigationContainer
        theme={{
          dark: theme.colors.background === '#111827',
          colors: {
            primary: theme.colors.primary,
            background: theme.colors.background,
            card: theme.colors.surface,
            text: theme.colors.text,
            border: theme.colors.border,
            notification: theme.colors.accent,
          },
        }}
      >
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.colors.primary,
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          {!isAuthenticated ? (
            // Authentication stack
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
          ) : (
            // Main app stack
            <>
              <Stack.Screen
                name="Main"
                component={TabNavigator}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="MetricDetail"
                component={MetricDetailScreen}
                options={{ title: 'Metric Details' }}
              />
              <Stack.Screen
                name="Analytics"
                component={AnalyticsScreen}
                options={{ title: 'Deep Analytics' }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
};

export default App;