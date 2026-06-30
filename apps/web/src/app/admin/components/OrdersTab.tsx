'use client'

import { useState, useEffect } from 'react'

interface OrderItem {
  menu_item_id: string
  name: string
  price: number
  quantity: number
}

interface Order {
  id: string
  order_code: string
  shop_slug: string
  customer_name: string
  customer_phone: string
  items: OrderItem[]
  total_price: number
  note: string | null
  status: 'pending' | 'confirmed' | 'done' | 'cancelled'
  created_at: string
}

interface OrdersTabProps {
  shopSlug: string
}

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

const STATUS_META = {
  pending: { label: 'Chờ xử lý', color: 'text-amber-700 bg-amber-50 border-amber-200 dot-bg-amber-400' },
  confirmed: { label: 'Đã xác nhận', color: 'text-blue-700 bg-blue-50 border-blue-200 dot-bg-blue-400' },
  done: { label: 'Hoàn thành', color: 'text-emerald-700 bg-emerald-50 border-emerald-200 dot-bg-emerald-400' },
  cancelled: { label: 'Đã huỷ / Boom', color: 'text-rose-700 bg-rose-50 border-rose-200 dot-bg-rose-400' },
}

export default function OrdersTab({ shopSlug }: OrdersTabProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const fetchOrders = async () => {
    if (!shopSlug) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/orders?shop_slug=${shopSlug}`)
      if (!res.ok) throw new Error('Không thể tải danh sách đơn hàng')
      const data = await res.json()
      setOrders(data || [])
    } catch (err: any) {
      setError(err.message || 'Lỗi tải đơn hàng')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [shopSlug])

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Không thể cập nhật trạng thái đơn hàng')
      
      // Update local state
      setOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, status: newStatus as any } : o))
      )
    } catch (err: any) {
      alert(err.message || 'Cập nhật trạng thái thất bại')
    } finally {
      setUpdatingId(null)
    }
  }

  // Helper trích xuất địa chỉ và ghi chú từ cột note
  const getAddressAndNote = (noteStr: string | null) => {
    if (!noteStr) return { address: 'Không xác định', note: '' }
    const addressMatch = noteStr.match(/\[Địa chỉ: (.*?)\]/)
    const noteMatch = noteStr.match(/ - Ghi chú: (.*)$/)
    return {
      address: addressMatch ? addressMatch[1] : noteStr,
      note: noteMatch ? noteMatch[1] : '',
    }
  }

  // Filter and Search logic
  const filteredOrders = orders.filter(order => {
    const { address, note } = getAddressAndNote(order.note)
    const matchesSearch =
      order.order_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_phone.includes(searchTerm) ||
      address.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'cancelled'
        ? order.status === 'cancelled'
        : order.status !== 'cancelled'

    return matchesSearch && matchesStatus
  })

  // Pagination logic
  const totalItems = filteredOrders.length
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header and Action Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            📋 Quản Lý Đơn Hàng
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Xem và thay đổi trạng thái giao hàng, xử lý hoàn trả / huỷ đơn
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrders}
            className="bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-200 text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            🔄 Tải lại đơn
          </button>
        </div>
      </div>

      {/* Filter and Search Input */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 text-sm">
            🔍
          </span>
          <input
            type="text"
            placeholder="Tìm theo mã đơn, tên khách, SĐT..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-sky-400"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-sky-400"
          >
            <option value="all">Tất cả đơn hàng</option>
            <option value="success">Thành công</option>
            <option value="cancelled">Không thành công (Boom đơn)</option>
          </select>
        </div>
        <div className="flex items-center justify-end text-[11px] text-slate-400 font-semibold px-2">
          Tìm thấy: <b className="text-slate-700 ml-1 mr-1">{totalItems}</b> đơn hàng
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Đang tải danh sách đơn hàng...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold px-4 py-3 rounded-2xl">
          ⚠️ {error}
        </div>
      ) : currentOrders.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 shadow-sm text-center text-slate-400">
          <span className="text-4xl">📭</span>
          <p className="text-sm font-semibold mt-2">Không tìm thấy đơn hàng nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentOrders.map(order => {
            const { address, note: orderNote } = getAddressAndNote(order.note)
            const meta = STATUS_META[order.status] || STATUS_META.pending
            const time = new Date(order.created_at).toLocaleString('vi-VN')

            return (
              <div
                key={order.id}
                className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow relative"
              >
                {/* Top Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 pb-3 mb-3 gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-black text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
                      {order.order_code}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">{time}</span>
                  </div>

                  {/* Status update control */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold flex-shrink-0">
                      Trạng thái:
                    </span>
                    <select
                      value={order.status === 'cancelled' ? 'cancelled' : 'done'}
                      disabled={updatingId === order.id}
                      onChange={e => handleUpdateStatus(order.id, e.target.value)}
                      className={`text-xs font-bold rounded-lg border px-2.5 py-1 focus:outline-none cursor-pointer ${
                        order.status === 'cancelled'
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      <option value="done" className="text-emerald-700 bg-white font-bold">🟢 Thành công</option>
                      <option value="cancelled" className="text-rose-700 bg-white font-bold">❌ Không thành công (Boom đơn)</option>
                    </select>
                    {updatingId === order.id && (
                      <span className="w-4 h-4 border-2 border-slate-200 border-t-sky-500 rounded-full animate-spin" />
                    )}
                  </div>
                </div>

                {/* Content grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Left: Customer Info */}
                  <div className="space-y-1.5 border-r border-slate-50 pr-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      Thông tin khách hàng
                    </p>
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-slate-800">{order.customer_name}</p>
                      <p className="font-semibold text-slate-500 flex items-center gap-1">
                        📞 <a href={`tel:${order.customer_phone}`} className="hover:underline">{order.customer_phone}</a>
                      </p>
                      <p className="text-slate-500 leading-normal">
                        📍 <span className="font-medium">{address}</span>
                      </p>
                      {orderNote && (
                        <p className="text-amber-700 font-bold bg-amber-50/50 p-2 rounded-lg border border-amber-100/50 mt-2 leading-normal">
                          📝 {orderNote}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Middle: Items List */}
                  <div className="space-y-1.5 border-r border-slate-50 pr-4 lg:col-span-2 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                        Chi tiết sản phẩm
                      </p>
                      <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                        {order.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs py-1 border-b border-dashed border-slate-50"
                          >
                            <span className="font-semibold text-slate-700 flex-1 truncate">
                              • {item.name}
                            </span>
                            <span className="text-slate-400 mr-2 flex-shrink-0">
                              x{item.quantity}
                            </span>
                            <span className="font-bold text-slate-800 flex-shrink-0">
                              {fmt(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Order Price summary */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-2">
                      <span className="text-xs font-bold text-slate-500">Tổng cộng:</span>
                      <span className="text-sm font-black text-slate-900">{fmt(order.total_price)}</span>
                    </div>
                  </div>
                </div>

                {/* Cancelled badge overlay watermark */}
                {order.status === 'cancelled' && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-10 select-none font-black text-rose-500 text-5xl tracking-widest uppercase border-4 border-rose-500 rounded-xl px-4 py-2 rotate-12">
                    BOOM ĐƠN
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
          >
            ◀ Trước
          </button>
          <span className="text-xs font-bold text-slate-500">
            Trang {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Sau ▶
          </button>
        </div>
      )}
    </div>
  )
}
