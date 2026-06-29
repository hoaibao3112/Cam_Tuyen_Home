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
    if (!shopSlug) {
      throw new BadRequestException('Thiếu tham số shop_slug')
    }

    const currentDate = new Date()
    const year = yearStr ? parseInt(yearStr, 10) : currentDate.getFullYear()
    const month = monthStr ? parseInt(monthStr, 10) : currentDate.getMonth() + 1

    if (isNaN(year) || isNaN(month)) {
      throw new BadRequestException('Tham số year hoặc month không hợp lệ')
    }

    return this.statsService.getSummary(shopSlug, year, month)
  }

  @Get('revenue-chart')
  async getRevenueChart(
    @Query('shop_slug') shopSlug: string,
    @Query('year') yearStr?: string,
  ) {
    if (!shopSlug) {
      throw new BadRequestException('Thiếu tham số shop_slug')
    }

    const currentDate = new Date()
    const year = yearStr ? parseInt(yearStr, 10) : currentDate.getFullYear()

    if (isNaN(year)) {
      throw new BadRequestException('Tham số year không hợp lệ')
    }

    return this.statsService.getRevenueChart(shopSlug, year)
  }

  @Get('top-products')
  async getTopProducts(
    @Query('shop_slug') shopSlug: string,
    @Query('year') yearStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    if (!shopSlug) {
      throw new BadRequestException('Thiếu tham số shop_slug')
    }

    const currentDate = new Date()
    const year = yearStr ? parseInt(yearStr, 10) : currentDate.getFullYear()
    const limit = limitStr ? parseInt(limitStr, 10) : 5

    if (isNaN(year) || isNaN(limit)) {
      throw new BadRequestException('Tham số year hoặc limit không hợp lệ')
    }

    return this.statsService.getTopProducts(shopSlug, year, limit)
  }
}
