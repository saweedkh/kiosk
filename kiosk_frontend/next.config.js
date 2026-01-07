/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode
  reactStrictMode: true,
  
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  
  // Optimize on-demand entries for better performance
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // 60 seconds
    pagesBufferLength: 10,
  },
  
  // Webpack configuration for better dev experience
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Use filesystem cache for faster builds
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      }
      // Reduce webpack logging noise
      config.infrastructureLogging = {
        level: 'error',
      }
    }
    return config
  },
  
  // Reduce logging in development
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
}

module.exports = nextConfig

