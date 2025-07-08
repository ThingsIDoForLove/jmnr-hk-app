import * as CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { nanoid } from 'nanoid/non-secure';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { API_BASE_URL } from '../constants/Config';
import { databaseService } from '../services/DatabaseService';
import { DonationRecord } from '../types/data';

export interface SyncStatus {
  pendingCount: number;
  totalRecords: number;
  lastSyncAttempt: string | null;
  isConnected: boolean;
  isSyncing: boolean;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export function useSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pendingCount: 0,
    totalRecords: 0,
    lastSyncAttempt: null,
    isConnected: true, // Mock as always connected
    isSyncing: false,
  });

  // Initialize services
  useEffect(() => {
    const initServices = async () => {
      try {
        await databaseService.init();
        //await syncService.init();
        // Load initial status
        await updateSyncStatus();
      } catch (error) {
        console.error('Error initializing services:', error);
      }
    };

    initServices();
  }, []);

  const updateSyncStatus = useCallback(async () => {
    try {
      const [totalDonations, pendingCount] = await Promise.all([
        databaseService.getTotalDonations(),
        databaseService.getPendingSyncCount(),
      ]);

      setSyncStatus(prev => ({
        ...prev,
        totalRecords: totalDonations,
        pendingCount,
      }));
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  }, []);

  const saveDonation = useCallback(async (donation: Omit<DonationRecord, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => {
    try {
      const newDonation: DonationRecord = {
        ...donation,
        id: nanoid(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
      };

      await databaseService.saveDonation(newDonation);
      await updateSyncStatus();
      
      return newDonation;
    } catch (error) {
      console.error('Error saving donation:', error);
      throw error;
    }
  }, [updateSyncStatus]);

  const manualSync = useCallback(async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true }));

      // 1. Get credentials
      const username = await SecureStore.getItemAsync('username');
      const signingKey = await SecureStore.getItemAsync('signingKey');
      if (!username || !signingKey) {
        Alert.alert('اکاؤنٹ ایکٹیویٹ نہیں ہے۔');
        return;
      }

      // 2. Get all pending donations
      const pendingDonations = await databaseService.getPendingSyncDonations();
      if (pendingDonations.length === 0) return;
      // 3. Chunk into batches of 100
      const batches = chunkArray(pendingDonations, 100);
      let hadError = false;
      for (const batch of batches) {
        const timestamp = new Date().toISOString();
        
        // Filter out internal fields before sending to API
        const cleanBatch = batch.map(donation => ({
          id: donation.id,
          amount: donation.amount,
          currency: donation.currency,
          benefactorName: donation.benefactorName,
          benefactorPhone: donation.benefactorPhone,
          benefactorAddress: donation.benefactorAddress,
          recipient: donation.recipient,
          category: donation.category,
          description: donation.description,
          date: donation.date,
          bookNo: donation.bookNo, // <-- add this
          receiptSerialNo: donation.receiptSerialNo, // <-- add this
        }));
        
        const batchString = JSON.stringify(cleanBatch);
        const dataToSign = batchString + timestamp + username;
        // 4. Calculate signature (HMAC-SHA256)
        const signature = CryptoJS.HmacSHA256(
          dataToSign,
          signingKey
        ).toString();

        console.log('=== DONATION SYNC DEBUG INFO ===');
        console.log('timestamp:', timestamp);
        console.log('username:', username);
        console.log('batch length:', batch.length);
        console.log('dataToSign length:', dataToSign.length);
        console.log('dataToSign preview:', dataToSign);
        console.log('signature:', signature);
        console.log('================================');

        try {
          const res = await fetch(`${API_BASE_URL}/donations/bulk-save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              donations: cleanBatch,
              timestamp,
              username,
              signature,
            }),
          });
          if (res.ok) {
            for (const donation of batch) {
              await databaseService.updateDonationSyncStatus(donation.id, 'synced');
            }
          } else {
            hadError = true;
          }
        } catch (err) {
          hadError = true;
        }
      }
      if (hadError) {
        Alert.alert('کچھ ریکارڈز ڈیٹا سنک نہیں ہو سکے۔ براہ کرم ایڈمن سے رابطہ کریں۔');
      }
    } catch (error) {
      console.error('Error during manual sync:', error);
    } finally {
      await updateSyncStatus();
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [updateSyncStatus]);

  const syncHistoricalDonations = useCallback(async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true }));

      // 1. Get credentials
      const username = await SecureStore.getItemAsync('username');
      const signingKey = await SecureStore.getItemAsync('signingKey');
      if (!username || !signingKey) {
        console.log('No credentials found for historical sync');
        return;
      }

      // 2. Get first date of current year
      const currentYear = new Date().getFullYear();
      const firstDateOfYear = new Date(currentYear, 0, 1).toISOString().split('T')[0]; // YYYY-MM-DD format

      // 3. Fetch historical donations from server
      const timestamp = new Date().toISOString();
      const dataToSign = username + firstDateOfYear + timestamp;
      const signature = CryptoJS.HmacSHA256(dataToSign, signingKey).toString();

      console.log('=== HISTORICAL DONATIONS SYNC ===');
      console.log('username:', username);
      console.log('afterDate:', firstDateOfYear);
      console.log('timestamp:', timestamp);
      console.log('signature:', signature);

      const response = await fetch(`${API_BASE_URL}/api/donations?username=${encodeURIComponent(username)}&afterDate=${encodeURIComponent(firstDateOfYear)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Timestamp': timestamp,
          'X-Signature': signature,
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch historical donations:', response.status, response.statusText);
        return;
      }

      const historicalDonations = await response.json();
      console.log('Historical donations received:', historicalDonations.length);

      // 4. Insert historical donations into local database
      let insertedCount = 0;
      for (const donation of historicalDonations) {
        try {
          // Check if donation already exists (by ID or by unique combination)
          const existingDonation = await databaseService.getDonationById(donation.id);
          if (!existingDonation) {
            // Create donation record with synced status
            const newDonation: DonationRecord = {
              id: donation.id,
              amount: donation.amount,
              currency: donation.currency,
              benefactorName: donation.benefactorName,
              benefactorPhone: donation.benefactorPhone,
              benefactorAddress: donation.benefactorAddress,
              recipient: donation.recipient,
              category: donation.category,
              description: donation.description,
              date: donation.date,
              location: donation.location,
              receiptImage: donation.receiptImage,
              createdAt: donation.createdAt || new Date().toISOString(),
              updatedAt: donation.updatedAt || new Date().toISOString(),
              syncStatus: 'synced', // Mark as already synced
            };

            await databaseService.saveDonation(newDonation);
            insertedCount++;
          }
        } catch (error) {
          console.error('Error inserting historical donation:', error);
        }
      }

      console.log(`Historical sync completed: ${insertedCount} donations inserted`);
      await updateSyncStatus();

    } catch (error) {
      console.error('Error during historical donations sync:', error);
    } finally {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [updateSyncStatus]);

  const syncHistoricalData = useCallback(async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true }));

      // 1. Get credentials
      const username = await SecureStore.getItemAsync('username');
      const signingKey = await SecureStore.getItemAsync('signingKey');
      if (!username || !signingKey) {
        console.log('No credentials found for historical data sync');
        return;
      }

      // 2. Get first date of current year
      const currentYear = new Date().getFullYear();
      const firstDateOfYear = new Date(currentYear, 0, 1).toISOString().split('T')[0]; // YYYY-MM-DD format

      console.log('=== HISTORICAL DATA SYNC STARTED ===');
      console.log('username:', username);
      console.log('afterDate:', firstDateOfYear);

      // 3. Sync donations first
      try {
        await syncHistoricalDonations();
        console.log('Historical donations sync completed successfully');
      } catch (error) {
        console.error('Historical donations sync failed:', error);
      }

      // 4. Sync expenses (we'll implement this separately)
      console.log('Historical expenses sync will be implemented separately');

      console.log('=== HISTORICAL DATA SYNC COMPLETED ===');

    } catch (error) {
      console.error('Error during historical data sync:', error);
    } finally {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [syncHistoricalDonations]);

  const getDonations = useCallback(async (limit = 50, offset = 0, searchQuery?: string) => {
    try {
      return await databaseService.getDonations(limit, offset, searchQuery);
    } catch (error) {
      console.error('Error getting donations:', error);
      return [];
    }
  }, []);

  const getDonationById = useCallback(async (id: string) => {
    try {
      return await databaseService.getDonationById(id);
    } catch (error) {
      console.error('Error getting donation by ID:', error);
      return null;
    }
  }, []);

  const getStatistics = useCallback(async () => {
    try {
      const [totalDonations, totalAmount, pendingCount] = await Promise.all([
        databaseService.getTotalDonations(),
        databaseService.getTotalAmount(),
        databaseService.getPendingSyncCount(),
      ]);

      return {
        totalDonations,
        totalAmount,
        pendingCount,
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {
        totalDonations: 0,
        totalAmount: 0,
        pendingCount: 0,
      };
    }
  }, []);

  // Refresh status periodically
  useEffect(() => {
    const interval = setInterval(updateSyncStatus, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [updateSyncStatus]);

  return {
    // State
    syncStatus,
    
    // Actions
    saveDonation,
    manualSync,
    syncHistoricalDonations,
    syncHistoricalData,
    getDonations,
    getDonationById,
    getStatistics,
    updateSyncStatus,
  };
} 