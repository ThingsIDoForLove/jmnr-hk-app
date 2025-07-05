import * as SQLite from 'expo-sqlite';
import { DonationRecord, ExpenseRecord } from '../types/data';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async init(): Promise<void> {
    try {
      console.log('Initializing SQLite database...');
      this.db = await SQLite.openDatabaseAsync('hisaab-e-khair.db');
      console.log('SQLite database opened successfully');
      
      await this.migrateDatabase();
      await this.createTables();
      console.log('Database initialization completed successfully');
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
      throw new Error(`Database initialization failed: ${error}`);
    }
  }

  /**
   * Handles database schema migrations using PRAGMA user_version.
   * Add migration steps as you increment the schema version.
   */
  private async migrateDatabase(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const pragmaResult = await this.db.getAllAsync('PRAGMA user_version;') as any[];
    let version = (pragmaResult && pragmaResult.length > 0 && typeof pragmaResult[0].user_version === 'number')
      ? pragmaResult[0].user_version
      : 0;

    // --- Migration to version 1: Add phone column ---
    // if (version < 1) {
    //   // Check if phone column exists
    //   const columns = await this.db.getAllAsync("PRAGMA table_info(donations);") as any[];
    //   const hasPhone = columns.some(col => col.name === 'phone');
    //   if (!hasPhone) {
    //     await this.db.execAsync('ALTER TABLE donations ADD COLUMN phone TEXT;');
    //   }
    //   await this.db.execAsync('PRAGMA user_version = 1;');
    //   version = 1;
    // }

    // Add more migrations as needed
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    console.log('Creating tables ....');
    // Drop tables if they exist , remove this after first version
    // await this.db.execAsync('DROP TABLE IF EXISTS donations');
    // await this.db.execAsync('DROP TABLE IF EXISTS expenses');

    // Create donations table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS donations (
        id TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        benefactor_name TEXT NOT NULL,
        benefactor_phone TEXT NOT NULL,
        benefactor_address TEXT,
        recipient TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        location_lat REAL,
        location_lng REAL,
        receipt_image TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pending'
      );
    `);

    // Create expenses table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        payee TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        is_personal INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pending'
      );
    `);

    // Create indexes for better performance
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_donations_sync_status ON donations (sync_status);
      CREATE INDEX IF NOT EXISTS idx_donations_date ON donations (date);
    `);
  }

  // Donation CRUD operations
  async saveDonation(donation: DonationRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const query = `
      INSERT OR REPLACE INTO donations (
        id, amount, currency, benefactor_name, benefactor_phone, benefactor_address, recipient, category, description, date,
        location_lat, location_lng, receipt_image,
        created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.runAsync(query, [
      donation.id,
      donation.amount,
      donation.currency,
      donation.benefactorName,
      donation.benefactorPhone,
      donation.benefactorAddress || null,
      donation.recipient,
      donation.category,
      donation.description || null,
      donation.date,
      donation.location?.latitude || null,
      donation.location?.longitude || null,
      donation.receiptImage || null,
      donation.createdAt,
      donation.updatedAt,
      donation.syncStatus,
    ]);
  }

  async getDonations(limit = 50, offset = 0, searchQuery?: string): Promise<DonationRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query: string;
    let params: any[];

    if (searchQuery && searchQuery.trim()) {
      const searchTerm = `%${searchQuery.trim()}%`;
      query = `
        SELECT * FROM donations 
        WHERE benefactor_name LIKE ? 
           OR benefactor_phone LIKE ? 
           OR benefactor_address LIKE ? 
           OR category LIKE ? 
           OR description LIKE ? 
           OR amount LIKE ?
        ORDER BY date DESC 
        LIMIT ? OFFSET ?
      `;
      params = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, limit, offset];
    } else {
      query = `
        SELECT * FROM donations 
        ORDER BY date DESC 
        LIMIT ? OFFSET ?
      `;
      params = [limit, offset];
    }

    const result = await this.db.getAllAsync(query, params);
    return result.map(this.mapDonationFromDB);
  }

  async getDonationById(id: string): Promise<DonationRecord | null> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM donations WHERE id = ?';
    const result = await this.db.getFirstAsync(query, [id]);
    
    return result ? this.mapDonationFromDB(result) : null;
  }

  async getPendingSyncDonations(): Promise<DonationRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM donations WHERE sync_status = "pending" ORDER BY created_at ASC';
    const result = await this.db.getAllAsync(query);
    return result.map(this.mapDonationFromDB);
  }

  async updateDonationSyncStatus(id: string, status: 'pending' | 'synced' | 'failed'): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      UPDATE donations 
      SET sync_status = ?, updated_at = ? 
      WHERE id = ?
    `;

    await this.db.runAsync(query, [status, new Date().toISOString(), id]);
  }

  // Helper methods
  private mapDonationFromDB(row: any): DonationRecord {
    return {
      id: row.id,
      amount: row.amount,
      currency: row.currency,
      benefactorName: row.benefactor_name,
      benefactorPhone: row.benefactor_phone,
      benefactorAddress: row.benefactor_address || undefined,
      recipient: row.recipient,
      category: row.category,
      description: row.description,
      date: row.date,
      location: row.location_lat && row.location_lng ? {
        latitude: row.location_lat,
        longitude: row.location_lng,
      } : undefined,
      receiptImage: row.receipt_image,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: row.sync_status,
    };
  }

  // Statistics
  async getTotalDonations(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM donations') as { count: number } | null;
    return result?.count || 0;
  }

  async getTotalAmount(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync('SELECT SUM(amount) as total FROM donations') as { total: number } | null;
    return result?.total || 0;
  }

  async getPendingSyncCount(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM donations WHERE sync_status = "pending"') as { count: number } | null;
    return result?.count || 0;
  }

  // Expense CRUD operations
  async saveExpense(expense: ExpenseRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const query = `
      INSERT OR REPLACE INTO expenses (
        id, amount, currency, payee, category, description, date,
        is_personal, created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await this.db.runAsync(query, [
      expense.id,
      expense.amount,
      expense.currency,
      expense.payee,
      expense.category,
      expense.description || null,
      expense.date,
      expense.isPersonal ? 1 : 0,
      expense.createdAt,
      expense.updatedAt,
      expense.syncStatus,
    ]);
  }

  async getExpenses(limit = 50, offset = 0, searchQuery?: string): Promise<ExpenseRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query: string;
    let params: any[];

    if (searchQuery && searchQuery.trim()) {
      const searchTerm = `%${searchQuery.trim()}%`;
      query = `
        SELECT * FROM expenses 
        WHERE payee LIKE ? 
           OR category LIKE ? 
           OR description LIKE ? 
           OR amount LIKE ?
        ORDER BY date DESC 
        LIMIT ? OFFSET ?
      `;
      params = [searchTerm, searchTerm, searchTerm, searchTerm, limit, offset];
    } else {
      query = `
        SELECT * FROM expenses 
        ORDER BY date DESC 
        LIMIT ? OFFSET ?
      `;
      params = [limit, offset];
    }

    const result = await this.db.getAllAsync(query, params);
    return result.map(this.mapExpenseFromDB);
  }

  async getExpenseById(id: string): Promise<ExpenseRecord | null> {
    if (!this.db) throw new Error('Database not initialized');
    const query = 'SELECT * FROM expenses WHERE id = ?';
    const result = await this.db.getFirstAsync(query, [id]);
    return result ? this.mapExpenseFromDB(result) : null;
  }

  async getPendingSyncExpenses(): Promise<ExpenseRecord[]> {
    if (!this.db) throw new Error('Database not initialized');
    const query = 'SELECT * FROM expenses WHERE sync_status = "pending" ORDER BY created_at ASC';
    const result = await this.db.getAllAsync(query);
    return result.map(this.mapExpenseFromDB);
  }

  async updateExpenseSyncStatus(id: string, status: 'pending' | 'synced' | 'failed'): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const query = `
      UPDATE expenses 
      SET sync_status = ?, updated_at = ? 
      WHERE id = ?
    `;
    await this.db.runAsync(query, [status, new Date().toISOString(), id]);
  }

  async getTotalExpenses(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM expenses') as { count: number } | null;
    return result?.count || 0;
  }

  async getTotalExpenseAmount(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.getFirstAsync('SELECT SUM(amount) as total FROM expenses') as { total: number } | null;
    return result?.total || 0;
  }

  async getPendingSyncExpenseCount(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM expenses WHERE sync_status = "pending"') as { count: number } | null;
    return result?.count || 0;
  }

  private mapExpenseFromDB(row: any): ExpenseRecord {
    return {
      id: row.id,
      amount: row.amount,
      currency: row.currency,
      payee: row.payee,
      category: row.category,
      description: row.description,
      date: row.date,
      isPersonal: Boolean(row.is_personal),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: row.sync_status,
    };
  }

  // Bulk operations for better performance
  async bulkSaveDonations(donations: DonationRecord[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    if (donations.length === 0) return;

    // Start transaction for better performance
    await this.db.execAsync('BEGIN TRANSACTION');

    try {
      const query = `
        INSERT OR REPLACE INTO donations (
          id, amount, currency, benefactor_name, benefactor_phone, benefactor_address, recipient, category, description, date,
          location_lat, location_lng, receipt_image,
          created_at, updated_at, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Prepare statement for better performance
      const stmt = await this.db.prepareAsync(query);

      for (const donation of donations) {
        await stmt.executeAsync([
          donation.id,
          donation.amount,
          donation.currency,
          donation.benefactorName,
          donation.benefactorPhone,
          donation.benefactorAddress || null,
          donation.recipient,
          donation.category,
          donation.description || null,
          donation.date,
          donation.location?.latitude || null,
          donation.location?.longitude || null,
          donation.receiptImage || null,
          donation.createdAt,
          donation.updatedAt,
          donation.syncStatus,
        ]);
      }

      await stmt.finalizeAsync();
      await this.db.execAsync('COMMIT');
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      throw error;
    }
  }

  async bulkSaveExpenses(expenses: ExpenseRecord[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    if (expenses.length === 0) return;

    // Start transaction for better performance
    await this.db.execAsync('BEGIN TRANSACTION');

    try {
      const query = `
        INSERT OR REPLACE INTO expenses (
          id, amount, currency, payee, category, description, date, is_personal,
          created_at, updated_at, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Prepare statement for better performance
      const stmt = await this.db.prepareAsync(query);

      for (const expense of expenses) {
        await stmt.executeAsync([
          expense.id,
          expense.amount,
          expense.currency,
          expense.payee,
          expense.category,
          expense.description || null,
          expense.date,
          expense.isPersonal ? 1 : 0,
          expense.createdAt,
          expense.updatedAt,
          expense.syncStatus,
        ]);
      }

      await stmt.finalizeAsync();
      await this.db.execAsync('COMMIT');
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      throw error;
    }
  }

  // Optimized bulk save with chunking for very large datasets
  async bulkSaveDonationsChunked(donations: DonationRecord[], chunkSize = 100): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    if (donations.length === 0) return;

    // Start a single transaction for all chunks
    await this.db.execAsync('BEGIN TRANSACTION');

    try {
      const query = `
        INSERT OR REPLACE INTO donations (
          id, amount, currency, benefactor_name, benefactor_phone, benefactor_address, recipient, category, description, date,
          location_lat, location_lng, receipt_image,
          created_at, updated_at, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Prepare statement for better performance
      const stmt = await this.db.prepareAsync(query);

      // Process in chunks to avoid memory issues
      for (let i = 0; i < donations.length; i += chunkSize) {
        const chunk = donations.slice(i, i + chunkSize);
        
        for (const donation of chunk) {
          await stmt.executeAsync([
            donation.id,
            donation.amount,
            donation.currency,
            donation.benefactorName,
            donation.benefactorPhone,
            donation.benefactorAddress || null,
            donation.recipient,
            donation.category,
            donation.description || null,
            donation.date,
            donation.location?.latitude || null,
            donation.location?.longitude || null,
            donation.receiptImage || null,
            donation.createdAt,
            donation.updatedAt,
            donation.syncStatus,
          ]);
        }
      }

      await stmt.finalizeAsync();
      await this.db.execAsync('COMMIT');
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      throw error;
    }
  }

  async bulkSaveExpensesChunked(expenses: ExpenseRecord[], chunkSize = 100): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    if (expenses.length === 0) return;

    // Start a single transaction for all chunks
    await this.db.execAsync('BEGIN TRANSACTION');

    try {
      const query = `
        INSERT OR REPLACE INTO expenses (
          id, amount, currency, payee, category, description, date, is_personal,
          created_at, updated_at, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Prepare statement for better performance
      const stmt = await this.db.prepareAsync(query);

      // Process in chunks to avoid memory issues
      for (let i = 0; i < expenses.length; i += chunkSize) {
        const chunk = expenses.slice(i, i + chunkSize);
        
        for (const expense of chunk) {
          await stmt.executeAsync([
            expense.id,
            expense.amount,
            expense.currency,
            expense.payee,
            expense.category,
            expense.description || null,
            expense.date,
            expense.isPersonal ? 1 : 0,
            expense.createdAt,
            expense.updatedAt,
            expense.syncStatus,
          ]);
        }
      }

      await stmt.finalizeAsync();
      await this.db.execAsync('COMMIT');
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      throw error;
    }
  }
}

export const databaseService = new DatabaseService(); 