import Bugsnag from '@bugsnag/expo';
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Button, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_BASE_URL } from '../constants/Config';
import { databaseService } from '../services/DatabaseService';
import { HistoricalSyncService } from '../services/HistoricalSyncService';
import { Logo } from './Logo';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onLayout?: () => Promise<void>;
}

export default function LoginScreen({ onLoginSuccess, onLayout }: LoginScreenProps) {
  const [hasInternet, setHasInternet] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [isDevelopment] = useState(__DEV__); // Check if in development mode

  useEffect(() => {
    Network.getNetworkStateAsync().then(state => {
      setHasInternet(!!(state.isConnected && state.isInternetReachable));
    });
  }, []);

  useEffect(() => {
    // Call onLayout when component mounts
    if (onLayout) {
      onLayout();
    }
  }, [onLayout]);

  const handleActivate = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('براہ کرم یوزر نیم اور پاس ورڈ دونوں درج کریں');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          Alert.alert('غلط یوزرنیم یا پاس ورڈ');
          console.log(res.text());
        } else {
          Alert.alert('اکٹیویشن ناکام', 'سرور کی خرابی');
        }
        setLoading(false);
        return;
      }
      const { username: apiUsername, signingKey } = await res.json();
      await SecureStore.setItemAsync('username', apiUsername);
      await SecureStore.setItemAsync('signingKey', signingKey);
      
      // Show syncing state to user
      setLoading(false);
      setSyncing(true);
      setSyncMessage('ڈیٹابیس تیار ہو رہا ہے...');
      
      // Ensure database is initialized before syncing
      try {
        console.log('Ensuring database is initialized before historical sync...');
        await databaseService.ensureInitialized();
        console.log('Database initialized successfully');
        
        // Small delay to ensure database is fully ready
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (dbError) {
        console.error('Database initialization failed:', dbError);
        Bugsnag.notify(dbError instanceof Error ? dbError : new Error(String(dbError)));
        throw new Error('Database initialization failed');
      }
      
      // Sync historical data after successful login
      try {
        console.log('Starting historical data sync after login...');
        setSyncMessage('عطیات کا ڈیٹا ڈاؤن لوڈ ہو رہا ہے...');
        const donationsResult = await HistoricalSyncService.syncHistoricalDonations();
        
        setSyncMessage('اخراجات کا ڈیٹا ڈاؤن لوڈ ہو رہا ہے...');
        const expensesResult = await HistoricalSyncService.syncHistoricalExpenses();
        
        console.log('Historical data sync completed:', { donations: donationsResult, expenses: expensesResult });
        setSyncMessage(`مکمل! ${donationsResult} عطیات اور ${expensesResult} اخراجات ڈاؤن لوڈ ہوئے`);
        
        // Wait a moment to show completion message
        setTimeout(() => {
          setSyncing(false);
          onLoginSuccess();
        }, 1500);
        
      } catch (syncError) {
        console.error('Historical sync failed, but continuing with login:', syncError);
        Bugsnag.notify(syncError instanceof Error ? syncError : new Error(String(syncError)));
        setSyncMessage('ڈیٹا ڈاؤن لوڈ میں مسئلہ، لیکن لاگ ان جاری ہے...');
        
        // Wait a moment then continue
        setTimeout(() => {
          setSyncing(false);
          onLoginSuccess();
        }, 2000);
      }
    } catch (e) {
      Alert.alert('اکٹیویشن ناکام', 'نیٹ ورک یا سرور کی خرابی');
      setLoading(false);
    }
  };

  const handleResetDatabase = async () => {
    Alert.alert(
      'Reset Database',
      'This will delete all local data and close the app. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset & Close',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Resetting database...');
              
              // Reset the database (delete file and reinitialize)
              await databaseService.resetDatabase();
              
              // Clear all secure store data
              await SecureStore.deleteItemAsync('username');
              await SecureStore.deleteItemAsync('signingKey');
              
              console.log('Database reset completed, closing app...');
              
              // Close the app
              if (Platform.OS === 'android') {
                BackHandler.exitApp();
              } else {
                // On iOS, we can't force close, but we can show a message
                Alert.alert(
                  'Database Reset Complete',
                  'Please manually close and restart the app to see the changes.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Try to exit anyway
                        BackHandler.exitApp();
                      },
                    },
                  ]
                );
              }
            } catch (error) {
              Bugsnag.notify(error instanceof Error ? error : new Error(String(error)));
              console.error('Error resetting database:', error);
              Alert.alert('Error', 'Failed to reset database. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Show syncing screen when syncing is in progress
  if (syncing) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#f5f5f5',
        padding: 24
      }}>
        <Logo size="large" style={{ marginBottom: 40 }} />
        <ActivityIndicator size="large" color="#1976D2" style={{ marginBottom: 20 }} />
        <Text style={{ 
          fontSize: 18, 
          color: '#1976D2', 
          fontWeight: '600',
          textAlign: 'center',
          marginBottom: 12
        }}>
          {syncMessage}
        </Text>
        <Text style={{ 
          fontSize: 14, 
          color: '#666',
          textAlign: 'center',
          lineHeight: 20
        }}>
          براہ کرم انتظار کریں، یہ صرف چند سیکنڈ لگے گا
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={40}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Logo size="large" style={{ marginBottom: 20 }} />
        <Text style={{ fontSize: 22, marginBottom: 24, color: '#1976D2', fontWeight: 'bold' }}>ایپ ایکٹیویشن</Text>
        <Text style={{ textAlign: 'center', fontSize: 16, color: '#d32f2f' }}>
            اس ایپ کو فعال کرنے کے لیے انٹرنیٹ کنکشن ضروری ہے۔ ایکٹیویشن کے بعد آپ آف لائن بھی کام کر سکتے ہیں۔
        </Text>
        <View style={{ width: '100%', marginBottom: 16 }}>
          <Text style={{ marginBottom: 6, textAlign: 'right' }}>یوزر نیم</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fff', textAlign: 'right' }}
            placeholder="یوزر نیم درج کریں"
          />
        </View>
        <View style={{ width: '100%', marginBottom: 16 }}>
          <Text style={{ marginBottom: 6, textAlign: 'right' }}>پاس ورڈ</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fff', textAlign: 'right' }}
            placeholder="پاس ورڈ درج کریں"
          />
        </View>
        <View style={{ width: '100%', marginTop: 8 }}>
          <Button
            title={loading ? 'ایکٹیویٹ ہو رہا ہے...' : 'ایپ ایکٹیویٹ کریں'}
            onPress={handleActivate}
            disabled={loading}
            color="#1976D2"
          />
        </View>
        {loading && <ActivityIndicator style={{ marginTop: 16 }} color="#1976D2" />}
        
        {/* Development-only reset database button */}
        {isDevelopment && (
          <View style={{ width: '100%', marginTop: 32 }}>
            <TouchableOpacity
              style={{
                backgroundColor: '#f44336',
                padding: 12,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 2,
                borderColor: '#d32f2f',
              }}
              onPress={handleResetDatabase}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                🗑️ Reset Database (Dev Only)
              </Text>
            </TouchableOpacity>
            <Text style={{ 
              textAlign: 'center', 
              fontSize: 12, 
              color: '#666', 
              marginTop: 8,
              fontStyle: 'italic'
            }}>
              This button only appears in development mode
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
} 