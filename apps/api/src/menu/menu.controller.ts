import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common'
import { MenuService } from './menu.service'
import { ApiKeyGuard } from '../common/guards/api-key.guard'

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // Public: khách hàng xem menu (hoặc admin xem tất cả nếu truyền thêm ?all=true)
  @Get(':slug')
  getMenu(@Param('slug') slug: string, @Query('all') all?: string) {
    return this.menuService.getMenuBySlug(slug, all === 'true')
  }

  // Admin only: cần header x-api-key
  @Post()
  @UseGuards(ApiKeyGuard)
  createItem(@Body() body: any) {
    return this.menuService.createItem(body)
  }

  @Put(':id')
  @UseGuards(ApiKeyGuard)
  updateItem(@Param('id') id: string, @Body() body: any) {
    return this.menuService.updateItem(id, body)
  }

  @Delete(':id')
  @UseGuards(ApiKeyGuard)
  deleteItem(@Param('id') id: string) {
    return this.menuService.deleteItem(id)
  }
}
