/**
 * ============================================================
 * UNIT TESTS — OrderService (toàn bộ luồng backend)
 * ============================================================
 * Tất cả external call (Supabase, Axios) đều được MOCK.
 * Không cần FB token, Telegram token, hay kết nối DB thật.
 * Chạy: cd apps/api && npx jest --testPathPattern=order.service
 * ============================================================
 */

import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { OrderService } from '../order.service'
import { SupabaseService } from '../../supabase/supabase.service'
import { CreateOrderDto } from '../dto/create-order.dto'
import axios from 'axios'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// ─── Factory helpers ──────────────────────────────────────────────────────────

/** Tạo mock Supabase client với chain method đầy đủ */
function buildMockDb() {
  const db: any = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    single: jest.fn(),
  }
  return db
}

/** DTO hợp lệ dùng xuyên suốt */
const VALID_ITEM_ID = 'e4a5fdc8-1111-2222-3333-444444444444'
const VALID_ITEM_ID_2 = 'b9c3aef1-5555-6666-7777-888888888888'

const validDto: CreateOrderDto = {
  shop_slug: 'quan-test',
  customer_name: 'Nguyen Van A',
  customer_phone: '0901234567',
  note: 'It cay',
  address_province: 'Tien Giang',
  address_district: 'Thanh pho My Tho',
  address_ward: 'Phuong 1',
  address_street: '123 Le Loi',
  items: [
    {
      menu_item_id: VALID_ITEM_ID,
      name: 'Com tam',
      price: 45000, // giá client gửi — service sẽ bỏ qua
      quantity: 2,
    },
  ],
}

/** Giả lập DB trả về menu_items */
const mockMenuItems = [
  { id: VALID_ITEM_ID, price: 45000, is_active: true },
  { id: VALID_ITEM_ID_2, price: 30000, is_active: false },
]

// ─── Setup ────────────────────────────────────────────────────────────────────

