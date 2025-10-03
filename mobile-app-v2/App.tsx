/**
 * Spirit Tours Mobile App
 * Main Application Entry Point
 */

import React, {useEffect} from 'react';
import {StatusBar, LogBox} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {Provider as PaperProvider} from 'react-native-paper';
import {Provider as ReduxProvider} from 'react-redux';
import {QueryClient, QueryClientProvider} from 'react-query';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import SplashScreen from 'react-native-splash-screen';
import {I18nextProvider} from 'react-i18next';

import {store} from './src/store';
import {theme} from './src/theme';
import i18n from './src/i18n';
import {RootNavigator} from './src/navigation/RootNavigator';
import {AuthProvider} from './src/contexts/AuthContext';
import {NotificationService} from './src/services/NotificationService';
import {AnalyticsService} from './src/services/AnalyticsService';
import {ErrorBoundary} from './src/components/common/ErrorBoundary';
import {NetworkProvider} from './src/contexts/NetworkContext';
import {LoadingProvider} from './src/contexts/LoadingContext';
import {setupInterceptors} from './src/services/api/interceptors';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested',
]);

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

const App: React.FC = () => {
  useEffect(() => {
    // Hide splash screen
    SplashScreen.hide();
    
    // Initialize services
    NotificationService.initialize();
    AnalyticsService.initialize();
    
    // Setup API interceptors
    setupInterceptors(store);
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{flex: 1}}>
        <ReduxProvider store={store}>
          <QueryClientProvider client={queryClient}>
            <I18nextProvider i18n={i18n}>
              <PaperProvider theme={theme}>
                <SafeAreaProvider>
                  <NetworkProvider>
                    <LoadingProvider>
                      <AuthProvider>
                        <NavigationContainer>
                          <StatusBar
                            backgroundColor={theme.colors.primary}
                            barStyle="light-content"
                          />
                          <RootNavigator />
                        </NavigationContainer>
                      </AuthProvider>
                    </LoadingProvider>
                  </NetworkProvider>
                </SafeAreaProvider>
              </PaperProvider>
            </I18nextProvider>
          </QueryClientProvider>
        </ReduxProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

export default App;