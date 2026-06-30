import { getProductUnit } from '@/lib/product-helper'

type MenuItem = {
  id: string
  name: string
  price: number
  category: string
  sub_category?: string | null
  description: string
  is_active: boolean
  shop_slug: string
  image_url?: string
  track_stock?: boolean
  stock?: number
  import_price?: number
  unit?: string | null
}

interface ProductTableProps {
  filteredItems: MenuItem[]
  paginatedItems: MenuItem[]
  currentPage: number
  totalPages: number
  startIndex: number
  endIndex: number
  setCurrentPage: (page: number | ((prev: number) => number)) => void
  onEdit: (item: MenuItem) => void
  onDelete: (id: string) => void
}

export default function ProductTable({
  filteredItems,
  paginatedItems,
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  setCurrentPage,
  onEdit,
  onDelete,
}: ProductTableProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 flex flex-col justify-between overflow-hidden">
      
      {/* 1. PC: BẢNG SẢN PHẨM (Hiển thị trên màn hình >= md) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-wider">
              <th className="py-4 px-6">Hình ảnh</th>
              <th className="py-4 px-6">Tên sản phẩm</th>
              <th className="py-4 px-6">Nhóm sản phẩm</th>
              <th className="py-4 px-6 text-center">Tồn kho</th>
              <th className="py-4 px-6 text-right">Giá (VNĐ)</th>
              <th className="py-4 px-6 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <span className="text-4xl block mb-2">🍽️</span>
                  <p className="text-sm font-medium">Không tìm thấy sản phẩm nào phù hợp.</p>
                </td>
              </tr>
            ) : (
              paginatedItems.map(item => {
                const categoryCode = 
                  item.category === 'Rau Củ Quả Đà Lạt' ? 'VEG' :
                  item.category === 'Hoa Tươi' ? 'FLW' :
                  item.category === 'Trái Cây Nhập Khẩu' ? 'FRU' :
                  item.category === 'Bánh Kẹo & Hạt Organic' ? 'ORG' :
                  item.category === 'Đồ Sấy & Đặc Sản Đà Lạt' ? 'DRY' : 'AGR'
                const itemSku = `SKU: ${categoryCode}-${item.id.slice(0, 4).toUpperCase()}`
                
                return (
                  <tr 
                    key={item.id} 
                    onClick={() => onEdit(item)}
                    className="hover:bg-slate-50/50 transition-colors duration-150 cursor-pointer"
                  >
                    <td className="py-3.5 px-6">
                      <div className="size-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl overflow-hidden relative">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="size-full object-cover" />
                        ) : (
                          item.category === 'Rau Củ Quả Đà Lạt' ? '🥬' : item.category === 'Hoa Tươi' ? '🌸' : item.category === 'Trái Cây Nhập Khẩu' ? '🍎' : item.category === 'Bánh Kẹo & Hạt Organic' ? '🥜' : item.category === 'Đồ Sấy & Đặc Sản Đà Lạt' ? '🍇' : '🌿'
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      <div>
                        <p className="font-bold text-slate-800 text-sm leading-snug">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5 tracking-wider">{itemSku}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                          item.category === 'Rau Củ Quả Đà Lạt'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.category === 'Hoa Tươi'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : item.category === 'Trái Cây Nhập Khẩu'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : item.category === 'Bánh Kẹo & Hạt Organic'
                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                            : item.category === 'Đồ Sấy & Đặc Sản Đà Lạt'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {item.category}
                        </span>
                        {item.sub_category && (
                          <span className="text-[10px] text-slate-500 font-semibold px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                            {item.sub_category}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      {item.track_stock ? (
                        <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                          item.stock && item.stock > 0 
                            ? 'bg-sky-50 text-sky-700 border border-sky-200' 
                            : 'bg-red-50 text-red-650 border border-red-200'
                        }`}>
                          {item.stock} {getProductUnit(item.category, item.unit)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm font-semibold">∞ Vô hạn</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right font-extrabold text-slate-800 text-sm">
                      <div>{item.price.toLocaleString('vi-VN')}</div>
                      {item.import_price ? (
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                          Nhập: {item.import_price.toLocaleString('vi-VN')}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                          className="p-2 text-blue-600 hover:bg-blue-55 transition-colors rounded-lg cursor-pointer"
                          title="Sửa"
                        >
                          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                          className="p-2 text-red-500 hover:bg-red-55 transition-colors rounded-lg cursor-pointer"
                          title="Xóa"
                        >
                          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 2. MOBILE: DANH SÁCH CARD RESPONSIVE (Hiển thị trên màn hình < md) */}
      <div className="block md:hidden overflow-y-auto max-h-[60vh] p-4 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <span className="text-4xl block mb-2">🍽️</span>
            <p className="text-sm font-medium">Không tìm thấy sản phẩm nào phù hợp.</p>
          </div>
        ) : (
          paginatedItems.map(item => (
            <div 
              key={item.id} 
              onClick={() => onEdit(item)}
              className="border border-slate-100 rounded-2xl bg-white p-3.5 flex items-center justify-between gap-4 shadow-xs cursor-pointer hover:border-blue-200 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Thumbnail ảnh */}
                <div className="size-14 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-3xl overflow-hidden flex-shrink-0 relative">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="size-full object-cover" />
                  ) : (
                    item.category === 'Rau Củ Quả Đà Lạt' ? '🥬' : item.category === 'Hoa Tươi' ? '🌸' : item.category === 'Trái Cây Nhập Khẩu' ? '🍎' : item.category === 'Bánh Kẹo & Hạt Organic' ? '🥜' : item.category === 'Đồ Sấy & Đặc Sản Đà Lạt' ? '🍇' : '🌿'
                  )}
                </div>

                {/* Thông tin */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      item.category === 'Rau Củ Quả Đà Lạt'
                        ? 'bg-emerald-50 text-emerald-700'
                        : item.category === 'Hoa Tươi'
                        ? 'bg-rose-50 text-rose-700'
                        : item.category === 'Trái Cây Nhập Khẩu'
                        ? 'bg-amber-50 text-amber-700'
                        : item.category === 'Bánh Kẹo & Hạt Organic'
                        ? 'bg-teal-50 text-teal-700'
                        : item.category === 'Đồ Sấy & Đặc Sản Đà Lạt'
                        ? 'bg-orange-50 text-orange-700'
                        : 'bg-slate-50 text-slate-700'
                    }`}>
                      {item.category}
                    </span>
                    {item.sub_category && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
                        {item.sub_category}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm leading-snug mt-1 truncate">{item.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-blue-600 font-extrabold text-xs">
                      {item.price.toLocaleString('vi-VN')}đ
                    </p>
                    <span className="text-[10px] text-slate-350">|</span>
                    {item.track_stock ? (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        item.stock && item.stock > 0 
                          ? 'bg-sky-50 text-sky-700 border border-sky-100' 
                          : 'bg-red-50 text-red-650 border border-red-100 animate-pulse'
                      }`}>
                        Tồn: {item.stock} {getProductUnit(item.category, item.unit)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Tồn: ∞</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Menu Actions nhỏ gọn cho Mobile */}
              <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onEdit(item)}
                  className="size-9 bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 transition-all rounded-xl flex items-center justify-center cursor-pointer border border-blue-100/50"
                  title="Sửa"
                >
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="size-9 bg-red-50 text-red-650 hover:bg-red-100 active:scale-95 transition-all rounded-xl flex items-center justify-center cursor-pointer border border-red-100/50"
                  title="Xóa"
                >
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination footer */}
      <div className="h-16 px-6 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 bg-white select-none">
        <div>
          {filteredItems.length > 0 ? (
            <span>Hiển thị {startIndex} - {endIndex} của {filteredItems.length} sản phẩm</span>
          ) : (
            <span>0 sản phẩm</span>
          )}
        </div>
        
        {/* Nút Phân Trang */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              className="size-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ‹
            </button>
            <button
              className="size-7 flex items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs"
            >
              {currentPage}
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              className="size-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ›
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
