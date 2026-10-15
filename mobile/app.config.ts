const version = (process.env.APP_VERSION || '0.1.0').replace(/^v/, '');
export default {
  expo: {
    name: 'Unser Alltag', slug: 'unser-alltag', version, orientation: 'portrait', scheme: 'unseralltag',
    userInterfaceStyle: 'light', icon: './assets/icon.png',
    ios: { bundleIdentifier: 'at.unseralltag.app', supportsTablet: true, buildNumber: process.env.BUILD_NUMBER || '1', infoPlist: { ITSAppUsesNonExemptEncryption: false } },
    android: { package: 'at.unseralltag.app', versionCode: Number(process.env.BUILD_NUMBER || 1), permissions: ['POST_NOTIFICATIONS'] },
    web: { bundler: 'metro', output: 'single', favicon: './assets/icon.png' },
    plugins: ['expo-secure-store', ['expo-notifications', { color: '#382C43' }], '@react-native-community/datetimepicker'],
    extra: { apiUrl: process.env.EXPO_PUBLIC_API_URL || '', updateManifest: process.env.EXPO_PUBLIC_UPDATE_MANIFEST || '', sideStoreSource: process.env.EXPO_PUBLIC_SIDESTORE_SOURCE || '' },
  },
};
