/**
 * ============================================================
 * UNIT TESTS — CategoriesService
 * ============================================================
 * Chạy: cd apps/api && npx jest --testPathPattern=categories.service
 * ============================================================
 */

import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { CategoriesService } from '../categories.service'
import { SupabaseService } from '../../supabase/supabase.service'
import { MenuService } from '../../menu/menu.service'

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
    order: jest.fn().mockReturnThis(),
    single: jest.fn(),
  }
  return db
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SHOP = 'quan-test'

const existingCategories = [
  { id: 'cat-1', shop_slug: SHOP, name: 'Rau Củ Quả Đà Lạt', sort_order: 0 },
  { id: 'cat-2', shop_slug: SHOP, name: 'Hoa Tươi', sort_order: 1 },
]

// ─── Setup ────────────────────────────────────────────────────────────────────

describe('CategoriesService', () => {
  let service: CategoriesService
  let db: ReturnType<typeof buildMockDb>
  let mockMenuService: { clearCache: jest.Mock }

  beforeEach(async () => {
    db = buildMockDb()
    mockMenuService = { clearCache: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: SupabaseService, useValue: { db } },
        { provide: MenuService, useValue: mockMenuService },
      ],
    }).compile()

    service = module.get<CategoriesService>(CategoriesService)
    jest.clearAllMocks()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // getCategories
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getCategories', () => {
    it('✅ trả về danh sách categories', async () => {
      db.order.mockResolvedValueOnce({ data: existingCategories, error: null })

      const result = await service.getCategories(SHOP)

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Rau Củ Quả Đà Lạt')
    })

    it('✅ trả về mảng rỗng khi không có categories', async () => {
      db.order.mockResolvedValueOnce({ data: null, error: null })

      const result = await service.getCategories(SHOP)

      expect(result).toEqual([])
    })

    it('❌ throw Error khi Supabase lỗi', async () => {
      db.order.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })

      await expect(service.getCategories(SHOP)).rejects.toThrow('DB error')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // createCategory
  // ═══════════════════════════════════════════════════════════════════════════

  describe('createCategory', () => {
    it('✅ tạo category mới với sort_order = max + 1', async () => {
      // Lần 1: get existing
      db.eq.mockResolvedValueOnce({ data: existingCategories, error: null })
      // Lần 2: insert
      db.single.mockResolvedValueOnce({
        data: { id: 'cat-3', name: 'Trái Cây', sort_order: 2 },
        error: null,
      })

      const result = await service.createCategory({ shop_slug: SHOP, name: 'Trái Cây' })

      expect(result.id).toBe('cat-3')
      expect(result.sort_order).toBe(2)
      expect(db.insert).toHaveBeenCalledWith(
        expect.objectContaining({ sort_order: 2, name: 'Trái Cây' }),
      )
    })

    it('✅ category đầu tiên được tạo với sort_order = 0', async () => {
      db.eq.mockResolvedValueOnce({ data: [], error: null })
      db.single.mockResolvedValueOnce({
        data: { id: 'cat-1', name: 'Rau Củ', sort_order: 0 },
        error: null,
      })

      const result = await service.createCategory({ shop_slug: SHOP, name: 'Rau Củ' })

      expect(db.insert).toHaveBeenCalledWith(
        expect.objectContaining({ sort_order: 0 }),
      )
      expect(result.sort_order).toBe(0)
    })

    it('✅ trả về existing record khi category đã tồn tại (không insert)', async () => {
      db.eq.mockResolvedValueOnce({ data: existingCategories, error: null })

      const result = await service.createCategory({ shop_slug: SHOP, name: 'Hoa Tươi' })

      expect(result.id).toBe('cat-2')
      expect(db.insert).not.toHaveBeenCalled()
    })

    it('✅ so sánh tên không phân biệt hoa/thường (case-insensitive)', async () => {
      db.eq.mockResolvedValueOnce({ data: existingCategories, error: null })

      const result = await service.createCategory({ shop_slug: SHOP, name: '  hoa tươi  ' })

      // Đã tồn tại "Hoa Tươi" -> trả về existing
      expect(result.id).toBe('cat-2')
      expect(db.insert).not.toHaveBeenCalled()
    })

    it('✅ clearCache menu được gọi sau khi tạo mới', async () => {
      db.eq.mockResolvedValueOnce({ data: [], error: null })
      db.single.mockResolvedValueOnce({
        data: { id: 'cat-new', sort_order: 0 },
        error: null,
      })

      await service.createCategory({ shop_slug: SHOP, name: 'Mới' })

      expect(mockMenuService.clearCache).toHaveBeenCalled()
    })

    it('✅ không gọi clearCache nếu trả về existing (đã tồn tại)', async () => {
      db.eq.mockResolvedValueOnce({ data: existingCategories, error: null })

      await service.createCategory({ shop_slug: SHOP, name: 'Hoa Tươi' })

      expect(mockMenuService.clearCache).not.toHaveBeenCalled()
    })

    it('❌ throw Error khi lấy danh sách existing bị lỗi', async () => {
      db.eq.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })

      await expect(
        service.createCategory({ shop_slug: SHOP, name: 'X' }),
      ).rejects.toThrow('DB error')
    })

    it('❌ throw Error khi insert bị lỗi', async () => {
      db.eq.mockResolvedValueOnce({ data: [], error: null })
      db.single.mockResolvedValueOnce({ data: null, error: { message: 'insert error' } })

      await expect(
        service.createCategory({ shop_slug: SHOP, name: 'Mới' }),
      ).rejects.toThrow('insert error')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // reorderCategories
  // ═══════════════════════════════════════════════════════════════════════════

  describe('reorderCategories', () => {
    const orderPayload = [
      { id: 'cat-1', sort_order: 1 },
      { id: 'cat-2', sort_order: 0 },
    ]

    it('✅ reorder thành công', async () => {
      db.eq.mockResolvedValue({ error: null })

      const result = await service.reorderCategories(SHOP, orderPayload)

      expect(result).toEqual({ success: true })
      expect(db.update).toHaveBeenCalledTimes(2)
      expect(mockMenuService.clearCache).toHaveBeenCalled()
    })

    it('❌ throw BadRequestException khi 1 update bị lỗi', async () => {
      db.eq
        .mockResolvedValueOnce({ error: null })
        .mockRejectedValueOnce(new Error('fail'))

      await expect(
        service.reorderCategories(SHOP, orderPayload),
      ).rejects.toThrow(BadRequestException)
    })

    it('❌ message lỗi chứa ID bị fail', async () => {
      db.eq.mockRejectedValue(new Error('fail'))

      try {
        await service.reorderCategories(SHOP, orderPayload)
      } catch (e: any) {
        expect(e.message).toContain('cat-1')
        expect(e.message).toContain('cat-2')
      }
    })

    it('✅ clearCache được gọi dù có lỗi', async () => {
      db.eq.mockRejectedValue(new Error('fail'))

      await expect(
        service.reorderCategories(SHOP, orderPayload),
      ).rejects.toThrow()

      expect(mockMenuService.clearCache).toHaveBeenCalled()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // deleteCategory
  // ═══════════════════════════════════════════════════════════════════════════

  describe('deleteCategory', () => {
    const catId = 'cat-1'
    const mockCat = { id: catId, shop_slug: SHOP, name: 'Rau Củ Quả Đà Lạt', sort_order: 0 }

    it('✅ xóa category thành công khi không có item liên kết', async () => {
      // 1. Tìm category
      db.eq.mockReturnValueOnce(db)
      db.single.mockResolvedValueOnce({ data: mockCat, error: null })
      // 2. Lấy menu_items của shop — không item nào thuộc category này
      db.eq.mockResolvedValueOnce({
        data: [{ id: 'item-x', category: 'Hoa Tươi' }],
        error: null,
      })
      // 3. Delete
      db.eq.mockResolvedValueOnce({ error: null })

      const result = await service.deleteCategory(catId)

      expect(result).toEqual({ success: true })
      expect(db.delete).toHaveBeenCalled()
      expect(mockMenuService.clearCache).toHaveBeenCalled()
    })

    it('❌ throw NotFoundException khi category không tồn tại', async () => {
      db.single.mockResolvedValueOnce({ data: null, error: { message: 'not found' } })

      await expect(service.deleteCategory('ghost-id')).rejects.toThrow(NotFoundException)
      expect(db.delete).not.toHaveBeenCalled()
    })

    it('❌ throw BadRequestException khi còn item thuộc category', async () => {
      db.eq.mockReturnValueOnce(db)
      db.single.mockResolvedValueOnce({ data: mockCat, error: null })
      db.eq.mockResolvedValueOnce({
        data: [
          { id: 'item-1', category: 'Rau Củ Quả Đà Lạt' }, // có item trong category này
        ],
        error: null,
      })

      await expect(service.deleteCategory(catId)).rejects.toThrow(BadRequestException)
      expect(db.delete).not.toHaveBeenCalled()
    })

    it('✅ so sánh tên category case-insensitive khi check item liên kết', async () => {
      // Category tên "Rau Củ Quả Đà Lạt" nhưng item lưu "rau củ quả đà lạt"
      db.eq.mockReturnValueOnce(db)
      db.single.mockResolvedValueOnce({ data: mockCat, error: null })
      db.eq.mockResolvedValueOnce({
        data: [{ id: 'item-1', category: '  rau củ quả đà lạt  ' }],
        error: null,
      })

      await expect(service.deleteCategory(catId)).rejects.toThrow(BadRequestException)
    })

    it('❌ throw Error khi query menu_items bị lỗi', async () => {
      db.eq.mockReturnValueOnce(db)
      db.single.mockResolvedValueOnce({ data: mockCat, error: null })
      db.eq.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })

      await expect(service.deleteCategory(catId)).rejects.toThrow('DB error')
    })

    it('❌ throw Error khi Supabase delete bị lỗi', async () => {
      db.eq.mockReturnValueOnce(db)
      db.single.mockResolvedValueOnce({ data: mockCat, error: null })
      db.eq
        .mockResolvedValueOnce({ data: [], error: null })   // menu_items: không có
        .mockResolvedValueOnce({ error: { message: 'delete error' } }) // delete fail

      await expect(service.deleteCategory(catId)).rejects.toThrow('delete error')
    })
  })
})
