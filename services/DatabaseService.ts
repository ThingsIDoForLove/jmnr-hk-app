import * as SQLite from 'expo-sqlite';
import { DonationRecord, ExpenseRecord } from '../types/data';

class DatabaseService {
  private connectionPool: SQLite.SQLiteDatabase[] = [];
  private maxConnections = 3;
  private activeConnections = 0;
  private isRecovering = false;
  private connectionMutex = false;
  private dbInitialized = false;

  async init(): Promise<void> {
    try {
      console.log('Initializing SQLite database with connection pooling...');
      
      // Initialize the connection pool
      await this.initializeConnectionPool();
      
      // Run migrations and create tables on the first connection
      await this.migrateDatabase();
      await this.createTables();
      
      this.dbInitialized = true;
      console.log('Database initialization completed successfully');
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
      throw new Error(`Database initialization failed: ${error}`);
    }
  }

  private async initializeConnectionPool(): Promise<void> {
    for (let i = 0; i < this.maxConnections; i++) {
      try {
        const connection = await SQLite.openDatabaseAsync('hisaab-e-khair.db');
        this.connectionPool.push(connection);
      } catch (error) {
        console.error(`Failed to create connection ${i + 1}:`, error);
        throw error;
      }
    }
  }

  isInitialized(): boolean {
    return this.dbInitialized && this.connectionPool.length > 0;
  }

  async ensureInitialized(): Promise<void> {
    if (!this.isInitialized()) {
      console.log('Database not initialized, attempting to initialize...');
      await this.init();
    }
  }

  private async acquireConnection(): Promise<SQLite.SQLiteDatabase> {
    // Wait for mutex to be available
    while (this.connectionMutex) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.connectionMutex = true;
    
    try {
      // Wait for an available connection
      while (this.activeConnections >= this.maxConnections) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const connection = this.connectionPool[this.activeConnections];
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
      await connection.getFirstAsync('SELECT 1 as test');
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
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
        
        if (attempts >= maxAttempts) {
          console.error('Max recovery attempts reached, throwing error');
          throw error;
        }

        // Try to recover the connection pool
        try {
          await this.recoverConnectionPool();
        } catch (recoveryError) {
          console.error('Database recovery failed:', recoveryError);
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

  /**
   * Handles database schema migrations using PRAGMA user_version.
   * Add migration steps as you increment the schema version.
   */
  private async migrateDatabase(): Promise<void> {
    const connection = await this.acquireConnection();
    try {
      const pragmaResult = await connection.getAllAsync('PRAGMA user_version;') as any[];
      let version = (pragmaResult && pragmaResult.length > 0 && typeof pragmaResult[0].user_version === 'number')
        ? pragmaResult[0].user_version
        : 0;

      // Add more migrations as needed
    } finally {
      this.releaseConnection();
    }
  }

  private async createTables(): Promise<void> {
    const connection = await this.acquireConnection();
    try {
      console.log('Creating tables...');

      // Create donations table
      await connection.execAsync(`
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
      await connection.execAsync(`
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
      await connection.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_donations_sync_status ON donations (sync_status);
        CREATE INDEX IF NOT EXISTS idx_donations_date ON donations (date);
      `);
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
          location_lat, location_lng, receipt_image,
          created_at, updated_at, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            location_lat, location_lng, receipt_image,
            created_at, updated_at, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            location_lat, location_lng, receipt_image,
            created_at, updated_at, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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