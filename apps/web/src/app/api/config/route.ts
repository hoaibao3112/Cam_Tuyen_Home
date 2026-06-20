import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    shopSlug: process.env.NEXT_PUBLIC_SHOP_SLUG || 'quan-test',
  })
}
