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

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent, highlight }: {
  icon: string; label: string; value: string; sub?: string; accent: string; highlight?: boolean
}) {
  const valueCls =
    value.length > 14 ? 'text-sm'
    : value.length > 11 ? 'text-base'
    : 'text-xl'

  return (
    <div className={`rounded-2xl p-3 sm:p-4 flex items-start gap-3 transition-all duration-200 ${
      highlight
        ? 'bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-200 border-0'
        : 'bg-white border border-slate-100 shadow-sm hover:shadow-md'
    }`}>
      <div className={`size-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 mt-0.5 ${
        highlight ? 'bg-white/20' : accent
      }`}>
        {icon}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className={`text-[10px] font-bold uppercase tracking-wide leading-snug ${highlight ? 'text-sky-100' : 'text-slate-400'}`}>
          {label}
        </p>
        <p className={`${valueCls} font-black leading-tight mt-0.5 break-words ${highlight ? 'text-white' : 'text-slate-800'}`}>
          {value}
        </p>
        {sub && <p className={`text-[10px] mt-0.5 font-semibold ${highlight ? 'text-sky-200' : 'text-slate-400'}`}>{sub}</p>}
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
  const [hoveredBar, setHoveredBar] = useState<string | null>(null)

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
      const res = await fetch(`/api/admin/stats/overview?shop_slug=${shopSlug}&year=${year}&month=${month}`)
      const data = await res.json()
      setSummary(data.summary); setChartData(data.chartData || []); setTopProducts(data.topProducts || [])
      setTodayData(data.today); setDailyData(data.dailyData || [])
      setOrderStatus(data.orderStatus); setTopCats(data.topCats || [])
    } catch (e: unknown) {
      setError((e as Error).message || 'Loi tai thong ke')
    } finally {
      setLoading(false)
    }
  }, [shopSlug, year, month])

  useEffect(() => { fetchAll() }, [fetchAll])

  const monthlyMax = Math.max(...chartData.map(d => d.revenue), 1)
  const dailyMax   = Math.max(...dailyData.map(d => d.revenue), 1)
  const catMax     = Math.max(...topCats.map(c => c.revenue), 1)
  const prodMax    = Math.max(...topProducts.map(p => p.quantitySold), 1)

  const total30DayRevenue = dailyData.reduce((s, d) => s + d.revenue, 0)
  const total30DayOrders  = dailyData.reduce((s, d) => s + d.ordersCount, 0)

  if (loading && !summary) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-72 bg-slate-100 rounded-2xl" />
          <div className="h-72 bg-slate-100 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-56 bg-slate-100 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Header & filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-800">📊 Báo Cáo Thống Kê</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Dữ liệu bán hàng nông sản &amp; trái cây</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={month} onChange={e => setMonth(+e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-sky-400">
            {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>Thang {m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(+e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-sky-400">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={fetchAll}
            className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer">
            🔄 Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>
      )}

      {/* Row 1: 6 stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard icon="💵" accent="bg-emerald-50" label="Doanh thu hôm nay"
          value={fmt(todayData?.totalRevenue ?? 0)}
          sub={`${todayData?.totalOrders ?? 0} đơn hôm nay`} highlight />
        <StatCard icon="🌅" accent="bg-amber-50" label="Đơn hôm nay"
          value={`${todayData?.totalOrders ?? 0} đơn`}
          sub={`⏳ Chờ xử lý: ${todayData?.countByStatus.pending ?? 0}`} />
        <StatCard icon="💰" accent="bg-sky-50" label={`Doanh thu tháng ${month}`}
          value={fmt(summary?.monthlyRevenue ?? 0)}
          sub={`${summary?.monthlyOrdersCount ?? 0} đơn`} />
        <StatCard icon="📦" accent="bg-blue-50" label={`Số đơn tháng ${month}`}
          value={`${summary?.monthlyOrdersCount ?? 0} đơn`} />
        <StatCard icon="📈" accent="bg-purple-50" label={`Doanh thu năm ${year}`}
          value={fmt(summary?.yearlyRevenue ?? 0)}
          sub={`${summary?.yearlyOrdersCount ?? 0} đơn`} />
        <StatCard icon="🛒" accent="bg-rose-50" label={`Tổng đơn năm ${year}`}
          value={`${summary?.yearlyOrdersCount ?? 0} đơn`} />
      </div>

      {/* Row 2: Chart + Order status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-sm font-black text-slate-800">Biểu đồ doanh thu</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {tab === 'daily'
                  ? `30 ngày gần nhất · Tổng ${fmt(total30DayRevenue)} · ${total30DayOrders} đơn`
                  : `Theo tháng — năm ${year}`}
              </p>
            </div>
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1 flex-shrink-0">
              {(['daily','monthly'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    tab === t ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}>
                  {t === 'daily' ? '30 ngày' : '12 tháng'}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            {tab === 'daily' ? (
              <span className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                <span className="w-3 h-2 bg-sky-400 rounded-sm inline-block" /> Doanh thu ngày
              </span>
            ) : (
              <>
                <span className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                  <span className="w-3 h-2 bg-sky-300 rounded-sm inline-block" /> Các tháng khác
                </span>
                <span className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                  <span className="w-3 h-2 bg-blue-500 rounded-sm inline-block" /> Tháng hiện tại
                </span>
              </>
            )}
            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold ml-auto">
              👆 Nhấn vào cột để xem chi tiết
            </span>
          </div>

          {/* Chart scrollable */}
          <div className="overflow-x-auto pb-1">
            <div
              className="flex items-end gap-1 px-1 select-none relative"
              style={{ height: '160px', minWidth: tab === 'daily' ? '560px' : '0px' }}
            >
              {tab === 'daily'
                ? dailyData.map((item, i) => {
                    const h = Math.max((item.revenue / dailyMax) * 100, item.revenue > 0 ? 5 : 1)
                    const showLabel = i % 5 === 0 || i === dailyData.length - 1
                    const isHovered = hoveredBar === item.date
                    const isToday   = i === dailyData.length - 1
                    return (
                      <div
                        key={item.date}
                        className="flex-1 flex flex-col items-center justify-end gap-0.5 cursor-pointer relative"
                        onMouseEnter={() => setHoveredBar(item.date)}
                        onMouseLeave={() => setHoveredBar(null)}
                        onTouchStart={() => setHoveredBar(isHovered ? null : item.date)}
                      >
                        {isHovered && item.revenue > 0 && (
                          <div className="absolute bottom-full z-20 mb-1 bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl pointer-events-none left-1/2 -translate-x-1/2">
                            <p className="text-slate-300 text-[9px]">{item.label}</p>
                            <p className="text-sky-300">{fmt(item.revenue)}</p>
                            <p className="text-slate-400 text-[9px]">{item.ordersCount} đơn</p>
                          </div>
                        )}
                        <div
                          style={{ height: `${h}%` }}
                          className={`w-full rounded-t transition-all duration-150 ${
                            isToday ? 'bg-blue-500'
                            : isHovered ? 'bg-sky-500'
                            : item.revenue > 0 ? 'bg-sky-400'
                            : 'bg-slate-100'
                          }`}
                        />
                        {showLabel && (
                          <span className="text-[7px] text-slate-400 font-semibold leading-none pt-0.5">
                            {item.label}
                          </span>
                        )}
                      </div>
                    )
                  })
                : chartData.map(item => {
                    const h = Math.max((item.revenue / monthlyMax) * 100, item.revenue > 0 ? 5 : 1)
                    const isCurrent = item.month === month
                    const isHovered = hoveredBar === String(item.month)
                    return (
                      <div
                        key={item.month}
                        className="flex-1 flex flex-col items-center justify-end gap-0.5 cursor-pointer relative"
                        onMouseEnter={() => setHoveredBar(String(item.month))}
                        onMouseLeave={() => setHoveredBar(null)}
                        onTouchStart={() => setHoveredBar(isHovered ? null : String(item.month))}
                      >
                        {isHovered && item.revenue > 0 && (
                          <div className="absolute bottom-full z-20 mb-1 bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl pointer-events-none left-1/2 -translate-x-1/2">
                            <p className="text-slate-300 text-[9px]">Tháng {item.month}</p>
                            <p className="text-sky-300">{fmt(item.revenue)}</p>
                            <p className="text-slate-400 text-[9px]">{item.ordersCount} đơn</p>
                          </div>
                        )}
                        <div
                          style={{ height: `${h}%` }}
                          className={`w-full rounded-t transition-all duration-150 ${
                            isCurrent && item.revenue > 0 ? 'bg-blue-500'
                            : isHovered ? 'bg-sky-500'
                            : item.revenue > 0 ? 'bg-sky-300'
                            : 'bg-slate-100'
                          }`}
                        />
                        <span className={`text-[10px] font-bold leading-none pt-0.5 ${
                          isCurrent ? 'text-blue-500' : 'text-slate-400'
                        }`}>{item.month}</span>
                      </div>
                    )
                  })
              }
            </div>
          </div>

          {/* Quick stats below chart */}
          {tab === 'daily' && total30DayRevenue > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-6 flex-wrap">
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">TB/ngày</p>
                <p className="text-xs font-black text-slate-700">{fmt(Math.round(total30DayRevenue / 30))}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">Ngày cao nhất</p>
                <p className="text-xs font-black text-slate-700">{fmt(dailyMax)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">Ngày có đơn</p>
                <p className="text-xs font-black text-slate-700">{dailyData.filter(d => d.ordersCount > 0).length}/30</p>
              </div>
            </div>
          )}
        </div>

        {/* Order status */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col">
          <h3 className="text-sm font-black text-slate-800 mb-0.5">🎯 Trạng thái đơn</h3>
          <p className="text-[10px] text-slate-400 mb-4">Tháng {month}/{year} · Tổng {orderStatus?.total ?? 0} đơn</p>

          {orderStatus && orderStatus.total > 0 ? (
            <>
              {/* Stacked bar */}
              <div className="flex h-3 rounded-full overflow-hidden mb-4 gap-0.5">
                {(() => {
                  const doneCount = (orderStatus.counts.pending || 0) + (orderStatus.counts.confirmed || 0) + (orderStatus.counts.done || 0)
                  const cancelledCount = orderStatus.counts.cancelled || 0
                  const total = orderStatus.total || 1
                  const doneRate = +((doneCount / total) * 100).toFixed(1)
                  const cancelledRate = +((cancelledCount / total) * 100).toFixed(1)
                  return (
                    <>
                      {doneRate > 0 && <div style={{ width: `${doneRate}%` }} className="bg-emerald-400 transition-all" />}
                      {cancelledRate > 0 && <div style={{ width: `${cancelledRate}%` }} className="bg-rose-400 transition-all" />}
                    </>
                  )
                })()}
              </div>

              {/* Per-status rows */}
              <div className="space-y-2 flex-1">
                {(() => {
                  const doneCount = (orderStatus.counts.pending || 0) + (orderStatus.counts.confirmed || 0) + (orderStatus.counts.done || 0)
                  const cancelledCount = orderStatus.counts.cancelled || 0
                  const total = orderStatus.total || 1
                  const doneRate = +((doneCount / total) * 100).toFixed(1)
                  const cancelledRate = +((cancelledCount / total) * 100).toFixed(1)
                  
                  return (
                    <>
                      <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-emerald-50">
                        <span className="size-2.5 rounded-full flex-shrink-0 bg-emerald-400" />
                        <span className="text-[11px] font-semibold flex-1 text-emerald-700">✅ Hoàn thành</span>
                        <span className="text-[12px] font-black text-slate-800">{doneCount}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/60 text-emerald-700">{doneRate}%</span>
                      </div>
                      <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-rose-50">
                        <span className="size-2.5 rounded-full flex-shrink-0 bg-rose-400" />
                        <span className="text-[11px] font-semibold flex-1 text-rose-700">❌ Bơm hàng / Hủy</span>
                        <span className="text-[12px] font-black text-slate-800">{cancelledCount}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/60 text-rose-700">{cancelledRate}%</span>
                      </div>
                    </>
                  )
                })()}
              </div>

              {orderStatus.cancelledRevenueLost > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <div>
                    <p className="text-[9px] text-slate-400 font-semibold">⚠️ Doanh thu mất do huỷ đơn</p>
                    <p className="text-xs font-black text-rose-600">{fmt(orderStatus.cancelledRevenueLost)}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 py-8">
              <span className="text-4xl">📭</span>
              <p className="text-xs font-semibold">Chưa có đơn hàng tháng {month}</p>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Top products + Top categories + Today orders */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Top products */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 mb-0.5">🏆 Top 5 Sản phẩm</h3>
          <p className="text-[10px] text-slate-400 mb-4">Bán chạy nhất năm {year}</p>
          {topProducts.length === 0
            ? <div className="py-8 text-center text-slate-400"><span className="text-3xl">🥦</span><p className="text-xs mt-2 font-semibold">Chưa có dữ liệu</p></div>
            : (
              <div className="space-y-3">
                {topProducts.map((p, i) => {
                  const medals = ['🥇','🥈','🥉']
                  const barColors = ['bg-amber-400','bg-slate-400','bg-orange-400','bg-sky-400','bg-purple-400']
                  const pct = Math.round((p.quantitySold / prodMax) * 100)
                  return (
                    <div key={p.id}>
                      <div className="flex items-center gap-2 text-xs mb-1">
                        <span className="text-base flex-shrink-0 w-6 text-center">
                          {i < 3 ? medals[i] : <span className="text-[11px] font-black text-slate-400">#{i+1}</span>}
                        </span>
                        <span className="font-semibold text-slate-700 flex-1 truncate">{p.name}</span>
                        <span className="font-black text-slate-800 flex-shrink-0">×{p.quantitySold}</span>
                      </div>
                      <div className="flex items-center gap-2 pl-8">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div style={{ width:`${pct}%` }} className={`h-full ${barColors[i]||'bg-sky-400'} rounded-full transition-all duration-700`} />
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold w-12 text-right flex-shrink-0">{fmtShort(p.revenue)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>

        {/* Top categories */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 mb-0.5">📂 Top Danh mục</h3>
          <p className="text-[10px] text-slate-400 mb-4">Doanh thu theo nhóm T{month}/{year}</p>
          {topCats.length === 0
            ? <div className="py-8 text-center text-slate-400"><span className="text-3xl">📦</span><p className="text-xs mt-2 font-semibold">Chưa có dữ liệu</p></div>
            : (
              <div className="space-y-3">
                {topCats.slice(0,5).map((cat, i) => {
                  const colors  = ['bg-emerald-400','bg-sky-400','bg-purple-400','bg-amber-400','bg-rose-400']
                  const bgLight = ['bg-emerald-50','bg-sky-50','bg-purple-50','bg-amber-50','bg-rose-50']
                  const texts   = ['text-emerald-700','text-sky-700','text-purple-700','text-amber-700','text-rose-700']
                  const pct = Math.round((cat.revenue / catMax) * 100)
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center gap-2 text-xs mb-1">
                        <span className={`size-2.5 rounded-full flex-shrink-0 ${colors[i]||'bg-slate-300'}`} />
                        <span className="font-semibold text-slate-700 flex-1 truncate">{cat.category}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${bgLight[i]} ${texts[i]}`}>
                          {cat.quantitySold} đơn vị
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pl-4">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div style={{ width:`${pct}%` }} className={`h-full ${colors[i]||'bg-slate-300'} rounded-full transition-all duration-700`} />
                        </div>
                        <span className="text-[11px] font-black text-slate-800 w-14 text-right flex-shrink-0">{fmtShort(cat.revenue)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>

        {/* Today orders */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 mb-0.5">🕐 Đơn hàng hôm nay</h3>
          <p className="text-[10px] text-slate-400 mb-4">5 đơn gần nhất · {new Date().toLocaleDateString('vi-VN')}</p>
          {!todayData || todayData.recentOrders.length === 0
            ? (
              <div className="py-8 text-center text-slate-400">
                <span className="text-4xl">📭</span>
                <p className="text-xs mt-2 font-semibold">Chưa có đơn hôm nay</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayData.recentOrders.map(order => {
                  const isCancelled = order.status === 'cancelled'
                  const isPending   = order.status === 'pending'
                  const statusLabel = isCancelled ? 'Hủy / Boom' : isPending ? 'Chờ xử lý' : 'Thành công'
                  const statusColor = isCancelled ? 'text-rose-600' : isPending ? 'text-amber-600' : 'text-emerald-600'
                  const statusBg    = isCancelled ? 'bg-rose-50' : isPending ? 'bg-amber-50' : 'bg-emerald-50'
                  const statusDot   = isCancelled ? 'bg-rose-400' : isPending ? 'bg-amber-400' : 'bg-emerald-400'
                  const time = new Date(new Date(order.created_at).getTime() + 7*3600*1000)
                    .toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' })
                  return (
                    <div key={order.order_code}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <span className={`size-2.5 rounded-full flex-shrink-0 ${statusDot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-700 truncate">{order.customer_name}</p>
                        <p className="text-[9px] text-slate-400">{order.order_code} · {time}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-black text-slate-800" title={fmt(order.total_price)}>
                          {fmtShort(order.total_price)}
                        </p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${statusBg} ${statusColor}`}>
                          {statusLabel}
                        </span>
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
