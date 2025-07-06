import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import * as Sentry from '@sentry/react-native';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import LoginScreen from '../components/LoginScreen';
import HomeScreen from './index';

Sentry.init({
  dsn: 'https://5b9646d9b1c37d756ebe59967358647d@o4509622034694144.ingest.de.sentry.io/4509622036725840',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

export default Sentry.wrap(function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkLogin() {
      const username = await SecureStore.getItemAsync('username');
      const signingKey = await SecureStore.getItemAsync('signingKey');
      setIsLoggedIn(!!(username && signingKey));
    }
    checkLogin();
  }, []);

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  if (isLoggedIn === false) {
    return <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <HomeScreen onLogout={handleLogout} />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
});