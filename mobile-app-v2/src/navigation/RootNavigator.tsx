import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createDrawerNavigator} from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {useAuth} from '../contexts/AuthContext';
import {theme} from '../theme';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import VerificationScreen from '../screens/auth/VerificationScreen';

// Main Screens
import HomeScreen from '../screens/main/HomeScreen';
import ExploreScreen from '../screens/main/ExploreScreen';
import SearchScreen from '../screens/main/SearchScreen';

// Tour Screens
import TourListScreen from '../screens/tours/TourListScreen';
import TourDetailScreen from '../screens/tours/TourDetailScreen';
import TourBookingScreen from '../screens/tours/TourBookingScreen';
import TourReviewScreen from '../screens/tours/TourReviewScreen';

// Booking Screens
import BookingsScreen from '../screens/bookings/BookingsScreen';
import BookingDetailScreen from '../screens/bookings/BookingDetailScreen';
import PaymentScreen from '../screens/bookings/PaymentScreen';

// Profile Screens
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import PreferencesScreen from '../screens/profile/PreferencesScreen';

// Settings Screens
import SettingsScreen from '../screens/settings/SettingsScreen';
import NotificationSettingsScreen from '../screens/settings/NotificationSettingsScreen';
import PrivacyScreen from '../screens/settings/PrivacyScreen';
import HelpScreen from '../screens/settings/HelpScreen';

// Chat & Support
import ChatListScreen from '../screens/chat/ChatListScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import SupportScreen from '../screens/support/SupportScreen';

// Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  TourDetail: {tourId: string};
  TourBooking: {tourId: string; selectedDate: string};
  BookingDetail: {bookingId: string};
  Payment: {bookingId: string; amount: number};
  Chat: {conversationId: string};
  EditProfile: undefined;
  Settings: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Verification: {email: string};
};

export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  Bookings: undefined;
  Profile: undefined;
  More: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const Drawer = createDrawerNavigator();

// Auth Navigator
const AuthNavigator = () => (
  <AuthStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
    <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <AuthStack.Screen name="Verification" component={VerificationScreen} />
  </AuthStack.Navigator>
);

// Tab Navigator
const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({route}) => ({
      tabBarIcon: ({focused, color, size}) => {
        let iconName = 'home';
        
        switch (route.name) {
          case 'Home':
            iconName = 'home';
            break;
          case 'Explore':
            iconName = 'explore';
            break;
          case 'Bookings':
            iconName = 'calendar-today';
            break;
          case 'Profile':
            iconName = 'person';
            break;
          case 'More':
            iconName = 'menu';
            break;
        }
        
        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
      tabBarStyle: {
        height: 60,
        paddingBottom: 5,
        paddingTop: 5,
      },
    })}>
    <Tab.Screen 
      name="Home" 
      component={HomeScreen}
      options={{title: 'Inicio'}}
    />
    <Tab.Screen 
      name="Explore" 
      component={ExploreScreen}
      options={{title: 'Explorar'}}
    />
    <Tab.Screen 
      name="Bookings" 
      component={BookingsScreen}
      options={{title: 'Reservas'}}
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen}
      options={{title: 'Perfil'}}
    />
    <Tab.Screen 
      name="More" 
      component={DrawerNavigator}
      options={{title: 'Más'}}
    />
  </Tab.Navigator>
);

// Drawer Navigator
const DrawerNavigator = () => (
  <Drawer.Navigator
    screenOptions={{
      drawerActiveTintColor: theme.colors.primary,
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: '#fff',
    }}>
    <Drawer.Screen 
      name="Tours" 
      component={TourListScreen}
      options={{
        title: 'Tours',
        drawerIcon: ({color, size}) => (
          <Icon name="tour" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="Chat" 
      component={ChatListScreen}
      options={{
        title: 'Chat',
        drawerIcon: ({color, size}) => (
          <Icon name="chat" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="Support" 
      component={SupportScreen}
      options={{
        title: 'Soporte',
        drawerIcon: ({color, size}) => (
          <Icon name="support-agent" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="Settings" 
      component={SettingsScreen}
      options={{
        title: 'Configuración',
        drawerIcon: ({color, size}) => (
          <Icon name="settings" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="Help" 
      component={HelpScreen}
      options={{
        title: 'Ayuda',
        drawerIcon: ({color, size}) => (
          <Icon name="help" size={size} color={color} />
        ),
      }}
    />
  </Drawer.Navigator>
);

// Root Navigator
export const RootNavigator = () => {
  const {isAuthenticated, isLoading} = useAuth();
  
  if (isLoading) {
    // Return loading screen component
    return null;
  }
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen 
            name="TourDetail" 
            component={TourDetailScreen}
            options={{
              headerShown: true,
              headerTransparent: true,
              headerTitle: '',
            }}
          />
          <Stack.Screen 
            name="TourBooking" 
            component={TourBookingScreen}
            options={{
              headerShown: true,
              headerTitle: 'Reservar Tour',
              headerStyle: {
                backgroundColor: theme.colors.primary,
              },
              headerTintColor: '#fff',
            }}
          />
          <Stack.Screen 
            name="BookingDetail" 
            component={BookingDetailScreen}
            options={{
              headerShown: true,
              headerTitle: 'Detalle de Reserva',
            }}
          />
          <Stack.Screen 
            name="Payment" 
            component={PaymentScreen}
            options={{
              headerShown: true,
              headerTitle: 'Pago',
              headerBackVisible: false,
            }}
          />
          <Stack.Screen 
            name="Chat" 
            component={ChatScreen}
            options={{
              headerShown: true,
              headerTitle: 'Chat',
            }}
          />
          <Stack.Screen 
            name="EditProfile" 
            component={EditProfileScreen}
            options={{
              headerShown: true,
              headerTitle: 'Editar Perfil',
            }}
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsNavigator}
            options={{
              headerShown: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

// Settings Navigator
const SettingsStack = createNativeStackNavigator();

const SettingsNavigator = () => (
  <SettingsStack.Navigator>
    <SettingsStack.Screen 
      name="SettingsMain" 
      component={SettingsScreen}
      options={{headerTitle: 'Configuración'}}
    />
    <SettingsStack.Screen 
      name="NotificationSettings" 
      component={NotificationSettingsScreen}
      options={{headerTitle: 'Notificaciones'}}
    />
    <SettingsStack.Screen 
      name="Privacy" 
      component={PrivacyScreen}
      options={{headerTitle: 'Privacidad'}}
    />
    <SettingsStack.Screen 
      name="Preferences" 
      component={PreferencesScreen}
      options={{headerTitle: 'Preferencias'}}
    />
  </SettingsStack.Navigator>
);