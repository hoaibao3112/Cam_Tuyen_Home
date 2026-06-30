export function getProductUnit(category: string, unit?: string | null): string {
  if (unit && unit.trim()) return unit.trim()
  const cat = category.trim().toLowerCase()
  if (cat.includes('rau') || cat.includes('quả') || cat.includes('trái cây') || cat.includes('củ')) {
    return 'kg'
  }
  if (cat.includes('hoa')) {
    return 'bó'
  }
  if (cat.includes('hạt') || cat.includes('bánh') || cat.includes('đặc sản') || cat.includes('sấy')) {
    return 'hộp'
  }
  return 'cái'
}
