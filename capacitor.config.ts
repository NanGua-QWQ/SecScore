import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.sectl.secscore',
  appName: 'SecScore',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Preferences: {
      group: 'SecScore'
    }
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      signingType: 'apksigner'
    }
  }
}

export default config
