import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { CleanupService } from './cleanup.service'
import { SupabaseModule } from '../supabase/supabase.module'

@Module({
  imports: [ScheduleModule.forRoot(), SupabaseModule],
  providers: [CleanupService],
})
export class CleanupModule {}
