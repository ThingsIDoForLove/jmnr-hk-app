import Bugsnag from '@bugsnag/expo';
import * as SQLite from 'expo-sqlite';

export async function runMigrations(connection: SQLite.SQLiteDatabase) {
  console.log('Starting database migrations...');
  
  try {
    // Create migrations table if it doesn't exist
    await connection.execAsync(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        executed_at TEXT NOT NULL
      );
    `);

    // Get all existing migrations for debugging
    const existingMigrations = await connection.getAllAsync('SELECT name FROM migrations ORDER BY name') as any[];
    console.log('Existing migrations:', existingMigrations.map(m => m.name));

    // Define all migrations in order
    const migrations = [
      {
        name: '001_create_initial_tables',
        execute: async () => {
          console.log('Executing: Create initial tables');
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
        }
      },
      {
        name: '002_add_book_no_and_receipt_serial_no',
        execute: async () => {
          console.log('Executing: Add book_no and receipt_serial_no columns');
          // Check if donations table exists first
          const tables = await connection.getAllAsync("SELECT name FROM sqlite_master WHERE type='table' AND name='donations';") as any[];
          if (tables.length > 0) {
            // Check if book_no column exists
            const tableInfo = await connection.getAllAsync("PRAGMA table_info(donations);") as any[];
            const hasBookNo = tableInfo.some(col => col.name === 'book_no');
            const hasReceiptSerialNo = tableInfo.some(col => col.name === 'receipt_serial_no');

            console.log('Table info for donations:', tableInfo.map(col => col.name));
            console.log('Has book_no:', hasBookNo, 'Has receipt_serial_no:', hasReceiptSerialNo);

            if (!hasBookNo) {
              console.log('Adding book_no column...');
              await connection.execAsync('ALTER TABLE donations ADD COLUMN book_no TEXT;');
            }
            if (!hasReceiptSerialNo) {
              console.log('Adding receipt_serial_no column...');
              await connection.execAsync('ALTER TABLE donations ADD COLUMN receipt_serial_no INTEGER;');
            }
          } else {
            console.log('Donations table does not exist, skipping column additions');
          }
        }
      }
    ];

    // Run each migration if it hasn't been executed yet
    for (const migration of migrations) {
      try {
        console.log(`Checking migration: ${migration.name}`);
        
        // Double-check if migration already exists
        const existingMigration = await connection.getFirstAsync(
          'SELECT name FROM migrations WHERE name = ?',
          [migration.name]
        ) as { name: string } | null;

        if (!existingMigration) {
          console.log(`Running migration: ${migration.name}`);
          
          // Execute the migration
          await migration.execute();
          
          // Use INSERT OR IGNORE to prevent UNIQUE constraint violations
          const result = await connection.runAsync(
            'INSERT OR IGNORE INTO migrations (name, executed_at) VALUES (?, ?)',
            [migration.name, new Date().toISOString()]
          );
          
          console.log(`Migration ${migration.name} completed successfully`);
        } else {
          console.log(`Migration ${migration.name} already executed, skipping`);
        }
      } catch (error) {
        Bugsnag.notify(error instanceof Error ? error : new Error(String(error)));
        console.error(`Migration ${migration.name} failed:`, error);
        throw error;
      }
    }
    
    console.log('All migrations completed successfully');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
} 