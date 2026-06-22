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
}

async function getMenuItems(slug: string): Promise<MenuItem[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/menu/${slug}`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
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
