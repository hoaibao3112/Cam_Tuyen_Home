import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common'
import { StatsService } from './stats.service'
import { ApiKeyGuard } from '../common/guards/api-key.guard'

@Controller('stats')
@UseGuards(ApiKeyGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('summary')
  async getSummary(
    @Query('shop_slug') shopSlug: string,
    @Query('year') yearStr?: string,
    @Query('month') monthStr?: string,
  ) {
    if (!shopSlug) throw new BadRequestException('Thiếu shop_slug')
    const now = new Date()
    const year = yearStr ? parseInt(yearStr, 10) : now.getFullYear()
    const month = monthStr ? parseInt(monthStr, 10) : now.getMonth() + 1
    if (isNaN(year) || isNaN(month)) throw new BadRequestException('year/month không hợp lệ')
    return this.statsService.getSummary(shopSlug, year, month)
  }

  @Get('revenue-chart')
  async getRevenueChart(
    @Query('shop_slug') shopSlug: string,
    @Query('year') yearStr?: string,
  ) {
    if (!shopSlug) throw new BadRequestException('Thiếu shop_slug')
    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear()
    if (isNaN(year)) throw new BadRequestException('year không hợp lệ')
    return this.statsService.getRevenueChart(shopSlug, year)
  }

  @Get('top-products')
  async getTopProducts(
    @Query('shop_slug') shopSlug: string,
    @Query('year') yearStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    if (!shopSlug) throw new BadRequestException('Thiếu shop_slug')
    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear()
    const limit = limitStr ? parseInt(limitStr, 10) : 5
    if (isNaN(year)) throw new BadRequestException('year không hợp lệ')
    return this.statsService.getTopProducts(shopSlug, year, limit)
  }

  // ── Mới ──────────────────────────────────────────────────────────────────

  /** Thống kê hôm nay: doanh thu, số đơn, trạng thái, 5 đơn mới nhất */
  @Get('today')
  async getToday(@Query('shop_slug') shopSlug: string) {
    if (!shopSlug) throw new BadRequestException('Thiếu shop_slug')
    return this.statsService.getToday(shopSlug)
  }

  /** Biểu đồ 30 ngày gần nhất (daily granularity) */
  @Get('daily-chart')
  async getDailyChart(@Query('shop_slug') shopSlug: string) {
    if (!shopSlug) throw new BadRequestException('Thiếu shop_slug')
    return this.statsService.getDailyChart(shopSlug)
  }

  /** Tỷ lệ trạng thái đơn hàng (pending/done/cancelled) */
  @Get('order-status')
  async getOrderStatus(
    @Query('shop_slug') shopSlug: string,
    @Query('year') yearStr?: string,
    @Query('month') monthStr?: string,
  ) {
    if (!shopSlug) throw new BadRequestException('Thiếu shop_slug')
    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear()
    const month = monthStr ? parseInt(monthStr, 10) : undefined
    return this.statsService.getOrderStatus(shopSlug, year, month)
  }

  /** Top danh mục bán chạy */
  @Get('top-categories')
  async getTopCategories(
    @Query('shop_slug') shopSlug: string,
    @Query('year') yearStr?: string,
    @Query('month') monthStr?: string,
  ) {
    if (!shopSlug) throw new BadRequestException('Thiếu shop_slug')
    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear()
    const month = monthStr ? parseInt(monthStr, 10) : undefined
    return this.statsService.getTopCategories(shopSlug, year, month)
  }
}
