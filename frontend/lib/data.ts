import type { Stock, Buyer, Rack, Activity, BuyerMatch } from './types'
import realData from './real-data.json'

// Stock Type Labels (from scope document — 6 configurable types)
export const stockTypeLabels: Record<string, string> = {
  'dead-stock': 'Dead Stock',
  'off-shade': 'Off-Shade / Off-Spec',
  'mill-seconds': 'Mill Seconds',
  'end-of-lot': 'End-of-Lot / Remnants',
  'overproduction': 'Overproduction / Surplus',
  'manufactured': 'Manufactured / Generic',
}

export const stockTypeColors: Record<string, string> = {
  'dead-stock': 'bg-red-500/20 text-red-400 border-red-500/30',
  'off-shade': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'mill-seconds': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'end-of-lot': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'overproduction': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'manufactured': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

// ═══════════════ REAL STOCK DATA (from CURRENT STOCK SNAPSHOT.xlsx — 5,734 items) ═══════════════
export const mockStocks: Stock[] = (realData.stockEntries || []).map((s: any) => ({
  id: s.id,
  code: s.code,
  fabricType: s.fabricType || 'Unclassified',
  stockType: (s.stockType || 'overproduction') as Stock['stockType'],
  qualityGrade: (s.qualityGrade || 'B') as Stock['qualityGrade'],
  quantity: s.quantity || 0,
  unit: 'meters' as const,
  purchasePrice: s.purchasePrice || 0,
  sellingPrice: s.sellingPrice || 0,
  manufacturer: s.manufacturer || '',
  rackLocation: s.rackLocation || 'Warehouse',
  daysInStock: s.daysInStock || 0,
  dateAdded: s.dateAdded || '2026-03-01',
  lastUpdated: s.lastUpdated || '2026-04-10',
  tags: s.tags || [],
  status: (s.status || 'available') as Stock['status'],
  defectNotes: s.defectNotes || '',
}))

// ═══════════════ REAL BUYER DATA (from A_ListofSalesVouchers + DYED SALE — 742 unique buyers) ═══════════════
export const mockBuyers: Buyer[] = (realData.buyers || []).map((b: any) => ({
  id: b.id,
  name: b.name,
  company: b.company || b.name,
  phone: b.phone || '',
  email: b.email || '',
  whatsapp: b.whatsapp || b.phone || '',
  type: (b.type || 'generalist') as Buyer['type'],
  preferredFabrics: b.preferredFabrics || [],
  qualityPreference: b.qualityPreference || [],
  volumeRange: b.volumeRange || { min: 0, max: 50000 },
  paymentBehavior: (b.paymentBehavior || 'good') as Buyer['paymentBehavior'],
  totalPurchases: b.totalPurchases || 0,
  lastOrderDate: b.lastOrderDate || '',
  assignedSalesperson: b.assignedSalesperson || '',
  tags: b.tags || [],
  status: (b.status || 'active') as Buyer['status'],
  createdAt: b.createdAt || '2026-01-01',
}))

// ═══════════════ REAL RACK DATA (from rack numbers.xlsx — 211 assigned racks, 9 halls) ═══════════════
const hallColors: Record<string, string> = {
  'Hall 1': 'slate', 'Hall 2': 'blue', 'Hall 3': 'slate', 'Hall 4': 'amber',
  'Hall 5': 'blue', 'Hall 6': 'orange', 'Hall 7': 'emerald', 'Hall 8': 'amber',
  'Hall 9': 'emerald', 'Hall 10': 'red',
}

export const mockRacks: Rack[] = (realData.racks || []).map((r: any, i: number) => ({
  id: `${r.number}`,
  code: `${r.hall.replace('Hall ', 'H')}-${r.number}`,
  zone: r.hall,
  capacity: 10000,
  // No random — show 0 until backend provides real occupancy
  currentStock: 0,
  stockItems: [],
  stockType: 'overproduction' as const,
  color: hallColors[r.hall] || 'slate',
}))

// ═══════════════ ACTIVITIES — empty until backend provides real data ═══════════════
export const mockActivities: Activity[] = []

// ═══════════════ BUYER MATCHING (uses real buyer data) ═══════════════
export function getMatchingBuyers(stock: Stock): BuyerMatch[] {
  const matches: BuyerMatch[] = mockBuyers
    .filter(buyer => buyer.status !== 'inactive')
    .map(buyer => {
      let score = 0
      const reasons: string[] = []

      // Fabric type match (specialist)
      if (buyer.type === 'specialist') {
        const matchesFabric = buyer.preferredFabrics.some(f =>
          stock.fabricType.toLowerCase().includes(f.toLowerCase()) ||
          f.toLowerCase().includes(stock.fabricType.toLowerCase())
        )
        if (matchesFabric) {
          score += 40
          reasons.push(`Specialist — buys ${stock.fabricType}`)
        }
      } else {
        score += 20
        reasons.push('Generalist buyer — considers all fabrics')
      }

      // Quality preference match
      if (buyer.qualityPreference.includes(stock.qualityGrade)) {
        score += 25
        reasons.push(`Accepts Grade ${stock.qualityGrade} quality`)
      }

      // Volume match
      if (stock.quantity >= buyer.volumeRange.min && stock.quantity <= buyer.volumeRange.max) {
        score += 20
        reasons.push('Volume within typical range')
      }

      // Recent activity bonus
      if (buyer.lastOrderDate) {
        const daysSinceOrder = Math.floor(
          (new Date().getTime() - new Date(buyer.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysSinceOrder < 14) {
          score += 15
          reasons.push('Recently active buyer')
        } else if (daysSinceOrder < 30) {
          score += 10
          reasons.push('Active within last month')
        }
      }

      // Payment behavior bonus
      if (buyer.paymentBehavior === 'excellent') {
        score += 5
        reasons.push('Excellent payment history')
      }

      return {
        buyer,
        score: Math.min(score, 100),
        reasons,
        // Real data — total meters from parsed sales
        pastVolume: buyer.totalPurchases,
        timesBought: (buyer as any).transactions || 0,
        lastOrder: buyer.lastOrderDate,
      }
    })
    .sort((a, b) => b.score - a.score)

  return matches
}

// ═══════════════ DASHBOARD STATS (from real parsed data) ═══════════════
export function getDashboardStats() {
  const s = realData.stats
  return {
    totalStock: s.totalMeters,
    totalValue: 0, // No pricing in stock snapshot
    urgentItems: 0,
    avgDaysInStock: 0,
    activeBuyers: mockBuyers.filter(b => b.status === 'active').length,
    totalBuyers: s.totalBuyers,
    racksUsed: s.totalRacks,
    capacityUsed: 0,
  }
}
