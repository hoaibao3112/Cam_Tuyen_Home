/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vatucnvyteqdpjjdxgwn.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Tắt cache webpack ở môi trường dev để tránh lỗi ENOENT trên Windows/Monorepo
      config.cache = false;
    }
    return config;
  },
}

module.exports = nextConfig
