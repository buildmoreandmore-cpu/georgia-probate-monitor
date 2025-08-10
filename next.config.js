/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['playwright', 'pdf-parse', '@prisma/client', 'prisma']
  },
  // Skip database operations during build
  env: {
    SKIP_ENV_VALIDATION: 'true'
  }
}

module.exports = nextConfig