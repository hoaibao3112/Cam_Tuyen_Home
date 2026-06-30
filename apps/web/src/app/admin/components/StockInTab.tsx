'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { getProductUnit } from '@/lib/product-helper'

// ─── Types ────────────────────────────────────────────────────────────────────

type MenuItem = {
  id: string
  name: string
  price: number
  import_price?: number
  category: string
  sub_category?: string | null
  description: string
  is_active: boolean
  shop_slug: string
  image_url?: string
  track_stock?: boolean
  stock?: number
  unit?: string | null
}

interface StockInTabProps {
  shopSlug: string
  items: MenuItem[]
  onUpdated: () => void
}

type ImportRow = {
  itemId: string
  quantity: string
  importPrice: string
}

type ImportHistoryEntry = {
  id: string
  date: string
  totalItems: number
  totalQty: number
  totalAmount: number
  rows: { name: string; qty: number; price: number }[]
}

const HISTORY_KEY = 'stockin_history'
const MAX_HISTORY = 5

// ─── Searchable Product Selector Component ───────────────────────────────────

function SearchableProductSelect({
  items,
  value,
  onChange,
}: {
  items: MenuItem[]
  value: string
  onChange: (value: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Tìm sản phẩm đang được chọn
  const selectedItem = items.find((item) => item.id === value)

  // Lọc sản phẩm theo từ khoá tìm kiếm
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    if (selectedItem && searchQuery.trim() === selectedItem.name) return items
    const q = searchQuery.toLowerCase()
    return items.filter((item) => item.name.toLowerCase().includes(q))
  }, [items, searchQuery, selectedItem])

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Đồng bộ ô tìm kiếm khi giá trị sản phẩm được chọn thay đổi
  useEffect(() => {
    if (selectedItem) {
      setSearchQuery(selectedItem.name)
    } else {
      setSearchQuery('')
    }
  }, [selectedItem])

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setIsOpen(true)
            if (!e.target.value) {
              onChange('')
            }
          }}
          onFocus={(e) => {
            setIsOpen(true)
            e.target.select() // Tự động bôi đen để tiện gõ đè
          }}
          placeholder="Tìm sản phẩm..."
          className="w-full bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-semibold"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
        >
          <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-[999] py-1">
          {filteredItems.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">Không tìm thấy sản phẩm</div>
          ) : (
            filteredItems.map((item) => {
              const currentStockText = item.track_stock
                ? `(Kho: ${item.stock ?? 0} ${getProductUnit(item.category, item.unit)})`
                : '(Vô hạn)'
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(item.id)
                    setSearchQuery(item.name)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer ${
                    item.id === value ? 'bg-blue-50/50 font-bold text-blue-600' : 'text-slate-700'
                  }`}
                >
                  <span className="truncate">{item.name}</span>
                  <span className="text-[10px] text-slate-400 font-normal shrink-0 ml-2">{currentStockText}</span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StockInTab({ shopSlug, items, onUpdated }: StockInTabProps) {
  const [rows, setRows] = useState<ImportRow[]>([{ itemId: '', quantity: '', importPrice: '' }])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error'>('success')
  const [inlineQtys, setInlineQtys] = useState<Record<string, string>>({})
  const [inlinePrices, setInlinePrices] = useState<Record<string, string>>({})
  const [history, setHistory] = useState<ImportHistoryEntry[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Load history từ localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw) setHistory(JSON.parse(raw))
    } catch {}
  }, [])

  const saveHistory = useCallback((entry: ImportHistoryEntry) => {
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, MAX_HISTORY)
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const sortedItems = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name)), [items])

  const lowStockItems = useMemo(
    () => items.filter(i => i.track_stock && (i.stock === undefined || i.stock === null || i.stock < 10)),
    [items],
  )

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }

  const addRow = (preselectedId = '', defaultPrice = '') =>
    setRows(prev => [...prev, { itemId: preselectedId, quantity: '', importPrice: defaultPrice }])

  const removeRow = (index: number) => {
    if (rows.length === 1) { setRows([{ itemId: '', quantity: '', importPrice: '' }]); return }
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  const updateRow = (index: number, field: keyof ImportRow, value: string) => {
    setRows(prev => prev.map((row, i) => {
      if (i !== index) return row
      const updated = { ...row, [field]: value }
      if (field === 'itemId' && value) {
        const product = items.find(p => p.id === value)
        if (product) updated.importPrice = String(product.import_price || '')
      }
      return updated
    }))
  }

  const totals = useMemo(() => {
    let totalItems = 0, totalQty = 0, totalAmount = 0
    rows.forEach(r => {
      if (!r.itemId) return
      totalItems++
      const q = Number(r.quantity) || 0
      const p = Number(r.importPrice) || 0
      totalQty += q
      totalAmount += q * p
    })
    return { totalItems, totalQty, totalAmount }
  }, [rows])

  const handleBatchImport = async (e: React.FormEvent) => {
    e.preventDefault()
    const validRows = rows.filter(r => r.itemId)
    if (validRows.length === 0) { showMsg('Vui lòng chọn ít nhất một sản phẩm!', 'error'); return }

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      if (!r.itemId) continue
      if (isNaN(Number(r.quantity)) || Number(r.quantity) <= 0) { showMsg(`Dòng ${i + 1}: Số lượng phải lớn hơn 0!`, 'error'); return }
      if (isNaN(Number(r.importPrice)) || Number(r.importPrice) < 0) { showMsg(`Dòng ${i + 1}: Giá nhập không hợp lệ!`, 'error'); return }
    }

    setLoading(true)
    try {
      await Promise.all(validRows.map(async r => {
        const item = items.find(p => p.id === r.itemId)
        if (!item) return
        const newStock = (item.stock || 0) + Number(r.quantity)
        const res = await fetch(`/api/admin/menu/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item, track_stock: true, stock: newStock, import_price: Number(r.importPrice) }),
        })
        if (!res.ok) throw new Error(`Lỗi cập nhật "${item.name}"`)
      }))

      // Lưu lịch sử
      saveHistory({
        id: Date.now().toString(),
        date: new Date().toLocaleString('vi-VN'),
        totalItems: totals.totalItems,
        totalQty: totals.totalQty,
        totalAmount: totals.totalAmount,
        rows: validRows.map(r => {
          const item = items.find(p => p.id === r.itemId)!
          return { name: item.name, qty: Number(r.quantity), price: Number(r.importPrice) }
        }),
      })

      showMsg(`✅ Nhập kho thành công ${validRows.length} mặt hàng! Tổng: ${totals.totalAmount.toLocaleString('vi-VN')}đ`)
      setRows([{ itemId: '', quantity: '', importPrice: '' }])
      onUpdated()
    } catch (err: any) {
      showMsg(err.message || 'Lỗi khi nhập kho!', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleInlineImport = async (id: string, currentStock: number) => {
    const qty = Number(inlineQtys[id])
    const price = inlinePrices[id] ? Number(inlinePrices[id]) : undefined
    const item = items.find(i => i.id === id)
    if (!item) return
    if (isNaN(qty) || qty <= 0) { showMsg('Số lượng không hợp lệ!', 'error'); return }

    try {
      const newStock = currentStock + qty
      const finalPrice = price ?? (item.import_price || 0)
      const res = await fetch(`/api/admin/menu/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, track_stock: true, stock: newStock, import_price: finalPrice }),
      })
      if (!res.ok) throw new Error('Không thể cập nhật tồn kho')

      saveHistory({
        id: Date.now().toString(),
        date: new Date().toLocaleString('vi-VN'),
        totalItems: 1, totalQty: qty, totalAmount: qty * finalPrice,
        rows: [{ name: item.name, qty, price: finalPrice }],
      })

      showMsg(`Cập nhật +${qty} ${item.name}. Tồn: ${newStock}`)
      setInlineQtys(prev => ({ ...prev, [id]: '' }))
      setInlinePrices(prev => ({ ...prev, [id]: '' }))
      onUpdated()
    } catch {
      showMsg('Lỗi khi cập nhật nhanh!', 'error')
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 flex-1 flex flex-col min-h-0">

      {/* Toast */}
      {msg && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg border text-sm font-semibold max-w-[90vw] ${
          msgType === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          <span>{msgType === 'success' ? '✅' : '⚠️'}</span>
          <span>{msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex-shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">📦 Nhập Kho Hàng Hoá</h1>
        <p className="text-xs text-slate-500 mt-0.5">Nhập kho nhiều sản phẩm cùng lúc, xem lịch sử 5 đơn gần nhất</p>
      </div>

      {/* Main grid: form (left) + sidebar (right) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 flex-1 min-h-0">

        {/* ── Left: Phiếu nhập ──────────────────────────────────────────── */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col min-h-0">

          {/* Card header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>📋</span> Phiếu Nhập Nhiều Sản Phẩm
            </h2>
            <button
              type="button"
              onClick={() => addRow()}
              className="bg-sky-50 hover:bg-sky-100 text-sky-600 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-sky-100 cursor-pointer"
            >
              ＋ Thêm dòng
            </button>
          </div>

          <form onSubmit={handleBatchImport} className="flex-1 flex flex-col min-h-0 mt-3 gap-3">

            {/* Rows — scroll on mobile, expand on desktop */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
              {rows.map((row, index) => {
                const product = items.find(p => p.id === row.itemId)
                const currentStock = product ? (product.stock ?? 0) : null
                const rowTotal = (Number(row.quantity) || 0) * (Number(row.importPrice) || 0)

                return (
                  <div
                    key={index}
                    className="relative bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 rounded-xl p-3 sm:p-4 transition-all"
                  >
                    {/* Row number badge */}
                    <span className="absolute -left-2 top-3 bg-slate-200 text-slate-600 text-[10px] font-black size-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                      {index + 1}
                    </span>

                    {/* Mobile: stacked. Desktop: single row */}
                    <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">

                      {/* Product select */}
                      <div className="flex-1 min-w-0">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Sản phẩm</label>
                        <SearchableProductSelect
                          items={sortedItems}
                          value={row.itemId}
                          onChange={val => updateRow(index, 'itemId', val)}
                        />
                        {currentStock !== null && product && (
                          <p className="text-[10px] text-slate-400 mt-0.5 ml-1">
                            Tồn: <span className="font-bold text-slate-600">{currentStock} {getProductUnit(product.category, product.unit)}</span>
                          </p>
                        )}
                      </div>

                      {/* Qty */}
                      <div className="w-full sm:w-24">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Số lượng</label>
                        <input
                          type="number" min="0.01" step="any" placeholder="SL"
                          value={row.quantity}
                          onChange={e => updateRow(index, 'quantity', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-bold"
                        />
                      </div>

                      {/* Price */}
                      <div className="w-full sm:w-32">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Giá nhập (đ)</label>
                        <input
                          type="number" min="0" placeholder="Giá"
                          value={row.importPrice}
                          onChange={e => updateRow(index, 'importPrice', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-bold"
                        />
                      </div>

                      {/* Total + delete */}
                      <div className="flex items-center justify-between sm:justify-start sm:gap-3">
                        <span className="text-sm font-extrabold text-slate-800">
                          {rowTotal > 0 ? rowTotal.toLocaleString('vi-VN') + 'đ' : <span className="text-slate-300">0đ</span>}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="size-8 rounded-xl border border-rose-100 hover:bg-rose-50 text-rose-400 hover:text-rose-600 flex items-center justify-center text-lg font-black transition-colors cursor-pointer ml-2 sm:ml-0"
                        >×</button>
                      </div>

                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer totals + submit */}
            <div className="flex-shrink-0 bg-slate-50 border border-slate-100 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-3 sm:gap-5 text-xs font-bold text-slate-500">
                <span>Mặt hàng: <b className="text-slate-800 text-sm">{totals.totalItems}</b></span>
                <span className="hidden sm:inline text-slate-200">|</span>
                <span>Tổng SL: <b className="text-slate-800 text-sm">{totals.totalQty}</b></span>
                <span className="hidden sm:inline text-slate-200">|</span>
                <span>Tổng tiền: <b className="text-rose-600 text-base">{totals.totalAmount.toLocaleString('vi-VN')}đ</b></span>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto min-w-[160px] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 px-5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loading
                  ? <><span className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> Đang xử lý...</>
                  : '📥 Xác nhận nhập kho'}
              </button>
            </div>

          </form>
        </div>

        {/* ── Right sidebar ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 min-h-0">

          {/* 5 đơn nhập gần nhất */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col flex-1 min-h-0">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center justify-between flex-shrink-0">
              <span className="flex items-center gap-1.5">🕐 Đơn nhập gần nhất</span>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{history.length}/{MAX_HISTORY}</span>
            </h2>

            <div className="flex-1 overflow-y-auto mt-3 space-y-2">
              {history.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <span className="text-3xl block mb-2">📭</span>
                  <p className="text-xs font-semibold">Chưa có đơn nhập nào</p>
                  <p className="text-[10px] text-slate-300 mt-1">Đơn nhập sẽ xuất hiện sau khi xác nhận</p>
                </div>
              ) : (
                history.map((entry, idx) => {
                  const isOpen = expandedId === entry.id
                  return (
                    <div
                      key={entry.id}
                      className="border border-slate-100 rounded-xl overflow-hidden"
                    >
                      {/* Header row — tap to expand */}
                      <button
                        type="button"
                        onClick={() => setExpandedId(isOpen ? null : entry.id)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left cursor-pointer"
                      >
                        {/* Index badge */}
                        <span className={`size-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                          idx === 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'
                        }`}>{idx + 1}</span>

                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-slate-700 truncate">{entry.date}</p>
                          <p className="text-[10px] text-slate-400">
                            {entry.totalItems} mặt hàng · {entry.totalQty} SL
                          </p>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-extrabold text-rose-600">{entry.totalAmount.toLocaleString('vi-VN')}đ</p>
                          <span className="text-[10px] text-slate-300">{isOpen ? '▲' : '▼'}</span>
                        </div>
                      </button>

                      {/* Expanded detail */}
                      {isOpen && (
                        <div className="px-3 py-2 bg-white border-t border-slate-100 space-y-1.5">
                          {entry.rows.map((r, i) => (
                            <div key={i} className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-600 font-medium truncate max-w-[55%]">{r.name}</span>
                              <span className="text-slate-400">×{r.qty}</span>
                              <span className="font-bold text-slate-700">{(r.qty * r.price).toLocaleString('vi-VN')}đ</span>
                            </div>
                          ))}
                          <div className="border-t border-slate-100 pt-1.5 flex justify-between text-[11px]">
                            <span className="text-slate-400 font-semibold">Tổng cộng</span>
                            <span className="font-extrabold text-rose-600">{entry.totalAmount.toLocaleString('vi-VN')}đ</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Cảnh báo hết hàng — compact */}
          {lowStockItems.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex-shrink-0">
              <h3 className="text-xs font-bold text-amber-700 flex items-center gap-1.5 mb-2">
                ⚠️ Hàng sắp hết ({lowStockItems.length} sản phẩm)
              </h3>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {lowStockItems.map(item => {
                  const stock = item.stock || 0
                  return (
                    <div key={item.id} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-700 truncate">{item.name}</p>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                          stock === 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                        }`}>
                          Còn {stock} {getProductUnit(item.category, item.unit)}
                        </span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <input
                          type="number" min="1" placeholder="SL"
                          value={inlineQtys[item.id] || ''}
                          onChange={e => setInlineQtys({ ...inlineQtys, [item.id]: e.target.value })}
                          className="w-14 bg-white border border-amber-200 rounded-lg px-1.5 py-1 text-[11px] text-center font-bold focus:outline-none focus:border-blue-400"
                        />
                        <button
                          onClick={() => handleInlineImport(item.id, stock)}
                          className="bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                        >+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
