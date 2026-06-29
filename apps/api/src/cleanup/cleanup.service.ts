import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { SupabaseService } from '../supabase/supabase.service'

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name)

  constructor(private readonly supabase: SupabaseService) {}

  // Chay luc 2:00 AM moi ngay
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldOrders(): Promise<void> {
    const threshold = new Date()
    threshold.setDate(threshold.getDate() - 13)
    threshold.setHours(0, 0, 0, 0)
    const thresholdDate = threshold.toISOString()

    this.logger.log(`[Cleanup] Bat dau don dep don hang truoc ${thresholdDate}`)

    const { data, error } = await this.supabase.db
      .from('orders')
      .delete()
      .lt('created_at', thresholdDate)
      .select('id')

    if (error) {
      this.logger.error('[Cleanup] Loi don dep don hang cu:', error.message)
      return
    }

    const count = data?.length ?? 0
    if (count > 0) {
      this.logger.log(`[Cleanup] Da xoa thanh cong ${count} don hang cu`)
    } else {
      this.logger.log('[Cleanup] Khong co don hang cu can xoa')
    }
  }
}
