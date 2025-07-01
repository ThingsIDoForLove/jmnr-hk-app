import { nanoid } from 'nanoid/non-secure';
import { useCallback, useEffect, useState } from 'react';
import { databaseService } from '../services/DatabaseService';
import { DonationRecord } from '../types/data';

export interface SyncStatus {
  pendingCount: number;
  totalRecords: number;
  lastSyncAttempt: string | null;
  isConnected: boolean;
  isSyncing: boolean;
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
      
      // Mock sync - just mark all pending as synced
      const pendingDonations = await databaseService.getPendingSyncDonations();
      for (const donation of pendingDonations) {
        await databaseService.updateDonationSyncStatus(donation.id, 'synced');
      }
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Error during manual sync:', error);
    } finally {
      await updateSyncStatus();
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [updateSyncStatus]);

  const getDonations = useCallback(async (limit = 50, offset = 0) => {
    try {
      return await databaseService.getDonations(limit, offset);
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
    getDonations,
    getDonationById,
    getStatistics,
    updateSyncStatus,
  };
} 