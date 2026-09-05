import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.netherite.app',
  appName: 'Netherite',
  webDir: 'public',
  server: {
    url: 'https://craftnetherite.vercel.app',
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: [
      'craftnetherite.vercel.app',
      'accounts.google.com',
      'accounts.youtube.com',
      'ssl.gstatic.com',
      '*.google.com',
      '*.googleusercontent.com',
      '*.googleapis.com',
    ],
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#09090b',
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    overrideUserAgent:
      'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
  },
};

export default config;
