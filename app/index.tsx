import { DonationForm } from '@/components/DonationForm';
import { DonationList } from '@/components/DonationList';
import { ExpenseForm } from '@/components/ExpenseForm';
import { ExpenseList } from '@/components/ExpenseList';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useExpenseSync } from '@/hooks/useExpenseSync';
import { useSync } from '@/hooks/useSync';
import { databaseService } from '@/services/DatabaseService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

export default function HomeScreen() {
  const [dbReady, setDbReady] = useState(false);
  const [currentView, setCurrentView] = useState<'main' | 'list' | 'form' | 'expense-list' | 'expense-form'>('main');
  const { getStatistics, manualSync, syncStatus } = useSync();
  const [stats, setStats] = useState({ totalDonations: 0, totalAmount: 0, pendingCount: 0 });

  const { getStatistics: getExpenseStats, manualSync: manualExpenseSync, syncStatus: expenseSyncStatus } = useExpenseSync();
  const [expenseStats, setExpenseStats] = useState({ totalExpenses: 0, totalAmount: 0, pendingCount: 0 });

  const [balance, setBalance] = useState(0);

  useEffect(() => {
    databaseService.init().then(() => setDbReady(true));
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
    <ScrollView>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="title">حسابِ خیر</ThemedText>
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
                {syncStatus?.isSyncing ? 'ہم آہنگ...' : `(${stats.pendingCount})`}
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
                {expenseSyncStatus?.isSyncing ? 'ہم آہنگ...' : `(${expenseStats.pendingCount})`}
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
          <TouchableOpacity
            style={styles.button}
            onPress={() => setCurrentView('list')}
          >
            <ThemedText style={styles.buttonText}>📋 تمام عطیات دیکھیں</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.addButton]}
            onPress={() => setCurrentView('form')}
          >
            <ThemedText style={styles.buttonText}>➕ نیا عطیہ شامل کریں</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.expenseButton]}
            onPress={() => setCurrentView('expense-list')}
          >
            <ThemedText style={styles.buttonText}>💸 اخراجات کا حساب</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </ScrollView>
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
        <ThemedText>لوڈ ہو رہا ہے...</ThemedText>
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
        <TouchableOpacity
          style={[styles.button, styles.addButton, { margin: 20 }]}
          onPress={() => setCurrentView('expense-form')}
        >
          <ThemedText style={styles.buttonText}>➕ نیا خرچ شامل کریں</ThemedText>
        </TouchableOpacity>
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

  return renderMainView();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  fullContainer: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
    gap: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 20,
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#f5f5f5',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  expenseButton: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center'
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
    borderRadius: 16,
    marginBottom: 24,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: '#f7fafd',
  },
  statColumnBorder: {
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
    color: '#1976D2',
  },
  statsText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
    textAlign: 'center',
  },
  statsSubText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
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
  },
}); 