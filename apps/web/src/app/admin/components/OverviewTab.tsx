'use client'

import { useState, useEffect } from 'react'

interface OverviewTabProps {
  shopSlug: string
}

interface SummaryData {
  monthlyRevenue: number
  yearlyRevenue: number
  monthlyOrdersCount: number
  yearlyOrdersCount: number
}

interface ChartItem {
  month: number
  revenue: number
  ordersCount: number
}

interface TopProductItem {
  id: string
  name: string
  quantitySold: number
  revenue: number
}

export default function OverviewTab({ shopSlug }: OverviewTabProps) {
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1)
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [chartData, setChartData] = useState<ChartItem[]>([])
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  // Sinh danh sách các năm lựa chọn (từ 2024 đến năm hiện tại)
  const years = Array.from(
    { length: new Date().getFullYear() - 2024 + 1 },
    (_, i) => 2024 + i
  )

  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  useEffect(() => {
    if (!shopSlug) return

    const fetchData = async () => {
      setLoading(true)
      setError('')
      try {
        // 1. Fetch Summary
        const summaryRes = await fetch(
          `/api/admin/stats/summary?shop_slug=${shopSlug}&year=${year}&month=${month}`
        )
        if (!summaryRes.ok) throw new Error('Không thể tải dữ liệu tổng quan')
        const summaryData = await summaryRes.json()

        // 2. Fetch Chart Data
        const chartRes = await fetch(
          `/api/admin/stats/revenue-chart?shop_slug=${shopSlug}&year=${year}`
        )
        if (!chartRes.ok) throw new Error('Không thể tải dữ liệu biểu đồ')
        const chartDataVal = await chartRes.json()

        // 3. Fetch Top Products
        const productsRes = await fetch(
          `/api/admin/stats/top-products?shop_slug=${shopSlug}&year=${year}&limit=5`
        )
        if (!productsRes.ok) throw new Error('Không thể tải danh sách sản phẩm bán chạy')
        const productsData = await productsRes.json()

        setSummary(summaryData)
        setChartData(chartDataVal || [])
        setTopProducts(productsData || [])
      } catch (err: any) {
        console.error(err)
        setError(err.message || 'Lỗi tải dữ liệu thống kê')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [shopSlug, year, month])

  const formatVND = (value: number) => {
    return value.toLocaleString('vi-VN') + 'đ'
  }

  // Tìm tháng có doanh thu cao nhất để làm mốc tỷ lệ phần trăm cho biểu đồ cột
  const maxRevenue = Math.max(...chartData.map((item) => item.revenue), 1000)

  // Tìm sản phẩm bán chạy nhất để làm mốc tỷ lệ cho progress bar
  const maxQtySold = Math.max(...topProducts.map((p) => p.quantitySold), 1)

  if (loading && !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-4">
        <svg className="animate-spin h-8 w-8 text-sky-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm font-medium">Đang tải dữ liệu thống kê...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Chọn thời gian */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            📊 Thống Kê Báo Cáo
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Số liệu thống kê doanh số bán hàng nông sản & trái cây
          </p>
        </div>

        {/* Bộ lọc Năm / Tháng */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">Tháng:</span>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value, 10))}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 transition-colors"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">Năm:</span>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 transition-colors"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-650 text-sm font-semibold px-4 py-3 rounded-2xl">
          ⚠️ {error}
        </div>
      )}

      {/* Grid thẻ số liệu tổng quan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Doanh thu tháng */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between hover:shadow-md hover:border-slate-200 transition-all duration-300">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-450 uppercase tracking-wider block">
              Doanh thu tháng này
            </span>
            <span className="text-2xl font-black text-emerald-600 block">
              {formatVND(summary?.monthlyRevenue || 0)}
            </span>
          </div>
          <div className="size-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-2xl shadow-inner flex-shrink-0">
            💰
          </div>
        </div>

        {/* Số đơn tháng */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between hover:shadow-md hover:border-slate-200 transition-all duration-300">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-450 uppercase tracking-wider block">
              Đơn hàng tháng này
            </span>
            <span className="text-2xl font-black text-sky-600 block">
              {summary?.monthlyOrdersCount || 0} đơn
            </span>
          </div>
          <div className="size-12 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center text-2xl shadow-inner flex-shrink-0">
            📦
          </div>
        </div>

        {/* Doanh thu năm */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between hover:shadow-md hover:border-slate-200 transition-all duration-300">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-450 uppercase tracking-wider block">
              Doanh thu năm nay
            </span>
            <span className="text-2xl font-black text-orange-600 block">
              {formatVND(summary?.yearlyRevenue || 0)}
            </span>
          </div>
          <div className="size-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center text-2xl shadow-inner flex-shrink-0">
            📈
          </div>
        </div>

        {/* Số đơn năm */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between hover:shadow-md hover:border-slate-200 transition-all duration-300">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-450 uppercase tracking-wider block">
              Đơn hàng năm nay
            </span>
            <span className="text-2xl font-black text-purple-600 block">
              {summary?.yearlyOrdersCount || 0} đơn
            </span>
          </div>
          <div className="size-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center text-2xl shadow-inner flex-shrink-0">
            🛒
          </div>
        </div>
      </div>

      {/* Grid Biểu đồ & Sản phẩm bán chạy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Khối Biểu đồ Doanh thu (Cột trái lớn) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="mb-6">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              📊 Biểu đồ doanh thu năm {year}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Doanh số thu được theo từng tháng
            </p>
          </div>

          {/* Khung vẽ biểu đồ cột */}
          <div className="h-64 flex items-end gap-3.5 sm:gap-5 px-2 select-none">
            {chartData.map((item) => {
              const heightPercent = Math.max((item.revenue / maxRevenue) * 100, 3) // Tối thiểu 3% để hiển thị vạch nhỏ
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip hiển thị khi hover cột */}
                  <div className="absolute bottom-full mb-2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-250 whitespace-nowrap shadow-md z-10">
                    <p className="text-slate-200">T{item.month}</p>
                    <p className="text-sky-300 font-extrabold">{formatVND(item.revenue)}</p>
                    <p className="text-slate-350">{item.ordersCount} đơn</p>
                  </div>

                  {/* Cột doanh thu */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full bg-gradient-to-t from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 rounded-t-lg transition-all duration-300 cursor-pointer shadow-sm relative group-hover:scale-x-105"
                  >
                    {/* Hiệu ứng bóng sáng bên trong cột */}
                    <div className="absolute inset-x-0 top-0 h-1 bg-white/20 rounded-t-lg" />
                  </div>

                  {/* Tháng */}
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400 group-hover:text-slate-700 transition-colors">
                    {item.month}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Khối Sản phẩm bán chạy (Cột phải) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col">
          <div className="mb-5">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              🏆 Top 5 Sản Phẩm Bán Chạy
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Sản phẩm dẫn đầu doanh số năm {year}
            </p>
          </div>

          {topProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-400 text-center gap-2">
              <span className="text-3xl">🥦</span>
              <p className="text-xs font-semibold">Chưa có số liệu sản phẩm bán ra</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto">
              {topProducts.map((product, index) => {
                const percentWidth = (product.quantitySold / maxQtySold) * 100
                const colors = [
                  'bg-yellow-400', // Hạng 1
                  'bg-slate-400',  // Hạng 2
                  'bg-orange-400', // Hạng 3
                  'bg-sky-400',    // Hạng 4
                  'bg-sky-300'     // Hạng 5
                ]
                return (
                  <div key={product.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Huy hiệu thứ hạng */}
                        <span className={`size-5 rounded-full flex items-center justify-center text-[10px] text-white flex-shrink-0 font-black ${
                          index < 3 ? colors[index] : 'bg-slate-300'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="text-slate-700 truncate">{product.name}</span>
                      </div>
                      <span className="text-slate-400 flex-shrink-0 ml-2">
                        Đã bán: <b className="text-slate-700">{product.quantitySold}</b>
                      </span>
                    </div>

                    {/* Thanh tỷ lệ bán ra */}
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percentWidth}%` }}
                        className={`h-full rounded-full transition-all duration-500 bg-sky-500`}
                      />
                    </div>

                    {/* Doanh thu mang về */}
                    <div className="text-[10px] text-slate-450 text-right font-medium">
                      Doanh thu: {formatVND(product.revenue)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
