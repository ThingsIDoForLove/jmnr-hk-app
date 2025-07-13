import Bugsnag from '@bugsnag/expo';
import * as SQLite from 'expo-sqlite';
import { DonationRecord, ExpenseRecord } from '../types/data';
import { runMigrations } from './DatabaseMigrations';

class DatabaseService {
  private connectionPool: SQLite.SQLiteDatabase[] = [];
  private maxConnections = 3;
  private activeConnections = 0;
  private isRecovering = false;
  private connectionMutex = false;
  private dbInitialized = false;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    // If initialization is already in progress, wait for it
    if (this.initPromise) {
      console.log('Database initialization already in progress, waiting...');
      return this.initPromise;
    }

    // If already initialized, return immediately
    if (this.isInitialized()) {
      console.log('Database already initialized');
      return;
    }

    // Start initialization
    this.initPromise = this.performInit();
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async performInit(): Promise<void> {
    try {
      console.log('Initializing SQLite database with connection pooling...');
      
      // Clear any existing state
      this.connectionPool = [];
      this.activeConnections = 0;
      this.dbInitialized = false;
      
      // Initialize the connection pool
      await this.initializeConnectionPool();
      
      // Verify pool is properly initialized
      if (this.connectionPool.length === 0) {
        throw new Error('Connection pool initialization failed - no connections created');
      }
      
      console.log(`Connection pool ready with ${this.connectionPool.length} connections`);
      
      // Only run migrations (no more createTables)
      await this.migrateDatabase();
      
      this.dbInitialized = true;
      console.log('Database initialization completed successfully');
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
      Bugsnag.notify(error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Database initialization failed: ${error}`);
    }
  }

  private async initializeConnectionPool(): Promise<void> {
    console.log(`Initializing connection pool with ${this.maxConnections} connections...`);
    
    // Ensure we start with a clean state
    if (this.connectionPool.length > 0) {
      console.log('Clearing existing connection pool...');
      for (const connection of this.connectionPool) {
        try {
          await connection.closeAsync();
        } catch (error) {
          console.log('Error closing existing connection:', error);
        }
      }
    }
    
    this.connectionPool = [];
    this.activeConnections = 0;
    
    for (let i = 0; i < this.maxConnections; i++) {
      try {
        console.log(`Creating connection ${i + 1}/${this.maxConnections}...`);
        const connection = await SQLite.openDatabaseAsync('hisaab-e-khair.db');
        
        if (!connection) {
          throw new Error(`SQLite.openDatabaseAsync returned null for connection ${i + 1}`);
        }
        
        this.connectionPool.push(connection);
        console.log(`Connection ${i + 1} created successfully`);
      } catch (error) {
        console.error(`Failed to create connection ${i + 1}:`, error);
        Bugsnag.notify(error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    }
    
    console.log(`Connection pool initialized with ${this.connectionPool.length} connections`);
  }

  isInitialized(): boolean {
    return this.dbInitialized && this.connectionPool.length > 0;
  }

  async ensureInitialized(): Promise<void> {
    if (!this.isInitialized()) {
      console.log('Database not initialized, attempting to initialize...');
      await this.init();
      
      // Double-check initialization
      if (!this.isInitialized()) {
        throw new Error('Database initialization failed - still not initialized after init()');
      }
    }
  }

  private async acquireConnection(): Promise<SQLite.SQLiteDatabase> {
    // Wait for mutex to be available
    while (this.connectionMutex) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.connectionMutex = true;
    
    try {
      // Check if pool is initialized
      if (this.connectionPool.length === 0) {
        console.error('Connection pool is empty. Pool size:', this.connectionPool.length);
        console.error('Database initialized:', this.dbInitialized);
        console.error('Active connections:', this.activeConnections);
        throw new Error('Connection pool is empty. Database may not be properly initialized.');
      }
      
      // Wait for an available connection
      while (this.activeConnections >= this.maxConnections) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Find an available connection (not using activeConnections as index)
      const availableIndex = this.activeConnections;
      const connection = this.connectionPool[availableIndex];
      
      if (!connection) {
        console.error('Connection pool state:', {
          poolSize: this.connectionPool.length,
          activeConnections: this.activeConnections,
          availableIndex,
          maxConnections: this.maxConnections
        });
        throw new Error(`No connection available at index ${availableIndex}. Pool size: ${this.connectionPool.length}`);
      }
      
      this.activeConnections++;
      
      return connection;
    } finally {
      this.connectionMutex = false;
    }
  }

  private releaseConnection(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  private async testConnection(connection: SQLite.SQLiteDatabase): Promise<boolean> {
    try {
      if (!connection || typeof connection.getFirstAsync !== 'function') {
        console.error('Invalid connection object:', connection);
        return false;
      }
      await connection.getFirstAsync('SELECT 1 as test');
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      Bugsnag.notify(error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  private async recoverConnectionPool(): Promise<void> {
    if (this.isRecovering) {
      console.log('Database recovery already in progress...');
      return;
    }

    this.isRecovering = true;
    console.log('Starting database recovery...');

    try {
      // Close all existing connections
      for (const connection of this.connectionPool) {
        try {
          await connection.closeAsync();
        } catch (error) {
          console.log('Error closing connection during recovery:', error);
          Bugsnag.notify(error instanceof Error ? error : new Error(String(error)));
        }
      }

      // Clear the pool
      this.connectionPool = [];
      this.activeConnections = 0;

      // Wait a moment before reinitializing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reinitialize the connection pool
      await this.initializeConnectionPool();
      console.log('Database recovery completed successfully');
    } catch (error) {
      console.error('Database recovery failed:', error);
      Bugsnag.notify(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      this.isRecovering = false;
    }
  }

  private async executeWithConnection<T>(operation: (connection: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      const connection = await this.acquireConnection();
      
      try {
        // Test connection before operation
        const isConnected = await this.testConnection(connection);
        if (!isConnected) {
          console.error(`Connection test failed, attempt ${attempts + 1}/${maxAttempts}`);
          this.releaseConnection();
          await this.recoverConnectionPool();
          attempts++;
          continue;
        }

        // Execute the operation
        const result = await operation(connection);
        return result;
      } catch (error) {
        attempts++;
        console.error(`Database operation failed, attempt ${attempts}/${maxAttempts}:`, error);
        Bugsnag.notify(error instanceof Error ? error : new Error(String(error)));
        
        if (attempts >= maxAttempts) {
          console.error('Max recovery attempts reached, throwing error');
          Bugsnag.notify(error instanceof Error ? error : new Error(String(error)));
          throw error;
        }

        // Try to recover the connection pool
        try {
          await this.recoverConnectionPool();
        } catch (recoveryError) {
          console.error('Database recovery failed:', recoveryError);
          Bugsnag.notify(recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError)));
          // Wait before next attempt
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } finally {
        this.releaseConnection();
      }
    }

    throw new Error('Database operation failed after maximum recovery attempts');
  }

  // Public method to force database recovery (can be called from UI if needed)
  async forceRecovery(): Promise<void> {
    console.log('Force database recovery requested...');
    await this.recoverConnectionPool();
  }

  // Public method to completely reset the database (delete file and reinitialize)
  async resetDatabase(): Promise<void> {
    console.log('Database reset requested...');
    
    try {
      // Close all existing connections first
      for (const connection of this.connectionPool) {
        try {
          await connection.closeAsync();
        } catch (error) {
          console.log('Error closing connection during reset:', error);
        }
      }

      // Clear the pool and reset state
      this.connectionPool = [];
      this.activeConnections = 0;
      this.dbInitialized = false;
      this.isRecovering = false;
      this.connectionMutex = false;

      // Delete the database file
      const FileSystem = await import('expo-file-system');
      const dbPath = `${FileSystem.documentDirectory}SQLite/hisaab-e-khair.db`;
      
      try {
        await FileSystem.deleteAsync(dbPath);
        console.log('Database file deleted successfully');
      } catch (error) {
        console.log('Database file may not exist or could not be deleted:', error);
      }

      // Wait a moment before reinitializing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reinitialize the database
      await this.init();
      console.log('Database reset completed successfully');
    } catch (error) {
      console.error('Database reset failed:', error);
      Bugsnag.notify(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Handles database schema migrations using PRAGMA user_version.
   * Delegates to the runMigrations function in DatabaseMigrations.ts
   */
  private async migrateDatabase(): Promise<void> {
    const connection = await this.acquireConnection();
    try {
      await runMigrations(connection);
    } finally {
      this.releaseConnection();
    }
  }

  // Donation CRUD operations
  async saveDonation(donation: DonationRecord): Promise<void> {
    return this.executeWithConnection(async (connection) => {
      const query = `
        INSERT OR REPLACE INTO donations (
          id, amount, currency, benefactor_name, benefactor_phone, benefactor_address, recipient, category, description, date,
          book_no, receipt_serial_no,
          location_lat, location_lng, receipt_image,
          created_at, updated_at, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await connection.runAsync(query, [
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
        donation.bookNo || null,
        donation.receiptSerialNo !== undefined ? donation.receiptSerialNo : null,
        donation.location?.latitude || null,
        donation.location?.longitude || null,
        donation.receiptImage || null,
        donation.createdAt,
        donation.updatedAt,
        donation.syncStatus,
      ]);
    });
  }

  async getDonations(limit = 50, offset = 0, searchQuery?: string): Promise<DonationRecord[]> {
    return this.executeWithConnection(async (connection) => {
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

      const result = await connection.getAllAsync(query, params);
      return result.map(this.mapDonationFromDB);
    });
  }

  async getDonationById(id: string): Promise<DonationRecord | null> {
    return this.executeWithConnection(async (connection) => {
      const query = 'SELECT * FROM donations WHERE id = ?';
      const result = await connection.getFirstAsync(query, [id]);
      
      return result ? this.mapDonationFromDB(result) : null;
    });
  }

  async getPendingSyncDonations(): Promise<DonationRecord[]> {
    return this.executeWithConnection(async (connection) => {
      const query = 'SELECT * FROM donations WHERE sync_status = "pending" ORDER BY created_at ASC';
      const result = await connection.getAllAsync(query);
      return result.map(this.mapDonationFromDB);
    });
  }

  async updateDonationSyncStatus(id: string, status: 'pending' | 'synced' | 'failed'): Promise<void> {
    return this.executeWithConnection(async (connection) => {
      const query = `
        UPDATE donations 
        SET sync_status = ?, updated_at = ? 
        WHERE id = ?
      `;

      await connection.runAsync(query, [status, new Date().toISOString(), id]);
    });
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
      description: row.description || undefined,
      date: row.date,
      bookNo: row.book_no || undefined,
      receiptSerialNo: row.receipt_serial_no !== null && row.receipt_serial_no !== undefined ? row.receipt_serial_no : undefined,
      location: row.location_lat && row.location_lng ? {
        latitude: row.location_lat,
        longitude: row.location_lng,
      } : undefined,
      receiptImage: row.receipt_image || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: row.sync_status,
    };
  }

