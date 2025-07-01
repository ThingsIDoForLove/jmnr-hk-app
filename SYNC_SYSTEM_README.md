# Hisaab-e-Khair: Offline-First Sync System

This document explains the robust offline-first data synchronization system implemented for the Hisaab-e-Khair charity tracking app.

## 🎯 Overview

The sync system provides **three-tier data persistence**:
1. **Local Storage** - Immediate save to SQLite database
2. **Internet Sync** - Automatic sync when online
3. **SMS Fallback** - SMS transmission when offline

## 🏗️ Architecture

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI Layer      │    │   Sync Hook     │    │   Services      │
│                 │    │                 │    │                 │
│ - DonationForm  │◄──►│ - useSync()     │◄──►│ - Database      │
│ - Status Display│    │ - Status Mgmt   │    │ - Network       │
│ - Manual Sync   │    │ - Auto Sync     │    │ - SMS           │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **User saves donation** → Immediately stored in SQLite
2. **Network check** → Automatic sync attempt when online
3. **SMS fallback** → If no internet, send via SMS
4. **Conflict resolution** → Handle data conflicts gracefully

## 📦 Dependencies

```json
{
  "expo-sqlite": "~14.1.0",           // Local database
  "expo-network": "~7.1.0",           // Network detection
  "expo-sms": "~12.1.0",              // SMS functionality
  "@react-native-async-storage/async-storage": "1.25.0", // Config storage
  "@react-native-picker/picker": "2.6.1"  // Form pickers
}
```

## 🚀 Quick Start

### 1. Initialize Services

```typescript
import { useSync } from './hooks/useSync';

function App() {
  const { saveDonation, syncStatus, manualSync } = useSync();
  
  // Services auto-initialize on mount
  return <YourApp />;
}
```

### 2. Save a Donation

```typescript
const handleSave = async () => {
  try {
    await saveDonation({
      amount: 100,
      currency: 'USD',
      recipient: 'Red Cross',
      category: 'charity',
      description: 'Emergency relief',
      date: new Date().toISOString(),
      isAnonymous: false,
    });
    
    // Automatically queued for sync
    console.log('Saved locally, will sync when online');
  } catch (error) {
    console.error('Save failed:', error);
  }
};
```

### 3. Monitor Sync Status

```typescript
const { syncStatus, networkStatus } = useSync();

// Check pending records
if (syncStatus.pendingCount > 0) {
  console.log(`${syncStatus.pendingCount} records pending sync`);
}

// Check network
if (networkStatus.isConnected) {
  console.log('Network available for sync');
}
```

## 🔧 Configuration

### Sync Settings

```typescript
import { syncService } from './services/SyncService';

await syncService.saveConfig({
  serverUrl: 'https://your-api.com',
  apiKey: 'your-api-key',
  smsFallbackNumber: '+1234567890',
  syncInterval: 15, // minutes
  batchSize: 10,
  maxRetries: 3,
});
```

### Default Configuration

```typescript
{
  serverUrl: 'https://your-server.com/api',
  apiKey: '',
  smsFallbackNumber: '+1234567890',
  maxRetries: 3,
  syncInterval: 15, // minutes
  batchSize: 10,
}
```

## 📊 Data Models

### Donation Record

```typescript
interface DonationRecord {
  id: string;                    // Unique identifier
  amount: number;                // Donation amount
  currency: string;              // Currency code
  recipient: string;             // Recipient name
  category: 'charity' | 'zakat' | 'sadaqah' | 'other';
  description?: string;          // Optional description
  date: string;                  // ISO date string
  location?: {                   // Optional GPS coordinates
    latitude: number;
    longitude: number;
  };
  receiptImage?: string;         // Base64 or file path
  isAnonymous: boolean;          // Anonymous flag
  createdAt: string;             // Creation timestamp
  updatedAt: string;             // Last update timestamp
  syncStatus: 'pending' | 'synced' | 'failed';
}
```

## 🔄 Sync Process

### 1. Local Save
- Record immediately saved to SQLite
- Added to sync queue with 'pending' status
- User gets instant feedback

### 2. Network Detection
- Continuous network monitoring
- Automatic sync attempts when online
- Graceful handling of connection changes

