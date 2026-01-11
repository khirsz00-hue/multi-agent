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
    // Make resend an external module on the server to avoid bundling issues
    // This allows the system to work without resend installed
    if (isServer) {
      config.externals = config.externals || []
      // Only externalize if it's not already in node_modules
      if (!config.externals.includes('resend')) {
        config.externals.push({
          resend: 'commonjs resend'
        })
      }
    }
    return config
  },
}

module.exports = nextConfig
