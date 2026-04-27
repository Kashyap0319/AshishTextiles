'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import api from '@/lib/api'

/**
 * Fetches data from the FastAPI backend and populates the Zustand store.
 * Falls back to mock data (already in store) if the backend is unavailable.
 */
export function DataLoader() {
  const { setStocks, setBuyers, setActivities } = useAppStore()

  useEffect(() => {
    const token = localStorage.getItem('caratsense_token')
    if (!token) return // Don't fetch if not authenticated

    // Fetch stock data (with article details)
    api.get('/stock/?per_page=200')
      .then((res) => {
        const items = Array.isArray(res.data) ? res.data : res.data?.items || res.data?.data || []
        if (items.length > 0) {
          // Backend joins Article — { id, article_id, batch_number, meters, hall, rack_number, status, aging_days, article: { article_code, quality_category } }
          const stocks = items.map((item: any) => ({
            id: String(item.id),
            code: item.article?.article_code || item.batch_number || `STK-${item.id}`,
            fabricType: item.article?.quality_category || item.fabric_type || 'Unknown',
            stockType: mapStockType(item.stock_type || item.status),
            qualityGrade: mapQualityGrade(item.article?.quality_category || item.quality_grade),
            quantity: item.meters || item.quantity || 0,
            purchasePrice: item.purchase_price || item.purchasePrice || 0,
            sellingPrice: item.selling_price || item.sellingPrice || 0,
            manufacturer: item.manufacturer || item.mill_name || '',
            rackLocation: item.rack_number ? `H${item.hall}-${item.rack_number}` : (item.rack_location || 'Unassigned'),
            daysInStock: item.aging_days || item.days_in_stock || 0,
            dateAdded: item.received_date || item.date_added || new Date().toISOString(),
            lastUpdated: item.updated_at || item.last_updated || new Date().toISOString(),
            tags: item.tags || [],
            status: mapStatus(item.status),
            defectNotes: item.defect_notes || item.remarks || '',
            baleNumber: item.batch_number,
          }))
          setStocks(stocks)
        }
      })
      .catch(() => {
        // Keep mock data in store as fallback
        console.log('Backend unavailable, using mock data for stocks')
      })

    // Fetch buyers data
    api.get('/buyers/?per_page=100')
      .then((res) => {
        const items = Array.isArray(res.data) ? res.data : res.data?.items || res.data?.data || []
        if (items.length > 0) {
          // Map backend buyer model — { id, name, phone, city, buyer_type, preferred_qualities, total_purchases_meters, total_purchases_count, last_purchase_date, is_active }
          const buyers = items.map((item: any) => ({
            id: String(item.id),
            name: item.name || 'Unknown',
            company: item.company || item.name || '',
            phone: item.phone || '',
            email: item.email || '',
            whatsapp: item.whatsapp || item.phone || '',
            type: (item.buyer_type || 'generalist') as 'specialist' | 'generalist',
            preferredFabrics: Array.isArray(item.preferred_qualities)
              ? item.preferred_qualities
              : (item.preferred_qualities || '').split(',').filter(Boolean),
            qualityPreference: item.quality_preference || [],
            volumeRange: item.volume_range || { min: 0, max: item.total_purchases_meters || 50000 },
            paymentBehavior: (item.payment_behavior || 'good') as 'excellent' | 'good' | 'fair' | 'poor',
            totalPurchases: item.total_purchases_meters || item.total_meters || 0,
            lastOrderDate: item.last_purchase_date || item.last_order_date || '',
            assignedSalesperson: item.assigned_salesperson || '',
            tags: item.tags || [],
            status: item.is_active === false ? 'inactive' : (item.status || 'active'),
            createdAt: item.created_at || '',
          }))
          setBuyers(buyers)
        }
      })
      .catch(() => {
        console.log('Backend unavailable, using mock data for buyers')
      })
  }, [setStocks, setBuyers, setActivities])

  return null // This component only loads data, renders nothing
}

function mapStockType(type?: string): string {
  if (!type) return 'overproduction'
  const map: Record<string, string> = {
    'dead_stock': 'dead-stock',
    'dead-stock': 'dead-stock',
    'off_shade': 'off-shade',
    'off-shade': 'off-shade',
    'mill_seconds': 'mill-seconds',
    'mill-seconds': 'mill-seconds',
    'end_of_lot': 'end-of-lot',
    'end-of-lot': 'end-of-lot',
    'overproduction': 'overproduction',
    'manufactured': 'manufactured',
    'available': 'overproduction',
    'reserved': 'overproduction',
    'sold': 'overproduction',
  }
  return map[type.toLowerCase()] || 'overproduction'
}

function mapQualityGrade(grade?: string): string {
  if (!grade) return 'B'
  if (grade.length === 1 && 'ABCD'.includes(grade.toUpperCase())) return grade.toUpperCase()
  // Map quality category names to grades
  const name = grade.toLowerCase()
  if (name.includes('premium') || name.includes('satin')) return 'A'
  if (name.includes('standard') || name.includes('tussur')) return 'B'
  if (name.includes('economy')) return 'C'
  return 'B'
}

function mapStatus(status?: string): string {
  if (!status) return 'available'
  const s = status.toLowerCase()
  if (s === 'available' || s === 'active') return 'available'
  if (s === 'reserved' || s === 'hold') return 'reserved'
  if (s === 'sold') return 'sold'
  if (s === 'urgent' || s === 'critical') return 'urgent'
  return 'available'
}
