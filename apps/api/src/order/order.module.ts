import { Module } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'
import { OrderController } from './order.controller'
import { OrderService } from './order.service'

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
