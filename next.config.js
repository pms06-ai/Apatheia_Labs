/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Next.js built-in ESLint to use custom flat config
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Static export for Tauri desktop app
  output: 'export',

  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Optimize images - use 'unoptimized' for static export
  images: {
    unoptimized: true,
    domains: [
      // Add your R2 public domain if using public bucket
      // 'your-bucket.r2.dev',
    ],
  },

  // Environment variables available on client
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  // Webpack configuration for better performance
  webpack: (config, { isServer }) => {
    // Optimize bundle size
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },

  // Skip trailing slash for Tauri compatibility
  trailingSlash: true,
}

module.exports = nextConfig
