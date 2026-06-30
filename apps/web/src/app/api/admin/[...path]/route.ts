import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidateTag, revalidatePath } from 'next/cache'

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
  try {
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

    // 3. Lay API key tu env server-side (KHONG bao gio ra client)
    // KHONG duoc fallback ve key cung trong source code - neu thieu env phai fail ngay
    // de tranh truong hop deploy thieu config ma van "chay duoc" bang key cu da bi lo.
    const adminApiKey = process.env.ADMIN_API_KEY
    if (!adminApiKey) {
      console.error('[admin proxy] Thieu bien moi truong ADMIN_API_KEY tren server')
      return NextResponse.json(
        { message: 'Loi cau hinh server: thieu ADMIN_API_KEY' },
        { status: 500 },
      )
    }

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

    // Nếu là thao tác ghi thành công đối với menu hoặc categories, xóa cache
    if (response.ok && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (pathSegments.startsWith('menu') || pathSegments.startsWith('categories')) {
        try {
          revalidateTag('menu')
          revalidatePath('/menu/[slug]', 'page')
        } catch (e) {
          console.error('Error revalidating cache:', e)
        }
      }
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    console.error(`[admin proxy error] Path: ${params.path.join('/')}, Method: ${req.method}, Error:`, error)
    return NextResponse.json(
      { message: error?.message || 'Có lỗi xảy ra khi kết nối tới hệ thống máy chủ backend' },
      { status: 500 }
    )
  }
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
