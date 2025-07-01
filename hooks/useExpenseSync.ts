import { nanoid } from 'nanoid/non-secure';
import { useCallback, useEffect, useState } from 'react';
import { databaseService } from '../services/DatabaseService';
import { ExpenseRecord } from '../types/data';

export interface ExpenseSyncStatus {
  pendingCount: number;
  totalExpenses: number;
  lastSyncAttempt: string | null;
  isConnected: boolean;
  isSyncing: boolean;
  totalAmount: number;
}

export function useExpenseSync() {
  const [syncStatus, setSyncStatus] = useState<ExpenseSyncStatus>({
    pendingCount: 0,
    totalExpenses: 0,
    lastSyncAttempt: null,
    isConnected: true, // Mock as always connected
    isSyncing: false,
    totalAmount: 0,
  });

  useEffect(() => {
    const initServices = async () => {
      try {
        await databaseService.init();
        await updateSyncStatus();
      } catch (error) {
        console.error('Error initializing expense services:', error);
      }
    };
    initServices();
  }, []);

  const updateSyncStatus = useCallback(async () => {
    try {
      const [totalExpenses, pendingCount, totalAmount] = await Promise.all([
        databaseService.getTotalExpenses(),
        databaseService.getPendingSyncExpenseCount(),
        databaseService.getTotalExpenseAmount(),
      ]);
      setSyncStatus(prev => ({
        ...prev,
        totalExpenses,
        pendingCount,
        totalAmount,
      }));
    } catch (error) {
      console.error('Error updating expense sync status:', error);
    }
  }, []);

  const saveExpense = useCallback(async (expense: Omit<ExpenseRecord, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => {
    try {
      const newExpense: ExpenseRecord = {
        ...expense,
        id: nanoid(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
      };
      await databaseService.saveExpense(newExpense);
      await updateSyncStatus();
      return newExpense;
    } catch (error) {
      console.error('Error saving expense:', error);
      throw error;
    }
  }, [updateSyncStatus]);

  const manualSync = useCallback(async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true }));
      // Mock sync - just mark all pending as synced
      const pendingExpenses = await databaseService.getPendingSyncExpenses();
      for (const expense of pendingExpenses) {
        await databaseService.updateExpenseSyncStatus(expense.id, 'synced');
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error during manual expense sync:', error);
    } finally {
      await updateSyncStatus();
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [updateSyncStatus]);

  const getExpenses = useCallback(async (limit = 50, offset = 0) => {
    try {
      return await databaseService.getExpenses(limit, offset);
    } catch (error) {
      console.error('Error getting expenses:', error);
      return [];
    }
  }, []);

  const getExpenseById = useCallback(async (id: string) => {
    try {
      return await databaseService.getExpenseById(id);
    } catch (error) {
      console.error('Error getting expense by ID:', error);
      return null;
    }
  }, []);

  const getStatistics = useCallback(async () => {
    try {
      const [totalExpenses, totalAmount, pendingCount] = await Promise.all([
        databaseService.getTotalExpenses(),
        databaseService.getTotalExpenseAmount(),
        databaseService.getPendingSyncExpenseCount(),
      ]);
      return {
        totalExpenses,
        totalAmount,
        pendingCount,
      };
    } catch (error) {
      console.error('Error getting expense statistics:', error);
      return {
        totalExpenses: 0,
        totalAmount: 0,
        pendingCount: 0,
      };
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(updateSyncStatus, 30000);
    return () => clearInterval(interval);
  }, [updateSyncStatus]);

  return {
    syncStatus,
    saveExpense,
    manualSync,
    getExpenses,
    getExpenseById,
    getStatistics,
    updateSyncStatus,
  };
} 