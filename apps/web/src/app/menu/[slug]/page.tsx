import { notFound } from 'next/navigation'
import MenuClient from './MenuClient'

export interface MenuItem {
  id: string
  name: string
  price: number
  description?: string
  image_url?: string
  category: string
  sub_category?: string | null
  sort_order?: number
  track_stock?: boolean
  stock?: number
  import_price?: number
  unit?: string | null
}

async function getMenuItems(slug: string): Promise<MenuItem[]> {
  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/menu/${slug}`

  // Hàm fetch với timeout — tránh treo lâu khi Render cold start
  const fetchWithTimeout = async (ms: number): Promise<MenuItem[]> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ms)
    try {
      const res = await fetch(apiUrl, {
        signal: controller.signal,
        next: { revalidate: 60, tags: ['menu', `menu-${slug}`] },
      })
      if (!res.ok) return []
      return res.json()
    } catch {
      return []
    } finally {
      clearTimeout(timer)
    }
  }

  // Lần 1: timeout 4s — Render đã warm
  const items = await fetchWithTimeout(4000)
  if (items.length > 0) return items

  // Lần 2: retry sau 3s — Render đang cold start, chờ boot xong
  await new Promise((r) => setTimeout(r, 3000))
  return fetchWithTimeout(8000)
}

export async function generateStaticParams() {
  return [
    { slug: 'quan' }
  ]
}

export default async function MenuPage({
  params,
}: {
  params: { slug: string }
}) {
  const items = await getMenuItems(params.slug)
  if (!items.length) return notFound()

  return <MenuClient items={items} slug={params.slug} />
}