  // Statistics
  async getTotalDonations(): Promise<number> {
    try {
      return await this.executeWithConnection(async (connection) => {
        const result = await connection.getFirstAsync('SELECT COUNT(*) as count FROM donations') as { count: number } | null;
        return result?.count || 0;
      });
    } catch (error) {
      console.error('Error getting total donations:', error);
      Bugsnag.notify(error instanceof Error ? error : new Error(String(error)));
      return 0;
    }
  }

  async getTotalAmount(): Promise<number> {
    try {
      return await this.executeWithConnection(async (connection) => {
        const result = await connection.getFirstAsync('SELECT SUM(amount) as total FROM donations') as { total: number } | null;
        return result?.total || 0;
      });
    } catch (error) {
      console.error('Error getting total amount:', error);
      if (error instanceof Error) {
        Bugsnag.notify(error);
      } else {
        Bugsnag.notify(new Error(String(error)));
      }
      return 0;
    }
  }

  async getPendingSyncCount(): Promise<number> {
    try {
      return await this.executeWithConnection(async (connection) => {
        const result = await connection.getFirstAsync('SELECT COUNT(*) as count FROM donations WHERE sync_status = "pending"') as { count: number } | null;
        return result?.count || 0;
      });
    } catch (error) {
      console.error('Error getting pending sync count:', error);
      Bugsnag.notify(error instanceof Error ? error : new Error(String(error)));
      return 0;
    }
  }

