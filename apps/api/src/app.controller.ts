import { Controller, Get } from '@nestjs/common'
import { SupabaseService } from './supabase/supabase.service'

@Controller()
export class AppController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  getHello() {
    return { message: 'YNuQuan API is running!' }
  }

  @Get('health')
  async getHealth() {
    try {
      // Truy vấn tối thiểu: chỉ lấy ID của 1 món ăn để giữ kết nối hoạt động
      const { error } = await this.supabase.db
        .from('menu_items')
        .select('id')
        .limit(1)

      if (error) throw error

      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      }
    } catch (err: any) {
      return {
        status: 'error',
        database: 'disconnected',
        message: err.message,
        timestamp: new Date().toISOString(),
      }
    }
  }
}
