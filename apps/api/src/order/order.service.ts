import { Injectable, BadRequestException } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'
import { CreateOrderDto } from './dto/create-order.dto'
import axios from 'axios'

@Injectable()
export class OrderService {
  constructor(private readonly supabase: SupabaseService) {}

  async createOrder(dto: CreateOrderDto) {
    // 1. Validate items không rỗng
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Đơn hàng phải có ít nhất 1 món')
    }

    // 2. Tạo mã đơn hàng
    const orderCode = `DH${Date.now()}`
    const total = dto.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    )

    // 3. Lưu vào Supabase
    const { data: order, error } = await this.supabase.db
      .from('orders')
      .insert({
        order_code: orderCode,
        shop_slug: dto.shop_slug,
        customer_name: dto.customer_name,
        customer_phone: dto.customer_phone,
        items: dto.items,
        total_price: total,
        note: dto.note || '',
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw new BadRequestException('Lỗi lưu đơn hàng: ' + error.message)

    // 4. Gửi thông báo Messenger (fire-and-forget, không block response)
    this.sendMessengerNotification(dto, orderCode, total).catch((err) =>
      console.error('Messenger notification failed:', err.message),
    )

    // 5. Trả về link mở Messenger cho khách
    const messengerUrl = `https://m.me/${process.env.FB_PAGE_ID}?ref=order_${orderCode}`

    return {
      success: true,
      order_code: orderCode,
      total_price: total,
      messenger_url: messengerUrl,
    }
  }

  private async sendMessengerNotification(
    dto: CreateOrderDto,
    orderCode: string,
    total: number,
  ) {
    const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN
    const pageInboxPsid = process.env.FB_ADMIN_PSID // PSID của tài khoản admin nhận thông báo

    if (!pageAccessToken || !pageInboxPsid) {
      console.warn('Thiếu FB_PAGE_ACCESS_TOKEN hoặc FB_ADMIN_PSID — bỏ qua gửi Messenger')
      return
    }

    const itemsList = dto.items
      .map(
        (i) =>
          `• ${i.name} x${i.quantity} — ${(i.price * i.quantity).toLocaleString('vi-VN')}đ`,
      )
      .join('\n')

    const message =
      `🛎️ ĐƠN HÀNG MỚI - ${orderCode}\n` +
      `👤 Khách: ${dto.customer_name}\n` +
      `📞 SĐT: ${dto.customer_phone}\n` +
      `───────────────\n` +
      `${itemsList}\n` +
      `───────────────\n` +
      `💰 Tổng: ${total.toLocaleString('vi-VN')}đ\n` +
      (dto.note ? `📝 Ghi chú: ${dto.note}` : '')

    await axios.post(
      `https://graph.facebook.com/v19.0/me/messages`,
      {
        recipient: { id: pageInboxPsid }, // Phải là PSID của admin, không phải Page ID
        message: { text: message },
      },
      {
        params: { access_token: pageAccessToken },
      },
    )
  }
}