describe('OrderService — full flow', () => {
  let service: OrderService
  let db: ReturnType<typeof buildMockDb>

  beforeEach(async () => {
    db = buildMockDb()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: SupabaseService, useValue: { db } },
      ],
    }).compile()

    service = module.get<OrderService>(OrderService)

    // Đặt env giả cho mọi test
    process.env.FB_PAGE_ACCESS_TOKEN = 'fake-fb-token'
    process.env.FB_ADMIN_PSID = 'fake-admin-psid'
    process.env.FB_PAGE_ID = 'fake-page-id'
    process.env.FB_VERIFY_TOKEN = 'fake-verify-token'
    process.env.TELEGRAM_BOT_TOKEN = 'fake-tg-token'
    process.env.TELEGRAM_CHAT_ID = 'fake-tg-chat'
    process.env.ADMIN_API_KEY = 'fake-admin-key'

    jest.clearAllMocks()
    mockedAxios.post.mockResolvedValue({ data: {} })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. createOrder — luồng thành công
  // ═══════════════════════════════════════════════════════════════════════════

  describe('createOrder', () => {
    describe('✅ Happy path', () => {
      beforeEach(() => {
        // Mock query menu_items
        db.in.mockResolvedValue({ data: mockMenuItems, error: null })
        // Mock insert order
        db.single.mockResolvedValue({
          data: { order_code: 'DH_MOCK', total_price: 90000 },
          error: null,
        })
      })

      it('trả về success=true, order_code và total_price đúng', async () => {
        const result = await service.createOrder(validDto)

        expect(result.success).toBe(true)
        expect(result.order_code).toMatch(/^DH\d+$/)
        // Giá server (45000) x số lượng (2) = 90000, bỏ qua giá client
        expect(result.total_price).toBe(90000)
      })

      it('messenger_url chứa FB_PAGE_ID và order_code', async () => {
        const result = await service.createOrder(validDto)

        expect(result.messenger_url).toContain('fake-page-id')
        expect(result.messenger_url).toContain(`order=${result.order_code}`)
      })

      it('gọi Supabase insert với giá server, không phải giá client', async () => {
        await service.createOrder(validDto)

        expect(db.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            total_price: 90000,
            status: 'pending',
            items: expect.arrayContaining([
              expect.objectContaining({ price: 45000, quantity: 2 }),
            ]),
          }),
        )
      })

      it('lưu địa chỉ đầy đủ vào trường note', async () => {
        await service.createOrder(validDto)

        expect(db.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            note: expect.stringContaining('123 Le Loi'),
          }),
        )
        expect(db.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            note: expect.stringContaining('It cay'),
          }),
        )
      })

      it('gửi thông báo Messenger (fire-and-forget) sau khi lưu', async () => {
        await service.createOrder(validDto)
        await new Promise((r) => setTimeout(r, 50))

        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('graph.facebook.com'),
          expect.objectContaining({
            recipient: { id: 'fake-admin-psid' },
          }),
          expect.any(Object),
        )
      })

      it('gửi thông báo Telegram (fire-and-forget) sau khi lưu', async () => {
        await service.createOrder(validDto)
        await new Promise((r) => setTimeout(r, 50))

        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('api.telegram.org/botfake-tg-token/sendMessage'),
          expect.objectContaining({
            chat_id: 'fake-tg-chat',
            parse_mode: 'HTML',
            text: expect.stringContaining('Nguyen Van A'),
          }),
        )
      })

      it('đơn nhiều món: tính tổng đúng cho cả 2 món', async () => {
        const multiDto: CreateOrderDto = {
          ...validDto,
          items: [
            { menu_item_id: VALID_ITEM_ID, name: 'Com tam', price: 0, quantity: 2 },
            { menu_item_id: VALID_ITEM_ID_2, name: 'Che', price: 0, quantity: 1 },
          ],
        }
        db.in.mockResolvedValue({
          data: [
            { id: VALID_ITEM_ID, price: 45000, is_active: true },
            { id: VALID_ITEM_ID_2, price: 30000, is_active: true },
          ],
          error: null,
        })
        db.single.mockResolvedValue({ data: { order_code: 'DH_MULTI' }, error: null })

        const result = await service.createOrder(multiDto)
        // 45000*2 + 30000*1 = 120000
        expect(result.total_price).toBe(120000)
      })

      it('pickup (Tới quán lấy): địa chỉ ghi đúng vào note', async () => {
        const pickupDto: CreateOrderDto = {
          ...validDto,
          address_district: 'Tới quán lấy',
          address_ward: 'Tới quán lấy',
          address_street: undefined,
        }

        await service.createOrder(pickupDto)

        expect(db.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            note: expect.stringContaining('Khách tự tới quán lấy'),
          }),
        )
      })

      it('đơn không có ghi chú: note chỉ chứa địa chỉ, không có "Ghi chú:"', async () => {
        const noNoteDto: CreateOrderDto = { ...validDto, note: undefined }

        await service.createOrder(noNoteDto)

        const insertCall = db.insert.mock.calls[0][0]
        expect(insertCall.note).not.toContain('Ghi chú:')
        expect(insertCall.note).toContain('[Địa chỉ:')
      })
    })

    // ───────────────────────────────────────────────────────────────────────
    describe('❌ Validation & error cases', () => {
      it('throw BadRequestException khi items rỗng', async () => {
        await expect(
          service.createOrder({ ...validDto, items: [] }),
        ).rejects.toThrow(BadRequestException)

        expect(db.insert).not.toHaveBeenCalled()
      })

      it('throw BadRequestException khi menu_item_id không tồn tại trong DB', async () => {
        db.in.mockResolvedValue({ data: [], error: null }) // DB trả về empty

        await expect(service.createOrder(validDto)).rejects.toThrow(
          new BadRequestException(`Món "Com tam" không tồn tại hoặc đã bị xoá`),
        )
      })

      it('throw BadRequestException khi món bị is_active=false', async () => {
        db.in.mockResolvedValue({
          data: [{ id: VALID_ITEM_ID, price: 45000, is_active: false }],
          error: null,
        })

        await expect(service.createOrder(validDto)).rejects.toThrow(
          new BadRequestException(`Món "Com tam" hiện không còn phục vụ`),
        )
      })

      it('throw BadRequestException khi Supabase lỗi khi query menu_items', async () => {
        db.in.mockResolvedValue({ data: null, error: { message: 'DB timeout' } })

        await expect(service.createOrder(validDto)).rejects.toThrow(BadRequestException)
      })

      it('throw BadRequestException khi Supabase insert bị lỗi', async () => {
        db.in.mockResolvedValue({ data: mockMenuItems, error: null })
        db.single.mockResolvedValue({ data: null, error: { message: 'insert failed' } })

        await expect(service.createOrder(validDto)).rejects.toThrow(BadRequestException)
      })

      it('đơn hàng vẫn thành công dù gửi Telegram/FB bị lỗi (fire-and-forget)', async () => {
        db.in.mockResolvedValue({ data: mockMenuItems, error: null })
        db.single.mockResolvedValue({ data: { order_code: 'DH_OK' }, error: null })
        mockedAxios.post.mockRejectedValue(new Error('Network error'))

        // Không throw
        const result = await service.createOrder(validDto)
        expect(result.success).toBe(true)
      })

      it('không gửi Messenger nếu thiếu FB_PAGE_ACCESS_TOKEN', async () => {
        delete process.env.FB_PAGE_ACCESS_TOKEN

        db.in.mockResolvedValue({ data: mockMenuItems, error: null })
        db.single.mockResolvedValue({ data: { order_code: 'DH_OK' }, error: null })

        await service.createOrder(validDto)
        await new Promise((r) => setTimeout(r, 50))

        const fbCalls = mockedAxios.post.mock.calls.filter(([url]) =>
          url.includes('graph.facebook.com'),
        )
        expect(fbCalls).toHaveLength(0)
      })

      it('không gửi Telegram nếu thiếu TELEGRAM_BOT_TOKEN', async () => {
        delete process.env.TELEGRAM_BOT_TOKEN

        db.in.mockResolvedValue({ data: mockMenuItems, error: null })
        db.single.mockResolvedValue({ data: { order_code: 'DH_OK' }, error: null })

        await service.createOrder(validDto)
        await new Promise((r) => setTimeout(r, 50))

        const tgCalls = mockedAxios.post.mock.calls.filter(([url]) =>
          url.includes('api.telegram.org'),
        )
        expect(tgCalls).toHaveLength(0)
      })
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. verifyWebhook
  // ═══════════════════════════════════════════════════════════════════════════

  describe('verifyWebhook', () => {
    it('✅ trả về challenge khi mode=subscribe và token đúng', async () => {
      const result = await service.verifyWebhook('subscribe', 'fake-verify-token', 'abc123')
      expect(result).toBe('abc123')
    })

    it('❌ throw khi token sai', async () => {
      await expect(
        service.verifyWebhook('subscribe', 'wrong-token', 'abc123'),
      ).rejects.toThrow(BadRequestException)
    })

    it('❌ throw khi mode không phải subscribe', async () => {
      await expect(
        service.verifyWebhook('unsubscribe', 'fake-verify-token', 'abc123'),
      ).rejects.toThrow(BadRequestException)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. handleWebhookPayload — Facebook Messenger events
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleWebhookPayload', () => {
    const mockOrder = {
      order_code: 'DH123456',
      customer_name: 'Nguyen Van A',
      customer_phone: '0901234567',
      total_price: 90000,
      note: '[Địa chỉ: 123 Le Loi, Phuong 1, My Tho, Tiền Giang] - Ghi chú: It cay',
      items: [{ name: 'Com tam', price: 45000, quantity: 2 }],
    }

    beforeEach(() => {
      db.single.mockResolvedValue({ data: mockOrder, error: null })
    })

    it('✅ xử lý referral trực tiếp (event.referral.ref)', async () => {
      await service.handleWebhookPayload({
        object: 'page',
        entry: [
          {
            messaging: [
              { sender: { id: 'psid-001' }, referral: { ref: 'order--DH123456' } },
            ],
          },
        ],
      })

      expect(db.eq).toHaveBeenCalledWith('order_code', 'DH123456')
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('graph.facebook.com'),
        expect.objectContaining({ recipient: { id: 'psid-001' } }),
        expect.any(Object),
      )
    })

    it('✅ xử lý postback referral (event.postback.referral.ref)', async () => {
      await service.handleWebhookPayload({
        object: 'page',
        entry: [
          {
            messaging: [
              {
                sender: { id: 'psid-002' },
                postback: { referral: { ref: '2567571--order=DH123456' } },
              },
            ],
          },
        ],
      })

      expect(db.eq).toHaveBeenCalledWith('order_code', 'DH123456')
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('graph.facebook.com'),
        expect.objectContaining({ recipient: { id: 'psid-002' } }),
        expect.any(Object),
      )
    })

    it('✅ tin nhắn gửi đến khách chứa đầy đủ thông tin đơn', async () => {
      await service.handleWebhookPayload({
        object: 'page',
        entry: [
          {
            messaging: [
              { sender: { id: 'psid-003' }, referral: { ref: 'order_DH123456' } },
            ],
          },
        ],
      })

      const [, body] = mockedAxios.post.mock.calls[0]
      const text: string = (body as any).message.text
      expect(text).toContain('DH123456')
      expect(text).toContain('Nguyen Van A')
      expect(text).toContain('90.000đ')
      expect(text).toContain('Com tam (x2)')
    })

    it('⏭️  bỏ qua khi object không phải page', async () => {
      await service.handleWebhookPayload({ object: 'user', entry: [] })
      expect(db.from).not.toHaveBeenCalled()
    })

    it('⏭️  bỏ qua khi event không có referral', async () => {
      await service.handleWebhookPayload({
        object: 'page',
        entry: [
          {
            messaging: [
              { sender: { id: 'psid-004' }, message: { text: 'Xin chào' } },
            ],
          },
        ],
      })
      expect(db.from).not.toHaveBeenCalled()
    })

    it('⏭️  bỏ qua khi không tìm thấy đơn hàng, không gửi tin nhắn', async () => {
      db.single.mockResolvedValue({ data: null, error: { message: 'Not found' } })

      await service.handleWebhookPayload({
        object: 'page',
        entry: [
          {
            messaging: [
              { sender: { id: 'psid-005' }, referral: { ref: 'order-DH_GHOST' } },
            ],
          },
        ],
      })

      expect(mockedAxios.post).not.toHaveBeenCalled()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. handleBotcakeWebhook — parse ref + trả về message
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleBotcakeWebhook', () => {
    const mockOrder = {
      order_code: 'DH123456',
      customer_name: 'Nguyen Van A',
      customer_phone: '0901234567',
      total_price: 90000,
      note: '[Địa chỉ: 123 Le Loi, Phuong 1, My Tho, Tiền Giang] - Ghi chú: It cay',
      items: [{ name: 'Com tam', price: 45000, quantity: 2 }],
    }

    beforeEach(() => {
      db.single.mockResolvedValue({ data: mockOrder, error: null })
    })

    const REF_CASES = [
      ['order--DH123456', 'prefix order--'],
      ['order=DH123456', 'prefix order='],
      ['order_DH123456', 'prefix order_'],
      ['order-DH123456', 'prefix order-'],
      ['2567571--order=DH123456', 'prefix 2567571-- + order='],
      ['w2567571--order=DH123456', 'prefix w2567571-- + order='],
      ['DH123456', 'không có prefix'],
    ]

    test.each(REF_CASES)('✅ parse đúng mã đơn từ ref "%s" (%s)', async (ref) => {
      const result = await service.handleBotcakeWebhook({ ref })

      expect(db.eq).toHaveBeenCalledWith('order_code', 'DH123456')
      expect(result.version).toBe('v2')
      expect(result.content.messages[0].text).toContain('DH123456')
    })

    it('✅ nội dung tin nhắn đầy đủ: tên, SĐT, địa chỉ, tổng tiền, ghi chú', async () => {
      const result = await service.handleBotcakeWebhook({ ref: 'order--DH123456' })
      const text: string = result.content.messages[0].text

      expect(text).toContain('Nguyen Van A')
      expect(text).toContain('0901234567')
      expect(text).toContain('DH123456')
      expect(text).toContain('90.000đ')
      expect(text).toContain('123 Le Loi, Phuong 1, My Tho, Tiền Giang')
      expect(text).toContain('It cay')
      expect(text).toContain('Com tam (x2)')
    })

    it('❌ trả về cảnh báo khi không có ref', async () => {
      const result = await service.handleBotcakeWebhook({})

      expect(result.version).toBe('v2')
      expect(result.content.messages[0].text).toContain('Không nhận được tham số ref')
    })

    it('❌ trả về cảnh báo khi không tìm thấy đơn hàng', async () => {
      db.single.mockResolvedValue({ data: null, error: { message: 'Not found' } })

      const result = await service.handleBotcakeWebhook({ ref: 'order--DH_GHOST' })

      expect(result.content.messages[0].text).toContain('Không tìm thấy đơn hàng')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. logBotcakeWebhook + getBotcakeLogs — debug log
  // ═══════════════════════════════════════════════════════════════════════════

  describe('logBotcakeWebhook / getBotcakeLogs', () => {
    it('✅ lưu log và trả về đúng nội dung', () => {
      service.logBotcakeWebhook({ ref: 'abc' }, { 'x-api-key': 'key' }, { q: '1' })
      const logs = service.getBotcakeLogs()

      expect(logs).toHaveLength(1)
      expect(logs[0].body).toEqual({ ref: 'abc' })
      expect(logs[0].timestamp).toBeDefined()
    })

    it('✅ giữ tối đa 10 log, tự xóa log cũ nhất', () => {
      for (let i = 0; i < 12; i++) {
        service.logBotcakeWebhook({ i }, {}, {})
      }

      const logs = service.getBotcakeLogs()
      expect(logs.length).toBeLessThanOrEqual(10)
      // Log đầu tiên (i=0, i=1) đã bị xóa, log cuối nhất là i=11
      expect(logs[logs.length - 1].body).toEqual({ i: 11 })
    })
  })
})
