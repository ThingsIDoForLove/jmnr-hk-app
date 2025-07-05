# Database Requirements

## Overview

The Hisaab-e-Khair app requires SQLite to function properly. If SQLite cannot be initialized, the app will display an error message and exit gracefully.

## Requirements

### SQLite Support
- **Primary Storage**: SQLite database using `expo-sqlite`
- **No Fallback**: The app does not use AsyncStorage or any other fallback storage
- **Critical Dependency**: SQLite is essential for all app functionality

### Platform Support
- **Android**: SQLite is supported in production builds
- **iOS**: SQLite is supported in production builds
- **Development**: SQLite works in Expo development builds

## Error Handling

### Database Initialization Failure
If SQLite fails to initialize:

1. **Error Message**: User sees a clear error message in Urdu
2. **App Exit**: User is prompted to exit the app
3. **No Partial Functionality**: App does not attempt to run without database

### Error Message
```
Database Error
Failed to initialize local database. The app cannot function without a database. Please restart the app or contact support.
```

## Troubleshooting

### Common Issues

1. **EAS Build Issues**
   - Ensure `expo-sqlite` is in the plugins array in `app.json`
   - Check that the SQLite plugin is properly configured

2. **Production Build Problems**
   - SQLite should work in production builds
   - If issues persist, check EAS build logs

3. **Device-Specific Issues**
   - Some devices may have SQLite restrictions
   - Check device permissions and storage access

### Debugging

1. **Check Logs**
   ```bash
   # Look for these log messages:
   "Initializing SQLite database..."
   "SQLite database opened successfully"
   "Database initialization completed successfully"
   ```

2. **Common Error Messages**
   - `Database initialization failed: [error details]`
   - `Database not initialized`

## Build Configuration

### app.json
```json
{
  "expo": {
    "plugins": [
      "expo-sqlite"
    ]
  }
}
```

### eas.json
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  }
}
```

## Development vs Production

### Development
- SQLite works reliably in development builds
- Use `expo start` for testing

### Production
- SQLite is bundled with the app
- Test thoroughly with production builds
- Use `eas build` for production builds

## Support

If SQLite continues to fail in production builds:

1. **Check EAS Build Logs**: Look for SQLite-related errors
2. **Test on Different Devices**: Some devices may have restrictions
3. **Contact Expo Support**: For platform-specific issues
4. **Consider Alternative**: If SQLite consistently fails, consider using a different database solution

## No Fallback Policy

This app intentionally does not implement fallback storage because:

1. **Data Integrity**: SQLite provides ACID compliance
2. **Performance**: SQLite is optimized for the app's use case
3. **Simplicity**: Single storage solution reduces complexity
4. **Reliability**: SQLite is a proven, reliable database

If SQLite fails, the app exits gracefully rather than compromising data integrity or performance. 