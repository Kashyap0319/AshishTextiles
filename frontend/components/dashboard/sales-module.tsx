'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import {
  ShoppingCart, Plus, Loader2, Search, User, Package, Clock, ArrowDown, Calendar,
} from 'lucide-react'
import api from '@/lib/api'
import realData from '@/lib/real-data.json'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

interface Sale {
  id: number
  voucher_number: string
  voucher_date: string
  buyer_id?: number
  article_id?: number
  quantity_meters: number
  quantity_pieces: number
  total_amount: number
  sale_type: string
  narration: string
}

interface SaleSummary {
  total_sales: number
  total_meters: number
  total_amount: number
}

export function SalesModule() {
  const [sales, setSales] = useState<Sale[]>([])
  const [summary, setSummary] = useState<SaleSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [saleForm, setSaleForm] = useState({
    buyer_name: '',
    article_code: '',
    meters: '',
    sale_type: 'dyed',
  })

  // FIFO suggestion state
  const [fifoSuggestions, setFifoSuggestions] = useState<any[]>([])
  const [loadingFifo, setLoadingFifo] = useState(false)

  useEffect(() => {
    // Try backend first, fallback to parsed Excel data
    Promise.all([
      api.get('/sales/?per_page=50').then((r) => setSales(Array.isArray(r.data) ? r.data : [])),
      api.get('/sales/summary').then((r) => setSummary(r.data)),
    ]).catch(() => {
      // Fallback: use real parsed sales from Excel
      const rs = (realData.recentSales || []).map((s: any, i: number) => ({
        id: i + 1, voucher_number: s.voucher || `S-${i}`, voucher_date: s.date,
        narration: s.buyer, quantity_meters: s.meters, quantity_pieces: 1,
        total_amount: 0, sale_type: 'dyed',
      }))
      setSales(rs)
      setSummary({
        total_sales: realData.stats.totalSalesTransactions,
        total_meters: realData.stats.totalMetersSold,
        total_amount: 0,
      })
    }).finally(() => setLoading(false))
  }, [])

  // When article code changes, fetch oldest lots (FIFO)
  const fetchFifoLots = async (articleCode: string) => {
    if (!articleCode || articleCode.length < 3) { setFifoSuggestions([]); return }
    setLoadingFifo(true)
    try {
      const res = await api.get(`/stock/?search=${articleCode}&per_page=10`)
      const items = Array.isArray(res.data) ? res.data : res.data?.items || []
      // Sort by aging_days descending (oldest first = FIFO)
      const sorted = items.sort((a: any, b: any) => (b.aging_days || 0) - (a.aging_days || 0))
      setFifoSuggestions(sorted)
    } catch { setFifoSuggestions([]) }
    finally { setLoadingFifo(false) }
  }

  const handleCreateSale = async () => {
    if (!saleForm.buyer_name || !saleForm.article_code || !saleForm.meters) return
    setCreating(true)
    try {
      const meters = parseFloat(saleForm.meters)
      await api.post('/sales/', {
        voucher_number: `S-${Date.now().toString().slice(-6)}`,
        voucher_date: new Date().toISOString().split('T')[0],
        narration: saleForm.buyer_name,
        quantity_meters: meters,
        quantity_pieces: 1,
        sale_type: saleForm.sale_type,
      })
      setCreateOpen(false)
      setSaleForm({ buyer_name: '', article_code: '', meters: '', sale_type: 'dyed' })
      // Refresh
      const res = await api.get('/sales/?per_page=50')
      setSales(Array.isArray(res.data) ? res.data : [])
    } catch {} finally { setCreating(false) }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-4xl font-display-tight text-foreground flex items-center gap-3">
          <ShoppingCart className="size-8 text-primary" /> Sales
        </h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full h-11 px-6"><Plus className="mr-2 size-4" /> Create Sale</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="size-5 text-primary" /> New Sale (FIFO)
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Buyer Name *</Label>
                <Input placeholder="e.g. JANI TEXTILES" value={saleForm.buyer_name}
                  onChange={(e) => setSaleForm({ ...saleForm, buyer_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Article Code *</Label>
                <Input placeholder="e.g. A130D146" value={saleForm.article_code}
                  onChange={(e) => {
                    setSaleForm({ ...saleForm, article_code: e.target.value })
                    fetchFifoLots(e.target.value)
                  }} />
              </div>

              {/* FIFO Suggestions */}
              {fifoSuggestions.length > 0 && (
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <p className="text-xs font-medium flex items-center gap-2 text-amber-400">
                    <Clock className="size-3" /> FIFO: Oldest lots first
                  </p>
                  {fifoSuggestions.slice(0, 4).map((lot: any, i: number) => (
                    <div key={lot.id || i} className="flex items-center justify-between text-sm rounded-md bg-secondary/50 p-2">
                      <div>
                        <span className="font-mono">{lot.batch_number || lot.article_code || '—'}</span>
                        <span className="ml-2 text-muted-foreground">{lot.meters || lot.quantity || 0}m</span>
                      </div>
                      <Badge variant="outline" className={
                        (lot.aging_days || 0) > 60 ? 'text-red-400 border-red-500/30' :
                        (lot.aging_days || 0) > 30 ? 'text-amber-400 border-amber-500/30' :
                        'text-emerald-400 border-emerald-500/30'
                      }>
                        {lot.aging_days || 0}d old
                      </Badge>
                    </div>
                  ))}
                  {loadingFifo && <p className="text-xs text-muted-foreground">Loading lots...</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Meters *</Label>
                  <Input type="number" placeholder="5000" value={saleForm.meters}
                    onChange={(e) => setSaleForm({ ...saleForm, meters: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Sale Type</Label>
                  <Select value={saleForm.sale_type} onValueChange={(v) => setSaleForm({ ...saleForm, sale_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dyed">Dyed</SelectItem>
                      <SelectItem value="grey">Grey</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreateSale} disabled={creating} className="w-full">
                {creating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShoppingCart className="mr-2 size-4" />}
                {creating ? 'Creating...' : 'Create Sale'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards — pricing hidden per Q14 (fixed pricing, no per-sale tracking needed) */}
      {summary && (
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-bento border border-border bg-card p-6 shadow-bento-soft text-center">
            <p className="text-4xl font-display-tight">{summary.total_sales.toLocaleString()}</p>
            <p className="mt-2 text-sm uppercase tracking-wider text-muted-foreground font-semibold">Total Sales</p>
          </div>
          <div className="rounded-bento border border-border bg-card p-6 shadow-bento-soft text-center">
            <p className="text-4xl font-display-tight">{(summary.total_meters / 1000).toFixed(0)}K</p>
            <p className="mt-2 text-sm uppercase tracking-wider text-muted-foreground font-semibold">Meters Sold</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search sales..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Sales Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-bento border border-border bg-card p-2 shadow-bento-soft overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Voucher</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Meters</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales
                .filter((s) => !search || s.narration?.toLowerCase().includes(search.toLowerCase()) || s.voucher_number?.toLowerCase().includes(search.toLowerCase()))
                .slice(0, 50)
                .map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-mono">{sale.voucher_number}</TableCell>
                  <TableCell>{sale.voucher_date ? new Date(sale.voucher_date).toLocaleDateString() : '—'}</TableCell>
                  <TableCell className="font-medium">{sale.narration || '—'}</TableCell>
                  <TableCell>{sale.quantity_meters?.toLocaleString()}m</TableCell>
                  <TableCell><Badge variant="secondary">{sale.sale_type || 'dyed'}</Badge></TableCell>
                </TableRow>
              ))}
              {sales.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No sales found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
