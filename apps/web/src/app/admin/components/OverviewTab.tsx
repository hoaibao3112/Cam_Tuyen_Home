'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverviewTabProps { shopSlug: string }

interface SummaryData {
  monthlyRevenue: number; yearlyRevenue: number
  monthlyOrdersCount: number; yearlyOrdersCount: number
}
interface ChartItem { month: number; revenue: number; ordersCount: number }
interface DailyItem { date: string; label: string; revenue: number; ordersCount: number }
interface TopProduct { id: string; name: string; quantitySold: number; revenue: number }
interface TopCategory { category: string; quantitySold: number; revenue: number }
interface OrderStatus {
  total: number
  counts: { pending: number; confirmed: number; done: number; cancelled: number; other: number }
  rates: { pending: number; confirmed: number; done: number; cancelled: number }
  cancelledRevenueLost: number
}
interface TodayData {
  totalOrders: number; totalRevenue: number
  countByStatus: { pending: number; confirmed: number; done: number; cancelled: number }
  recentOrders: { order_code: string; customer_name: string; total_price: number; status: string; created_at: string }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'
const fmtShort = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'tr'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k'
  return n.toString()
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:   { label: 'Chờ xử lý',   color: 'text-amber-600',   bg: 'bg-amber-50',   dot: 'bg-amber-400'   },
  confirmed: { label: 'Đã xác nhận', color: 'text-blue-600',    bg: 'bg-blue-50',    dot: 'bg-blue-400'    },
  done:      { label: 'Hoàn thành',  color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-400' },
  cancelled: { label: 'Đã huỷ',      color: 'text-rose-600',    bg: 'bg-rose-50',    dot: 'bg-rose-400'    },
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
// Hiển thị đủ số tiền, KHÔNG truncate — tự co font khi chuỗi dài
function StatCard({ icon, label, value, sub, accent }: {
  icon: string; label: string; value: string; sub?: string; accent: string
}) {
  // Co font theo số ký tự: số tiền VNĐ dài ~15 ký tự → dùng text-sm
  const valueCls =
    value.length > 14 ? 'text-sm'
    : value.length > 11 ? 'text-base'
    : 'text-lg'

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-3 sm:p-4 flex items-start gap-3 shadow-sm hover:shadow-md transition-all">
      {/* Icon — flex-shrink-0 để không bị ép nhỏ */}
      <div className={`size-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 mt-0.5 ${accent}`}>
        {icon}
      </div>
      <div className="flex-1 overflow-hidden">
        {/* Label: 2 dòng nếu cần, không cắt */}
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-snug">
          {label}
        </p>
        {/* Value: KHÔNG truncate, co font tự động */}
        <p className={`${valueCls} font-black text-slate-800 leading-tight mt-0.5 break-words`}>
          {value}
        </p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function OverviewTab({ shopSlug }: OverviewTabProps) {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [tab, setTab]     = useState<'daily' | 'monthly'>('daily')

  const [summary, setSummary]         = useState<SummaryData | null>(null)
  const [chartData, setChartData]     = useState<ChartItem[]>([])
  const [dailyData, setDailyData]     = useState<DailyItem[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [topCats, setTopCats]         = useState<TopCategory[]>([])
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null)
  const [todayData, setTodayData]     = useState<TodayData | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')

  const years = Array.from({ length: now.getFullYear() - 2024 + 1 }, (_, i) => 2024 + i)

  const fetchAll = useCallback(async () => {
    if (!shopSlug) return
    setLoading(true); setError('')
    try {
      const base = `/api/admin/stats`
      const qs   = (p: string) => `${base}/${p}?shop_slug=${shopSlug}`

      const [s, c, tp, today, daily, status, cats] = await Promise.all([
        fetch(`${qs('summary')}&year=${year}&month=${month}`).then(r => r.json()),
        fetch(`${qs('revenue-chart')}&year=${year}`).then(r => r.json()),
        fetch(`${qs('top-products')}&year=${year}&limit=5`).then(r => r.json()),
        fetch(`${qs('today')}`).then(r => r.json()),
        fetch(`${qs('daily-chart')}`).then(r => r.json()),
        fetch(`${qs('order-status')}&year=${year}&month=${month}`).then(r => r.json()),
        fetch(`${qs('top-categories')}&year=${year}&month=${month}`).then(r => r.json()),
      ])

      setSummary(s); setChartData(c || []); setTopProducts(tp || [])
      setTodayData(today); setDailyData(daily || [])
      setOrderStatus(status); setTopCats(cats || [])
    } catch (e: any) {
      setError(e.message || 'Lỗi tải thống kê')
    } finally {
      setLoading(false)
    }
  }, [shopSlug, year, month])

  useEffect(() => { fetchAll() }, [fetchAll])

  const monthlyMax = Math.max(...chartData.map(d => d.revenue), 1)
  const dailyMax   = Math.max(...dailyData.map(d => d.revenue), 1)
  const catMax     = Math.max(...topCats.map(c => c.revenue), 1)
  const prodMax    = Math.max(...topProducts.map(p => p.quantitySold), 1)

  if (loading && !summary) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-64 bg-slate-100 rounded-2xl" />
          <div className="h-64 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── Header & bộ lọc ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800">📊 Báo Cáo Thống Kê</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Dữ liệu bán hàng nông sản &amp; trái cây</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={month} onChange={e => setMonth(+e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-sky-400">
            {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>Tháng {m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(+e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-sky-400">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={fetchAll}
            className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer">
            🔄 Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold px-4 py-3 rounded-2xl">⚠️ {error}</div>
      )}

      {/* ── Row 1: 6 thẻ số liệu ── */}
      {/* Grid tự điều chỉnh: mobile 2 cột, tablet 3 cột, desktop 6 cột */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          icon="🌅" accent="bg-amber-50"
          label="Đơn hôm nay"
          value={`${todayData?.totalOrders ?? 0} đơn`}
          sub={`⏳ Chờ: ${todayData?.countByStatus.pending ?? 0}`}
        />
        <StatCard
          icon="💵" accent="bg-emerald-50"
          label="Doanh thu hôm nay"
          value={fmt(todayData?.totalRevenue ?? 0)}
        />
        <StatCard
          icon="💰" accent="bg-sky-50"
          label={`Doanh thu tháng ${month}`}
          value={fmt(summary?.monthlyRevenue ?? 0)}
          sub={`${summary?.monthlyOrdersCount ?? 0} đơn`}
        />
        <StatCard
          icon="📦" accent="bg-blue-50"
          label={`Đơn tháng ${month}`}
          value={`${summary?.monthlyOrdersCount ?? 0} đơn`}
        />
        <StatCard
          icon="📈" accent="bg-purple-50"
          label={`Doanh thu năm ${year}`}
          value={fmt(summary?.yearlyRevenue ?? 0)}
          sub={`${summary?.yearlyOrdersCount ?? 0} đơn`}
        />
        <StatCard
          icon="🛒" accent="bg-rose-50"
          label={`Tổng đơn năm ${year}`}
          value={`${summary?.yearlyOrdersCount ?? 0} đơn`}
        />
      </div>

      {/* ── Row 2: Biểu đồ + Trạng thái đơn ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Biểu đồ — tab 30 ngày / 12 tháng */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Biểu đồ doanh thu</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {tab === 'daily' ? '30 ngày gần nhất' : `Theo tháng — năm ${year}`}
              </p>
            </div>
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
              {(['daily','monthly'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}>
                  {t === 'daily' ? '30 ngày' : '12 tháng'}
                </button>
              ))}
            </div>
          </div>

          <div className="h-52 flex items-end gap-1 sm:gap-1.5 px-1 select-none">
            {tab === 'daily'
              ? dailyData.map((item, i) => {
                  const h = Math.max((item.revenue / dailyMax) * 100, item.revenue > 0 ? 4 : 0.5)
                  const showLabel = i % 5 === 0 || i === dailyData.length - 1
                  return (
                    <div key={item.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute bottom-full mb-1.5 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 whitespace-nowrap z-10 shadow-md">
                        <p className="text-slate-300">{item.label}</p>
                        <p className="text-sky-300 font-black">{fmt(item.revenue)}</p>
                        <p className="text-slate-400">{item.ordersCount} đơn</p>
                      </div>
                      <div style={{ height: `${h}%` }}
                        className={`w-full rounded-t-md transition-all duration-200 cursor-pointer ${
                          item.revenue > 0 ? 'bg-sky-400 hover:bg-sky-500' : 'bg-slate-100'
                        }`} />
                      {showLabel && <span className="text-[8px] text-slate-300 font-bold">{item.label}</span>}
                    </div>
                  )
                })
              : chartData.map(item => {
                  const h = Math.max((item.revenue / monthlyMax) * 100, item.revenue > 0 ? 4 : 0.5)
                  return (
                    <div key={item.month} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute bottom-full mb-1.5 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 whitespace-nowrap z-10 shadow-md">
                        <p className="text-slate-300">Tháng {item.month}</p>
                        <p className="text-sky-300 font-black">{fmt(item.revenue)}</p>
                        <p className="text-slate-400">{item.ordersCount} đơn</p>
                      </div>
                      <div style={{ height: `${h}%` }}
                        className={`w-full rounded-t-md transition-all duration-200 cursor-pointer ${
                          item.month === month && item.revenue > 0 ? 'bg-blue-500 hover:bg-blue-600'
                          : item.revenue > 0 ? 'bg-sky-300 hover:bg-sky-400' : 'bg-slate-100'
                        }`} />
                      <span className="text-[10px] text-slate-400 font-bold">{item.month}</span>
                    </div>
                  )
                })
            }
          </div>
        </div>

        {/* Trạng thái đơn */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Trạng thái đơn</h3>
          <p className="text-[10px] text-slate-400 mb-4">Tháng {month}/{year} · Tổng {orderStatus?.total ?? 0} đơn</p>

          {orderStatus && orderStatus.total > 0 ? (
            <>
              {/* Visual donut-like stacked bar */}
              <div className="flex h-3 rounded-full overflow-hidden mb-4 gap-0.5">
                {(['success', 'cancelled'] as const).map(s => {
                  let count = 0
                  if (s === 'success') {
                    count = (orderStatus.counts.pending || 0) + (orderStatus.counts.confirmed || 0) + (orderStatus.counts.done || 0)
                  } else {
                    count = orderStatus.counts.cancelled || 0
                  }
                  const total = orderStatus.total || 1
                  const rate = +((count / total) * 100).toFixed(1)
                  if (!rate) return null
                  const colors: Record<string, string> = { success: 'bg-emerald-400', cancelled: 'bg-rose-400' }
                  return <div key={s} style={{ width: `${rate}%` }} className={`${colors[s]} rounded-full`} title={`${s === 'success' ? 'Thành công' : 'Không thành công'}: ${rate}%`} />
                })}
              </div>

              <div className="space-y-2.5 flex-1">
                {[
                  {
                    key: 'success',
                    label: 'Thành công',
                    dot: 'bg-emerald-400',
                    bg: 'bg-emerald-50',
                    color: 'text-emerald-600',
                    count: (orderStatus.counts.pending || 0) + (orderStatus.counts.confirmed || 0) + (orderStatus.counts.done || 0)
                  },
                  {
                    key: 'cancelled',
                    label: 'Không thành công (Boom đơn)',
                    dot: 'bg-rose-400',
                    bg: 'bg-rose-50',
                    color: 'text-rose-600',
                    count: orderStatus.counts.cancelled || 0
                  }
                ].map(meta => {
                  const total = orderStatus.total || 1
                  const rate = +((meta.count / total) * 100).toFixed(1)
                  return (
                    <div key={meta.key} className="flex items-center gap-2">
                      <span className={`size-2.5 rounded-full flex-shrink-0 ${meta.dot}`} />
                      <span className="text-[11px] font-semibold text-slate-600 flex-1">{meta.label}</span>
                      <span className="text-[11px] font-black text-slate-800">{meta.count}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${meta.bg} ${meta.color}`}>{rate}%</span>
                    </div>
                  )
                })}
              </div>
              {orderStatus.cancelledRevenueLost > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-rose-500 font-semibold">
                  ⚠️ Doanh thu mất do huỷ: <b>{fmt(orderStatus.cancelledRevenueLost)}</b>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 py-8">
              <span className="text-3xl">📭</span>
              <p className="text-xs font-semibold">Chưa có đơn hàng</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Top SP + Top danh mục + Đơn hôm nay ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Top sản phẩm */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-0.5">🏆 Top 5 Sản phẩm</h3>
          <p className="text-[10px] text-slate-400 mb-4">Bán chạy nhất năm {year}</p>
          {topProducts.length === 0
            ? <div className="py-8 text-center text-slate-400"><span className="text-2xl">🥦</span><p className="text-xs mt-2 font-semibold">Chưa có dữ liệu</p></div>
            : (
              <div className="space-y-3">
                {topProducts.map((p, i) => {
                  const badges = ['🥇','🥈','🥉','4️⃣','5️⃣']
                  return (
                    <div key={p.id} className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-base flex-shrink-0">{badges[i]}</span>
                        <span className="font-semibold text-slate-700 flex-1 truncate">{p.name}</span>
                        <span className="font-black text-slate-800 flex-shrink-0">×{p.quantitySold}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div style={{ width:`${(p.quantitySold/prodMax)*100}%` }} className="h-full bg-sky-400 rounded-full transition-all duration-500" />
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium w-16 text-right flex-shrink-0">{fmtShort(p.revenue)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>

        {/* Top danh mục */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-0.5">📂 Top Danh mục</h3>
          <p className="text-[10px] text-slate-400 mb-4">Doanh thu theo nhóm T{month}/{year}</p>
          {topCats.length === 0
            ? <div className="py-8 text-center text-slate-400"><span className="text-2xl">📦</span><p className="text-xs mt-2 font-semibold">Chưa có dữ liệu</p></div>
            : (
              <div className="space-y-3">
                {topCats.slice(0,5).map((cat, i) => {
                  const colors = ['bg-emerald-400','bg-sky-400','bg-purple-400','bg-amber-400','bg-rose-400']
                  return (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`size-2 rounded-full flex-shrink-0 ${colors[i]||'bg-slate-300'}`} />
                        <span className="font-semibold text-slate-700 flex-1 truncate">{cat.category}</span>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">{cat.quantitySold} SP</span>
                        <span className="font-black text-slate-800 flex-shrink-0 w-14 text-right text-[11px]">{fmtShort(cat.revenue)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div style={{ width:`${(cat.revenue/catMax)*100}%` }} className={`h-full ${colors[i]||'bg-slate-300'} rounded-full transition-all duration-500`} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>

        {/* Đơn hàng hôm nay */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-0.5">🕐 Đơn hàng hôm nay</h3>
          <p className="text-[10px] text-slate-400 mb-4">5 đơn gần nhất · {new Date().toLocaleDateString('vi-VN')}</p>
          {!todayData || todayData.recentOrders.length === 0
            ? <div className="py-8 text-center text-slate-400"><span className="text-2xl">📭</span><p className="text-xs mt-2 font-semibold">Chưa có đơn hôm nay</p></div>
            : (
              <div className="space-y-2">
                {todayData.recentOrders.map(order => {
                  const isCancelled = order.status === 'cancelled'
                  const statusLabel = isCancelled ? 'Không thành công' : 'Thành công'
                  const statusColor = isCancelled ? 'text-rose-600' : 'text-emerald-600'
                  const statusDot = isCancelled ? 'bg-rose-400' : 'bg-emerald-400'
                  const time = new Date(new Date(order.created_at).getTime() + 7*3600*1000)
                    .toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' })
                  return (
                    <div key={order.order_code}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <span className={`size-2 rounded-full flex-shrink-0 ${statusDot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-700 truncate">{order.customer_name}</p>
                        <p className="text-[10px] text-slate-400">{order.order_code} · {time}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {/* Dùng fmtShort ở đây vì không gian hẹp — hover tooltip nếu muốn xem đủ */}
                        <p className="text-xs font-black text-slate-800" title={fmt(order.total_price)}>
                          {fmtShort(order.total_price)}
                        </p>
                        <p className={`text-[9px] font-bold ${statusColor}`}>{statusLabel}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>
      </div>

    </div>
  )
}
