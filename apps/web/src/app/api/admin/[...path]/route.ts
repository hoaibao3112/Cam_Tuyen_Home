import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Proxy bảo mật cho các admin API call.
 * - Kiểm tra session Supabase server-side (không cần gửi adminApiKey ra client)
 * - Tự gắn x-api-key từ env server-side trước khi forward lên NestJS
 *
 * Route: /api/admin/[...path]
 * Ví dụ: POST /api/admin/menu → POST {API_URL}/menu (với x-api-key tự động)
 *        PUT  /api/admin/menu/123 → PUT {API_URL}/menu/123
 *        DELETE /api/admin/menu/123 → DELETE {API_URL}/menu/123
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
  const targetUrl = `${apiUrl}/${pathSegments}`

  // 3. Lấy API key từ env server-side (KHÔNG bao giờ ra client)
  const adminApiKey = process.env.ADMIN_API_KEY || 'ynuquan_secret_api_key_2026'

  // 4. Forward request
  const headers: Record<string, string> = {
    'x-api-key': adminApiKey,
    'Content-Type': 'application/json',
  }

  let body: string | undefined
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    body = await req.text()
  }

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
  })

  const data = await response.json().catch(() => ({}))
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
export async function DELETE(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handleRequest(req, ctx)
}
