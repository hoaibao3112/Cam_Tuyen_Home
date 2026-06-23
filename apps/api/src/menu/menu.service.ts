import { Injectable, NotFoundException } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'

@Injectable()
export class MenuService {
  private cache = new Map<string, { data: any; expiresAt: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor(private readonly supabase: SupabaseService) {}

  private clearCache() {
    this.cache.clear()
  }

  async getMenuBySlug(slug: string, includeInactive = false) {
    const cacheKey = `${slug}:${includeInactive}`
    const cached = this.cache.get(cacheKey)
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data
    }

    let query = this.supabase.db
      .from('menu_items')
      .select('*')
      .eq('shop_slug', slug)

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query.order('category')

    if (error) throw new NotFoundException('Không tìm thấy menu')
    
    this.cache.set(cacheKey, {
      data,
      expiresAt: Date.now() + this.CACHE_TTL,
    })

    return data
  }

  async createItem(body: any) {
    const { data, error } = await this.supabase.db
      .from('menu_items')
      .insert(body)
      .select()
      .single()

    if (error) throw new Error(error.message)
    this.clearCache()
    return data
  }

  async updateItem(id: string, body: any) {
    const { data, error } = await this.supabase.db
      .from('menu_items')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    this.clearCache()
    return data
  }

  async deleteItem(id: string) {
    const { error } = await this.supabase.db
      .from('menu_items')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    this.clearCache()
    return { success: true }
  }
}
