export default function Loading() {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#FAFAFA] text-slate-800 flex flex-col animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col items-center justify-center py-5 px-4 border-b border-[#F3F4F6] bg-white shadow-sm shrink-0">
        <div className="h-3 w-16 bg-slate-200 rounded-full mb-2" />
        <div className="h-10 w-40 bg-slate-200 rounded-lg" />
        <div className="h-3 w-48 bg-slate-200 rounded-full mt-2" />
      </div>

      {/* Tabs Skeleton */}
      <div className="bg-white border-b border-[#F3F4F6] shrink-0">
        <div className="flex justify-between gap-1.5 sm:gap-2.5 px-2 sm:px-4 py-3">
          <div className="flex-1 h-8 bg-slate-200 rounded-full" />
          <div className="flex-1 h-8 bg-slate-200 rounded-full" />
          <div className="flex-1 h-8 bg-slate-200 rounded-full" />
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50/80 border-b border-[#F3F4F6]">
          <div className="w-16 h-7 bg-slate-200 rounded-full shrink-0" />
          <div className="w-20 h-7 bg-slate-200 rounded-full shrink-0" />
          <div className="w-24 h-7 bg-slate-200 rounded-full shrink-0" />
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="flex-1 overflow-y-auto p-1.5 sm:p-6 bg-[#FAFAFA]">
        <div className="grid grid-cols-4 md:grid-cols-3 gap-1.5 sm:gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-lg sm:rounded-[16px] overflow-hidden border border-[#F3F4F6] p-1.5 sm:p-3 flex flex-col gap-2 sm:gap-3"
            >
              {/* Image box aspect 4/3 */}
              <div className="w-full aspect-[4/3] rounded-md sm:rounded-[12px] bg-slate-200" />
              
              {/* Name skeleton */}
              <div className="space-y-1 flex-1">
                <div className="h-3 sm:h-4 bg-slate-200 rounded-full w-5/6" />
                <div className="h-3 sm:h-4 bg-slate-200 rounded-full w-2/3 sm:block hidden" />
              </div>

              {/* Price skeleton */}
              <div className="h-3 sm:h-4 bg-slate-200 rounded-full w-1/3 mt-1" />

              {/* Button skeleton */}
              <div className="h-[26px] sm:h-[40px] w-full bg-slate-200 rounded-md sm:rounded-[12px] mt-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
