/**
 * image-helper.ts
 * Tối ưu ảnh Supabase Storage:
 * - Nếu Supabase Pro: dùng /render/v1/ để resize tại nguồn
 * - Nếu Supabase Free: trả về URL gốc (Next.js Image sẽ optimize phía client)
 * - Luôn tạo blurDataURL dạng SVG inline để hiện placeholder mờ ngay lập tức
 */

/**
 * Chuyển Supabase Storage URL sang URL có transform resize.
 * Chỉ hoạt động khi Supabase Pro plan.
 * Free plan sẽ trả về 400 → Next.js tự fallback về URL gốc.
 */
export function getSupabaseImageUrl(
  url: string | undefined | null,
  options: {
    width?: number
    quality?: number
    format?: 'origin' | 'webp' | 'avif'
  } = {}
): string {
  if (!url) return ''

  const { width = 800, quality = 80, format = 'origin' } = options

  try {
    // Chỉ transform URL từ Supabase Storage
    if (!url.includes('supabase.co/storage/v1/object/public/')) {
      return url
    }

    // Đổi /object/public/ → /render/v1/object/public/
    const transformed = url.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/v1/object/public/'
    )

    const parsed = new URL(transformed)
    parsed.searchParams.set('width', String(width))
    parsed.searchParams.set('quality', String(quality))
    if (format !== 'origin') {
      parsed.searchParams.set('format', format)
    }
    return parsed.toString()
  } catch {
    return url
  }
}

/**
 * URL ảnh thumbnail nhỏ cho card sản phẩm (400px wide, quality 75)
 */
export function getCardImageUrl(url: string | undefined | null): string {
  return getSupabaseImageUrl(url, { width: 400, quality: 75 })
}

/**
 * URL ảnh lớn cho modal chi tiết (800px wide, quality 85)
 */
export function getModalImageUrl(url: string | undefined | null): string {
  return getSupabaseImageUrl(url, { width: 800, quality: 85 })
}

/**
 * Tạo blurDataURL dạng SVG inline — hiện ngay lập tức không cần fetch gì cả.
 * Màu sắc khớp với palette của trang (#F5F0E8 = nền kem nhạt của shop).
 */
export const BLUR_DATA_URL =
  'data:image/svg+xml;base64,' +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3">
      <filter id="b"><feGaussianBlur stdDeviation="1"/></filter>
      <rect width="4" height="3" fill="#EDE8E0" filter="url(#b)"/>
    </svg>`
  ).toString('base64')

/**
 * blurDataURL màu xanh lá nhạt — dùng cho sản phẩm rau/hoa
 */
export const BLUR_DATA_URL_GREEN =
  'data:image/svg+xml;base64,' +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3">
      <filter id="b"><feGaussianBlur stdDeviation="1"/></filter>
      <rect width="4" height="3" fill="#EBF3EC" filter="url(#b)"/>
    </svg>`
  ).toString('base64')
