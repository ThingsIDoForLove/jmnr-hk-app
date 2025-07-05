import * as CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../constants/Config';
import { DonationRecord, ExpenseRecord } from '../types/data';
import { databaseService } from './DatabaseService';

export class HistoricalSyncService {
  static async syncHistoricalDonations(): Promise<number> {
    try {
      // 1. Get credentials
      const username = await SecureStore.getItemAsync('username');
      const signingKey = await SecureStore.getItemAsync('signingKey');
      if (!username || !signingKey) {
        console.log('No credentials found for historical donations sync');
        return 0;
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

      const response = await fetch(`${API_BASE_URL}/donations?username=${encodeURIComponent(username)}&afterDate=${encodeURIComponent(firstDateOfYear)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Timestamp': timestamp,
          'X-Signature': signature,
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch historical donations:', response.status, response.statusText);
        return 0;
      }

      const historicalDonations = await response.json();
      console.log('Historical donations received:', historicalDonations.length);

      // 4. Insert historical donations into local database
      let insertedCount = 0;
      
      if (historicalDonations.length > 0) {
        try {
          // Convert API data to DonationRecord format
          const donationRecords: DonationRecord[] = historicalDonations.map((donation: any) => ({
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
          }));

          // Use bulk save for better performance
          await databaseService.bulkSaveDonationsChunked(donationRecords, 50);
          insertedCount = donationRecords.length;
        } catch (error) {
          console.error('Error bulk inserting historical donations:', error);
          // Fallback to individual inserts if bulk fails
          for (const donation of historicalDonations) {
            try {
              const existingDonation = await databaseService.getDonationById(donation.id);
              if (!existingDonation) {
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
        }
      }

      console.log(`Historical donations sync completed: ${insertedCount} donations inserted`);
      return insertedCount;

    } catch (error) {
      console.error('Error during historical donations sync:', error);
      return 0;
    }
  }

  static async syncHistoricalExpenses(): Promise<number> {
    try {
      // 1. Get credentials
      const username = await SecureStore.getItemAsync('username');
      const signingKey = await SecureStore.getItemAsync('signingKey');
      if (!username || !signingKey) {
        console.log('No credentials found for historical expenses sync');
        return 0;
      }

      // 2. Get first date of current year
      const currentYear = new Date().getFullYear();
      const firstDateOfYear = new Date(currentYear, 0, 1).toISOString().split('T')[0]; // YYYY-MM-DD format

      // 3. Fetch historical expenses from server
      const timestamp = new Date().toISOString();
      const dataToSign = username + firstDateOfYear + timestamp;
      const signature = CryptoJS.HmacSHA256(dataToSign, signingKey).toString();

      console.log('=== HISTORICAL EXPENSES SYNC ===');
      console.log('username:', username);
      console.log('afterDate:', firstDateOfYear);
      console.log('timestamp:', timestamp);
      console.log('signature:', signature);

      const response = await fetch(`${API_BASE_URL}/expenses?username=${encodeURIComponent(username)}&afterDate=${encodeURIComponent(firstDateOfYear)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Timestamp': timestamp,
          'X-Signature': signature,
        },
      });

      if (!response.ok) {
        
        console.error('Failed to fetch historical expenses:', response.status, response.statusText);
        return 0;
      }

      const historicalExpenses = await response.json();
      console.log('Historical expenses received:', historicalExpenses.length);

      // 4. Insert historical expenses into local database
      let insertedCount = 0;
      
      if (historicalExpenses.length > 0) {
        try {
          // Convert API data to ExpenseRecord format
          const expenseRecords: ExpenseRecord[] = historicalExpenses.map((expense: any) => ({
            id: expense.id,
            amount: expense.amount,
            currency: expense.currency,
            payee: expense.payee,
            category: expense.category,
            description: expense.description,
            date: expense.date,
            isPersonal: expense.isPersonal,
            createdAt: expense.createdAt || new Date().toISOString(),
            updatedAt: expense.updatedAt || new Date().toISOString(),
            syncStatus: 'synced', // Mark as already synced
          }));

          // Use bulk save for better performance
          await databaseService.bulkSaveExpensesChunked(expenseRecords, 50);
          insertedCount = expenseRecords.length;
        } catch (error) {
          console.error('Error bulk inserting historical expenses:', error);
          // Fallback to individual inserts if bulk fails
          for (const expense of historicalExpenses) {
            try {
              const existingExpense = await databaseService.getExpenseById(expense.id);
              if (!existingExpense) {
                const newExpense: ExpenseRecord = {
                  id: expense.id,
                  amount: expense.amount,
                  currency: expense.currency,
                  payee: expense.payee,
                  category: expense.category,
                  description: expense.description,
                  date: expense.date,
                  isPersonal: expense.isPersonal,
                  createdAt: expense.createdAt || new Date().toISOString(),
                  updatedAt: expense.updatedAt || new Date().toISOString(),
                  syncStatus: 'synced', // Mark as already synced
                };

                await databaseService.saveExpense(newExpense);
                insertedCount++;
              }
            } catch (error) {
              console.error('Error inserting historical expense:', error);
            }
          }
        }
      }

      console.log(`Historical expenses sync completed: ${insertedCount} expenses inserted`);
      return insertedCount;

    } catch (error) {
      console.error('Error during historical expenses sync:', error);
      return 0;
    }
  }

  static async syncAllHistoricalData(): Promise<{ donations: number; expenses: number }> {
    console.log('=== HISTORICAL DATA SYNC STARTED ===');
    
    // Run sequentially to avoid transaction conflicts
    const donationsCount = await this.syncHistoricalDonations();
    const expensesCount = await this.syncHistoricalExpenses();

    console.log(`=== HISTORICAL DATA SYNC COMPLETED ===`);
    console.log(`Donations: ${donationsCount}, Expenses: ${expensesCount}`);
    
    return { donations: donationsCount, expenses: expensesCount };
  }
} 