import { Controller, Get } from '@nestjs/common'
import { SupabaseService } from './supabase/supabase.service'

@Controller()
export class AppController {
  private lastCleanupDate = ''

  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  getHello() {
    return { message: 'YNuQuan API is running!' }
  }

  @Get('health')
  async getHealth() {
    // Tự động dọn dẹp đơn hàng cũ hơn 15 ngày (chạy nền hàng ngày, không block health check)
    this.runCleanup().catch((err) =>
      console.error('[Cleanup] Lỗi dọn dẹp đơn hàng cũ:', err.message),
    )

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

  private async runCleanup() {
    const todayStr = new Date().toISOString().split('T')[0]
    // Nếu hôm nay đã chạy dọn dẹp rồi thì bỏ qua
    if (this.lastCleanupDate === todayStr) return

    const threshold = new Date()
    // Giữ lại 14 ngày đơn hàng gần nhất (ví dụ hôm nay là 20/6 thì giữ từ ngày 7/6 đến hết 20/6)
    // Xóa toàn bộ đơn hàng từ ngày 6/6 trở về trước (mốc thời gian bắt đầu ngày 7/6 00:00:00)
    threshold.setDate(threshold.getDate() - 13)
    threshold.setHours(0, 0, 0, 0)
    const thresholdDate = threshold.toISOString()

    // Xóa các đơn hàng được tạo trước mốc thời gian thresholdDate
    const { data, error } = await this.supabase.db
      .from('orders')
      .delete()
      .lt('created_at', thresholdDate)
      .select('id')

    if (error) throw error

    this.lastCleanupDate = todayStr
    if (data && data.length > 0) {
      console.log(`[Cleanup] Đã dọn dẹp tự động: Xóa thành công ${data.length} đơn hàng cũ (từ ${thresholdDate} trở về trước)`)
    }
  }
}
