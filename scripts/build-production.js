#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting production build process...');

// Check if eas-cli is installed
try {
  execSync('eas --version', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ EAS CLI is not installed. Please install it first:');
  console.error('npm install -g @expo/eas-cli');
  process.exit(1);
}

// Check if logged in
try {
  execSync('eas whoami', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ Not logged in to EAS. Please login first:');
  console.error('eas login');
  process.exit(1);
}

// Clean and build
console.log('📦 Cleaning project...');
try {
  execSync('npx expo install --fix', { stdio: 'inherit' });
} catch (error) {
  console.warn('⚠️  Warning: Some dependencies might need manual fixing');
}

console.log('🔨 Building for production...');
try {
  execSync('eas build --platform android --profile production', { stdio: 'inherit' });
  console.log('✅ Production build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

console.log('📱 Build artifacts are available in your EAS dashboard');
console.log('🔗 https://expo.dev/accounts/[your-account]/projects/[your-project]/builds'); 