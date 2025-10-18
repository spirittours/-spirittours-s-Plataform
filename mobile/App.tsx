/**
 * Spirit Tours Mobile App
 * Main Application Component
 * 
 * @format
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import BookingScreen from './src/screens/BookingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import DestinationDetailScreen from './src/screens/DestinationDetailScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import ConfirmationScreen from './src/screens/ConfirmationScreen';
import MyBookingsScreen from './src/screens/MyBookingsScreen';
import OfflineScreen from './src/screens/OfflineScreen';

// Context
import { AuthProvider } from './src/context/AuthContext';
import { BookingProvider } from './src/context/BookingContext';
import { OfflineProvider } from './src/context/OfflineContext';

// Services
import { initializeOfflineStorage } from './src/services/OfflineService';
import { setupPushNotifications } from './src/services/NotificationService';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Main Tab Navigator
 */
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Search') {
            iconName = 'search';
          } else if (route.name === 'MyBookings') {
            iconName = 'book-online';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          } else {
            iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2E7D32',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Inicio' }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen}
        options={{ title: 'Buscar' }}
      />
      <Tab.Screen 
        name="MyBookings" 
        component={MyBookingsScreen}
        options={{ title: 'Mis Reservas' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Perfil' }}
      />
    </Tab.Navigator>
  );
}

/**
 * Main App Component
 */
function App(): JSX.Element {
  const [isOffline, setIsOffline] = React.useState(false);

  useEffect(() => {
    // Initialize offline storage
    initializeOfflineStorage();

    // Setup push notifications
    setupPushNotifications();

    // Network connectivity listener
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  if (isOffline) {
    return (
      <SafeAreaProvider>
        <OfflineScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <BookingProvider>
            <OfflineProvider>
              <NavigationContainer>
                <Stack.Navigator
                  initialRouteName="MainTabs"
                  screenOptions={{
                    headerStyle: {
                      backgroundColor: '#2E7D32',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                      fontWeight: 'bold',
                    },
                  }}
                >
                  <Stack.Screen 
                    name="Login" 
                    component={LoginScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen 
                    name="MainTabs" 
                    component={MainTabs}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen 
                    name="DestinationDetail" 
                    component={DestinationDetailScreen}
                    options={{ title: 'Detalles del Destino' }}
                  />
                  <Stack.Screen 
                    name="Booking" 
                    component={BookingScreen}
                    options={{ title: 'Reservar' }}
                  />
                  <Stack.Screen 
                    name="Payment" 
                    component={PaymentScreen}
                    options={{ title: 'Pago' }}
                  />
                  <Stack.Screen 
                    name="Confirmation" 
                    component={ConfirmationScreen}
                    options={{ 
                      title: 'Confirmación',
                      headerLeft: () => null, // Prevent going back
                    }}
                  />
                </Stack.Navigator>
              </NavigationContainer>
            </OfflineProvider>
          </BookingProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
