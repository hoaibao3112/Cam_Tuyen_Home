'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { MenuItem } from './page'
import Image from 'next/image'
import { createClient } from '@/lib/supabase-client'
import { getProductUnit } from '@/lib/product-helper'
import { getCardImageUrl, getModalImageUrl, BLUR_DATA_URL } from '@/lib/image-helper'

// Helper: trả về stagger class dựa theo index (tối đa 12 mức)
function getStaggerClass(index: number): string {
  const n = Math.min(index + 1, 12)
  return `stagger-${n}`
}

// Preload ảnh vào browser cache trước khi modal mở
function preloadImage(url: string) {
  if (typeof window === 'undefined') return
  const img = new window.Image()
  img.src = url
}

// Lazy-load OrderPanel: chi can khi khach mo gio hang, khong nen nam trong bundle ban dau
const OrderPanel = dynamic(() => import('./OrderPanel'), { ssr: false })

export interface CartItem extends MenuItem {
  quantity: number
}

// Badge label cho từng category (map theo tên category từ backend)
const CATEGORY_BADGE: Record<string, string> = {
  'Rau Củ Quả Đà Lạt': 'Organic',
  'Hoa Tươi': 'VietGAP',
  'Trái Cây Nhập Khẩu': 'Nhập Khẩu',
  'Bánh Kẹo & Hạt Organic': 'Đặc Sản',
  'Đồ Sấy & Đặc Sản Đà Lạt': 'Đặc Sản',
}

const BADGE_COLOR: Record<string, string> = {
  'Organic': 'bg-emerald-600',
  'VietGAP': 'bg-blue-600',
  'Nhập Khẩu': 'bg-amber-600',
  'Đặc Sản': 'bg-rose-600',
}

// Helper to get unit label based on category name and custom unit
function getItemUnit(category: string, itemUnit?: string | null): string {
  return getProductUnit(category, itemUnit)
}

