import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  owner: 'hangon_there',
  name: 'Ledgerist',
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
    bundleIdentifier: 'com.ledgerist.app',
    infoPlist: {
      NSFaceIDUsageDescription: 'Use Face ID to unlock the app',
      ITSAppUsesNonExemptEncryption: false,
      // TODO: When you have your iOS OAuth client ID from Google Cloud Console,
      // replace REVERSED_IOS_CLIENT_ID below with the reversed client ID
      // (e.g. if your iOS client ID is "278595331130-abc.apps.googleusercontent.com"
      // the reversed form is "com.googleusercontent.apps.278595331130-abc")
      // CFBundleURLTypes: [{ CFBundleURLSchemes: ['REVERSED_IOS_CLIENT_ID'] }],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#2a2d3a',
    },
    predictiveBackGestureEnabled: false,
    package: 'com.rey.financialapp',
    permissions: [
      'USE_BIOMETRIC',
      'USE_FINGERPRINT',
      'RECEIVE_BOOT_COMPLETED',
      'VIBRATE',
      'android.permission.USE_BIOMETRIC',
      'android.permission.USE_FINGERPRINT',
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.SCHEDULE_EXACT_ALARM',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    ['expo-router', { root: './src/app' }],
    'expo-sqlite',
    ['expo-local-authentication', { faceIDPermission: 'Allow Ledgerist to use Face ID' }],
    ['expo-notifications', { icon: './assets/icon.png', color: '#6366f1' }],
    'expo-font',
    '@react-native-community/datetimepicker',
    'expo-web-browser',
    'expo-build-properties',
  ],
  scheme: 'ledgerist',
  extra: {
    router: { root: './src/app' },
    eas: { projectId: 'ce6f994c-af83-460b-b2e7-9da17211800e' },
  },
});
