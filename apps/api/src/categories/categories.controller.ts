import { Controller, Get, Post, Put, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common'
import { CategoriesService } from './categories.service'
import { ApiKeyGuard } from '../common/guards/api-key.guard'

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // Public: Lấy danh sách danh mục theo shop_slug
  @Get(':slug')
  getCategories(@Param('slug') slug: string) {
    return this.categoriesService.getCategories(slug)
  }

  // Admin only: Tạo danh mục mới
  @Post()
  @UseGuards(ApiKeyGuard)
  createCategory(@Body() body: { shop_slug: string; name: string }) {
    return this.categoriesService.createCategory(body)
  }

  // Admin only: Sắp xếp danh mục
  @Patch('reorder')
  @UseGuards(ApiKeyGuard)
  reorderCategories(
    @Body() body: { shop_slug: string; order: { id: string; sort_order: number }[] }
  ) {
    return this.categoriesService.reorderCategories(body.shop_slug, body.order)
  }

  // Admin only: Cập nhật tên danh mục
  @Put(':id')
  @UseGuards(ApiKeyGuard)
  updateCategory(
    @Param('id') id: string,
    @Body() body: { shop_slug: string; name: string }
  ) {
    return this.categoriesService.updateCategory(id, body.shop_slug, body.name)
  }

  // Admin only: Xóa danh mục
  @Delete(':id')
  @UseGuards(ApiKeyGuard)
  deleteCategory(@Param('id') id: string) {
    return this.categoriesService.deleteCategory(id)
  }
}
