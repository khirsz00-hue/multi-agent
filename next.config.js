/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Ignore resend module if not available
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push('resend')
    }
    return config
  },
}

module.exports = nextConfig
