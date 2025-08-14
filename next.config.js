/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['playwright', 'pdf-parse', '@prisma/client', 'prisma']
  },
  // Skip database operations during build
  env: {
    SKIP_ENV_VALIDATION: 'true'
  },
  // Exclude local-scraper from TypeScript compilation
  typescript: {
    ignoreBuildErrors: false,
  },
  // Exclude directories from compilation
  excludeDefaultMomentLocales: true,
  webpack: (config, { isServer }) => {
    // Exclude local-scraper directory from webpack compilation
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/local-scraper/**', '**/node_modules/**']
    }
    return config
  }
}

module.exports = nextConfig