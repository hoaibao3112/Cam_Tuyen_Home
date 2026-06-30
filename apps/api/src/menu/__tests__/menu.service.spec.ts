/**
 * ============================================================
 * UNIT TESTS — MenuService
 * ============================================================
 * Chạy: cd apps/api && npx jest --testPathPattern=menu.service
 * ============================================================
 */

import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { MenuService } from '../menu.service'
import { SupabaseService } from '../../supabase/supabase.service'

// Polyfill Promise to support chainable mock DB calls (like .eq().eq())
const chainableMethods = ['from', 'select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'order', 'limit', 'single']
chainableMethods.forEach(method => {
  if (!(method in Promise.prototype)) {
    Object.defineProperty(Promise.prototype, method, {
      value: function () {
        return this
      },
      writable: true,
      configurable: true,
    })
  }
})


// ─── Mock Supabase builder ────────────────────────────────────────────────────

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
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
  }
  return db
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SHOP = 'quan-test'

const mockCategories = [
  { name: 'Rau Củ Quả Đà Lạt', sort_order: 0 },
  { name: 'Hoa Tươi', sort_order: 1 },
]

const mockItems = [
  { id: 'item-1', name: 'Rau muống', category: 'Rau Củ Quả Đà Lạt', sort_order: 0, is_active: true, shop_slug: SHOP },
  { id: 'item-2', name: 'Hoa hồng', category: 'Hoa Tươi', sort_order: 0, is_active: true, shop_slug: SHOP },
  { id: 'item-3', name: 'Cải ngọt', category: 'Rau Củ Quả Đà Lạt', sort_order: 1, is_active: false, shop_slug: SHOP },
]

// ─── Setup ────────────────────────────────────────────────────────────────────

