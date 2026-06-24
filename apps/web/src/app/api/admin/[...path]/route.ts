import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidateTag } from 'next/cache'

/**
 * Proxy bảo mật cho các admin API call.
 * - Kiểm tra session Supabase server-side (không cần gửi adminApiKey ra client)
 * - Tự gắn x-api-key từ env server-side trước khi forward lên NestJS
 *
 * Route: /api/admin/[...path]
 * Ví dụ: POST /api/admin/menu             → POST {API_URL}/menu
 *        PUT  /api/admin/menu/123          → PUT  {API_URL}/menu/123
 *        POST /api/admin/menu/upload-image → POST {API_URL}/menu/upload-image (multipart)
 */

async function getSupabaseSession() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    },
  )
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

async function handleRequest(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  // 1. Kiểm tra đăng nhập Supabase
  const session = await getSupabaseSession()
  if (!session) {
    return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
  }

  // 2. Xây dựng URL đích
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const pathSegments = params.path.join('/')
  const searchParams = req.nextUrl.searchParams.toString()
  const targetUrl = `${apiUrl}/${pathSegments}${searchParams ? '?' + searchParams : ''}`

  // 3. Lấy API key từ env server-side (KHÔNG bao giờ ra client)
  const adminApiKey = process.env.ADMIN_API_KEY || 'ynuquan_secret_api_key_2026'

  // 4. Detect nếu là multipart (upload ảnh) — forward nguyên body + Content-Type
  const isMultipart = req.headers.get('content-type')?.includes('multipart/form-data')

  let forwardHeaders: Record<string, string> = {
    'x-api-key': adminApiKey,
  }

  let body: BodyInit | undefined

  if (req.method !== 'GET' && req.method !== 'DELETE') {
    if (isMultipart) {
      // Forward multipart nguyên vẹn — để multer phía NestJS xử lý
      // Phải giữ Content-Type gốc (có boundary) thì multer mới parse được
      forwardHeaders['content-type'] = req.headers.get('content-type')!
      body = await req.arrayBuffer().then(buf => Buffer.from(buf))
    } else {
      forwardHeaders['content-type'] = 'application/json'
      body = await req.text()
    }
  }

  const response = await fetch(targetUrl, {
    method: req.method,
    headers: forwardHeaders,
    body,
  })

  const data = await response.json().catch(() => ({}))

  // Nếu là thao tác ghi thành công đối với menu, xóa cache tag 'menu'
  if (response.ok && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    if (pathSegments.startsWith('menu')) {
      try {
        revalidateTag('menu')
      } catch (e) {
        console.error('Error revalidating tag:', e)
      }
    }
  }

  return NextResponse.json(data, { status: response.status })
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handleRequest(req, ctx)
}
export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handleRequest(req, ctx)
}
export async function PUT(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handleRequest(req, ctx)
}
export async function PATCH(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handleRequest(req, ctx)
}
export async function DELETE(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handleRequest(req, ctx)
}
