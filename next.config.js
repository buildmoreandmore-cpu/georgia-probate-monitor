/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['playwright', 'pdf-parse']
  }
}

module.exports = nextConfig