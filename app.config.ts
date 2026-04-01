import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Finance Tracker',
  slug: 'finance-tracker',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#2a2d3a',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.financetracker.app',
    infoPlist: {
      NSFaceIDUsageDescription: 'Use Face ID to unlock the app',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#2a2d3a',
    },
    predictiveBackGestureEnabled: false,
    package: 'com.rey.financialapp',
    googleServicesFile: './google-services.json',
    permissions: [
      'USE_BIOMETRIC',
      'USE_FINGERPRINT',
      'RECEIVE_BOOT_COMPLETED',
      'VIBRATE',
      'android.permission.USE_BIOMETRIC',
      'android.permission.USE_FINGERPRINT',
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    ['expo-router', { root: './src/app' }],
    'expo-sqlite',
    ['expo-local-authentication', { faceIDPermission: 'Allow Finance Tracker to use Face ID' }],
    ['expo-notifications', { icon: './assets/icon.png', color: '#6366f1' }],
    'expo-font',
    '@react-native-community/datetimepicker',
    'expo-web-browser',
  ],
  scheme: 'financetracker',
  extra: {
    router: { root: './src/app' },
    eas: { projectId: '8db1bddb-5763-48e0-a1bf-6128b68e2aad' },
    firebaseApiKey: process.env.FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppId: process.env.FIREBASE_APP_ID,
  },
});
