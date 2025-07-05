import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useExpenseSync } from '../hooks/useExpenseSync';
import { useSync } from '../hooks/useSync';
import { databaseService } from '../services/DatabaseService';
import { HistoricalSyncService } from '../services/HistoricalSyncService';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface SettingsScreenProps {
  onLogout: () => void;
  onBack: () => void;
}

export default function SettingsScreen({ onLogout, onBack }: SettingsScreenProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { manualSync, syncStatus, updateSyncStatus } = useSync();
  const { manualSync: manualExpenseSync, syncStatus: expenseSyncStatus, updateSyncStatus: updateExpenseSyncStatus } = useExpenseSync();

  const handleHistoricalSync = async () => {
    try {
      setIsSyncing(true);
      Alert.alert('پرانا ڈیٹا سنک', 'ڈیٹا سنک شروع ہو رہا ہے...');
      
      const result = await HistoricalSyncService.syncAllHistoricalData();
      
              Alert.alert(
          'ڈیٹا سنک مکمل',
          `عطیات: ${result.donations}\nاخراجات: ${result.expenses}`
        );
    } catch (error) {
      Alert.alert('خرابی', 'تاریخی ڈیٹا سنک ناکام ہوا');
      console.error('Historical sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };



  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      // Check if there are pending sync items
      const hasPendingDonations = syncStatus.pendingCount > 0;
      const hasPendingExpenses = expenseSyncStatus.pendingCount > 0;
      
      if (hasPendingDonations || hasPendingExpenses) {
        Alert.alert(
          'ڈیٹا سنک ضروری ہے',
          'لاگ آؤٹ سے پہلے تمام ڈیٹا سنک کرنا ضروری ہے۔ براہ کرم پہلے ڈیٹا سنک کریں یا ایڈمن سے رابطہ کریں۔',
          [
            { text: 'ڈیٹا سنک کریں', onPress: handleSyncBeforeLogout },
            { text: 'منسوخ کریں', style: 'cancel' }
          ]
        );
        return;
      }
      
      // Proceed with logout
      await performLogout();
      
    } catch (error) {
      Alert.alert('خرابی', 'لاگ آؤٹ ناکام ہوا');
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleSyncBeforeLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      // Sync donations
      if (syncStatus.pendingCount > 0) {
        await manualSync();
      }
      
      // Sync expenses
      if (expenseSyncStatus.pendingCount > 0) {
        await manualExpenseSync();
      }
      
      // Wait a bit for sync to complete and refresh status
      await new Promise(resolve => setTimeout(resolve, 2000));
      await Promise.all([updateSyncStatus(), updateExpenseSyncStatus()]);
      
      // Get fresh data directly from database to check actual pending counts
      const [actualPendingDonations, actualPendingExpenses] = await Promise.all([
        databaseService.getPendingSyncCount(),
        databaseService.getPendingSyncExpenseCount(),
      ]);
      
      // Check if there are still pending items using fresh database data
      if (actualPendingDonations > 0 || actualPendingExpenses > 0) {
        Alert.alert(
          'ڈیٹا سنک ناکام',
          'کچھ ڈیٹا سنک نہیں ہو سکا۔ براہ کرم ایڈمن سے رابطہ کریں۔'
        );
        return;
      }
      
      // Proceed with logout
      await performLogout();
      
    } catch (error) {
      Alert.alert('خرابی', 'ڈیٹا سنک ناکام ہوا');
      console.error('Sync before logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const performLogout = async () => {
    try {
      // Clear stored credentials
      await SecureStore.deleteItemAsync('username');
      await SecureStore.deleteItemAsync('signingKey');
      
      // Call logout callback
      onLogout();
      
    } catch (error) {
      console.error('Error clearing credentials:', error);
      // Still proceed with logout even if clearing fails
      onLogout();
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
          <ThemedText style={styles.backButtonText}>واپس جائیں</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.title}>ترتیبات</ThemedText>
      </ThemedView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sync Section */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>ڈیٹا سنک</ThemedText>
          
          {/* Historical Sync */}
          <TouchableOpacity
            style={[styles.settingItem, isSyncing && styles.settingItemDisabled]}
            onPress={handleHistoricalSync}
            disabled={isSyncing}
          >
            <ThemedView style={styles.settingContent}>
              <Ionicons name="cloud-download" size={24} color="#FF9800" />
              <ThemedView style={styles.settingText}>
                <ThemedText style={styles.settingTitle}>تاریخی ڈیٹا سنک</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  سرور سے تاریخی ڈیٹا ڈاؤن لوڈ کریں
                </ThemedText>
              </ThemedView>
            </ThemedView>
            {isSyncing ? (
              <Ionicons name="sync" size={20} color="#007AFF" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#666" />
            )}
          </TouchableOpacity>

          {/* Manual Donation Sync */}
          <TouchableOpacity
            style={[styles.settingItem, syncStatus?.isSyncing && styles.settingItemDisabled]}
            onPress={manualSync}
            disabled={syncStatus?.isSyncing}
          >
            <ThemedView style={styles.settingContent}>
              <Ionicons name="cloud-upload" size={24} color="#007AFF" />
              <ThemedView style={styles.settingText}>
                <ThemedText style={styles.settingTitle}>عطیات ڈیٹا سنک</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  {syncStatus?.isSyncing ? 'ڈیٹا سنک ہو رہا ہے...' : `(${syncStatus?.pendingCount || 0} زیر التواء)`}
                </ThemedText>
              </ThemedView>
            </ThemedView>
            {syncStatus?.isSyncing ? (
              <Ionicons name="sync" size={20} color="#007AFF" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#666" />
            )}
          </TouchableOpacity>

          {/* Manual Expense Sync */}
          <TouchableOpacity
            style={[styles.settingItem, expenseSyncStatus?.isSyncing && styles.settingItemDisabled]}
            onPress={manualExpenseSync}
            disabled={expenseSyncStatus?.isSyncing}
          >
            <ThemedView style={styles.settingContent}>
              <Ionicons name="cloud-upload" size={24} color="#F44336" />
              <ThemedView style={styles.settingText}>
                <ThemedText style={styles.settingTitle}>اخراجات ڈیٹا سنک</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  {expenseSyncStatus?.isSyncing ? 'ڈیٹا سنک ہو رہا ہے...' : `(${expenseSyncStatus?.pendingCount || 0} زیر التواء)`}
                </ThemedText>
              </ThemedView>
            </ThemedView>
            {expenseSyncStatus?.isSyncing ? (
              <Ionicons name="sync" size={20} color="#F44336" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#666" />
            )}
          </TouchableOpacity>


        </ThemedView>

        {/* Account Section */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>اکاؤنٹ</ThemedText>
          
          {/* Logout */}
          <TouchableOpacity
            style={[styles.settingItem, styles.logoutItem, isLoggingOut && styles.settingItemDisabled]}
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            <ThemedView style={styles.settingContent}>
              <Ionicons name="log-out" size={24} color="#F44336" />
              <ThemedView style={styles.settingText}>
                <ThemedText style={[styles.settingTitle, styles.logoutText]}>لاگ آؤٹ</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  {isLoggingOut ? 'لاگ آؤٹ ہو رہا ہے...' : 'اکاؤنٹ سے باہر نکلیں'}
                </ThemedText>
              </ThemedView>
            </ThemedView>
            {isLoggingOut ? (
              <Ionicons name="sync" size={20} color="#F44336" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#666" />
            )}
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 4,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  settingItemDisabled: {
    opacity: 0.6,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logoutItem: {
    borderColor: '#F44336',
    backgroundColor: '#fff5f5',
  },
  logoutText: {
    color: '#F44336',
  },
}); 