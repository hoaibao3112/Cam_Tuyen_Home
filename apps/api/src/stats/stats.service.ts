import { Injectable, BadRequestException } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'

/**
 * Convert any server date to Vietnam timezone offset (UTC+7) Date object.
 * So that local methods like getHours(), getFullYear(), getDate() will represent Vietnam time.
 */
function toVietnamDate(date: Date = new Date()): Date {
  const tzOffset = date.getTimezoneOffset()
  const targetOffset = -420 // GMT+7 is -420 minutes
  const diff = (tzOffset - targetOffset) * 60 * 1000
  return new Date(date.getTime() + diff)
}

/**
 * Convert a Date object representing Vietnam local time back to UTC Date.
 */
function toUtcDate(vnDate: Date): Date {
  const tzOffset = new Date().getTimezoneOffset()
  const targetOffset = -420
  const diff = (tzOffset - targetOffset) * 60 * 1000
  return new Date(vnDate.getTime() - diff)
}

/**
 * Format a Date object (with local VN components) as YYYY-MM-DD.
 */
function formatYYYYMMDD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

@Injectable()
export class StatsService {
  constructor(private readonly supabase: SupabaseService) {}

  // ─── Helper ───────────────────────────────────────────────────────────────

  private async getOrdersForYear(shop_slug: string, year: number) {
    const startOfYear = new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString()
    const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)).toISOString()

    const { data: orders, error } = await this.supabase.db
      .from('orders')
      .select('created_at, total_price, items, status')
      .eq('shop_slug', shop_slug)
      .neq('status', 'cancelled')
      .gte('created_at', startOfYear)
      .lte('created_at', endOfYear)

    if (error) throw new BadRequestException('Lỗi khi lấy dữ liệu hóa đơn: ' + error.message)
    return orders || []
  }

  private async getAllOrdersForYear(shop_slug: string, year: number) {
    // Kể cả cancelled — dùng cho status breakdown
    const startOfYear = new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString()
    const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)).toISOString()

    const { data, error } = await this.supabase.db
      .from('orders')
      .select('created_at, total_price, status')
      .eq('shop_slug', shop_slug)
      .gte('created_at', startOfYear)
      .lte('created_at', endOfYear)

    if (error) throw new BadRequestException('Lỗi lấy dữ liệu: ' + error.message)
    return data || []
  }

  // ─── Existing APIs ────────────────────────────────────────────────────────

  async getSummary(shop_slug: string, year: number, month: number) {
    const orders = await this.getOrdersForYear(shop_slug, year)

    let yearlyRevenue = 0
    let monthlyRevenue = 0
    let monthlyOrdersCount = 0

    orders.forEach((order) => {
      const price = order.total_price || 0
      yearlyRevenue += price
      const m = new Date(order.created_at).getMonth() + 1
      if (m === month) { monthlyRevenue += price; monthlyOrdersCount++ }
    })

    return {
      monthlyRevenue,
      yearlyRevenue,
      monthlyOrdersCount,
      yearlyOrdersCount: orders.length,
    }
  }

  async getRevenueChart(shop_slug: string, year: number) {
    const orders = await this.getOrdersForYear(shop_slug, year)

    const chartData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      revenue: 0,
      ordersCount: 0,
    }))

    orders.forEach((order) => {
      const m = new Date(order.created_at).getMonth()
      chartData[m].revenue += order.total_price || 0
      chartData[m].ordersCount++
    })

    return chartData
  }

  async getTopProducts(shop_slug: string, year: number, limit: number) {
    const orders = await this.getOrdersForYear(shop_slug, year)
    const map = new Map<string, { id: string; name: string; quantitySold: number; revenue: number }>()

    orders.forEach((order) => {
      ;(order.items || []).forEach((item: any) => {
        if (!item.menu_item_id) return
        const ex = map.get(item.menu_item_id)
        const qty = item.quantity || 0
        const price = item.price || 0
        if (ex) { ex.quantitySold += qty; ex.revenue += price * qty }
        else map.set(item.menu_item_id, { id: item.menu_item_id, name: item.name || '?', quantitySold: qty, revenue: price * qty })
      })
    })

    return Array.from(map.values())
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, limit)
  }

  // ─── NEW API 1: Hôm nay ───────────────────────────────────────────────────
  // GET /stats/today?shop_slug=xxx
  // Trả về: số đơn hôm nay, doanh thu hôm nay, đơn pending, đơn mới nhất

  async getToday(shop_slug: string) {
    const vnNow = toVietnamDate(new Date())
    
    const vnStartOfDay = new Date(vnNow)
    vnStartOfDay.setHours(0, 0, 0, 0)
    
    const vnEndOfDay = new Date(vnNow)
    vnEndOfDay.setHours(23, 59, 59, 999)

    const utcStart = toUtcDate(vnStartOfDay).toISOString()
    const utcEnd = toUtcDate(vnEndOfDay).toISOString()

    const { data, error } = await this.supabase.db
      .from('orders')
      .select('order_code, customer_name, total_price, status, created_at')
      .eq('shop_slug', shop_slug)
      .gte('created_at', utcStart)
      .lte('created_at', utcEnd)
      .order('created_at', { ascending: false })

    if (error) throw new BadRequestException('Lỗi lấy đơn hôm nay: ' + error.message)

    const orders = data || []
    const totalRevenue = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((s, o) => s + (o.total_price || 0), 0)

    const countByStatus = { pending: 0, confirmed: 0, done: 0, cancelled: 0 }
    orders.forEach(o => {
      const s = o.status as keyof typeof countByStatus
      if (s in countByStatus) countByStatus[s]++
    })

    return {
      totalOrders: orders.length,
      totalRevenue,
      countByStatus,
      recentOrders: orders.slice(0, 5).map(o => ({
        order_code: o.order_code,
        customer_name: o.customer_name,
        total_price: o.total_price,
        status: o.status,
        created_at: o.created_at,
      })),
    }
  }

  async getDailyChart(shop_slug: string) {
    const vnNow = toVietnamDate(new Date())
    const vnDays30Ago = new Date(vnNow)
    vnDays30Ago.setDate(vnNow.getDate() - 29)
    vnDays30Ago.setHours(0, 0, 0, 0)

    const utcStart = toUtcDate(vnDays30Ago).toISOString()
    const utcEnd = toUtcDate(vnNow).toISOString()

    const { data, error } = await this.supabase.db
      .from('orders')
      .select('created_at, total_price, status')
      .eq('shop_slug', shop_slug)
      .neq('status', 'cancelled')
      .gte('created_at', utcStart)
      .lte('created_at', utcEnd)

    if (error) throw new BadRequestException('Lỗi lấy daily chart: ' + error.message)

    // Tạo map 30 ngày sử dụng format YYYY-MM-DD
    const dateMap = new Map<string, { revenue: number; ordersCount: number }>()
    for (let i = 0; i < 30; i++) {
      const d = new Date(vnDays30Ago)
      d.setDate(vnDays30Ago.getDate() + i)
      const key = formatYYYYMMDD(d)
      dateMap.set(key, { revenue: 0, ordersCount: 0 })
    }

    ;(data || []).forEach(order => {
      // Chuyển created_at (UTC) sang VN time
      const vnOrderDate = toVietnamDate(new Date(order.created_at))
      const key = formatYYYYMMDD(vnOrderDate)
      const entry = dateMap.get(key)
      if (entry) {
        entry.revenue += order.total_price || 0
        entry.ordersCount++
      }
    })

    return Array.from(dateMap.entries()).map(([date, val]) => ({
      date,
      label: new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      ...val,
    }))
  }

  // ─── NEW API 3: Tỷ lệ trạng thái đơn hàng ────────────────────────────────
  // GET /stats/order-status?shop_slug=xxx&year=2025
  // Trả về: breakdown pending / confirmed / done / cancelled + tỷ lệ

  async getOrderStatus(shop_slug: string, year: number, month?: number) {
    const allOrders = await this.getAllOrdersForYear(shop_slug, year)

    const filtered = month
      ? allOrders.filter(o => new Date(o.created_at).getMonth() + 1 === month)
      : allOrders

    const counts = { pending: 0, confirmed: 0, done: 0, cancelled: 0, other: 0 }
    let cancelledRevenueLost = 0

    filtered.forEach(o => {
      const s = o.status as string
      if (s === 'pending') counts.pending++
      else if (s === 'confirmed') counts.confirmed++
      else if (s === 'done') counts.done++
      else if (s === 'cancelled') { counts.cancelled++; cancelledRevenueLost += o.total_price || 0 }
      else counts.other++
    })

    const total = filtered.length || 1
    return {
      total: filtered.length,
      counts,
      rates: {
        pending: +((counts.pending / total) * 100).toFixed(1),
        confirmed: +((counts.confirmed / total) * 100).toFixed(1),
        done: +((counts.done / total) * 100).toFixed(1),
        cancelled: +((counts.cancelled / total) * 100).toFixed(1),
      },
      cancelledRevenueLost,
    }
  }

  // ─── COMBINED: Overview tổng hợp (1 lần fetch orders, dùng chung cho 7 khối UI) ──
  // GET /stats/overview?shop_slug=xxx&year=2025&month=6
  // Thay thế việc gọi 7 API riêng lẻ — trong đó summary/revenue-chart/top-products/
  // top-categories trước đây MỖI cái tự fetch lại nguyên đơn hàng cả năm từ Supabase
  // (4 lần query giống hệt nhau). Giờ chỉ fetch orders 1 lần (+ 1 lần bản có cancelled
  // cho order-status), dùng chung cho tất cả phần tính toán.

  async getOverview(shop_slug: string, year: number, month: number) {
    const [ordersNoCancelled, allOrders, today, dailyData] = await Promise.all([
      this.getOrdersForYear(shop_slug, year),
      this.getAllOrdersForYear(shop_slug, year),
      this.getToday(shop_slug),
      this.getDailyChart(shop_slug),
    ])

    // ── Summary ──
    let yearlyRevenue = 0
    let monthlyRevenue = 0
    let monthlyOrdersCount = 0
    ordersNoCancelled.forEach((order) => {
      const price = order.total_price || 0
      yearlyRevenue += price
      const m = new Date(order.created_at).getMonth() + 1
      if (m === month) { monthlyRevenue += price; monthlyOrdersCount++ }
    })
    const summary = {
      monthlyRevenue,
      yearlyRevenue,
      monthlyOrdersCount,
      yearlyOrdersCount: ordersNoCancelled.length,
    }

    // ── Revenue chart (theo tháng trong năm) ──
    const chartData = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, revenue: 0, ordersCount: 0 }))
    ordersNoCancelled.forEach((order) => {
      const m = new Date(order.created_at).getMonth()
      chartData[m].revenue += order.total_price || 0
      chartData[m].ordersCount++
    })

    // ── Top products (theo năm) ──
    const productMap = new Map<string, { id: string; name: string; quantitySold: number; revenue: number }>()
    ordersNoCancelled.forEach((order) => {
      ;(order.items || []).forEach((item: any) => {
        if (!item.menu_item_id) return
        const ex = productMap.get(item.menu_item_id)
        const qty = item.quantity || 0
        const price = item.price || 0
        if (ex) { ex.quantitySold += qty; ex.revenue += price * qty }
        else productMap.set(item.menu_item_id, { id: item.menu_item_id, name: item.name || '?', quantitySold: qty, revenue: price * qty })
      })
    })
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5)

    // ── Order status (theo năm, lọc theo tháng nếu có, tính cả cancelled) ──
    const statusFiltered = month
      ? allOrders.filter(o => new Date(o.created_at).getMonth() + 1 === month)
      : allOrders
    const counts = { pending: 0, confirmed: 0, done: 0, cancelled: 0, other: 0 }
    let cancelledRevenueLost = 0
    statusFiltered.forEach(o => {
      const s = o.status as string
      if (s === 'pending') counts.pending++
      else if (s === 'confirmed') counts.confirmed++
      else if (s === 'done') counts.done++
      else if (s === 'cancelled') { counts.cancelled++; cancelledRevenueLost += o.total_price || 0 }
      else counts.other++
    })
    const statusTotal = statusFiltered.length || 1
    const orderStatus = {
      total: statusFiltered.length,
      counts,
      rates: {
        pending: +((counts.pending / statusTotal) * 100).toFixed(1),
        confirmed: +((counts.confirmed / statusTotal) * 100).toFixed(1),
        done: +((counts.done / statusTotal) * 100).toFixed(1),
        cancelled: +((counts.cancelled / statusTotal) * 100).toFixed(1),
      },
      cancelledRevenueLost,
    }

    // ── Top categories (theo năm, lọc theo tháng nếu có) ──
    const catFiltered = month
      ? ordersNoCancelled.filter(o => new Date(o.created_at).getMonth() + 1 === month)
      : ordersNoCancelled

    const allItemIds = new Set<string>()
    catFiltered.forEach(o => (o.items || []).forEach((i: any) => { if (i.menu_item_id) allItemIds.add(i.menu_item_id) }))

    let topCats: { category: string; quantitySold: number; revenue: number }[] = []
    if (allItemIds.size > 0) {
      const { data: menuItems } = await this.supabase.db
        .from('menu_items')
        .select('id, category')
        .in('id', Array.from(allItemIds))

      const categoryOf = new Map<string, string>()
      ;(menuItems || []).forEach((m: any) => categoryOf.set(m.id, m.category || 'Khác'))

      const catMap = new Map<string, { category: string; quantitySold: number; revenue: number }>()
      catFiltered.forEach(order => {
        ;(order.items || []).forEach((item: any) => {
          const cat = categoryOf.get(item.menu_item_id) || 'Khác'
          const qty = item.quantity || 0
          const price = item.price || 0
          const ex = catMap.get(cat)
          if (ex) { ex.quantitySold += qty; ex.revenue += price * qty }
          else catMap.set(cat, { category: cat, quantitySold: qty, revenue: price * qty })
        })
      })
      topCats = Array.from(catMap.values()).sort((a, b) => b.revenue - a.revenue)
    }

    return { summary, chartData, topProducts, today, dailyData, orderStatus, topCats }
  }
  // ─── NEW API 4: Top danh mục bán chạy ────────────────────────────────────
  // GET /stats/top-categories?shop_slug=xxx&year=2025&month=6
  // Trả về: top danh mục theo số lượng bán + doanh thu

  async getTopCategories(shop_slug: string, year: number, month?: number) {
    const orders = await this.getOrdersForYear(shop_slug, year)

    const filtered = month
      ? orders.filter(o => new Date(o.created_at).getMonth() + 1 === month)
      : orders

    // Lấy thêm category từ menu_items
    const allItemIds = new Set<string>()
    filtered.forEach(o => (o.items || []).forEach((i: any) => { if (i.menu_item_id) allItemIds.add(i.menu_item_id) }))

    if (allItemIds.size === 0) return []

    const { data: menuItems } = await this.supabase.db
      .from('menu_items')
      .select('id, category')
      .in('id', Array.from(allItemIds))

    const categoryOf = new Map<string, string>()
    ;(menuItems || []).forEach((m: any) => categoryOf.set(m.id, m.category || 'Khác'))

    const catMap = new Map<string, { category: string; quantitySold: number; revenue: number; orderCount: number }>()

    filtered.forEach(order => {
      ;(order.items || []).forEach((item: any) => {
        const cat = categoryOf.get(item.menu_item_id) || 'Khác'
        const qty = item.quantity || 0
        const price = item.price || 0
        const ex = catMap.get(cat)
        if (ex) { ex.quantitySold += qty; ex.revenue += price * qty }
        else catMap.set(cat, { category: cat, quantitySold: qty, revenue: price * qty, orderCount: 1 })
      })
    })

    return Array.from(catMap.values())
      .sort((a, b) => b.revenue - a.revenue)
  }
}
