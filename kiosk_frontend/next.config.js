const isTauriBuild =
  process.env.TAURI_BUILD === '1' ||
  process.env.npm_lifecycle_event === 'build:tauri'

if (isTauriBuild) {
  console.log(
    '[next.config] Tauri static export enabled',
    `(TAURI_BUILD=${process.env.TAURI_BUILD}, lifecycle=${process.env.npm_lifecycle_event})`
  )
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Docker: standalone | Tauri: static export into ./out
  output: isTauriBuild ? 'export' : 'standalone',

  images: {
    unoptimized: isTauriBuild,
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

  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 10,
  },

  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      }
      config.infrastructureLogging = {
        level: 'error',
      }
    }
    return config
  },

  logging: {
    fetches: {
      fullUrl: false,
    },
  },
}

module.exports = nextConfig
