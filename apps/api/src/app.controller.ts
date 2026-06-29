import { Controller, Get, Res, HttpStatus } from '@nestjs/common'
import { Response } from 'express'
import { SupabaseService } from './supabase/supabase.service'

@Controller()
export class AppController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  getHello() {
    return { message: 'YNuQuan API is running!' }
  }

  @Get('health')
  async getHealth(@Res() res: Response): Promise<void> {
    try {
      const { error } = await this.supabase.db
        .from('menu_items')
        .select('id')
        .limit(1)

      if (error) throw error

      res.status(HttpStatus.OK).json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        database: 'disconnected',
        message,
        timestamp: new Date().toISOString(),
      })
    }
  }
}
