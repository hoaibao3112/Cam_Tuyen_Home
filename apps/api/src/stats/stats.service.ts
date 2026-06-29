import { Injectable, BadRequestException } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'

@Injectable()
export class StatsService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Helper to query orders for a specific year
   */
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

    if (error) {
      throw new BadRequestException('Lỗi khi lấy dữ liệu hóa đơn: ' + error.message)
    }

    return orders || []
  }

  /**
   * Get overview statistics (yearly + monthly revenue and order count)
   */
  async getSummary(shop_slug: string, year: number, month: number) {
    const orders = await this.getOrdersForYear(shop_slug, year)

    let yearlyRevenue = 0
    let yearlyOrdersCount = orders.length

    let monthlyRevenue = 0
    let monthlyOrdersCount = 0

    orders.forEach((order) => {
      const price = order.total_price || 0
      yearlyRevenue += price

      const orderDate = new Date(order.created_at)
      const orderMonth = orderDate.getMonth() + 1 // 1-indexed

      if (orderMonth === month) {
        monthlyRevenue += price
        monthlyOrdersCount++
      }
    })

    return {
      monthlyRevenue,
      yearlyRevenue,
      monthlyOrdersCount,
      yearlyOrdersCount,
    }
  }

  /**
   * Get monthly revenue and order counts for chart rendering
   */
  async getRevenueChart(shop_slug: string, year: number) {
    const orders = await this.getOrdersForYear(shop_slug, year)

    const chartData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      revenue: 0,
      ordersCount: 0,
    }))

    orders.forEach((order) => {
      const orderDate = new Date(order.created_at)
      const orderMonth = orderDate.getMonth() // 0-indexed
      const price = order.total_price || 0

      if (orderMonth >= 0 && orderMonth < 12) {
        chartData[orderMonth].revenue += price
        chartData[orderMonth].ordersCount++
      }
    })

    return chartData
  }

  /**
   * Get top selling products for the given year
   */
  async getTopProducts(shop_slug: string, year: number, limit: number) {
    const orders = await this.getOrdersForYear(shop_slug, year)

    const productMap = new Map<string, { id: string; name: string; quantitySold: number; revenue: number }>()

    orders.forEach((order) => {
      const items = (order.items || []) as any[]
      items.forEach((item) => {
        const id = item.menu_item_id
        if (!id) return

        const name = item.name || 'Không tên'
        const qty = item.quantity || 0
        const price = item.price || 0

        const existing = productMap.get(id)
        if (existing) {
          existing.quantitySold += qty
          existing.revenue += price * qty
        } else {
          productMap.set(id, {
            id,
            name,
            quantitySold: qty,
            revenue: price * qty,
          })
        }
      })
    })

    return Array.from(productMap.values())
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, limit)
  }
}
