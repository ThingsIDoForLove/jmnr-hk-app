import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import LoginScreen from '../components/LoginScreen';

export default function RootLayout() {
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

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  if (isLoggedIn === false) {
    return <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
