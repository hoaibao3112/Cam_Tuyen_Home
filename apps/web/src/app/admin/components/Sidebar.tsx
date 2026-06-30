'use client'

interface SidebarProps {
  isSidebarOpen: boolean
  setIsSidebarOpen: (open: boolean) => void
  onLogout: () => void
  activeTab: 'overview' | 'products' | 'reorder' | 'stock-in' | 'orders'
  setActiveTab: (tab: 'overview' | 'products' | 'reorder' | 'stock-in' | 'orders') => void
}

type TabKey = 'overview' | 'products' | 'reorder' | 'stock-in' | 'orders'

const NAV_ITEMS: { tab: TabKey; label: string; emoji: string; icon: React.ReactNode }[] = [
  {
    tab: 'overview',
    label: 'Thống kê',
    emoji: '📊',
    icon: (
      <svg className="size-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
      </svg>
    ),
  },
  {
    tab: 'orders',
    label: 'Đơn hàng',
    emoji: '📋',
    icon: (
      <svg className="size-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    tab: 'products',
    label: 'Sản phẩm',
    emoji: '📦',
    icon: (
      <svg className="size-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    tab: 'stock-in',
    label: 'Nhập hàng',
    emoji: '📥',
    icon: (
      <svg className="size-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    tab: 'reorder',
    label: 'Sắp xếp',
    emoji: '🔀',
    icon: (
      <svg className="size-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
]

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────
export default function Sidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  onLogout,
  activeTab,
  setActiveTab,
}: SidebarProps) {
  const handleNav = (tab: TabKey) => {
    setActiveTab(tab)
    setIsSidebarOpen(false)
  }

  return (
    <aside className={`transform fixed inset-y-0 left-0 w-64 bg-blue-50/95 lg:bg-blue-50/40 border-r border-slate-200 flex flex-col justify-between p-6 z-50 transition-transform duration-300 lg:static lg:translate-x-0 ${
      isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    }`}>
      <div className="flex flex-col gap-8">
        {/* Logo / Title */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Admin Panel</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Quản lý kho vận</p>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.tab}
              onClick={() => handleNav(item.tab)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 text-left w-full cursor-pointer ${
                activeTab === item.tab
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/10 hover:bg-sky-600'
                  : 'bg-white/60 text-slate-600 hover:bg-white/90 border border-slate-200'
              }`}
            >
              {item.icon}
              <span>{item.emoji} {item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Bottom buttons */}
      <div className="flex flex-col gap-4">
        <button className="flex items-center justify-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors duration-200 rounded-xl py-3 px-4 text-xs font-semibold cursor-pointer">
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Hỗ trợ kỹ thuật</span>
        </button>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-red-500 hover:text-red-700 transition-colors duration-200 text-sm font-semibold pl-4 cursor-pointer"
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  )
}

// ─── Mobile Bottom Navigation Bar ────────────────────────────────────────────
// Hiện cố định ở đáy màn hình trên mobile/tablet, ẩn trên desktop (lg+)
export function BottomNav({
  activeTab,
  setActiveTab,
}: {
  activeTab: TabKey
  setActiveTab: (tab: TabKey) => void
}) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
      <div className="flex items-stretch h-[60px]">
        {NAV_ITEMS.map(item => {
          const isActive = activeTab === item.tab
          return (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 cursor-pointer relative ${
                isActive ? 'text-sky-600' : 'text-slate-400'
              }`}
            >
              {/* Active indicator — line at top */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-sky-500 rounded-full" />
              )}
              <span className={`text-xl leading-none transition-all duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>
                {item.emoji}
              </span>
              <span className={`text-[9px] font-bold leading-none mt-0.5 ${isActive ? 'text-sky-600' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
