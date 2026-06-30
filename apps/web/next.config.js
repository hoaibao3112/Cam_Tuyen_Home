/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        // Hỗ trợ cả URL gốc lẫn URL transform (render/v1)
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        // Supabase Pro: Image Transform endpoint
        pathname: '/storage/v1/render/v1/object/public/**',
      },
    ],
    // Tự động convert sang WebP/AVIF, giảm dung lượng 30-50%
    formats: ['image/avif', 'image/webp'],
    // Breakpoint phù hợp mobile-first
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [64, 128, 256, 384],
    // Cache ảnh đã optimize 60 ngày — tránh re-optimize mỗi deploy
    minimumCacheTTL: 5184000,
    // Cho phép SVG inline (dùng cho blurDataURL)
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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

