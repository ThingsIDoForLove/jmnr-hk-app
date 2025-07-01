import AsyncStorage from '@react-native-async-storage/async-storage';
import { DonationRecord, NetworkStatus, SyncConfig } from '../types/data';
import { databaseService } from './DatabaseService';
import { networkService } from './NetworkService';
import { smsService } from './SMSService';

class SyncService {
  private config: SyncConfig = {
    serverUrl: 'https://webhook.site/cfa64e5b-6645-43bc-a300-83acf39de10e',
    apiKey: 'test',
    smsFallbackNumber: '+1234567890',
    maxRetries: 3,
    syncInterval: 2, // minutes
    batchSize: 10,
  };

  private isSyncing = false;
  private syncIntervalId: ReturnType<typeof setInterval> | null = null;
  private networkUnsubscribe: (() => void) | null = null;

  async init(): Promise<void> {
    await this.loadConfig();
    await this.startAutoSync();
    this.setupNetworkListener();
  }

  private async loadConfig(): Promise<void> {
    try {
      const savedConfig = await AsyncStorage.getItem('sync_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.error('Error loading sync config:', error);
    }
  }

  async saveConfig(config: Partial<SyncConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await AsyncStorage.setItem('sync_config', JSON.stringify(this.config));
  }

  private setupNetworkListener(): void {
    this.networkUnsubscribe = networkService.addListener(async (status: NetworkStatus) => {
      if (status.isConnected && !this.isSyncing) {
        // Network became available, try to sync
        setTimeout(() => this.syncPendingRecords(), 2000);
      }
    });
  }

  private async startAutoSync(): Promise<void> {
    // Clear any existing interval
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }

    // Start periodic sync
    this.syncIntervalId = setInterval(async () => {
      if (!this.isSyncing) {
        await this.syncPendingRecords();
      }
    }, this.config.syncInterval * 60 * 1000);

    // Initial sync attempt
    setTimeout(() => this.syncPendingRecords(), 5000);
  }

  async syncPendingRecords(): Promise<void> {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    this.isSyncing = true;
    console.log('Starting sync process...');

    try {
      const pendingRecords = await databaseService.getPendingSyncDonations();
      
      if (pendingRecords.length === 0) {
        console.log('No pending records to sync');
        return;
      }

      console.log(`Found ${pendingRecords.length} pending records to sync`);

      // Check network connectivity
      const isConnected = await networkService.isConnected();
      const hasInternet = await networkService.hasInternetAccess();

      if (isConnected && hasInternet) {
        await this.syncViaInternet(pendingRecords);
      } else {
       // await this.syncViaSMS(pendingRecords);
      }
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncViaInternet(records: DonationRecord[]): Promise<void> {
    console.log('Attempting to sync via internet...');

    try {
      // Split records into batches
      const batches = this.chunkArray(records, this.config.batchSize);
      
      for (const batch of batches) {
        const success = await this.sendBatchToServer(batch);
        
        if (success) {
          // Update sync status for successful records
          for (const record of batch) {
            await databaseService.updateDonationSyncStatus(record.id, 'synced');
          }
          console.log(`Successfully synced batch of ${batch.length} records`);
        } else {
          console.log('Failed to sync batch, will retry later');
          // Records remain in pending status for retry
        }
      }
    } catch (error) {
      console.error('Error syncing via internet:', error);
      // Fall back to SMS if internet sync fails
      await this.syncViaSMS(records);
    }
  }

  private async sendBatchToServer(records: DonationRecord[]): Promise<boolean> {
    try {

      console.log('sending batch to server', records);
      const response = await fetch(`${this.config.serverUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          donations: records,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        //const result = await response.json();
        
        return true;
      } else {
        console.error('Server responded with error:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('Error sending batch to server:', error);
      return false;
    }
  }

  private async syncViaSMS(records: DonationRecord[]): Promise<void> {
    console.log('Attempting to sync via SMS...');

    try {
      const isSMSAvailable = await smsService.isAvailable();
      
      if (!isSMSAvailable) {
        console.log('SMS not available, records will remain pending');
        return;
      }

      // Send records in batches via SMS
      const batches = this.chunkArray(records, 5); // Smaller batches for SMS
      
      for (const batch of batches) {
        const success = await smsService.sendBatchDonations(batch, this.config.smsFallbackNumber);
        
        if (success) {
          console.log(`Successfully sent batch of ${batch.length} records via SMS`);
          // Note: We don't mark as synced here since SMS is one-way
          // Server needs to process SMS and confirm via internet sync later
        } else {
          console.log('Failed to send batch via SMS');
        }
      }
    } catch (error) {
      console.error('Error syncing via SMS:', error);
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Manual sync trigger
  async manualSync(): Promise<void> {
    console.log('Manual sync triggered');
    await this.syncPendingRecords();
  }

  // Get sync status
  async getSyncStatus(): Promise<{
    pendingCount: number;
    totalRecords: number;
    lastSyncAttempt: string | null;
    isConnected: boolean;
  }> {
    const pendingCount = await databaseService.getPendingSyncCount();
    const totalRecords = await databaseService.getTotalDonations();
    const lastSyncAttempt = await AsyncStorage.getItem('last_sync_attempt');
    const isConnected = await networkService.isConnected();

    return {
      pendingCount,
      totalRecords,
      lastSyncAttempt,
      isConnected,
    };
  }

  // Process incoming SMS (for server-side processing)
  async processIncomingSMS(message: string): Promise<DonationRecord[]> {
    if (!smsService.isHisaabKhairMessage(message)) {
      return [];
    }

    if (message.includes('BATCH:')) {
      return smsService.decodeBatchDonations(message);
    } else {
      const record = smsService.decodeDonationFromSMS(message);
      return record ? [record] : [];
    }
  }

  // Cleanup
  destroy(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }
    
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
    }
  }
}

export const syncService = new SyncService(); 