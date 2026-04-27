'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import {
  Clock, CheckCircle2, XCircle, DollarSign, Loader2, User, Calendar, Edit3,
} from 'lucide-react'
import api from '@/lib/api'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

interface PendingSale {
  id: number
  voucher_number: string
  voucher_date: string
  buyer_name: string
  quantity_meters: number
  unit_price: number
  total_amount: number
  sale_type: string
  created_by?: number
  created_at: string
}

interface Stats {
  pending: number
  approved: number
  rejected: number
}

export function PriceApprovals() {
  const [sales, setSales] = useState<PendingSale[]>([])
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<PendingSale | null>(null)
  const [counterPrice, setCounterPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      api.get('/sales/pending-approval').then((r) => setSales(Array.isArray(r.data) ? r.data : [])),
      api.get('/sales/approval-stats').then((r) => setStats(r.data)),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const approve = async (accept: boolean) => {
    if (!selected) return
    setProcessing(true)
    try {
      if (accept) {
        const body: any = {}
        if (counterPrice) body.counter_price = parseFloat(counterPrice)
        if (notes) body.notes = notes
        await api.put(`/sales/${selected.id}/approve`, null, { params: body })
      } else {
        await api.put(`/sales/${selected.id}/reject`, null, { params: { notes } })
      }
      setSelected(null)
      setCounterPrice('')
      setNotes('')
      fetchData()
    } catch {} finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="mb-8">
        <h2 className="font-display-tight text-4xl text-foreground mb-3">Price approvals</h2>
        <p className="text-sm text-muted-foreground max-w-xl">
          Sales team must get admin approval before dispatch. Review prices, set counter-offers, approve or reject.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', val: stats.pending, tone: 'text-warning', icon: Clock },
          { label: 'Approved', val: stats.approved, tone: 'text-success', icon: CheckCircle2 },
          { label: 'Rejected', val: stats.rejected, tone: 'text-destructive', icon: XCircle },
        ].map((s) => (
          <div key={s.label} className="rounded-bento border border-border bg-card p-6 shadow-bento-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className={`font-display-tight text-5xl mt-3 ${s.tone}`}>{s.val.toLocaleString()}</p>
              </div>
              <s.icon className={`size-8 ${s.tone} opacity-60`} />
            </div>
          </div>
        ))}
      </div>

      {/* Pending list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : sales.length === 0 ? (
        <div className="rounded-bento border border-border bg-card py-16 text-center shadow-bento-soft">
          <CheckCircle2 className="mx-auto mb-4 size-12 text-success/60" />
          <p className="text-lg font-medium text-foreground">No pending approvals.</p>
          <p className="text-sm text-muted-foreground mt-2">All sales have been reviewed.</p>
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Clock className="size-4 text-warning" />
            Awaiting your review
            <Badge variant="outline">{sales.length}</Badge>
          </h3>
          {sales.map((s) => (
            <motion.div key={s.id} variants={staggerItem}>
              <div className="rounded-2xl border border-warning/20 bg-warning/5 p-6 shadow-bento-soft flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-warning/10">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-lg font-semibold">{s.voucher_number}</span>
                    <Badge variant="outline" className="capitalize rounded-full">{s.sale_type}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><User className="size-4 text-foreground/50" /> {s.buyer_name}</span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-4 text-foreground/50" />
                      {s.voucher_date ? new Date(s.voucher_date).toLocaleDateString() : '—'}
                    </span>
                    <span><strong className="text-foreground">{s.quantity_meters?.toLocaleString()}</strong> m</span>
                    <span className="font-mono">₹{s.unit_price?.toFixed(2)}/m</span>
                    <span className="font-mono text-foreground font-semibold text-base">₹{s.total_amount?.toLocaleString()}</span>
                  </div>
                </div>
                <Button size="lg" className="rounded-full shrink-0" onClick={() => setSelected(s)}>
                  <Edit3 className="mr-2 size-4" /> Review
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Review dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Review sale {selected?.voucher_number}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Buyer</p>
                  <p className="font-medium">{selected.buyer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Quantity</p>
                  <p className="font-medium">{selected.quantity_meters?.toLocaleString()} m</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Proposed price</p>
                  <p className="font-mono font-medium">₹{selected.unit_price?.toFixed(2)}/m</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total amount</p>
                  <p className="font-serif text-2xl ticker">₹{selected.total_amount?.toLocaleString()}</p>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <div className="space-y-2">
                  <Label>Counter price (optional)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={`Leave blank to keep ₹${selected.unit_price}/m`}
                      value={counterPrice}
                      onChange={(e) => setCounterPrice(e.target.value)}
                      className="pl-9 font-mono"
                    />
                  </div>
                  {counterPrice && (
                    <p className="text-xs text-muted-foreground">
                      New total: <span className="font-mono text-foreground">₹{(parseFloat(counterPrice) * (selected.quantity_meters || 0)).toLocaleString()}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    placeholder="Reason for counter-price or rejection..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => approve(false)} disabled={processing}>
              <XCircle className="mr-2 size-4" /> Reject
            </Button>
            <Button onClick={() => approve(true)} disabled={processing}>
              {processing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
              {counterPrice ? 'Approve with counter' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
