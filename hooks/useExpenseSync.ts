import * as CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { nanoid } from 'nanoid/non-secure';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { API_BASE_URL } from '../constants/Config';
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

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
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
      // 1. Get credentials
      const username = await SecureStore.getItemAsync('username');
      const signingKey = await SecureStore.getItemAsync('signingKey');
      if (!username || !signingKey) {
        Alert.alert('اکاؤنٹ ایکٹیویٹ نہیں ہے۔');
        return;
      }
      // 2. Get all pending expenses
      const pendingExpenses = await databaseService.getPendingSyncExpenses();
      if (pendingExpenses.length === 0) return;
      // 3. Chunk into batches of 100
      const batches = chunkArray(pendingExpenses, 100);
      let hadError = false;
      for (const batch of batches) {
        const timestamp = new Date().toISOString();
        
        // Filter out internal fields before sending to API
        const cleanBatch = batch.map(expense => ({
          id: expense.id,
          amount: expense.amount,
          currency: expense.currency,
          payee: expense.payee,
          category: expense.category,
          description: expense.description,
          date: expense.date,
          isPersonal: expense.isPersonal,
        }));
        
        const batchString = JSON.stringify(cleanBatch);
        const dataToSign = batchString + timestamp + username;
        // 4. Calculate signature (HMAC-SHA256)
        const signature = CryptoJS.HmacSHA256(
          dataToSign,
          signingKey
        ).toString();

        try {

          const body = {
            expenses: cleanBatch,
            timestamp,
            username,
            signature,
          };

          console.log('Expense Sync Body', body);
          const res = await fetch(`${API_BASE_URL}/expenses/bulk-save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (res.ok) {
            for (const expense of batch) {
              await databaseService.updateExpenseSyncStatus(expense.id, 'synced');
            }
          } else {
            hadError = true;
          }
        } catch (err) {
          hadError = true;
        }
      }
      if (hadError) {
        Alert.alert('کچھ اخراجات ڈیٹا سنک نہیں ہو سکے۔ براہ کرم ایڈمن سے رابطہ کریں۔');
      }
    } catch (error) {
      console.error('Error during manual expense sync:', error);
    } finally {
      await updateSyncStatus();
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [updateSyncStatus]);



  const getExpenses = useCallback(async (limit = 50, offset = 0, searchQuery?: string) => {
    try {
      return await databaseService.getExpenses(limit, offset, searchQuery);
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