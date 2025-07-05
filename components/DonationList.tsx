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
import { useSync } from '../hooks/useSync';
import { DonationRecord } from '../types/data';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export function DonationList() {
  const { getDonations, getStatistics } = useSync();
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalDonations: 0, totalAmount: 0 });
  
  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const RECORDS_PER_PAGE = 30;

  const getCategoryInUrdu = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      'charity': 'خیرات',
      'zakat': 'زکٰوۃ',
      'sadaqah': 'صدقہ',
      'other': 'دیگر'
    };
    return categoryMap[category] || category;
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: string } = {
      'charity': '🤝',
      'zakat': '🕌',
      'sadaqah': '💝',
      'other': '📋'
    };
    return iconMap[category] || '📋';
  };

  const loadDonations = async (searchQuery: string = '', page: number = 1) => {
    try {
      setLoading(true);
      
      // Get donations with search and pagination from database
      const [donationData, statsData] = await Promise.all([
        getDonations(RECORDS_PER_PAGE, (page - 1) * RECORDS_PER_PAGE, searchQuery),
        getStatistics(),
      ]);
      
      setDonations(donationData);
      setStats(statsData);
      setCurrentPage(page);
      
      // Check if there are more records
      const hasMore = donationData.length === RECORDS_PER_PAGE;
      setHasMoreData(hasMore);
      
    } catch (error) {
      console.error('Error loading donations:', error);
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
    loadDonations(searchQuery, 1);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setCurrentSearchTerm('');
    loadDonations('', 1);
  };

  const loadNextPage = () => {
    if (hasMoreData) {
      const nextPage = currentPage + 1;
      loadDonations(currentSearchTerm, nextPage);
    }
  };

  const loadPreviousPage = () => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      loadDonations(currentSearchTerm, prevPage);
    }
  };

  useEffect(() => {
    loadDonations('', 1);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDonations(currentSearchTerm, 1);
  };

  const renderDonationItem = ({ item }: { item: DonationRecord }) => (
    <ThemedView style={styles.donationItem}>
      {/* Header with name and amount */}
      <View style={styles.donationHeader}>
        <ThemedText type="subtitle" style={styles.benefactorName}>
          {item.benefactorName}
        </ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.amount}>
          {item.currency} {item.amount.toFixed(2)}
        </ThemedText>
      </View>
      
      {/* Contact Information and Category */}
      <View style={styles.contactInfo}>
        <View style={styles.categoryContainer}>
          <ThemedText style={styles.categoryText}>
            {getCategoryInUrdu(item.category)}
          </ThemedText>
          <ThemedText style={styles.categoryIcon}>
            {getCategoryIcon(item.category)}
          </ThemedText>
        </View>
        <View style={styles.phoneContainer}>
          <ThemedText style={styles.phoneText}>
            {item.benefactorPhone}
          </ThemedText>
          <ThemedText style={styles.phoneIcon}>📞</ThemedText>
        </View>
      </View>
      
      {/* Address */}
      {item.benefactorAddress && (
        <View style={styles.addressContainer}>
          <View style={styles.addressWrapper}>
            <ThemedText style={styles.addressText}>
              {item.benefactorAddress}
            </ThemedText>
            <ThemedText style={styles.addressIcon}>📍</ThemedText>
          </View>
        </View>
      )}
      
      {/* Description */}
      {item.description && (
        <View style={styles.descriptionContainer}>
          <View style={styles.descriptionWrapper}>
            <ThemedText style={styles.descriptionText}>
              {item.description}
            </ThemedText>
            <ThemedText style={styles.descriptionIcon}>📝</ThemedText>
          </View>
        </View>
      )}
      
      {/* Sync Status and Date */}
      <View style={styles.syncStatus}>
        <View style={styles.statusSection}>
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
        <ThemedText style={styles.date}>
          {new Date(item.date).toLocaleDateString()}
        </ThemedText>
      </View>
    </ThemedView>
  );

  const renderPaginationControls = () => {
    // Since we're using database pagination, we can't know the total count easily
    // We'll show current page and indicate if there are more pages
    const hasPrevious = currentPage > 1;
    const hasNext = hasMoreData;

    return (
      <ThemedView style={styles.paginationContainer}>
        <ThemedText style={styles.paginationInfo}>
          صفحہ {currentPage} • {donations.length} ریکارڈز
          {currentSearchTerm.trim() && ` • تلاش: "${currentSearchTerm}"`}
        </ThemedText>
        <View style={styles.paginationButtons}>
          <TouchableOpacity
            style={[styles.paginationButton, !hasPrevious && styles.paginationButtonDisabled]}
            onPress={loadPreviousPage}
            disabled={!hasPrevious}
          >
            <ThemedText style={[styles.paginationButtonText, !hasPrevious && styles.paginationButtonTextDisabled]}>
              پچھلا
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.paginationButton, !hasNext && styles.paginationButtonDisabled]}
            onPress={loadNextPage}
            disabled={!hasNext}
          >
            <ThemedText style={[styles.paginationButtonText, !hasNext && styles.paginationButtonTextDisabled]}>
              اگلا
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={styles.loadingText}>عطیات لوڈ ہو رہے ہیں...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Statistics Header */}
      <ThemedView style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <ThemedView style={styles.statItem}>
            <ThemedText type="subtitle">{stats.totalDonations}</ThemedText>
            <ThemedText style={styles.statLabel}>کل عطیات</ThemedText>
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
            placeholder="عطیات تلاش کریں..."
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

      {/* Donations List */}
      {donations.length === 0 ? (
        <ThemedView style={styles.emptyContainer}>
          <ThemedText type="subtitle">
            {currentSearchTerm.trim() ? 'اس تلاش کے مطابق کو عطیات نہیں' : 'ابھی تک کوئی عطیات نہیں'}
          </ThemedText>
          <ThemedText style={styles.emptyText}>
            {currentSearchTerm.trim() 
              ? 'اپنی تلاش کی شرائط کو ایڈجسٹ کرنے کی کوشش کریں۔'
              : '"عطیہ شامل کریں" بٹن کا استعمال کرتے ہوئے اپنا پہلا عطیہ شامل کرنے سے شروع کریں۔'
            }
          </ThemedText>
        </ThemedView>
      ) : (
        <>
          <FlatList
            data={donations}
            renderItem={renderDonationItem}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#007AFF']}
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
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#007AFF',
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
  },
  donationItem: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  donationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  benefactorName: {
    flex: 1,
    marginRight: 8,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  contactInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  categoryText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    textAlign: 'right',
  },
  categoryIcon: {
    fontSize: 16,
    color: '#007AFF',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  phoneText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
    textAlign: 'right',
  },
  phoneIcon: {
    fontSize: 16,
    color: '#007AFF',
  },
  addressContainer: {
    marginBottom: 12,
  },
  addressWrapper: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'right',
  },
  addressIcon: {
    fontSize: 16,
    color: '#007AFF',
  },
  donationDetails: {
    marginBottom: 12,
  },
  descriptionContainer: {
    marginBottom: 12,
  },
  descriptionWrapper: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  descriptionIcon: {
    fontSize: 16,
    color: '#007AFF',
  },
  date: {
    fontSize: 12,
    color: '#888',
    fontWeight: '400',
    textAlign: 'right',
  },
  syncStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusSection: {
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
    backgroundColor: '#007AFF',
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