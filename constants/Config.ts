import Constants from 'expo-constants';

// Environment detection
const getEnvironment = (): 'development' | 'preview' | 'production' => {
  // Check for explicit environment variable first
  const envVar = process.env.EXPO_PUBLIC_ENV;
  if (envVar && ['development', 'preview', 'production'].includes(envVar)) {
    return envVar as 'development' | 'preview' | 'production';
  }
  
  // Check if we're in development mode
  if (__DEV__) {
    return 'development';
  }
  
  // Check for EAS build environment
  const easBuildProfile = Constants.expoConfig?.extra?.eas?.buildProfile;
  if (easBuildProfile) {
    return easBuildProfile as 'development' | 'preview' | 'production';
  }
  
  // Default to production for release builds
  return 'production';
};

// Environment-specific configurations
const ENV_CONFIG = {
  development: {
    API_BASE_URL: 'https://jmnr-hk-git-stage-rasikh-labs.vercel.app/api',
    ENV_NAME: 'Development',
    DEBUG_MODE: true,
    LOG_LEVEL: 'debug',
    APP_NAME: 'Hisaab-e-Khair (Dev)',
  },
  preview: {
    API_BASE_URL: 'https://jmnr-hk-git-stage-rasikh-labs.vercel.app/api',
    ENV_NAME: 'Preview',
    DEBUG_MODE: true,
    LOG_LEVEL: 'info',
    APP_NAME: 'Hisaab-e-Khair (Preview)',
  },
  production: {
    API_BASE_URL: 'https://jmnr-hk.vercel.app/api',
    ENV_NAME: 'Production',
    DEBUG_MODE: false,
    LOG_LEVEL: 'error',
    APP_NAME: 'Hisaab-e-Khair',
  },
};

// Get current environment
const currentEnv = getEnvironment();

// Export environment-specific config
export const API_BASE_URL = ENV_CONFIG[currentEnv].API_BASE_URL;
export const ENV_NAME = ENV_CONFIG[currentEnv].ENV_NAME;
export const DEBUG_MODE = ENV_CONFIG[currentEnv].DEBUG_MODE;
export const LOG_LEVEL = ENV_CONFIG[currentEnv].LOG_LEVEL;
export const APP_NAME = ENV_CONFIG[currentEnv].APP_NAME;

// Export the entire config for debugging
export const Config = {
  environment: currentEnv,
  ...ENV_CONFIG[currentEnv],
};

// Debug logging
if (DEBUG_MODE) {
  console.log(`🚀 App Environment: ${currentEnv}`);
  console.log(`🌐 API Base URL: ${API_BASE_URL}`);
  console.log(`🔧 Debug Mode: ${DEBUG_MODE}`);
  console.log(`📱 App Name: ${APP_NAME}`);
} 