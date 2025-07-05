export interface DonationRecord {
  id: string;
  amount: number;
  currency: string;
  benefactorName: string;
  benefactorPhone: string;
  benefactorAddress?: string;
  recipient: string;
  category: 'charity' | 'zakat' | 'sadaqah' | 'other';
  description?: string;
  date: string; // ISO string
  location?: {
    latitude: number;
    longitude: number;
  };
  receiptImage?: string; // base64 or file path
  createdAt: string;
  updatedAt: string;
  syncStatus: 'pending' | 'synced' | 'failed';
}

export interface SMSSyncData {
  phoneNumber: string;
  message: string;
  timestamp: string;
  recordId: string;
}

export interface SyncConfig {
  serverUrl: string;
  apiKey: string;
  smsFallbackNumber: string;
  maxRetries: number;
  syncInterval: number; // in minutes
  batchSize: number;
}

export interface ExpenseRecord {
  id: string;
  amount: number;
  currency: string;
  payee: string;
  category: 'office_supplies' | 'utilities' | 'rent' | 'maintenance' | 'transportation' | 'meals' | 'events' | 'marketing' | 'equipment' | 'services' | 'other';
  description?: string;
  date: string; // ISO string
  isPersonal: boolean;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'pending' | 'synced' | 'failed';
} 