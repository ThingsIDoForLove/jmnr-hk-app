# Environment Configuration Guide

This guide explains how to use different configurations for development, preview, and production environments in your React Native Expo app.

## 🏗️ Current Setup

### **Environments Supported:**
- **Development**: Local development with Expo Go
- **Preview**: Internal testing builds
- **Production**: Release builds for app stores

### **Configuration Files:**
- `constants/Config.ts` - Environment-specific settings
- `eas.json` - EAS build profiles
- `app.json` - App configuration

## 🚀 How It Works

### **Environment Detection Priority:**
1. **Environment Variable**: `EXPO_PUBLIC_ENV`
2. **Development Mode**: `__DEV__` flag
3. **EAS Build Profile**: From `eas.json`
4. **Default**: Production

### **Current Configuration:**

```typescript
// Development
API_BASE_URL: 'https://jmnr-hk-git-stage-rasikh-labs.vercel.app/api'
DEBUG_MODE: true
APP_NAME: 'Hisaab-e-Khair (Dev)'

// Preview  
API_BASE_URL: 'https://jmnr-hk-git-stage-rasikh-labs.vercel.app/api'
DEBUG_MODE: true
APP_NAME: 'Hisaab-e-Khair (Preview)'

// Production
API_BASE_URL: 'https://jmnr-hk-production.vercel.app/api'
DEBUG_MODE: false
APP_NAME: 'Hisaab-e-Khair'
```

## 📱 Building for Different Environments

### **Development Build:**
```bash
# For development testing
eas build --profile development --platform android

# Or for iOS
eas build --profile development --platform ios
```

### **Preview Build:**
```bash
# For internal testing
eas build --profile preview --platform android

# Or for iOS
eas build --profile preview --platform ios
```

### **Production Build:**
```bash
# For app store release
eas build --profile production --platform android

# Or for iOS
eas build --profile production --platform ios
```

## 🔧 Customizing Configuration

### **1. Update API URLs**

Edit `constants/Config.ts`:

```typescript
const ENV_CONFIG = {
  development: {
    API_BASE_URL: 'https://your-dev-api.com/api',
    // ... other config
  },
  preview: {
    API_BASE_URL: 'https://your-staging-api.com/api',
    // ... other config
  },
  production: {
    API_BASE_URL: 'https://your-production-api.com/api',
    // ... other config
  },
};
```

### **2. Add New Environment Variables**

```typescript
const ENV_CONFIG = {
  development: {
    API_BASE_URL: 'https://dev-api.com/api',
    SOCKET_URL: 'wss://dev-socket.com',
    ANALYTICS_KEY: 'dev-analytics-key',
    // ... other config
  },
  // ... other environments
};
```

### **3. Environment-Specific Features**

```typescript
// In your components
import { DEBUG_MODE, ENV_NAME } from '@/constants/Config';

if (DEBUG_MODE) {
  // Show debug information
  console.log('Debug mode enabled');
}

// Show environment indicator
<Text>Environment: {ENV_NAME}</Text>
```

## 🛠️ Usage Examples

### **In Components:**
```typescript
import { API_BASE_URL, DEBUG_MODE, Config } from '@/constants/Config';

// Use API URL
const response = await fetch(`${API_BASE_URL}/donations`);

// Conditional debugging
if (DEBUG_MODE) {
  console.log('API Response:', response);
}

// Access full config
console.log('Current config:', Config);
```

### **In Services:**
```typescript
import { API_BASE_URL, LOG_LEVEL } from '@/constants/Config';

class ApiService {
  private baseUrl = API_BASE_URL;
  
  async makeRequest(endpoint: string) {
    const url = `${this.baseUrl}${endpoint}`;
    
    if (LOG_LEVEL === 'debug') {
      console.log(`Making request to: ${url}`);
    }
    
    // ... rest of the service
  }
}
```

## 🔍 Testing Different Environments

### **Local Development:**
```bash
# Start development server
npm run android
# or
npm run ios
```

### **Testing Build Profiles:**
```bash
# Build for development
eas build --profile development --platform android

# Install and test
# The app will show "(Dev)" in the name and use dev API
```

### **Environment Indicators:**
- **Development**: App name shows "(Dev)"
- **Preview**: App name shows "(Preview)"  
- **Production**: App name shows "Hisaab-e-Khair"

## 🔐 Security Considerations

### **Environment Variables:**
- Use `EXPO_PUBLIC_` prefix for client-side variables
- Sensitive data should be handled server-side
- Never commit API keys to version control

### **API URLs:**
- Use HTTPS for all environments
- Consider using different domains for each environment
- Implement proper authentication for each environment

## 🚨 Troubleshooting

### **Common Issues:**

1. **Wrong API URL in build:**
   - Check `eas.json` build profiles
   - Verify environment detection in `Config.ts`
   - Clear build cache: `eas build --clear-cache`

2. **Environment not detected:**
   - Check console logs for environment info
   - Verify `__DEV__` flag in development
   - Check EAS build profile configuration

3. **Build fails:**
   - Ensure all environment variables are set
   - Check `eas.json` syntax
   - Verify API URLs are accessible

### **Debug Commands:**
```bash
# Check current environment
console.log('Environment:', Config.environment);

# View all config
console.log('Full config:', Config);

# Check build profile
eas build:list
```

## 📋 Best Practices

1. **Consistent Naming**: Use clear, descriptive environment names
2. **Default Values**: Always provide fallback values
3. **Type Safety**: Use TypeScript for configuration
4. **Documentation**: Keep this guide updated
5. **Testing**: Test all environments before release
6. **Monitoring**: Log environment info for debugging

## 🔄 Updating Configuration

### **Adding New Environment:**
1. Update `Config.ts` with new environment config
2. Add build profile in `eas.json`
3. Update this documentation
4. Test the new environment

### **Changing API URLs:**
1. Update URLs in `Config.ts`
2. Test connectivity to new URLs
3. Update team documentation
4. Deploy new builds

## 📞 Support

For issues with environment configuration:
1. Check console logs for environment detection
2. Verify `eas.json` build profiles
3. Test with different build commands
4. Review this documentation 