  // Expense CRUD operations
  async saveExpense(expense: ExpenseRecord): Promise<void> {
    return this.executeWithConnection(async (connection) => {
      const query = `
        INSERT OR REPLACE INTO expenses (
          id, amount, currency, payee, category, description, date,
          is_personal, created_at, updated_at, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await connection.runAsync(query, [
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
    });
  }

  async getExpenses(limit = 50, offset = 0, searchQuery?: string): Promise<ExpenseRecord[]> {
    return this.executeWithConnection(async (connection) => {
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

      const result = await connection.getAllAsync(query, params);
      return result.map(this.mapExpenseFromDB);
    });
  }

  async getExpenseById(id: string): Promise<ExpenseRecord | null> {
    return this.executeWithConnection(async (connection) => {
      const query = 'SELECT * FROM expenses WHERE id = ?';
      const result = await connection.getFirstAsync(query, [id]);
      return result ? this.mapExpenseFromDB(result) : null;
    });
  }

  async getPendingSyncExpenses(): Promise<ExpenseRecord[]> {
    return this.executeWithConnection(async (connection) => {
      const query = 'SELECT * FROM expenses WHERE sync_status = "pending" ORDER BY created_at ASC';
      const result = await connection.getAllAsync(query);
      return result.map(this.mapExpenseFromDB);
    });
  }

  async updateExpenseSyncStatus(id: string, status: 'pending' | 'synced' | 'failed'): Promise<void> {
    return this.executeWithConnection(async (connection) => {
      const query = `
        UPDATE expenses 
        SET sync_status = ?, updated_at = ? 
        WHERE id = ?
      `;
      await connection.runAsync(query, [status, new Date().toISOString(), id]);
    });
  }

  async getTotalExpenses(): Promise<number> {
    try {
      return await this.executeWithConnection(async (connection) => {
        const result = await connection.getFirstAsync('SELECT COUNT(*) as count FROM expenses') as { count: number } | null;
        return result?.count || 0;
      });
    } catch (error) {
      console.error('Error getting total expenses:', error);
      Bugsnag.notify(error instanceof Error ? error : new Error(String(error)));
      return 0;
    }
  }

  async getTotalExpenseAmount(): Promise<number> {
    try {
      return await this.executeWithConnection(async (connection) => {
        const result = await connection.getFirstAsync('SELECT SUM(amount) as total FROM expenses') as { total: number } | null;
        return result?.total || 0;
      });
    } catch (error) {
      console.error('Error getting total expense amount:', error);
      Bugsnag.notify(error instanceof Error ? error : new Error(String(error)));
      return 0;
    }
  }

  async getPendingSyncExpenseCount(): Promise<number> {
    try {
      return await this.executeWithConnection(async (connection) => {
        const result = await connection.getFirstAsync('SELECT COUNT(*) as count FROM expenses WHERE sync_status = "pending"') as { count: number } | null;
        return result?.count || 0;
      });
    } catch (error) {
      console.error('Error getting pending sync expense count:', error);
      Bugsnag.notify(error instanceof Error ? error : new Error(String(error)));
      return 0;
    }
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
    return this.executeWithConnection(async (connection) => {
      if (donations.length === 0) return;

      // Start transaction for better performance
      await connection.execAsync('BEGIN TRANSACTION');

      try {
        const query = `
          INSERT OR REPLACE INTO donations (
            id, amount, currency, benefactor_name, benefactor_phone, benefactor_address, recipient, category, description, date,
            book_no, receipt_serial_no,
            location_lat, location_lng, receipt_image,
            created_at, updated_at, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Prepare statement for better performance
        const stmt = await connection.prepareAsync(query);

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
            donation.bookNo || null,
            donation.receiptSerialNo !== undefined ? donation.receiptSerialNo : null,
            donation.location?.latitude || null,
            donation.location?.longitude || null,
            donation.receiptImage || null,
            donation.createdAt,
            donation.updatedAt,
            donation.syncStatus,
          ]);
        }

        await stmt.finalizeAsync();
        await connection.execAsync('COMMIT');
      } catch (error) {
        await connection.execAsync('ROLLBACK');
        throw error;
      }
    });
  }

  async bulkSaveExpenses(expenses: ExpenseRecord[]): Promise<void> {
    return this.executeWithConnection(async (connection) => {
      if (expenses.length === 0) return;

      // Start transaction for better performance
      await connection.execAsync('BEGIN TRANSACTION');

      try {
        const query = `
          INSERT OR REPLACE INTO expenses (
            id, amount, currency, payee, category, description, date, is_personal,
            created_at, updated_at, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Prepare statement for better performance
        const stmt = await connection.prepareAsync(query);

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
        await connection.execAsync('COMMIT');
      } catch (error) {
        await connection.execAsync('ROLLBACK');
        throw error;
      }
    });
  }

  // Optimized bulk save with chunking for very large datasets
  async bulkSaveDonationsChunked(donations: DonationRecord[], chunkSize = 100): Promise<void> {
    return this.executeWithConnection(async (connection) => {
      if (donations.length === 0) return;

      // Start a single transaction for all chunks
      await connection.execAsync('BEGIN TRANSACTION');

      try {
        const query = `
          INSERT OR REPLACE INTO donations (
            id, amount, currency, benefactor_name, benefactor_phone, benefactor_address, recipient, category, description, date,
            book_no, receipt_serial_no,
            location_lat, location_lng, receipt_image,
            created_at, updated_at, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Prepare statement for better performance
        const stmt = await connection.prepareAsync(query);

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
              donation.bookNo || null,
              donation.receiptSerialNo !== undefined ? donation.receiptSerialNo : null,
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
        await connection.execAsync('COMMIT');
      } catch (error) {
        await connection.execAsync('ROLLBACK');
        throw error;
      }
    });
  }

  async bulkSaveExpensesChunked(expenses: ExpenseRecord[], chunkSize = 100): Promise<void> {
    return this.executeWithConnection(async (connection) => {
      if (expenses.length === 0) return;

      // Start a single transaction for all chunks
      await connection.execAsync('BEGIN TRANSACTION');

      try {
        const query = `
          INSERT OR REPLACE INTO expenses (
            id, amount, currency, payee, category, description, date, is_personal,
            created_at, updated_at, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Prepare statement for better performance
        const stmt = await connection.prepareAsync(query);

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
        await connection.execAsync('COMMIT');
      } catch (error) {
        await connection.execAsync('ROLLBACK');
        throw error;
      }
    });
  }
}

export const databaseService = new DatabaseService(); 