export default function MenuClient({
  items: initialItems,
  slug,
}: {
  items: MenuItem[]
  slug: string
}) {
  const supabase = createClient()

  const [items, setItems] = useState<MenuItem[]>(initialItems)
  const [cart, setCart] = useState<CartItem[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [activeSubCategory, setActiveSubCategory] = useState<string>('all')
  const [showOrderPanel, setShowOrderPanel] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  // Key dùng để re-trigger stagger animation mỗi khi đổi category/subcategory
  const [gridAnimKey, setGridAnimKey] = useState(0)
  // Track trạng thái load ảnh trong modal
  const [modalImageLoaded, setModalImageLoaded] = useState(false)

  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/menu/${slug}`)
      if (!res.ok) return
      const data: MenuItem[] = await res.json()
      setItems(data)
    } catch (err) {
      console.error('[MenuClient] Lỗi refetch:', err)
    }
  }, [slug])

  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current)
    refetchTimer.current = setTimeout(() => refetchItems(), 400)
  }, [refetchItems])

  useEffect(() => {
    const channel = supabase
      .channel(`menu-realtime-${slug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `shop_slug=eq.${slug}` }, () => scheduleRefetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `shop_slug=eq.${slug}` }, () => scheduleRefetch())
      .subscribe()

    // Da bo polling 60s: Supabase Realtime da du de bat thay doi, polling chi tao tai khong can thiet len Render free tier
    return () => {
      supabase.removeChannel(channel)
      if (refetchTimer.current) clearTimeout(refetchTimer.current)
    }
  }, [slug, scheduleRefetch, refetchItems])

  // Categories theo thứ tự xuất hiện trong data
  const categories = useMemo(() => {
    const seen = new Set<string>()
    const ordered: string[] = []
    items.forEach((item) => {
      if (!seen.has(item.category)) {
        seen.add(item.category)
        ordered.push(item.category)
      }
    })
    return ordered
  }, [items])

  // Set default category khi load xong
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0])
    }
  }, [categories, activeCategory])

  // Reset loading state mỗi khi mở modal sản phẩm khác
  useEffect(() => {
    setModalImageLoaded(false)
  }, [selectedItem?.id])

  const subCategories = useMemo(() => {
    const subs = items
      .filter((i) => i.category === activeCategory)
      .map((i) => i.sub_category?.trim())
      .filter((s): s is string => !!s)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    return Array.from(new Set(subs)).sort((a, b) => a.localeCompare(b))
  }, [items, activeCategory])

  const hasNullSubCategory = useMemo(() => {
    const activeItems = items.filter((i) => i.category === activeCategory)
    const hasSomeSub = activeItems.some((i) => !!i.sub_category)
    const hasSomeNoSub = activeItems.some((i) => !i.sub_category)
    return hasSomeSub && hasSomeNoSub
  }, [items, activeCategory])

  const filtered = useMemo(() => {
    let result = items.filter((i) => activeCategory === '' || i.category === activeCategory)
    if (activeSubCategory !== 'all') {
      if (activeSubCategory === 'other') {
        result = result.filter((i) => !i.sub_category)
      } else {
        result = result.filter((i) => {
          const s = i.sub_category?.trim()
          if (!s) return false
          return (s.charAt(0).toUpperCase() + s.slice(1)) === activeSubCategory
        })
      }
    }
    return result
  }, [items, activeCategory, activeSubCategory])

  const totalQty = cart.reduce((s, i) => s + i.quantity, 0)
  const totalPrice = cart.reduce((s, i) => s + i.price * i.quantity, 0)

  function addToCart(item: MenuItem) {
    if (item.track_stock && item.stock !== undefined && item.stock !== null) {
      const currentQtyInCart = getQty(item.id)
      if (currentQtyInCart >= item.stock) {
        alert(`Rất tiếc, sản phẩm "${item.name}" chỉ còn lại ${item.stock} cái/kg trong kho.`)
        return
      }
    }
    setCart((prev) => {
      const exists = prev.find((c) => c.id === item.id)
      if (exists) return prev.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  function removeFromCart(id: string) {
    setCart((prev) => {
      const exists = prev.find((c) => c.id === id)
      if (!exists) return prev
      if (exists.quantity === 1) return prev.filter((c) => c.id !== id)
      return prev.map((c) => c.id === id ? { ...c, quantity: c.quantity - 1 } : c)
    })
  }

  function getQty(id: string) {
    return cart.find((c) => c.id === id)?.quantity || 0
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-slate-800 flex flex-col">

      {/* ===== HEADER ===== */}
      <header className="bg-white border-b border-[#E8E0D0] shadow-sm sticky top-0 z-30">
        {/* Top bar: logo + info */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-3">
          {/* LEFT: Phone & Facebook (Desktop only) */}
          <div className="flex-1 lg:flex hidden flex-col gap-2">
            {/* Phone row */}
            <a href="tel:0375023839" className="flex items-center gap-3 text-left group">
              <div className="size-8 rounded-full bg-[#EBF3EC] flex items-center justify-center text-[#2D5A27] group-hover:bg-[#2D5A27] group-hover:text-white transition-all shrink-0">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-[#2D5A27] text-xs sm:text-sm leading-tight">037.502.3839</p>
                <p className="text-[#8B7355] text-[10px] sm:text-xs">Đặt hàng & tư vấn</p>
              </div>
            </a>
            {/* Facebook row */}
            <a href="https://www.facebook.com/camtuyen.nguyenthi.187" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-left group">
              <div className="size-8 rounded-full bg-[#EBF3EC] flex items-center justify-center text-[#2D5A27] group-hover:bg-[#2D5A27] group-hover:text-white transition-all shrink-0">
                <svg className="size-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-[#2D1810] text-xs sm:text-sm leading-tight">{"C\u1EA9m Tuy\u1EC1n House's"}</p>
                <p className="text-[#8B7355] text-[10px] sm:text-xs">Nhắn tin ngay trên Facebook</p>
              </div>
            </a>
          </div>

          {/* Search Button for Mobile only */}
          <button className="p-2 text-[#4A3728] hover:text-[#2D5A27] transition-colors lg:hidden" aria-label="Tìm kiếm">
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* CENTER: Logo + Brand */}
          <div className="flex flex-col items-center relative -top-1 sm:-top-1.5 shrink-0 mx-4">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24">
              <Image
                src="/logooo11.png"
                alt="Cẩm Tuyền House's"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="text-center mt-0.5">
              <p className="font-bold text-[#2D5A27] text-base sm:text-lg leading-tight" style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}>
                {"C\u1EA9m Tuy\u1EC1n House's"}
              </p>
              <p className="text-[#8B7355] text-[10px] tracking-widest font-medium">SINCE 2021</p>
            </div>
          </div>

          {/* RIGHT: Delivery & Freshness (Desktop only) */}
          <div className="flex-1 lg:flex hidden flex-col gap-2 items-end">
            {/* Delivery row */}
            <div className="flex items-center gap-3 text-right">
              <div>
                <p className="font-bold text-[#2D5A27] text-xs sm:text-sm leading-tight">Giao trong ngày</p>
                <p className="text-[#8B7355] text-[10px] sm:text-xs">Đặt trước 10:00 sáng</p>
              </div>
              <div className="size-8 rounded-full bg-[#EBF3EC] flex items-center justify-center text-[#2D5A27] shrink-0">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 18h14M5 18a2 2 0 11-4 0 2 2 0 014 0zm14 0a2 2 0 11-4 0 2 2 0 014 0zm-7-4v-7H4v7h8zm0 0v-5h5l2.5 3H20v2h-8z" />
                </svg>
              </div>
            </div>
            {/* Freshness row */}
            <div className="flex items-center gap-3 text-right">
              <div>
                <p className="font-bold text-[#2D5A27] text-xs sm:text-sm leading-tight">100% Đà Lạt tươi</p>
                <p className="text-[#8B7355] text-[10px] sm:text-xs">Chọn lọc mỗi buổi sáng</p>
              </div>
              <div className="size-8 rounded-full bg-[#EBF3EC] flex items-center justify-center text-[#2D5A27] shrink-0">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 20A7 7 0 019.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.58 1 9.2a7 7 0 01-14 3.19M11 20c2.2-2.2 4.9-5.2 6-8" />
                </svg>
              </div>
            </div>
          </div>

          {/* Spacer for Mobile only to keep centered */}
          <div className="w-9 lg:hidden" aria-hidden="true" />
        </div>

        {/* Nav categories */}
        <nav className="flex items-center gap-0 overflow-x-auto scrollbar-none px-4 sm:px-8 border-t border-[#E8E0D0]">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat)
                setActiveSubCategory('all')
                setGridAnimKey(k => k + 1)
              }}
              className={`shrink-0 px-3 sm:px-5 py-3 text-[11px] sm:text-sm font-bold transition-all duration-250 border-b-2 whitespace-nowrap ${
                activeCategory === cat
                  ? 'border-[#2D5A27] text-[#2D5A27]'
                  : 'border-transparent text-[#6B5E4E] hover:text-[#2D5A27] hover:border-[#2D5A27]/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </nav>

        {/* SubCategory bar */}
        {subCategories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none px-4 sm:px-8 py-2.5 bg-[#F5F0E8] border-t border-[#E8E0D0]">
            <button
              onClick={() => { setActiveSubCategory('all'); setGridAnimKey(k => k + 1) }}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all duration-200 ${
                activeSubCategory === 'all'
                  ? 'bg-[#2D5A27] text-white scale-[1.04] shadow-sm'
                  : 'bg-white text-[#6B5E4E] border border-[#D4C4A8] hover:bg-[#F0EAE0] hover:scale-[1.02]'
              }`}
            >
              Tất cả
            </button>
            {subCategories.map((sub) => (
              <button
                key={sub}
                onClick={() => { setActiveSubCategory(sub); setGridAnimKey(k => k + 1) }}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all duration-200 ${
                  activeSubCategory === sub
                    ? 'bg-[#2D5A27] text-white scale-[1.04] shadow-sm'
                    : 'bg-white text-[#6B5E4E] border border-[#D4C4A8] hover:bg-[#F0EAE0] hover:scale-[1.02]'
                }`}
              >
                {sub}
              </button>
            ))}
            {hasNullSubCategory && (
              <button
                onClick={() => { setActiveSubCategory('other'); setGridAnimKey(k => k + 1) }}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all duration-200 ${
                  activeSubCategory === 'other'
                    ? 'bg-[#2D5A27] text-white scale-[1.04] shadow-sm'
                    : 'bg-white text-[#6B5E4E] border border-[#D4C4A8] hover:bg-[#F0EAE0] hover:scale-[1.02]'
                }`}
              >
                Khác
              </button>
            )}
          </div>
        )}
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex flex-1 max-w-[1400px] w-full mx-auto">

        {/* ===== CỘT TRÁI: PRODUCT GRID ===== */}
        <main className="flex-1 lg:max-w-[calc(100%-380px)]">
          {/* Mobile Quick Info Grid */}
          <div className="lg:hidden grid grid-cols-2 gap-2 px-4 pt-5 pb-2">
            {/* Phone */}
            <a href="tel:0375023839" className="flex items-center gap-2.5 p-2.5 bg-white border border-[#E8E0D0] rounded-xl active:scale-[0.98] transition-all">
              <div className="size-7 rounded-full bg-[#EBF3EC] flex items-center justify-center text-[#2D5A27] shrink-0">
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[#2D5A27] text-[11px] leading-tight truncate">037.502.3839</p>
                <p className="text-[#8B7355] text-[9px]">Đặt hàng & tư vấn</p>
              </div>
            </a>
            {/* Facebook */}
            <a href="https://www.facebook.com/camtuyen.nguyenthi.187" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-2.5 bg-white border border-[#E8E0D0] rounded-xl active:scale-[0.98] transition-all">
              <div className="size-7 rounded-full bg-[#EBF3EC] flex items-center justify-center text-[#2D5A27] shrink-0">
                <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[#2D1810] text-[11px] leading-tight truncate">Cẩm Tuyền House</p>
                <p className="text-[#8B7355] text-[9px]">Nhắn tin ngay</p>
              </div>
            </a>
            {/* Delivery */}
            <div className="flex items-center gap-2.5 p-2.5 bg-white border border-[#E8E0D0] rounded-xl">
              <div className="size-7 rounded-full bg-[#EBF3EC] flex items-center justify-center text-[#2D5A27] shrink-0">
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M5 18h14M5 18a2 2 0 11-4 0 2 2 0 014 0zm14 0a2 2 0 11-4 0 2 2 0 014 0zm-7-4v-7H4v7h8zm0 0v-5h5l2.5 3H20v2h-8z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[#2D5A27] text-[11px] leading-tight truncate">Giao trong ngày</p>
                <p className="text-[#8B7355] text-[9px]">Đặt trước 10:00 sáng</p>
              </div>
            </div>
            {/* Freshness */}
            <div className="flex items-center gap-2.5 p-2.5 bg-white border border-[#E8E0D0] rounded-xl">
              <div className="size-7 rounded-full bg-[#EBF3EC] flex items-center justify-center text-[#2D5A27] shrink-0">
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M11 20A7 7 0 019.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.58 1 9.2a7 7 0 01-14 3.19M11 20c2.2-2.2 4.9-5.2 6-8" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[#2D5A27] text-[11px] leading-tight truncate">100% Đà Lạt tươi</p>
                <p className="text-[#8B7355] text-[9px]">Chọn lọc mỗi sáng</p>
              </div>
            </div>
          </div>
          {/* Category heading */}
          {activeCategory && (
            <div className="px-4 sm:px-8 pt-6 pb-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#2D1810]">{activeCategory}</h1>
              {activeCategory === 'Rau Củ Quả Đà Lạt' && (
                <p className="text-[#8B7355] text-sm mt-1">Hương vị thuần khiết từ cao nguyên, được chọn lọc kỹ lưỡng mỗi ngày cho bữa cơm gia đình trọn vẹn.</p>
              )}
            </div>
          )}

          {/* Product grid */}
          <div className="px-3 sm:px-8 pb-10">
            <div key={gridAnimKey} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {filtered.map((item, index) => {
                const qty = getQty(item.id)
                const badge = CATEGORY_BADGE[item.category]
                const badgeColor = badge ? (BADGE_COLOR[badge] ?? 'bg-[#2D5A27]') : null

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    onMouseEnter={() => { if (item.image_url) preloadImage(item.image_url) }}
                    onTouchStart={() => { if (item.image_url) preloadImage(item.image_url) }}
                    className={`animate-fade-in-up ${getStaggerClass(index)} bg-white rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-[#EDE8E0] hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 flex flex-col cursor-pointer group`}
                  >
                    {/* Image */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F5F0E8]">
                      {item.image_url ? (
                        <Image
                          src={getCardImageUrl(item.image_url)}
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          placeholder="blur"
                          blurDataURL={BLUR_DATA_URL}
                          quality={75}
                          priority={index < 6}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl bg-[#F5F0E8] select-none">
                          🌿
                        </div>
                      )}
                      {/* Badge */}
                      {badge && badgeColor && (
                        <span className={`absolute top-2 right-2 ${badgeColor} text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                          {badge}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-2.5 sm:p-4 flex flex-col flex-1">
                      <p className="text-[11px] sm:text-[12px] text-[#8B7355] font-medium leading-tight mb-0.5">
                        {item.category}
                      </p>
                      <p className="text-[#2D1810] font-bold text-sm sm:text-[15px] leading-snug line-clamp-2 flex-1 min-h-[2.5rem]">
                        {item.name}
                      </p>
                      <p className="text-[#2D5A27] font-extrabold text-sm sm:text-base mt-1.5">
                        {item.price.toLocaleString('vi-VN')}đ
                        {getItemUnit(item.category, item.unit) && (
                          <span className="text-xs text-[#8B7355] font-semibold ml-1">
                            / {getItemUnit(item.category, item.unit)}
                          </span>
                        )}
                      </p>
                      {item.track_stock && item.stock !== undefined && item.stock !== null && (
                        <p className={`text-[10px] font-bold mt-1 ${item.stock > 0 ? 'text-sky-700' : 'text-red-500 animate-pulse'}`}>
                          {item.stock > 0 ? `Còn lại: ${item.stock} ${getItemUnit(item.category, item.unit)}` : 'Đã hết hàng'}
                        </p>
                      )}

                      {/* Button */}
                      <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
                        {item.track_stock && item.stock !== undefined && item.stock !== null && item.stock <= 0 ? (
                          <button
                            disabled
                            className="w-full h-8 sm:h-9 bg-slate-100 text-slate-400 text-[11px] sm:text-xs font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-1.5"
                          >
                            Hết hàng
                          </button>
                        ) : qty === 0 ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); addToCart(item) }}
                            className="w-full h-8 sm:h-9 bg-[#2D5A27] hover:bg-[#1E3D1A] text-white text-[11px] sm:text-xs font-bold rounded-xl active:scale-[0.92] transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md"
                          >
                            <span className="text-sm leading-none">+</span> Chọn
                          </button>
                        ) : (
                          <div className="flex items-center justify-between bg-[#F0EAE0] border border-[#D4C4A8] rounded-xl overflow-hidden h-8 sm:h-9">
                            <button
                              onClick={(e) => { e.stopPropagation(); removeFromCart(item.id) }}
                              className="w-8 sm:w-10 h-full text-[#2D5A27] font-bold hover:bg-[#E8DDD0] active:bg-[#D4C4A8] transition-colors cursor-pointer flex items-center justify-center text-base"
                            >
                              −
                            </button>
                            <span key={qty} className="animate-qty-pop text-[#2D1810] font-extrabold text-xs sm:text-sm">{qty}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); addToCart(item) }}
                              className="w-8 sm:w-10 h-full text-[#2D5A27] font-bold hover:bg-[#E8DDD0] active:bg-[#D4C4A8] transition-colors cursor-pointer flex items-center justify-center text-base"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Empty product placeholder (giống design gốc) */}
              {filtered.length % 2 !== 0 && (
                <div className="hidden sm:flex bg-white/60 rounded-2xl border border-dashed border-[#D4C4A8] items-center justify-center aspect-[3/4] sm:aspect-auto sm:min-h-[280px] flex-col gap-2 text-[#B0A090]">
                  <span className="text-2xl">🌿</span>
                  <p className="text-xs font-medium text-center px-3">Đang cập nhật thêm sản phẩm tươi mới...</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* ===== CỘT PHẢI: ORDER PANEL (Desktop only) ===== */}
        <aside className="hidden lg:flex lg:w-[380px] border-l border-[#E8E0D0] bg-[#FAFAF7] flex-col sticky top-[var(--header-height,140px)] h-[calc(100vh-140px)] self-start">
          <OrderPanel
            cart={cart}
            slug={slug}
            onAdd={addToCart}
            onRemove={removeFromCart}
            onClear={() => setCart([])}
          />
        </aside>
      </div>

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#2D1810] text-white mt-auto">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-12 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <p className="font-bold text-xl mb-2" style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}>{"C\u1EA9m Tuy\u1EC1n House's"}</p>
            <p className="text-[#C4A882] text-sm leading-relaxed">
              Chúng tôi tin rằng thực phẩm không chỉ để ăn mà còn để nuôi dưỡng tâm hồn và gắn kết yêu thương. Mỗi sản phẩm tại Cẩm Tuyền đều chứa đựng sự tận tâm từ người nông dân.
            </p>
            <div className="flex items-center gap-4 mt-4 text-[#C4A882] text-sm">
              <a href="https://www.facebook.com/camtuyen.nguyenthi.187" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5">
                <svg className="size-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook: Nguyễn Thị Cẩm Tuyền
              </a>
            </div>
            <p className="text-[#C4A882] text-sm mt-2 flex items-center gap-1.5">
              <svg className="size-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
              037.502.3839
            </p>
          </div>

          {/* Khám phá */}
          <div>
            <p className="font-bold text-sm uppercase tracking-widest text-[#C4A882] mb-4">Khám Phá</p>
            <ul className="space-y-2.5 text-sm text-[#C4A882]">
              <li><a href="#" className="hover:text-white transition-colors">Về chúng tôi</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Chính sách giao hàng</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Hợp tác nông trại</a></li>
            </ul>
          </div>

          {/* Liên hệ */}
          <div>
            <p className="font-bold text-sm uppercase tracking-widest text-[#C4A882] mb-4">Liên Hệ</p>
            <ul className="space-y-2.5 text-sm text-[#C4A882]">
              <li>Địa chỉ: ~ Cầu Ngũ Hiệp, Cai Lậy, Tiền Giang</li>
              <li>Giờ mở cửa: 07:00 – 21:00</li>
            </ul>
          </div>

          {/* Kết nối Fanpage */}
          <div>
            <p className="font-bold text-sm uppercase tracking-widest text-[#C4A882] mb-4">Kết Nối Fanpage</p>
            <a
              href="https://www.facebook.com/camtuyen.nguyenthi.187"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-white p-2 rounded-xl hover:opacity-90 transition-opacity shadow-md"
            >
              <Image
                src="/QRTrang.png"
                alt="Facebook QR Code"
                width={112}
                height={112}
                className="w-28 h-28 object-contain"
              />
            </a>
            <p className="text-xs text-[#C4A882] mt-2">
              Quét mã để truy cập Facebook Page
            </p>
          </div>
        </div>

        <div className="border-t border-[#4A2D20] py-4 text-center text-[#8B6B55] text-xs">
          © 2024 Cẩm Tuyền House&apos;s. Chính Tươi – Sống Khoẻ – Yêu Thương.
        </div>
      </footer>

      {/* ===== MOBILE: Sticky bottom bar ===== */}
      {totalQty > 0 && (
        <div className="animate-slide-up lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-[#FAFAF7]/90 backdrop-blur-md border-t border-[#E8E0D0] z-40">
          <div className="h-14 bg-[#2D5A27] text-white rounded-2xl flex items-center justify-between px-4 shadow-[0_-4px_24px_rgba(45,90,39,0.35)]">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <svg className="size-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span key={totalQty} className="animate-qty-pop absolute -top-1.5 -right-1.5 bg-[#C4A882] text-[#2D1810] text-[9px] font-black size-4 rounded-full flex items-center justify-center">
                  {totalQty}
                </span>
              </div>
              <span className="text-xs font-bold">{totalQty} sản phẩm</span>
            </div>

            <button
              onClick={() => setShowOrderPanel(true)}
              className="bg-white text-[#2D5A27] hover:bg-[#F0EAE0] px-4 py-1.5 rounded-xl font-bold text-xs transition-all duration-200 active:scale-[0.94] cursor-pointer"
            >
              Xem đơn hàng
            </button>

            <span className="text-sm font-black">
              {totalPrice.toLocaleString('vi-VN')}đ
            </span>
          </div>
        </div>
      )}

      {/* ===== MOBILE: Order panel bottom sheet ===== */}
      {showOrderPanel && (
        <div className="animate-fade-in lg:hidden fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex flex-col justify-end">
          <div className="animate-slide-in-bottom bg-[#FAFAF7] rounded-t-[2rem] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <OrderPanel
                cart={cart}
                slug={slug}
                onAdd={addToCart}
                onRemove={removeFromCart}
                onClear={() => setCart([])}
                onClose={() => setShowOrderPanel(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ===== PRODUCT DETAIL MODAL ===== */}
      {selectedItem && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="animate-slide-in-bottom sm:[animation:fadeInUp_0.3s_ease_both] w-full sm:max-w-[480px] bg-white rounded-t-[2rem] sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto my-3 w-12 h-1 rounded-full bg-[#D4C4A8] sm:hidden shrink-0" />

            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 z-10 size-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex-1 overflow-y-auto pb-6">
              <div className="relative w-full aspect-[4/3] max-h-[360px] bg-[#F5F0E8] overflow-hidden shrink-0">
                {/* Shimmer skeleton hiện trong khi ảnh đang tải */}
                {!modalImageLoaded && selectedItem.image_url && (
                  <div className="absolute inset-0 z-10 animate-shimmer" />
                )}
                {selectedItem.image_url ? (
                  <Image
                    src={getModalImageUrl(selectedItem.image_url)}
                    alt={selectedItem.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 480px"
                    className={`object-cover transition-opacity duration-500 ${
                      modalImageLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    quality={85}
                    priority
                    onLoad={() => setModalImageLoaded(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl select-none">🌿</div>
                )}
              </div>

              <div className="px-5 sm:px-6 mt-4 flex flex-col">
                <span className="self-start px-2.5 py-1 bg-[#F0EAE0] text-[#2D5A27] text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-wider">
                  {selectedItem.category}
                </span>
                <h3 className="text-lg sm:text-2xl font-extrabold text-[#2D1810] mt-2.5 leading-tight">
                  {selectedItem.name}
                </h3>
                <p className="text-[#2D5A27] font-extrabold text-lg sm:text-2xl mt-2">
                  {selectedItem.price.toLocaleString('vi-VN')}đ
                  {getItemUnit(selectedItem.category, selectedItem.unit) && (
                    <span className="text-sm text-[#8B7355] font-semibold ml-1">
                      / {getItemUnit(selectedItem.category, selectedItem.unit)}
                    </span>
                  )}
                </p>
                {selectedItem.track_stock && selectedItem.stock !== undefined && selectedItem.stock !== null && (
                  <p className={`text-xs font-bold mt-1.5 ${selectedItem.stock > 0 ? 'text-sky-700' : 'text-red-500 animate-pulse'}`}>
                    {selectedItem.stock > 0 ? `Còn hàng (Số lượng có sẵn: ${selectedItem.stock} ${getItemUnit(selectedItem.category, selectedItem.unit)})` : 'Hết hàng'}
                  </p>
                )}
                <div className="mt-4 sm:mt-5 border-t border-[#EDE8E0] pt-4">
                  <h4 className="text-[10px] sm:text-xs font-extrabold text-[#8B7355] uppercase tracking-widest mb-1.5">
                    Chi tiết sản phẩm
                  </h4>
                  <p className="text-xs sm:text-sm text-[#6B5E4E] leading-relaxed whitespace-pre-line">
                    {selectedItem.description || 'Sản phẩm tươi ngon, chất lượng cao, được tuyển chọn kỹ lưỡng từ các nông trại uy tín.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-[#EDE8E0] bg-white shrink-0">
              {selectedItem.track_stock && selectedItem.stock !== undefined && selectedItem.stock !== null && selectedItem.stock <= 0 ? (
                <button
                  disabled
                  className="w-full h-12 bg-slate-200 text-slate-400 text-sm font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Hết hàng
                </button>
              ) : getQty(selectedItem.id) === 0 ? (
                <button
                  onClick={() => addToCart(selectedItem)}
                  className="w-full h-12 bg-[#2D5A27] hover:bg-[#1E3D1A] text-white text-sm font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Thêm vào đơn · {selectedItem.price.toLocaleString('vi-VN')}đ{getItemUnit(selectedItem.category, selectedItem.unit) ? ` / ${getItemUnit(selectedItem.category, selectedItem.unit)}` : ''}
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-[#F0EAE0] border border-[#D4C4A8] rounded-xl overflow-hidden h-12 px-1">
                    <button
                      onClick={() => removeFromCart(selectedItem.id)}
                      className="w-10 h-full text-[#2D5A27] font-bold hover:bg-[#E8DDD0] rounded-lg transition-colors cursor-pointer flex items-center justify-center text-lg"
                    >
                      −
                    </button>
                    <span className="text-[#2D1810] font-black text-sm px-4 select-none min-w-[2rem] text-center">
                      {getQty(selectedItem.id)}
                    </span>
                    <button
                      onClick={() => addToCart(selectedItem)}
                      className="w-10 h-full text-[#2D5A27] font-bold hover:bg-[#E8DDD0] rounded-lg transition-colors cursor-pointer flex items-center justify-center text-lg"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="flex-1 h-12 bg-[#C4A882] hover:bg-[#B8956E] text-[#2D1810] text-sm font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer shadow-md"
                  >
                    Đã chọn {getQty(selectedItem.id)} · Xem giỏ
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
