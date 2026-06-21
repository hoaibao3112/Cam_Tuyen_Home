import { Controller, Post, Body, Get, Query, HttpCode } from '@nestjs/common'
import { OrderService } from './order.service'
import { CreateOrderDto } from './dto/create-order.dto'

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  createOrder(@Body() dto: CreateOrderDto) {
    return this.orderService.createOrder(dto)
  }

  @Get('fb-webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    return this.orderService.verifyWebhook(mode, token, challenge)
  }

  @Post('fb-webhook')
  @HttpCode(200)
  async handleWebhook(@Body() body: any) {
    await this.orderService.handleWebhookPayload(body)
    return 'EVENT_RECEIVED'
  }

  @Post('botcake-webhook')
  @HttpCode(200)
  async handleBotcakeWebhook(@Body() body: { ref: string }) {
    return this.orderService.handleBotcakeWebhook(body)
  }
}
