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
    // Tự động convert sang WebP/AVIF, giảm dung lượng 30-50%
    formats: ['image/avif', 'image/webp'],
    // Các breakpoint phù hợp mobile-first (menu xem trên điện thoại là chủ yếu)
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [64, 128, 256, 384],
    // Cache ảnh đã optimize 30 ngày trên CDN của Next.js
    minimumCacheTTL: 2592000,
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
