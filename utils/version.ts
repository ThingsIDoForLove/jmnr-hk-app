import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { ENV_NAME } from '../constants/Config';

export interface VersionInfo {
  version: string;
  buildNumber: string;
  platform: string;
  environment: string;
  fullVersion: string;
}

export const getVersionInfo = (): VersionInfo => {
  const expoConfig = Constants.expoConfig;
  
  // Get version from app.json
  const version = expoConfig?.version || '1.0.0';
  
  // Get build number (different for iOS and Android)
  const buildNumber = Platform.select({
    ios: expoConfig?.ios?.buildNumber || '1',
    android: expoConfig?.android?.versionCode?.toString() || '1',
    default: '1',
  });
  
  // Get platform
  const platform = Platform.OS;
  
  // Get environment from Config
  const environment = ENV_NAME.toLowerCase();
  
  // Create full version string
  const fullVersion = `${version} (${buildNumber})`;
  
  return {
    version,
    buildNumber,
    platform,
    environment,
    fullVersion,
  };
};

export const getVersionDisplay = (): string => {
  const versionInfo = getVersionInfo();
  
  // Show environment in development/preview
  if (versionInfo.environment !== 'production') {
    return `${versionInfo.fullVersion} - ${versionInfo.environment}`;
  }
  
  return versionInfo.fullVersion;
};

export const getDetailedVersionInfo = (): string => {
  const versionInfo = getVersionInfo();
  return `Version ${versionInfo.version}\nBuild ${versionInfo.buildNumber}\nPlatform ${versionInfo.platform}\nEnvironment ${versionInfo.environment}`;
}; 