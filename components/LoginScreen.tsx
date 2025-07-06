import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { API_BASE_URL } from '../constants/Config';
import { HistoricalSyncService } from '../services/HistoricalSyncService';
import { Logo } from './Logo';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [hasInternet, setHasInternet] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Network.getNetworkStateAsync().then(state => {
      setHasInternet(!!(state.isConnected && state.isInternetReachable));
    });
  }, []);

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
        } else {
          Alert.alert('اکٹیویشن ناکام', 'سرور کی خرابی');
        }
        setLoading(false);
        return;
      }
      const { username: apiUsername, signingKey } = await res.json();
      await SecureStore.setItemAsync('username', apiUsername);
      await SecureStore.setItemAsync('signingKey', signingKey);
      
      // Sync historical data after successful login
      try {
        console.log('Starting historical data sync after login...');
        const result = await HistoricalSyncService.syncAllHistoricalData();
        console.log('Historical data sync completed:', result);
      } catch (syncError) {
        console.error('Historical sync failed, but continuing with login:', syncError);
        // Don't block login if sync fails
      }
      
      onLoginSuccess();
    } catch (e) {
      Alert.alert('اکٹیویشن ناکام', 'نیٹ ورک یا سرور کی خرابی');
    } finally {
      setLoading(false);
    }
  };

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
      </ScrollView>
    </KeyboardAvoidingView>
  );
} 