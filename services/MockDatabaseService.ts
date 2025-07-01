import AsyncStorage from '@react-native-async-storage/async-storage';
import { DonationRecord, ExpenseRecord } from '../types/data';

class MockDatabaseService {
  private readonly DONATION_KEY = 'hisaab_e_khair_donations';
  private readonly EXPENSE_KEY = 'hisaab_e_khair_expenses';

  async init(): Promise<void> {
    // Mock initialization - nothing needed for AsyncStorage
  }

  async saveDonation(donation: DonationRecord): Promise<void> {
    try {
      const existingDonations = await this.getAllDonations();
      const updatedDonations = [...existingDonations, donation];
      await AsyncStorage.setItem(this.DONATION_KEY, JSON.stringify(updatedDonations));
    } catch (error) {
      console.error('Error saving donation:', error);
      throw error;
    }
  }

  async getDonations(limit = 50, offset = 0): Promise<DonationRecord[]> {
    try {
      const donations = await this.getAllDonations();
      return donations.slice(offset, offset + limit);
    } catch (error) {
      console.error('Error getting donations:', error);
      return [];
    }
  }

  async getDonationById(id: string): Promise<DonationRecord | null> {
    try {
      const donations = await this.getAllDonations();
      return donations.find(donation => donation.id === id) || null;
    } catch (error) {
      console.error('Error getting donation by ID:', error);
      return null;
    }
  }

  async getPendingSyncDonations(): Promise<DonationRecord[]> {
    try {
      const donations = await this.getAllDonations();
      return donations.filter(donation => donation.syncStatus === 'pending');
    } catch (error) {
      console.error('Error getting pending donations:', error);
      return [];
    }
  }

  async updateDonationSyncStatus(id: string, status: 'pending' | 'synced' | 'failed'): Promise<void> {
    try {
      const donations = await this.getAllDonations();
      const updatedDonations = donations.map(donation => 
        donation.id === id 
          ? { ...donation, syncStatus: status, updatedAt: new Date().toISOString() }
          : donation
      );
      await AsyncStorage.setItem(this.DONATION_KEY, JSON.stringify(updatedDonations));
    } catch (error) {
      console.error('Error updating donation sync status:', error);
      throw error;
    }
  }

  async getTotalDonations(): Promise<number> {
    try {
      const donations = await this.getAllDonations();
      return donations.length;
    } catch (error) {
      console.error('Error getting total donations:', error);
      return 0;
    }
  }

  async getTotalAmount(): Promise<number> {
    try {
      const donations = await this.getAllDonations();
      return donations.reduce((total, donation) => total + donation.amount, 0);
    } catch (error) {
      console.error('Error getting total amount:', error);
      return 0;
    }
  }

  async getPendingSyncCount(): Promise<number> {
    try {
      const pendingDonations = await this.getPendingSyncDonations();
      return pendingDonations.length;
    } catch (error) {
      console.error('Error getting pending sync count:', error);
      return 0;
    }
  }

  private async getAllDonations(): Promise<DonationRecord[]> {
    try {
      const stored = await AsyncStorage.getItem(this.DONATION_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting all donations:', error);
      return [];
    }
  }

  // Mock methods for sync queue (not implemented in mock)
  async addToSyncQueue(): Promise<void> {
    // Mock implementation - does nothing
  }

  async getSyncQueueItems(): Promise<any[]> {
    return [];
  }

  async updateSyncQueueRetry(): Promise<void> {
    // Mock implementation - does nothing
  }

  async removeFromSyncQueue(): Promise<void> {
    // Mock implementation - does nothing
  }

  // --- Expense methods ---
  async saveExpense(expense: ExpenseRecord): Promise<void> {
    try {
      const existingExpenses = await this.getAllExpenses();
      const updatedExpenses = [...existingExpenses, expense];
      await AsyncStorage.setItem(this.EXPENSE_KEY, JSON.stringify(updatedExpenses));
    } catch (error) {
      console.error('Error saving expense:', error);
      throw error;
    }
  }

  async getExpenses(limit = 50, offset = 0): Promise<ExpenseRecord[]> {
    try {
      const expenses = await this.getAllExpenses();
      return expenses.slice(offset, offset + limit);
    } catch (error) {
      console.error('Error getting expenses:', error);
      return [];
    }
  }

  async getExpenseById(id: string): Promise<ExpenseRecord | null> {
    try {
      const expenses = await this.getAllExpenses();
      return expenses.find(expense => expense.id === id) || null;
    } catch (error) {
      console.error('Error getting expense by ID:', error);
      return null;
    }
  }

  async getPendingSyncExpenses(): Promise<ExpenseRecord[]> {
    try {
      const expenses = await this.getAllExpenses();
      return expenses.filter(expense => expense.syncStatus === 'pending');
    } catch (error) {
      console.error('Error getting pending expenses:', error);
      return [];
    }
  }

  async updateExpenseSyncStatus(id: string, status: 'pending' | 'synced' | 'failed'): Promise<void> {
    try {
      const expenses = await this.getAllExpenses();
      const updatedExpenses = expenses.map(expense => 
        expense.id === id 
          ? { ...expense, syncStatus: status, updatedAt: new Date().toISOString() }
          : expense
      );
      await AsyncStorage.setItem(this.EXPENSE_KEY, JSON.stringify(updatedExpenses));
    } catch (error) {
      console.error('Error updating expense sync status:', error);
      throw error;
    }
  }

  async getTotalExpenses(): Promise<number> {
    try {
      const expenses = await this.getAllExpenses();
      return expenses.length;
    } catch (error) {
      console.error('Error getting total expenses:', error);
      return 0;
    }
  }

  async getTotalExpenseAmount(): Promise<number> {
    try {
      const expenses = await this.getAllExpenses();
      return expenses.reduce((total, expense) => total + expense.amount, 0);
    } catch (error) {
      console.error('Error getting total expense amount:', error);
      return 0;
    }
  }

  async getPendingSyncExpenseCount(): Promise<number> {
    try {
      const pendingExpenses = await this.getPendingSyncExpenses();
      return pendingExpenses.length;
    } catch (error) {
      console.error('Error getting pending sync expense count:', error);
      return 0;
    }
  }

  private async getAllExpenses(): Promise<ExpenseRecord[]> {
    try {
      const stored = await AsyncStorage.getItem(this.EXPENSE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting all expenses:', error);
      return [];
    }
  }
}

export const mockDatabaseService = new MockDatabaseService(); 