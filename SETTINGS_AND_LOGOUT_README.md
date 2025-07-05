# Settings Screen and Logout Functionality

This document explains the new settings screen and secure logout functionality implemented in the Hisaab-e-Khair app.

## Overview

The app now includes a dedicated settings screen with sync controls and a secure logout process that ensures all data is synced before allowing logout.

## Settings Screen Features

### 1. Historical Data Sync
- **Location**: Settings → Historical Data Sync
- **Function**: Downloads historical data from server (from January 1st of current year)
- **Icon**: Cloud download (orange)
- **Status**: Shows sync progress and results

### 2. Manual Sync Controls
- **Donations Sync**: Manual sync for pending donations
- **Expenses Sync**: Manual sync for pending expenses
- **Status**: Shows pending count and sync progress
- **Icons**: Cloud upload (blue for donations, red for expenses)

### 3. Account Management
- **Logout**: Secure logout with sync verification
- **Icon**: Logout (red)
- **Security**: Prevents logout if data is not synced

## Logout Process

### Security Requirements
The logout process enforces data integrity by requiring all pending data to be synced before allowing logout.

### Process Flow
1. **Check Pending Data**: Verify if there are unsynced donations or expenses
2. **Sync if Needed**: If pending data exists, attempt to sync
3. **Verify Sync**: Check if sync was successful
4. **Clear Credentials**: Remove stored username and signing key
5. **Return to Login**: Navigate back to login screen

### Error Handling
- **Sync Required**: Shows alert if logout attempted with pending data
- **Sync Failed**: Shows error message if sync fails
- **Admin Contact**: Prompts user to contact admin if sync cannot be completed

## Implementation Details

### Settings Screen Component
```typescript
// components/SettingsScreen.tsx
interface SettingsScreenProps {
  onLogout: () => void;
  onBack: () => void;
}
```

### Logout Handler
```typescript
const handleLogout = async () => {
  // Check for pending sync items
  if (hasPendingData) {
    // Show sync required alert
    Alert.alert('Sync Required', 'Please sync all data before logout');
    return;
  }
  
  // Proceed with logout
  await performLogout();
};
```

### Sync Before Logout
```typescript
const handleSyncBeforeLogout = async () => {
  // Sync donations and expenses
  await Promise.all([
    manualSync(),
    manualExpenseSync()
  ]);
  
  // Verify sync success
  if (stillHasPendingData) {
    Alert.alert('Sync Failed', 'Please contact admin');
    return;
  }
  
  // Proceed with logout
  await performLogout();
};
```

## User Interface

### Settings Screen Layout
```
┌─────────────────────────┐
│ ← واپس جائیں  ترتیبات    │
├─────────────────────────┤
│ ڈیٹا سنک                    │
│ ☁️ تاریخی ڈیٹا سنک     │
│ ☁️ عطیات ڈیٹا سنک (5)       │
│ ☁️ اخراجات ڈیٹا سنک (2)     │
│                         │
│ اکاؤنٹ                  │
│ 🚪 لاگ آؤٹ              │
└─────────────────────────┘
```

### Navigation
- **Home Page → Settings**: Settings button in header (⚙️ icon)
- **Settings → Home**: Back button in header
- **Settings → Login**: Logout button (after sync verification)

## Security Features

### 1. Credential Management
```typescript
// Clear stored credentials on logout
await SecureStore.deleteItemAsync('username');
await SecureStore.deleteItemAsync('signingKey');
```

### 2. Data Integrity
- Prevents logout with unsynced data
- Forces sync before logout
- Verifies sync success

### 3. Error Recovery
- Fallback to individual sync if bulk sync fails
- Graceful handling of network errors
- Clear error messages for users

## Usage Examples

### Accessing Settings
```typescript
// From home page header
// Settings button appears in the header as a gear icon
<TouchableOpacity style={styles.settingsButtonHeader} onPress={() => setCurrentView('settings')}>
  <Ionicons name="settings" size={20} color="#666" />
</TouchableOpacity>
```

### Historical Sync
```typescript
// In settings screen
const handleHistoricalSync = async () => {
  const result = await HistoricalSyncService.syncAllHistoricalData();
  Alert.alert('Complete', `Synced ${result.donations} donations and ${result.expenses} expenses`);
};
```

### Secure Logout
```typescript
// In settings screen
const handleLogout = async () => {
  if (hasPendingData) {
    // Show sync required alert
    return;
  }
  
  await performLogout();
  onLogout(); // Call parent logout handler
};
```

## Error Messages

### Urdu Error Messages
- **Sync Required**: "ڈیٹا سنک ضروری ہے"
- **Sync Failed**: "ڈیٹا سنک ناکام"
- **Contact Admin**: "براہ کرم ایڈمن سے رابطہ کریں"
- **Logout Failed**: "لاگ آؤٹ ناکام ہوا"

### English Error Messages (for debugging)
- **Sync Required**: "Sync required before logout"
- **Sync Failed**: "Sync failed, please contact admin"
- **Logout Failed**: "Logout failed"

## Testing

### Test Cases
1. **Normal Logout**: No pending data → immediate logout
2. **Sync Required**: Pending data → show sync alert
3. **Sync and Logout**: Pending data → sync → verify → logout
4. **Sync Failed**: Pending data → sync fails → show error
5. **Historical Sync**: Test historical data download

### Manual Testing
```typescript
// Test logout with pending data
// 1. Create some donations/expenses
// 2. Try to logout
// 3. Verify sync alert appears
// 4. Complete sync
// 5. Verify logout succeeds
```

## Future Enhancements

### Potential Improvements
1. **Progress Indicators**: Show sync progress percentage
2. **Retry Logic**: Automatic retry for failed syncs
3. **Offline Mode**: Handle offline logout scenarios
4. **Data Export**: Export data before logout
5. **Account Settings**: Username display, change password

### Configuration Options
1. **Auto-sync**: Automatic sync on app start
2. **Sync Frequency**: Configurable sync intervals
3. **Data Retention**: Local data retention policies
4. **Backup**: Automatic data backup before logout

## Conclusion

The settings screen and secure logout functionality provide:

- **Better UX**: Organized settings in dedicated screen
- **Data Security**: Ensures data integrity before logout
- **User Control**: Manual sync controls for troubleshooting
- **Error Handling**: Clear error messages and recovery options
- **Scalability**: Easy to add new settings and features

This implementation ensures users can safely logout while maintaining data integrity and providing clear feedback about sync status. 