import { Controller, Post, Body, Get, Query, HttpCode, Headers, UseGuards } from '@nestjs/common'
import { OrderService } from './order.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { ApiKeyGuard } from '../common/guards/api-key.guard'

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

  // Debug endpoint — chỉ admin mới được xem, không expose ra ngoài production
  @Get('botcake-debug')
  @UseGuards(ApiKeyGuard)
  getBotcakeDebug() {
    return this.orderService.getBotcakeLogs()
  }

  @Post('botcake-webhook')
  @HttpCode(200)
  async handleBotcakeWebhook(
    @Body() body: any,
    @Headers() headers: any,
    @Query() query: any,
  ) {
    this.orderService.logBotcakeWebhook(body, headers, query)
    return this.orderService.handleBotcakeWebhook({ ...query, ...body })
  }
}
