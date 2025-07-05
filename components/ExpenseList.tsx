import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExpenseSync } from '../hooks/useExpenseSync';
import { ExpenseRecord } from '../types/data';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export function ExpenseList() {
  const { getExpenses, getStatistics } = useExpenseSync();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalExpenses: 0, totalAmount: 0 });
  const insets = useSafeAreaInsets();
  
  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const RECORDS_PER_PAGE = 30;

  const getCategoryInUrdu = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      'office_supplies': 'دفتری سامان',
      'utilities': 'بلز',
      'rent': 'کرایہ',
      'maintenance': 'مرمت',
      'transportation': 'نقل و حمل',
      'meals': 'کھانا',
      'events': 'تقریبات',
      'marketing': 'تشہیر',
      'equipment': 'آلات',
      'services': 'خدمات',
      'other': 'دیگر'
    };
    return categoryMap[category] || category;
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: string } = {
      'office_supplies': '📋',
      'utilities': '💡',
      'rent': '🏢',
      'maintenance': '🔧',
      'transportation': '🚗',
      'meals': '🍽️',
      'events': '🎉',
      'marketing': '📢',
      'equipment': '🖥️',
      'services': '🤝',
      'other': '📋'
    };
    return iconMap[category] || '📋';
  };

  const loadExpenses = async (searchQuery: string = '', page: number = 1) => {
    try {
      setLoading(true);
      
      // Get expenses with search and pagination from database
      const [expenseData, statsData] = await Promise.all([
        getExpenses(RECORDS_PER_PAGE, (page - 1) * RECORDS_PER_PAGE, searchQuery),
        getStatistics(),
      ]);
      
      setExpenses(expenseData);
      setStats(statsData);
      setCurrentPage(page);
      
      // Check if there are more records
      const hasMore = expenseData.length === RECORDS_PER_PAGE;
      setHasMoreData(hasMore);
      
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const performSearch = () => {
    setCurrentSearchTerm(searchQuery);
    loadExpenses(searchQuery, 1);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setCurrentSearchTerm('');
    loadExpenses('', 1);
  };

  const loadNextPage = () => {
    if (hasMoreData) {
      const nextPage = currentPage + 1;
      loadExpenses(currentSearchTerm, nextPage);
    }
  };

  const loadPreviousPage = () => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      loadExpenses(currentSearchTerm, prevPage);
    }
  };

  useEffect(() => {
    loadExpenses('', 1);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadExpenses(currentSearchTerm, 1);
  };

  const renderExpenseItem = ({ item }: { item: ExpenseRecord }) => (
    <ThemedView style={styles.expenseItem}>
      {/* Header with category and amount */}
      <View style={styles.expenseHeader}>
        <View style={styles.categoryContainer}>
          <ThemedText style={styles.categoryText}>
            {getCategoryInUrdu(item.category)}
          </ThemedText>
          <ThemedText style={styles.categoryIcon}>
            {getCategoryIcon(item.category)}
          </ThemedText>
        </View>
        <ThemedText type="defaultSemiBold" style={styles.amount}>
          PKR {item.amount.toFixed(2)}
        </ThemedText>
      </View>
      
      {/* Body - Description only */}
      {item.description && (
        <View style={styles.descriptionContainer}>
          <ThemedText style={styles.descriptionText}>
            {item.description}
          </ThemedText>
        </View>
      )}
      
      {/* Footer with payee, date, and sync status */}
      <View style={styles.expenseFooter}>
        <ThemedText style={styles.payee}>
          {item.isPersonal ? 'ذاتی' : item.payee}
        </ThemedText>
        <View style={styles.footerRight}>
          <ThemedText style={styles.date}>
            {new Date(item.date).toLocaleDateString()}
          </ThemedText>
          <View style={styles.statusSection}>
            <View style={[
              styles.statusDot,
              item.syncStatus === 'synced' ? styles.statusSynced :
              item.syncStatus === 'failed' ? styles.statusFailed :
              styles.statusPending
            ]} />
            <ThemedText style={styles.statusText}>
              {item.syncStatus === 'synced' ? 'Synced' :
               item.syncStatus === 'failed' ? 'Failed' :
               'Pending'}
            </ThemedText>
          </View>
        </View>
      </View>
    </ThemedView>
  );

  const renderPaginationControls = () => {
    const hasPrevious = currentPage > 1;
    const hasNext = hasMoreData;

    return (
      <ThemedView style={[styles.paginationContainer, { paddingBottom: 20 + insets.bottom }]}>
        <View style={styles.paginationRow}>
          <ThemedText style={styles.paginationInfo}>
            صفحہ {currentPage} • {expenses.length} ریکارڈز
            {currentSearchTerm.trim() && ` • تلاش: "${currentSearchTerm}"`}
          </ThemedText>
          <View style={styles.paginationButtons}>
            <TouchableOpacity
              style={[styles.paginationButton, !hasPrevious && styles.paginationButtonDisabled]}
              onPress={loadPreviousPage}
              disabled={!hasPrevious}
            >
              <ThemedText style={[styles.paginationButtonText, !hasPrevious && styles.paginationButtonTextDisabled]}>
                ←
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.paginationButton, !hasNext && styles.paginationButtonDisabled]}
              onPress={loadNextPage}
              disabled={!hasNext}
            >
              <ThemedText style={[styles.paginationButtonText, !hasNext && styles.paginationButtonTextDisabled]}>
                →
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedView>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F44336" />
        <ThemedText style={styles.loadingText}>خرچے لوڈ ہو رہے ہیں...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Statistics Header */}
      <ThemedView style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <ThemedView style={styles.statItem}>
            <ThemedText type="subtitle">{stats.totalExpenses}</ThemedText>
            <ThemedText style={styles.statLabel}>کل خرچے</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statItem}>
            <ThemedText type="subtitle">PKR {stats.totalAmount?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</ThemedText>
            <ThemedText style={styles.statLabel}>کل رقم</ThemedText>
          </ThemedView>
        </View>
      </ThemedView>

      {/* Search Bar */}
      <ThemedView style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="خرچے تلاش کریں..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#999"
            onSubmitEditing={performSearch}
            returnKeyType="search"
          />
        </View>
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearSearch}
          >
            <ThemedText style={styles.clearButtonText}>✕</ThemedText>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.searchButton}
          onPress={performSearch}
        >
          <ThemedText style={styles.searchButtonText}>تلاش</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* Expenses List */}
      {expenses.length === 0 ? (
        <ThemedView style={styles.emptyContainer}>
          <ThemedText type="subtitle">
            {currentSearchTerm.trim() ? 'اس تلاش کے مطابق کو خرچے نہیں' : 'ابھی تک کوئی خرچے نہیں'}
          </ThemedText>
          <ThemedText style={styles.emptyText}>
            {currentSearchTerm.trim() 
              ? 'اپنی تلاش کی شرائط کو ایڈجسٹ کرنے کی کوشش کریں۔'
              : '"خرچہ شامل کریں" بٹن کا استعمال کرتے ہوئے اپنا پہلا خرچہ شامل کرنے سے شروع کریں۔'
            }
          </ThemedText>
        </ThemedView>
      ) : (
        <>
          <FlatList
            data={expenses}
            renderItem={renderExpenseItem}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#F44336']}
              />
            }
            showsVerticalScrollIndicator={false}
          />
          
          {/* Pagination Controls */}
          {renderPaginationControls()}
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    padding: 12,
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    padding: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 4,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    color: '#666',
    marginTop: 1,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  searchButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F44336',
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 20, // Add bottom padding to ensure last items are visible
  },
  expenseItem: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  categoryText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    textAlign: 'right',
  },
  categoryIcon: {
    fontSize: 18,
    color: '#F44336',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F44336',
  },
  descriptionContainer: {
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 18,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  expenseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  payee: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textAlign: 'right',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  date: {
    fontSize: 11,
    color: '#888',
    fontWeight: '400',
    textAlign: 'right',
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusSynced: {
    backgroundColor: '#4CAF50',
  },
  statusPending: {
    backgroundColor: '#FF9800',
  },
  statusFailed: {
    backgroundColor: '#F44336',
  },
  statusText: {
    fontSize: 10,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  paginationContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paginationInfo: {
    fontSize: 14,
    color: '#666',
  },
  paginationButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  paginationButton: {
    width: 40,
    height: 40,
    backgroundColor: '#F44336',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationButtonDisabled: {
    backgroundColor: '#ccc',
  },
  paginationButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  paginationButtonTextDisabled: {
    color: '#999',
  },
  statsTextContainer: {
    flex: 1,
  },
  statsText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
}); 