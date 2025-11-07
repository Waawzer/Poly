/** @type {import('next').NextConfig} */
const nextConfig = {
  // Activer l'instrumentation pour initialiser les services au démarrage
  // Note: L'instrumentation hook peut ralentir le démarrage en développement
  // On l'active quand même mais l'initialisation est non-bloquante
  experimental: {
    instrumentationHook: true,
  },
  webpack: (config, { isServer }) => {
    // Ignore optional dependencies that are not needed for web
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@react-native-async-storage/async-storage': false,
        'pino-pretty': false,
      }
    }
    
    // Ignore these optional modules in webpack (they're only needed for React Native/mobile)
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    }

    // Ignore warnings for optional peer dependencies
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /node_modules\/@metamask\/sdk/,
        message: /Can't resolve '@react-native-async-storage\/async-storage'/,
      },
      {
        module: /node_modules\/pino/,
        message: /Can't resolve 'pino-pretty'/,
      },
    ]

    return config
  },
}

module.exports = nextConfig
