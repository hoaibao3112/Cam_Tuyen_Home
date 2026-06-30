/**
 * /api/ping/route.ts
 * Endpoint dùng để UptimeRobot ping giữ Render API không ngủ.
 * UptimeRobot ping https://your-vercel-app.vercel.app/api/ping mỗi 5 phút
 * → Next.js gọi luôn Render API để giữ warm.
 */
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
// Không cache response này
export const revalidate = 0

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  if (!apiUrl) {
    return NextResponse.json({ status: 'ok', api: 'no-url' })
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(`${apiUrl}/health`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timer)

    return NextResponse.json({
      status: 'ok',
      api: res.ok ? 'warm' : 'error',
      apiStatus: res.status,
      timestamp: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({
      status: 'ok',
      api: 'cold-or-down',
      timestamp: new Date().toISOString(),
    })
  }
}