### 3. Internet Sync
```typescript
// Batch upload to server
POST /api/donations/batch
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "donations": [
    {
      "clientId": "<unique_id>",
      "amount": 100,
      "currency": "USD",
      "recipient": "Red Cross",
      "category": "charity",
      "date": "2024-01-01T00:00:00.000Z",
      "isAnonymous": false
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 4. SMS Fallback
- Compressed data encoding (Base64)
- Batch sending for efficiency
- Automatic retry logic

### SMS Message Format
```
HK:BATCH:eyJpZCI6ImRvbmF0aW9uXzE2NzI1MzYwMDAwMCIsImFtdCI6MTAwLCJjdXIiOiJVU0QiLCJyZWMiOiJSZWQgQ3Jvc3MiLCJjYXQiOiJjaGFyaXR5IiwiZGF0ZSI6IjIwMjQtMDEtMDFUMDA6MDA6MDAuMDAwWiIsImFub24iOjB9
```

## 🛠️ API Integration

### Server Endpoints

```typescript
// Batch upload endpoint
POST /api/donations/batch
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "donations": [
    {
      "clientId": "<unique_id>",
      "amount": 100,
      "currency": "USD",
      "recipient": "Red Cross",
      "category": "charity",
      "date": "2024-01-01T00:00:00.000Z",
      "isAnonymous": false
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}

// Response
{
  "success": true,
  "donations": [
    {
      "clientId": "<unique_id>",
      "id": "server_generated_id",
      "status": "created"
    }
  ]
}
```

### SMS Processing (Server-side)

```typescript
// Process incoming SMS
function processSMS(message: string): DonationRecord[] {
  if (!message.startsWith('HK:')) return [];
  
  if (message.includes('BATCH:')) {
    return decodeBatchDonations(message);
  } else {
    const record = decodeDonationFromSMS(message);
    return record ? [record] : [];
  }
}
```

## 📱 Usage Examples

### Basic Donation Form

```typescript
import { DonationForm } from './components/DonationForm';

function HomeScreen() {
  return (
    <View>
      <DonationForm />
    </View>
  );
}
```

### Manual Sync Trigger

```typescript
const { manualSync, syncStatus } = useSync();

<TouchableOpacity onPress={manualSync} disabled={syncStatus.isSyncing}>
  <Text>{syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}</Text>
</TouchableOpacity>
```

### Statistics Display

```typescript
const { getStatistics } = useSync();
const [stats, setStats] = useState({ totalDonations: 0, totalAmount: 0 });

useEffect(() => {
  getStatistics().then(setStats);
}, []);

<Text>Total Donations: {stats.totalDonations}</Text>
<Text>Total Amount: ${stats.totalAmount}</Text>
```

## 🔍 Monitoring & Debugging

### Sync Status

```typescript
const { syncStatus, networkStatus } = useSync();

console.log('Network:', networkStatus.isConnected ? 'Online' : 'Offline');
console.log('Pending records:', syncStatus.pendingCount);
console.log('Last sync:', syncStatus.lastSyncAttempt);
```

### Database Queries

```typescript
import { databaseService } from './services/DatabaseService';

// Get all donations
const donations = await databaseService.getDonations(50, 0);

// Get pending sync records
const pending = await databaseService.getPendingSyncDonations();

// Get statistics
const totalAmount = await databaseService.getTotalAmount();
```

## 🚨 Error Handling

### Common Issues

1. **Network Unavailable**
   - Records remain in 'pending' status
   - Automatic retry when network returns
   - SMS fallback if configured

2. **Server Errors**
   - Records stay in sync queue
   - Exponential backoff retry
   - Manual sync option available

3. **SMS Failures**
   - Records remain pending
   - Internet sync takes priority
   - User notified of sync status

### Error Recovery

```typescript
// Check sync health
const status = await syncService.getSyncStatus();

if (status.pendingCount > 0) {
  // Attempt manual sync
  await syncService.manualSync();
}

// Force sync all pending records
const pending = await databaseService.getPendingSyncDonations();
for (const record of pending) {
  await databaseService.updateDonationSyncStatus(record.id, 'pending');
}
```

## 🔒 Security Considerations

### Data Protection
- Local SQLite encryption (if needed)
- Secure API key storage
- SMS data compression to minimize exposure

### Privacy
- Anonymous donation support
- Optional location tracking
- Secure server communication

## 📈 Performance Optimization

### Batch Processing
- Configurable batch sizes
- Efficient network usage
- Reduced API calls

### Local Storage
- Indexed database queries
- Efficient data structures
- Minimal memory footprint

### SMS Optimization
- Compressed data encoding
- Batch message sending
- Cost-effective transmission

## 🧪 Testing

### Unit Tests

```typescript
// Test database operations
describe('DatabaseService', () => {
  it('should save and retrieve donations', async () => {
    const donation = createTestDonation();
    await databaseService.saveDonation(donation);
    const retrieved = await databaseService.getDonationById(donation.id);
    expect(retrieved).toEqual(donation);
  });
});

// Test sync logic
describe('SyncService', () => {
  it('should sync pending records when online', async () => {
    // Mock network as online
    // Add pending records
    // Trigger sync
    // Verify records marked as synced
  });
});
```

### Integration Tests

```typescript
// Test full sync flow
describe('End-to-End Sync', () => {
  it('should handle offline -> online transition', async () => {
    // 1. Save donation while offline
    // 2. Verify local storage
    // 3. Simulate network connection
    // 4. Verify automatic sync
    // 5. Check server confirmation
  });
});
```

## 🚀 Deployment

### Production Setup

1. **Configure Server**
   ```bash
   # Set up API endpoints
   # Configure SMS processing
   # Set up database
   ```

2. **Update App Config**
   ```typescript
   await syncService.saveConfig({
     serverUrl: 'https://your-production-api.com',
     apiKey: process.env.API_KEY,
     smsFallbackNumber: '+1234567890',
   });
   ```

3. **Test Sync Flow**
   ```bash
   # Test offline functionality
   # Test network transitions
   # Test SMS fallback
   # Verify data integrity
   ```

## 📚 Additional Resources

- [Expo SQLite Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo Network Documentation](https://docs.expo.dev/versions/latest/sdk/network/)
- [Expo SMS Documentation](https://docs.expo.dev/versions/latest/sdk/sms/)
- [React Native AsyncStorage](https://react-native-async-storage.github.io/async-storage/)

---

This sync system ensures your charity tracking app works reliably in all network conditions, providing users with confidence that their donations are always recorded and will be synced when possible. 