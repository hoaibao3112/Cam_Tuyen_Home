import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'
import { MenuService } from '../menu/menu.service'

@Injectable()
export class CategoriesService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly menuService: MenuService,
  ) {}

  // Không hỗ trợ rename category vì sẽ làm menu_items.category cũ không khớp tên mới, làm món bị lạc nhóm. Muốn đổi tên phải xóa category cũ (khi rỗng) và tạo category mới, hoặc cập nhật cascade menu_items.category trong 1 transaction riêng nếu sau này cần.

  async getCategories(shop_slug: string) {
    const { data, error } = await this.supabase.db
      .from('categories')
      .select('*')
      .eq('shop_slug', shop_slug)
      .order('sort_order', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
  }

  async createCategory(body: { shop_slug: string; name: string }) {
    const { shop_slug, name } = body
    const trimmedName = name.trim()

    // 1. Get-or-create logic: Tìm xem danh mục này đã tồn tại chưa (so khớp không phân biệt hoa thường và khoảng trắng)
    const { data: existingList, error: findError } = await this.supabase.db
      .from('categories')
      .select('*')
      .eq('shop_slug', shop_slug)

    if (findError) throw new Error(findError.message)

    const targetNameLower = trimmedName.toLowerCase()
    const foundExisting = (existingList || []).find(
      cat => cat.name.trim().toLowerCase() === targetNameLower
    )

    if (foundExisting) {
      // Trả về record đã tồn tại
      return foundExisting
    }

    // 2. Chưa tồn tại thì tìm max sort_order
    let maxSortOrder = -1
    if (existingList && existingList.length > 0) {
      maxSortOrder = Math.max(...existingList.map(cat => cat.sort_order || 0))
    }
    const newSortOrder = maxSortOrder + 1

    // 3. Tiến hành insert mới
    const { data, error } = await this.supabase.db
      .from('categories')
      .insert({
        shop_slug,
        name: trimmedName,
        sort_order: newSortOrder,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    
    // Xóa cache menu
    this.menuService.clearCache()
    return data
  }

  async reorderCategories(shop_slug: string, order: { id: string; sort_order: number }[]) {
    const results = await Promise.allSettled(
      order.map(item =>
        this.supabase.db
          .from('categories')
          .update({ sort_order: item.sort_order })
          .eq('id', item.id)
          .eq('shop_slug', shop_slug)
      )
    )

    const failedIds: string[] = []
    results.forEach((res, index) => {
      if (res.status === 'rejected' || (res.value && res.value.error)) {
        failedIds.push(order[index].id)
      }
    })

    // Xóa cache menu
    this.menuService.clearCache()

    if (failedIds.length > 0) {
      throw new BadRequestException(
        `Lưu thứ tự chưa đầy đủ, vui lòng thử lại. Các ID lỗi: ${failedIds.join(', ')}`
      )
    }

    return { success: true }
  }

  async deleteCategory(id: string) {
    // 1. Tìm thông tin category để lấy shop_slug và tên
    const { data: category, error: getError } = await this.supabase.db
      .from('categories')
      .select('*')
      .eq('id', id)
      .single()

    if (getError || !category) {
      throw new NotFoundException('Không tìm thấy danh mục để xóa')
    }

    const { shop_slug, name } = category
    const catNameLower = name.trim().toLowerCase()

    // 2. Kiểm tra xem có menu_items nào thuộc category này hay không
    const { data: menuItems, error: itemsError } = await this.supabase.db
      .from('menu_items')
      .select('id, category')
      .eq('shop_slug', shop_slug)

    if (itemsError) throw new Error(itemsError.message)

    const hasLinkedItems = (menuItems || []).some(
      item => (item.category || '').trim().toLowerCase() === catNameLower
    )

    if (hasLinkedItems) {
      throw new BadRequestException(
        'Không thể xóa danh mục này vì vẫn còn sản phẩm đang thuộc danh mục.'
      )
    }

    // 3. Tiến hành xóa
    const { error: deleteError } = await this.supabase.db
      .from('categories')
      .delete()
      .eq('id', id)

    if (deleteError) throw new Error(deleteError.message)

    // Xóa cache menu
    this.menuService.clearCache()

    return { success: true }
  }

  async updateCategory(id: string, shop_slug: string, newName: string) {
    const trimmedNewName = newName.trim()
    if (!trimmedNewName) {
      throw new BadRequestException('Tên danh mục mới không được trống')
    }

    // 1. Tìm thông tin category cũ
    const { data: category, error: getError } = await this.supabase.db
      .from('categories')
      .select('*')
      .eq('id', id)
      .eq('shop_slug', shop_slug)
      .single()

    if (getError || !category) {
      throw new NotFoundException('Không tìm thấy danh mục để cập nhật')
    }

    const oldName = category.name
    if (oldName.trim().toLowerCase() === trimmedNewName.toLowerCase()) {
      return category
    }

    // 2. Cập nhật tên trong bảng categories
    const { error: updateError } = await this.supabase.db
      .from('categories')
      .update({ name: trimmedNewName })
      .eq('id', id)

    if (updateError) {
      throw new BadRequestException('Không thể cập nhật tên danh mục: ' + updateError.message)
    }

    // 3. Cập nhật tất cả menu_items thuộc category cũ sang category mới
    const { error: itemsUpdateError } = await this.supabase.db
      .from('menu_items')
      .update({ category: trimmedNewName })
      .eq('shop_slug', shop_slug)
      .eq('category', oldName)

    if (itemsUpdateError) {
      console.error('Lỗi cascade cập nhật menu_items:', itemsUpdateError.message)
    }

    // Xóa cache menu
    this.menuService.clearCache()

    return { id, name: trimmedNewName }
  }
}
