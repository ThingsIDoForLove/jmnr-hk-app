# Historical Data Sync

This document explains how the historical data sync functionality works in the Hisaab-e-Khair app.

## Overview

When a user logs in, the app automatically syncs historical data from the server to ensure the local database has all records from the beginning of the current year.

## API Endpoints

The app calls these endpoints to fetch historical data:

### Donations
```
GET /api/donations?username={username}&afterDate={firstDateOfYear}
```

### Expenses
```
GET /api/expenses?username={username}&afterDate={firstDateOfYear}
```

## Authentication

Both endpoints require secure authentication using:
- `X-Timestamp`: Current timestamp in ISO format
- `X-Signature`: HMAC-SHA256 signature of `username + afterDate + timestamp`

## Implementation

### 1. HistoricalSyncService

The main service class that handles historical data synchronization:

```typescript
import { HistoricalSyncService } from '@/services/HistoricalSyncService';

// Sync all historical data (donations + expenses)
const result = await HistoricalSyncService.syncAllHistoricalData();
console.log(`Donations: ${result.donations}, Expenses: ${result.expenses}`);

// Sync only donations
const donationsCount = await HistoricalSyncService.syncHistoricalDonations();

// Sync only expenses
const expensesCount = await HistoricalSyncService.syncHistoricalExpenses();
```

### 2. Automatic Sync on Login

Historical sync is automatically triggered after successful login in `LoginScreen.tsx`:

```typescript
// After successful login
const result = await HistoricalSyncService.syncAllHistoricalData();
```

### 3. Manual Sync

Users can manually trigger historical sync from the home screen using the "🔄 تاریخی ڈیٹا سنک" button.

## Data Processing

1. **Date Calculation**: Gets the first date of the current year (January 1st)
2. **API Call**: Fetches data from server with proper authentication
3. **Duplicate Check**: Checks if records already exist in local database
4. **Insertion**: Inserts new records with `syncStatus: 'synced'`
5. **Error Handling**: Continues processing even if individual records fail

## Error Handling

- If historical sync fails during login, the login process continues
- Individual record insertion errors are logged but don't stop the process
- Network errors are handled gracefully
- Missing credentials are logged but don't cause crashes

## Logging

The service provides detailed console logging for debugging:

```
=== HISTORICAL DATA SYNC STARTED ===
username: user123
afterDate: 2024-01-01
=== HISTORICAL DONATIONS SYNC ===
Historical donations received: 25
Historical donations sync completed: 25 donations inserted
=== HISTORICAL EXPENSES SYNC ===
Historical expenses received: 15
Historical expenses sync completed: 15 expenses inserted
=== HISTORICAL DATA SYNC COMPLETED ===
Donations: 25, Expenses: 15
```

## Usage Examples

### In Login Flow
```typescript
// Automatically called after successful login
const result = await HistoricalSyncService.syncAllHistoricalData();
```

### Manual Trigger
```typescript
// User-initiated sync
try {
  const result = await HistoricalSyncService.syncAllHistoricalData();
  Alert.alert('Success', `Synced ${result.donations} donations and ${result.expenses} expenses`);
} catch (error) {
  Alert.alert('Error', 'Historical sync failed');
}
```

### Individual Sync
```typescript
// Sync only donations
const donationsCount = await HistoricalSyncService.syncHistoricalDonations();

// Sync only expenses
const expensesCount = await HistoricalSyncService.syncHistoricalExpenses();
```

## Security

- All API calls use HMAC-SHA256 signatures
- Credentials are stored securely using expo-secure-store
- Timestamps prevent replay attacks
- Username is included in signature calculation

## Performance

- Historical sync runs in parallel for donations and expenses
- Duplicate checking prevents unnecessary database operations
- Error handling ensures partial failures don't block the entire process
- Sync status is tracked to avoid re-syncing already synced records 