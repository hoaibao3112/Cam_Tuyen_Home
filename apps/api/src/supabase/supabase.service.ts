import { Injectable } from '@nestjs/common'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SupabaseService {
  private client: SupabaseClient

  constructor() {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY

    if (!url || !key) {
      throw new Error(
        'Thiếu biến môi trường: SUPABASE_URL và SUPABASE_KEY là bắt buộc',
      )
    }

    this.client = createClient(url, key)
  }

  get db(): SupabaseClient {
    return this.client
  }
}