describe('MenuService', () => {
  let service: MenuService
  let db: ReturnType<typeof buildMockDb>

  beforeEach(async () => {
    db = buildMockDb()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        { provide: SupabaseService, useValue: { db } },
      ],
    }).compile()

    service = module.get<MenuService>(MenuService)
    jest.clearAllMocks()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // getMenuBySlug
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getMenuBySlug', () => {
    function mockQueryChain(categoriesData: any, itemsData: any, itemsError?: any) {
      // Lần gọi đầu: select categories (không có .eq('is_active'))
      // Lần gọi sau: select menu_items (có thể có .eq('is_active'))
      // Dùng mockResolvedValueOnce để chain đúng thứ tự
      db.eq
        .mockResolvedValueOnce({ data: categoriesData, error: null }) // categories
        .mockResolvedValueOnce({ data: itemsData, error: itemsError ?? null }) // items (includeInactive=false)
    }

    it('✅ trả về items đã sắp xếp theo category sort_order rồi đến item sort_order', async () => {
      mockQueryChain(mockCategories, mockItems)

      const result = await service.getMenuBySlug(SHOP)

      // Rau Củ (sort 0) phải trước Hoa Tươi (sort 1)
      expect(result[0].category).toBe('Rau Củ Quả Đà Lạt')
      expect(result[1].category).toBe('Rau Củ Quả Đà Lạt')
      expect(result[2].category).toBe('Hoa Tươi')
    })

    it('✅ items cùng category được sắp theo sort_order tăng dần', async () => {
      const items = [
        { id: 'a', category: 'Rau Củ Quả Đà Lạt', sort_order: 5 },
        { id: 'b', category: 'Rau Củ Quả Đà Lạt', sort_order: 1 },
        { id: 'c', category: 'Rau Củ Quả Đà Lạt', sort_order: 3 },
      ]
      mockQueryChain(mockCategories, items)

      const result = await service.getMenuBySlug(SHOP)

      expect(result.map((r: any) => r.id)).toEqual(['b', 'c', 'a'])
    })

    it('✅ category không có trong bảng categories bị đẩy xuống cuối', async () => {
      const items = [
        { id: 'x', category: 'Danh mục lạ', sort_order: 0 },
        { id: 'y', category: 'Rau Củ Quả Đà Lạt', sort_order: 0 },
      ]
      mockQueryChain(mockCategories, items)

      const result = await service.getMenuBySlug(SHOP)

      expect(result[0].id).toBe('y') // category biết sort_order=0
      expect(result[1].id).toBe('x') // category lạ -> sort_order=99999
    })

    it('✅ cache: lần 2 không gọi Supabase', async () => {
      mockQueryChain(mockCategories, mockItems)

      await service.getMenuBySlug(SHOP)
      await service.getMenuBySlug(SHOP) // lần 2

      // Supabase chỉ được gọi 1 lần (cho lần đầu)
      expect(db.from).toHaveBeenCalledTimes(2) // categories + menu_items
    })

    it('✅ clearCache() làm Supabase bị gọi lại ở lần tiếp theo', async () => {
      mockQueryChain(mockCategories, mockItems)
      await service.getMenuBySlug(SHOP)

      service.clearCache()

      // Phải mock lại vì mockResolvedValueOnce đã dùng hết
      db.eq
        .mockResolvedValueOnce({ data: mockCategories, error: null })
        .mockResolvedValueOnce({ data: mockItems, error: null })

      await service.getMenuBySlug(SHOP)

      expect(db.from).toHaveBeenCalledTimes(4) // 2 lần gọi x 2 queries mỗi lần
    })

    it('❌ throw NotFoundException khi Supabase trả lỗi ở items', async () => {
      db.eq
        .mockResolvedValueOnce({ data: mockCategories, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })

      await expect(service.getMenuBySlug(SHOP)).rejects.toThrow(NotFoundException)
    })

    it('✅ includeInactive=false lọc bỏ inactive items', async () => {
      const activeOnly = mockItems.filter(i => i.is_active)
      db.eq
        .mockResolvedValueOnce({ data: mockCategories, error: null })
        .mockResolvedValueOnce({ data: activeOnly, error: null })

      const result = await service.getMenuBySlug(SHOP, false)

      expect(result.every((i: any) => i.is_active)).toBe(true)
    })

    it('✅ includeInactive=true có cache key riêng với false', async () => {
      // First call: includeInactive=false
      db.eq
        .mockResolvedValueOnce({ data: mockCategories, error: null })
        .mockResolvedValueOnce({ data: mockItems.filter(i => i.is_active), error: null })
      await service.getMenuBySlug(SHOP, false)

      // Second call: includeInactive=true — vẫn phải gọi Supabase
      db.eq
        .mockResolvedValueOnce({ data: mockCategories, error: null })
        .mockResolvedValueOnce({ data: mockItems, error: null })
      const result = await service.getMenuBySlug(SHOP, true)

      expect(result).toHaveLength(mockItems.length)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // createItem
  // ═══════════════════════════════════════════════════════════════════════════

  describe('createItem', () => {
    it('✅ tạo item thành công với sort_order = max + 1', async () => {
      const existingItems = [
        { id: 'e1', sort_order: 0, category: 'Rau Củ Quả Đà Lạt' },
        { id: 'e2', sort_order: 2, category: 'Rau Củ Quả Đà Lạt' },
      ]
      // getMaxItemSortOrder gọi: .from().select().eq() -> existingItems
      db.eq.mockResolvedValueOnce({ data: existingItems, error: null })
      // insert gọi: .from().insert().select().single()
      db.single.mockResolvedValueOnce({ data: { id: 'new-item', sort_order: 3 }, error: null })

      const body = { shop_slug: SHOP, category: 'Rau Củ Quả Đà Lạt', name: 'Bí đỏ', price: 20000 }
      const result = await service.createItem(body)

      expect(result.id).toBe('new-item')
      expect(body).toMatchObject({ sort_order: 3 }) // được gán vào body
    })

    it('✅ category mới (chưa có item): sort_order = 0', async () => {
      db.eq.mockResolvedValueOnce({ data: [], error: null }) // không có item nào trong category
      db.single.mockResolvedValueOnce({ data: { id: 'new-item', sort_order: 0 }, error: null })

      const body: any = { shop_slug: SHOP, category: 'Danh mục mới', name: 'Sản phẩm mới', price: 10000 }
      await service.createItem(body)

      expect(body.sort_order).toBe(0)
    })

    it('✅ clearCache được gọi sau khi tạo thành công', async () => {
      db.eq.mockResolvedValueOnce({ data: [], error: null })
      db.single.mockResolvedValueOnce({ data: { id: 'x' }, error: null })

      const clearSpy = jest.spyOn(service, 'clearCache')
      await service.createItem({ shop_slug: SHOP, category: 'X', name: 'Y', price: 0 })

      expect(clearSpy).toHaveBeenCalled()
    })

    it('❌ throw Error khi Supabase insert bị lỗi', async () => {
      db.eq.mockResolvedValueOnce({ data: [], error: null })
      db.single.mockResolvedValueOnce({ data: null, error: { message: 'insert error' } })

      await expect(
        service.createItem({ shop_slug: SHOP, category: 'X', name: 'Y', price: 0 }),
      ).rejects.toThrow('insert error')
    })

    it('✅ getMaxItemSortOrder bỏ qua item của category khác', async () => {
      // Có item thuộc category khác nhau
      db.eq.mockResolvedValueOnce({
        data: [
          { sort_order: 5, category: 'Hoa Tươi' },       // khác category
          { sort_order: 2, category: 'Rau Củ Quả Đà Lạt' }, // đúng category
        ],
        error: null,
      })
      db.single.mockResolvedValueOnce({ data: { id: 'ok' }, error: null })

      const body: any = { shop_slug: SHOP, category: 'Rau Củ Quả Đà Lạt', name: 'X' }
      await service.createItem(body)

      // max của Rau Củ = 2, sort_order mới = 3 (không phải 6)
      expect(body.sort_order).toBe(3)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // updateItem
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateItem', () => {
    it('✅ cập nhật item thành công', async () => {
      db.single.mockResolvedValueOnce({ data: { id: 'item-1', name: 'Updated' }, error: null })

      const result = await service.updateItem('item-1', { name: 'Updated' })

      expect(result.name).toBe('Updated')
      expect(db.update).toHaveBeenCalledWith({ name: 'Updated' })
      expect(db.eq).toHaveBeenCalledWith('id', 'item-1')
    })

    it('✅ clearCache được gọi sau khi update', async () => {
      db.single.mockResolvedValueOnce({ data: { id: 'x' }, error: null })
      const clearSpy = jest.spyOn(service, 'clearCache')

      await service.updateItem('x', { price: 50000 })

      expect(clearSpy).toHaveBeenCalled()
    })

    it('❌ throw Error khi Supabase update bị lỗi', async () => {
      db.single.mockResolvedValueOnce({ data: null, error: { message: 'update failed' } })

      await expect(service.updateItem('item-1', { name: 'X' })).rejects.toThrow('update failed')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // deleteItem
  // ═══════════════════════════════════════════════════════════════════════════

  describe('deleteItem', () => {
    it('✅ xóa item thành công', async () => {
      db.eq.mockResolvedValueOnce({ error: null })

      const result = await service.deleteItem('item-1')

      expect(result).toEqual({ success: true })
      expect(db.delete).toHaveBeenCalled()
      expect(db.eq).toHaveBeenCalledWith('id', 'item-1')
    })

    it('✅ clearCache được gọi sau khi xóa', async () => {
      db.eq.mockResolvedValueOnce({ error: null })
      const clearSpy = jest.spyOn(service, 'clearCache')

      await service.deleteItem('item-1')

      expect(clearSpy).toHaveBeenCalled()
    })

    it('❌ throw Error khi Supabase delete lỗi', async () => {
      db.eq.mockResolvedValueOnce({ error: { message: 'delete failed' } })

      await expect(service.deleteItem('item-1')).rejects.toThrow('delete failed')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // reorderItems
  // ═══════════════════════════════════════════════════════════════════════════

  describe('reorderItems', () => {
    const orderPayload = [
      { id: 'item-1', sort_order: 0 },
      { id: 'item-2', sort_order: 1 },
    ]

    it('✅ reorder thành công tất cả items', async () => {
      // Mỗi update trả về Promise resolve
      db.eq.mockResolvedValue({ error: null })

      const result = await service.reorderItems(SHOP, orderPayload)

      expect(result).toEqual({ success: true })
      expect(db.update).toHaveBeenCalledTimes(2)
    })

    it('✅ clearCache được gọi kể cả khi có lỗi', async () => {
      db.eq.mockRejectedValue(new Error('network error'))
      const clearSpy = jest.spyOn(service, 'clearCache')

      await expect(service.reorderItems(SHOP, orderPayload)).rejects.toThrow(BadRequestException)
      expect(clearSpy).toHaveBeenCalled()
    })

    it('❌ throw BadRequestException khi 1 trong các update bị lỗi', async () => {
      db.eq
        .mockResolvedValueOnce({ error: null })       // item-1 ok
        .mockRejectedValueOnce(new Error('DB error')) // item-2 fail

      await expect(service.reorderItems(SHOP, orderPayload)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('❌ message lỗi chứa ID bị fail', async () => {
      db.eq.mockRejectedValue(new Error('DB error'))

      try {
        await service.reorderItems(SHOP, orderPayload)
      } catch (e: any) {
        expect(e.message).toContain('item-1')
        expect(e.message).toContain('item-2')
      }
    })
  })
})
