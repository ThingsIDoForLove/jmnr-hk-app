import { DonationForm } from '@/components/DonationForm';
import { DonationList } from '@/components/DonationList';
import { ExpenseForm } from '@/components/ExpenseForm';
import { ExpenseList } from '@/components/ExpenseList';
import SettingsScreen from '@/components/SettingsScreen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useExpenseSync } from '@/hooks/useExpenseSync';
import { useSync } from '@/hooks/useSync';
import { databaseService } from '@/services/DatabaseService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, BackHandler, Platform, StyleSheet, TouchableOpacity } from 'react-native';

interface HomeScreenProps {
  onLogout: () => void;
}

export default function HomeScreen({ onLogout }: HomeScreenProps) {
  const [dbReady, setDbReady] = useState(false);
  const [currentView, setCurrentView] = useState<'main' | 'list' | 'form' | 'expense-list' | 'expense-form' | 'settings' | 'reports'>('main');
  const { getStatistics, manualSync, syncStatus } = useSync();
  const [stats, setStats] = useState({ totalDonations: 0, totalAmount: 0, pendingCount: 0 });

  const { getStatistics: getExpenseStats, manualSync: manualExpenseSync, syncStatus: expenseSyncStatus } = useExpenseSync();
  const [expenseStats, setExpenseStats] = useState({ totalExpenses: 0, totalAmount: 0, pendingCount: 0 });

  const [balance, setBalance] = useState(0);

  useEffect(() => {
    databaseService.init()
      .then(() => {
        console.log('Database initialized successfully');
        setDbReady(true);
      })
      .catch((error) => {
        console.error('Failed to initialize database:', error);
        Alert.alert(
          'Database Error',
          'Failed to initialize local database. The app cannot function without a database. Please restart the app or contact support.',
          [
            { 
              text: 'Exit App', 
              onPress: () => {
                // Force close the app
                if (Platform.OS === 'ios') {
                  // On iOS, we can't force close, but we can show the error
                  console.log('App should be restarted manually');
                } else {
                  // On Android, we can try to exit
                  BackHandler.exitApp();
                }
              },
              style: 'destructive'
            }
          ]
        );
      });
  }, []);

  useEffect(() => {
    if (dbReady) {
      getStatistics().then(setStats);
      getExpenseStats().then(setExpenseStats);
    }
  }, [currentView, getStatistics, getExpenseStats, dbReady]);

  useEffect(() => {
    setBalance((stats.totalAmount || 0) - (expenseStats.totalAmount || 0));
  }, [stats.totalAmount, expenseStats.totalAmount]);

  const renderMainView = () => (
    <ThemedView style={styles.mainContainer}>
      <ThemedView style={styles.contentContainer}>
        <ThemedView style={styles.header}>
          <ThemedText style={styles.title} type="title">حسابِ خیر</ThemedText>
          <ThemedText style={styles.subtitle}>
            عطیات کا شفاف حساب، آسان انداز میں
          </ThemedText>
        </ThemedView>

        {/* Compact Stats Row */}
        <ThemedView style={styles.statsRow}>
          {/* Donations */}
          <ThemedView style={[styles.statColumn, styles.statColumnBorder]}>
            <ThemedText style={styles.statsTitle}>عطیات</ThemedText>
            <ThemedText style={styles.statsText}>{stats.totalDonations}</ThemedText>
            <ThemedText style={styles.statsSubText}>PKR {stats.totalAmount?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</ThemedText>
            <TouchableOpacity
              style={styles.syncButtonCompact}
              onPress={async () => {
                await manualSync();
                getStatistics().then(setStats);
              }}
              disabled={syncStatus?.isSyncing}
              accessibilityLabel="Sync now"
            >
              <Ionicons name={syncStatus?.isSyncing ? 'sync' : 'cloud-upload-outline'} size={20} color={syncStatus?.isSyncing ? '#007AFF' : '#333'} />
              <ThemedText style={styles.syncButtonTextCompact}>
                {syncStatus?.isSyncing ? 'ڈیٹا سنک...' : `(${stats.pendingCount})`}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
          {/* Expenses */}
          <ThemedView style={[styles.statColumn, styles.statColumnBorder]}>
            <ThemedText style={styles.statsTitle}>اخراجات</ThemedText>
            <ThemedText style={styles.statsText}>{expenseStats.totalExpenses}</ThemedText>
            <ThemedText style={styles.statsSubText}>PKR {expenseStats.totalAmount?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</ThemedText>
            <TouchableOpacity
              style={styles.syncButtonCompact}
              onPress={async () => {
                await manualExpenseSync();
                getExpenseStats().then(setExpenseStats);
              }}
              disabled={expenseSyncStatus?.isSyncing}
              accessibilityLabel="Sync expenses now"
            >
              <Ionicons name={expenseSyncStatus?.isSyncing ? 'sync' : 'cloud-upload-outline'} size={20} color={expenseSyncStatus?.isSyncing ? '#F44336' : '#333'} />
              <ThemedText style={styles.syncButtonTextCompact}>
                {expenseSyncStatus?.isSyncing ? 'ڈیٹا سنک...' : `(${expenseStats.pendingCount})`}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
          {/* Balance */}
          <ThemedView style={styles.statColumn}>
            <ThemedText style={styles.statsTitle}>بیلنس</ThemedText>
            <ThemedText style={styles.statsText}>{balance?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</ThemedText>
            <ThemedText style={styles.statsSubText}>PKR</ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.buttonContainer}>
          <ThemedView style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.halfButton]}
              onPress={() => setCurrentView('list')}
            >
              <ThemedText style={styles.buttonText}>📋 تمام عطیات</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.halfButton, styles.addButton]}
              onPress={() => setCurrentView('form')}
            >
              <ThemedText style={styles.buttonText}>➕ نیا عطیہ</ThemedText>
            </TouchableOpacity>
          </ThemedView>

          <ThemedView style={styles.buttonRow}>
          <TouchableOpacity
              style={[styles.button, styles.halfButton]}
              onPress={() => setCurrentView('expense-list')}
            >
              <ThemedText style={styles.buttonText}>💸 تمام اخراجات</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.halfButton, styles.addExpenseButton]}
              onPress={() => setCurrentView('expense-form')}
            >
              <ThemedText style={styles.buttonText}>➕ نیا خرچ</ThemedText>
            </TouchableOpacity>
          </ThemedView>

          <ThemedView style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.halfButton, styles.settingsButton]}
              onPress={() => setCurrentView('settings')}
            >
              <ThemedText style={styles.buttonText}>⚙️ ترتیبات</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.halfButton, styles.reportsButton]}
              onPress={() => setCurrentView('reports')}
            >
              <ThemedText style={styles.buttonText}>📊 رپورٹ</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );

  const renderHeader = (title: string) => (
    <ThemedView style={styles.navHeader}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setCurrentView('main')}
      >
        <ThemedText style={styles.backButtonText}>← واپس جائیں</ThemedText>
      </TouchableOpacity>
      <ThemedText type="title" style={styles.navTitle}>
        {title}
      </ThemedText>
    </ThemedView>
  );

  if (!dbReady) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ThemedText style={{ fontSize: 18, textAlign: 'center', marginBottom: 20 }}>
          ڈیٹابیس شروع ہو رہا ہے...
        </ThemedText>
        <ThemedText style={{ fontSize: 14, textAlign: 'center', color: '#666' }}>
          براہ کرم انتظار کریں
        </ThemedText>
      </ThemedView>
    );
  }

  if (currentView === 'list') {
    return (
      <ThemedView style={styles.fullContainer}>
        {renderHeader('تمام عطیات')}
        <DonationList />
      </ThemedView>
    );
  }

  if (currentView === 'form') {
    return (
      <ThemedView style={styles.fullContainer}>
        {renderHeader('نیا عطیہ شامل کریں')}
        <DonationForm />
      </ThemedView>
    );
  }

  if (currentView === 'expense-list') {
    return (
      <ThemedView style={styles.fullContainer}>
        {renderHeader('تمام اخراجات')}
        <ExpenseList />
      </ThemedView>
    );
  }

  if (currentView === 'expense-form') {
    return (
      <ThemedView style={styles.fullContainer}>
        {renderHeader('نیا خرچ شامل کریں')}
        <ExpenseForm />
      </ThemedView>
    );
  }

  const handleLogout = () => {
    // Call the parent's logout function
    onLogout();
  };

  if (currentView === 'settings') {
    return (
      <ThemedView style={styles.fullContainer}>
        <SettingsScreen 
          onLogout={handleLogout}
          onBack={() => setCurrentView('main')}
        />
      </ThemedView>
    );
  }

  if (currentView === 'reports') {
    return (
      <ThemedView style={styles.fullContainer}>
        {renderHeader('رپورٹ')}
        <ThemedView style={styles.container}>
          <ThemedText style={{ textAlign: 'center', marginTop: 50 }}>
            رپورٹ فیچر جلد آ رہا ہے...
          </ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  return renderMainView();
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    gap: 8,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  fullContainer: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title:{
    lineHeight: 55
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 40,
    width: '100%',
  },
  button: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  expenseButton: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  addExpenseButton: {
    backgroundColor: '#D0392E',
    borderColor: '#F44336',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonSubtext: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    backgroundColor: '#f7fafd',
    borderRadius: 12,
    marginBottom: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    backgroundColor: '#f7fafd',
  },
  statColumnBorder: {
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
    color: '#1976D2',
    lineHeight: 20,
  },
  statsText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 1,
    textAlign: 'center',
  },
  statsSubText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  syncButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0eaff',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  syncButtonTextCompact: {
    marginLeft: 6,
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  navTitle: {
    flex: 1,
    textAlign: "center"
  },
  addButtonHeader: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  addButtonHeaderText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  settingsButtonHeader: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  halfButton: {
    flex: 1,
  },
  settingsButton: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e0e0e0',
  },
  reportsButton: {
    backgroundColor: '#e0e0e0',
    borderColor: '#e0e0e0',
  },
}); 