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
import { useExpenseSync } from '../hooks/useExpenseSync';
import { ExpenseRecord } from '../types/data';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export function ExpenseList() {
  const { getExpenses, getStatistics } = useExpenseSync();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [allExpenses, setAllExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalExpenses: 0, totalAmount: 0 });
  
  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const RECORDS_PER_PAGE = 30;

  const loadExpenses = async () => {
    try {
      const [expenseData, statsData] = await Promise.all([
        getExpenses(1000, 0), // Get all expenses for search
        getStatistics(),
      ]);
      setAllExpenses(expenseData);
      setStats(statsData);
      applySearchAndPagination(expenseData, searchQuery, 1);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applySearchAndPagination = (data: ExpenseRecord[], query: string, page: number) => {
    // Filter by search query
    let filteredData = data;
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filteredData = data.filter(expense => 
        expense.payee.toLowerCase().includes(lowerQuery) ||
        expense.category.toLowerCase().includes(lowerQuery) ||
        expense.description?.toLowerCase().includes(lowerQuery) ||
        expense.currency.toLowerCase().includes(lowerQuery) ||
        expense.amount.toString().includes(lowerQuery)
      );
    }

    // Apply pagination
    const startIndex = (page - 1) * RECORDS_PER_PAGE;
    const endIndex = startIndex + RECORDS_PER_PAGE;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    
    setExpenses(paginatedData);
    setHasMoreData(endIndex < filteredData.length);
    setCurrentPage(page);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applySearchAndPagination(allExpenses, query, 1);
  };

  const loadNextPage = () => {
    if (hasMoreData) {
      const nextPage = currentPage + 1;
      applySearchAndPagination(allExpenses, searchQuery, nextPage);
    }
  };

  const loadPreviousPage = () => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      applySearchAndPagination(allExpenses, searchQuery, prevPage);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadExpenses();
  };

  const renderExpenseItem = ({ item }: { item: ExpenseRecord }) => (
    <ThemedView style={styles.expenseItem}>
      <View style={styles.expenseHeader}>
        <ThemedText type="subtitle" style={styles.payee}>
          {item.isPersonal ? 'Personal' : item.payee}
        </ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.amount}>
          {item.currency} {item.amount.toFixed(2)}
        </ThemedText>
      </View>
      
      <View style={styles.expenseDetails}>
        <ThemedText style={styles.category}>
          {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
        </ThemedText>
        <ThemedText style={styles.date}>
          {new Date(item.date).toLocaleDateString()}
        </ThemedText>
      </View>
      
      {item.description && (
        <ThemedText style={styles.description}>{item.description}</ThemedText>
      )}
      
      <View style={styles.syncStatus}>
        <View style={[
          styles.statusDot,
          item.syncStatus === 'synced' ? styles.statusSynced :
          item.syncStatus === 'failed' ? styles.statusFailed :
          styles.statusPending
        ]} />
        <ThemedText style={styles.statusText}>
          {item.syncStatus === 'synced' ? 'Synced' :
           item.syncStatus === 'failed' ? 'Sync Failed' :
           'Pending Sync'}
        </ThemedText>
      </View>
    </ThemedView>
  );

  const renderPaginationControls = () => {
    const totalPages = Math.ceil(allExpenses.length / RECORDS_PER_PAGE);
    const filteredCount = searchQuery.trim() 
      ? allExpenses.filter(e => 
          e.payee.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.currency.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.amount.toString().includes(searchQuery)
        ).length 
      : allExpenses.length;
    const filteredPages = Math.ceil(filteredCount / RECORDS_PER_PAGE);

    return (
      <ThemedView style={styles.paginationContainer}>
        <ThemedText style={styles.paginationInfo}>
          Page {currentPage} of {filteredPages} • {filteredCount} records
        </ThemedText>
        <View style={styles.paginationButtons}>
          <TouchableOpacity
            style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
            onPress={loadPreviousPage}
            disabled={currentPage === 1}
          >
            <ThemedText style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>
              Previous
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.paginationButton, !hasMoreData && styles.paginationButtonDisabled]}
            onPress={loadNextPage}
            disabled={!hasMoreData}
          >
            <ThemedText style={[styles.paginationButtonText, !hasMoreData && styles.paginationButtonTextDisabled]}>
              Next
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F44336" />
        <ThemedText style={styles.loadingText}>Loading expenses...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Statistics Header */}
      <ThemedView style={styles.statsContainer}>
        <ThemedText type="title">Your Expenses</ThemedText>
        <View style={styles.statsRow}>
          <ThemedView style={styles.statItem}>
            <ThemedText type="subtitle">{stats.totalExpenses}</ThemedText>
            <ThemedText style={styles.statLabel}>Total Expenses</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statItem}>
            <ThemedText type="subtitle">${stats.totalAmount.toFixed(2)}</ThemedText>
            <ThemedText style={styles.statLabel}>Total Amount</ThemedText>
          </ThemedView>
        </View>
      </ThemedView>

      {/* Search Bar */}
      <ThemedView style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search expenses..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => handleSearch('')}
          >
            <ThemedText style={styles.clearButtonText}>✕</ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>

      {/* Expenses List */}
      {expenses.length === 0 ? (
        <ThemedView style={styles.emptyContainer}>
          <ThemedText type="subtitle">
            {searchQuery.trim() ? 'No matching expenses' : 'No expenses yet'}
          </ThemedText>
          <ThemedText style={styles.emptyText}>
            {searchQuery.trim() 
              ? 'Try adjusting your search terms.'
              : 'Start by adding your first expense using the "Add Expense" button.'
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
    padding: 20,
    gap: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginTop: 16,
  },
  clearButton: {
    position: 'absolute',
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
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
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  payee: {
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 18,
    color: '#F44336',
  },
  expenseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  category: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  description: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    fontSize: 12,
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
  paginationInfo: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  paginationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  paginationButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F44336',
    borderRadius: 8,
    alignItems: 'center',
  },
  paginationButtonDisabled: {
    backgroundColor: '#ccc',
  },
  paginationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  paginationButtonTextDisabled: {
    color: '#999',
  },
}); 