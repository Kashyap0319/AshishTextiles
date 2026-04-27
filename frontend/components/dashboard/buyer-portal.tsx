'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import {
  User, Search, Loader2, Phone, MessageCircle, TrendingUp, Calendar, Package, DollarSign,
} from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Buyer {
  id: number
  name: string
  phone?: string
  city?: string
  buyer_type?: string
  total_purchases_meters?: number
  total_purchases_count?: number
  last_purchase_date?: string
  preferred_qualities?: string[]
}

interface Sale {
  id: number
  voucher_number: string
  voucher_date: string
  quantity_meters: number
  total_amount: number
  narration: string
  sale_type: string
}

export function BuyerPortal() {
  const [search, setSearch] = useState('')
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Buyer | null>(null)
  const [buyerSales, setBuyerSales] = useState<Sale[]>([])
  const [salesLoading, setSalesLoading] = useState(false)

  useEffect(() => {
    api.get('/buyers/top?limit=50')
      .then((r) => setBuyers(Array.isArray(r.data) ? r.data : []))
      .catch(() => setBuyers([]))
      .finally(() => setLoading(false))
  }, [])

  const selectBuyer = async (b: Buyer) => {
    setSelected(b)
    setBuyerSales([])
    setSalesLoading(true)
    try {
      const res = await api.get(`/sales/?buyer_id=${b.id}&per_page=50`)
      setBuyerSales(Array.isArray(res.data) ? res.data : [])
    } catch {} finally { setSalesLoading(false) }
  }

  const filtered = search
    ? buyers.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    : buyers

  const totalMeters = buyerSales.reduce((s, x) => s + (x.quantity_meters || 0), 0)
  const totalAmount = buyerSales.reduce((s, x) => s + (x.total_amount || 0), 0)
  const avgOrderSize = buyerSales.length > 0 ? totalMeters / buyerSales.length : 0

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      {/* Buyer list */}
      <div className="rounded-bento border border-border bg-card shadow-bento-soft flex flex-col overflow-hidden h-[700px]">
        <div className="p-6 border-b border-border">
          <h2 className="font-display-tight text-3xl mb-4">Buyers</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 rounded-full"
            />
          </div>
        </div>
        <div className="flex-1 overflow-hidden p-0">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              {filtered.slice(0, 100).map((b) => (
                <button
                  key={b.id}
                  onClick={() => selectBuyer(b)}
                  className={`w-full text-left px-4 py-2.5 border-b border-border hover:bg-accent transition-colors ${
                    selected?.id === b.id ? 'bg-accent border-l-2 border-l-primary' : ''
                  }`}
                >
                  <p className="text-sm font-medium truncate">{b.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {b.total_purchases_meters?.toLocaleString() || 0}m · {b.total_purchases_count || 0} orders
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Buyer detail */}
      {selected ? (
        <div className="space-y-5">
          {/* Header */}
          <div className="rounded-bento border border-border bg-card p-6 shadow-bento-soft">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-serif text-2xl shrink-0">
                    {selected.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-serif text-2xl text-foreground truncate">{selected.name}</h2>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {selected.buyer_type && <Badge variant="outline" className="capitalize">{selected.buyer_type}</Badge>}
                      {selected.city && <span>{selected.city}</span>}
                      {selected.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3" /> {selected.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {selected.phone && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => window.open(`tel:${selected.phone}`)}>
                        <Phone className="size-3" />
                      </Button>
                      <Button size="sm" onClick={() => {
                        const phone = (selected.phone || '').replace(/[^0-9]/g, '')
                        window.open(`https://wa.me/${phone}`, '_blank')
                      }}>
                        <MessageCircle className="mr-2 size-3" /> WhatsApp
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total orders', val: selected.total_purchases_count || 0, icon: Package },
              { label: 'Total meters', val: (selected.total_purchases_meters || 0).toLocaleString(), icon: TrendingUp },
              { label: 'Avg order', val: `${Math.round(avgOrderSize).toLocaleString()}m`, icon: Package },
              { label: 'Total spend', val: `₹${(totalAmount / 100000).toFixed(1)}L`, icon: DollarSign },
            ].map((s) => (
              <div key={s.label} className="rounded-bento border border-border bg-card p-6 shadow-bento-soft">
                <s.icon className="size-6 text-muted-foreground/50 mb-4" />
                <p className="font-display-tight text-4xl">{s.val}</p>
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mt-2">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Purchase timeline */}
          <div className="rounded-bento border border-border bg-card p-6 shadow-bento-soft">
            <div className="mb-6 flex items-center gap-2">
              <Calendar className="size-5 text-primary" /> 
              <h3 className="font-display-tight text-3xl">Purchase history</h3>
            </div>
            <div>
              {salesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
              ) : buyerSales.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-6">No sales recorded.</p>
              ) : (
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
                  {buyerSales.slice(0, 30).map((sale) => (
                    <motion.div key={sale.id} variants={staggerItem}>
                      <div className="flex items-center gap-4 py-2 border-b border-border last:border-0">
                        <div className="shrink-0 w-20 text-xs text-muted-foreground">
                          {sale.voucher_date ? new Date(sale.voucher_date).toLocaleDateString() : '—'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono truncate">{sale.voucher_number}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {sale.narration || '—'}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-medium">{sale.quantity_meters?.toLocaleString()}m</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            ₹{sale.total_amount?.toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="capitalize text-[10px] shrink-0">
                          {sale.sale_type || 'sale'}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-bento border border-border bg-card flex h-full min-h-[400px] items-center justify-center shadow-bento-soft">
          <div className="text-center">
            <User className="mx-auto mb-4 size-16 text-muted-foreground/30" />
            <h3 className="font-display-tight text-3xl">Select a Buyer</h3>
            <p className="text-muted-foreground mt-2">
              Click on any buyer to view their profile and history
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
