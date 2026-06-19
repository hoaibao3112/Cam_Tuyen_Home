import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MenuModule } from './menu/menu.module'
import { OrderModule } from './order/order.module'
import { SupabaseModule } from './supabase/supabase.module'
import { AppController } from './app.controller'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    MenuModule,
    OrderModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

