'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import {
  Bell, Plus, Loader2, Send, X, Package, Phone, Trash2, CheckCircle2, MessageCircle,
} from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'

interface Inquiry {
  id: number
  buyer_name: string
  buyer_phone?: string
  article_code?: string
  quality_category?: string
  color?: string
  min_meters?: number
  notes?: string
  status: string
  alert_count: number
  last_alerted_at?: string
  created_at: string
}

export function Inquiries() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    buyer_name: '', buyer_phone: '', article_code: '', quality_category: '',
    color: '', min_meters: '', notes: '',
  })
  const [creating, setCreating] = useState(false)

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      api.get('/inquiries/').then((r) => setInquiries(Array.isArray(r.data) ? r.data : [])),
      api.get('/inquiries/active-alerts').then((r) => setAlerts(Array.isArray(r.data) ? r.data : [])).catch(() => setAlerts([])),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const handleCreate = async () => {
    if (!form.buyer_name.trim()) return
    setCreating(true)
    try {
      await api.post('/inquiries/', {
        ...form,
        min_meters: form.min_meters ? parseFloat(form.min_meters) : 0,
      })
      setForm({ buyer_name: '', buyer_phone: '', article_code: '', quality_category: '', color: '', min_meters: '', notes: '' })
      setOpen(false)
      fetchData()
    } catch {} finally {
      setCreating(false)
    }
  }

  const alertBuyer = async (inq: Inquiry) => {
    const phone = (inq.buyer_phone || '').replace(/[^0-9]/g, '')
    const what = inq.article_code || inq.quality_category || 'your requested item'
    const text = encodeURIComponent(
      `Hi ${inq.buyer_name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}, we have ${what} available now. Interested?`
    )
    if (phone) window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
    try { await api.post(`/inquiries/${inq.id}/mark-alerted`) } catch {}
    fetchData()
  }

  const closeInquiry = async (id: number, status: 'fulfilled' | 'closed') => {
    await api.put(`/inquiries/${id}/close`, null, { params: { status } })
    fetchData()
  }

  const remove = async (id: number) => {
    await api.delete(`/inquiries/${id}`)
    fetchData()
  }

  const statusColor = (s: string) => {
    if (s === 'open') return 'text-warning border-warning/30 bg-warning/10'
    if (s === 'alerted') return 'text-primary border-primary/30 bg-primary/10'
    if (s === 'fulfilled') return 'text-success border-success/30 bg-success/10'
    return 'text-muted-foreground border-border bg-muted'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-serif text-2xl text-foreground mb-1">Buyer inquiries & demand alerts</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Log what buyers ask for. When matching stock arrives, get instant alerts and WhatsApp them directly.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 size-4" /> Log inquiry</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">New buyer inquiry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Buyer name *</Label>
                  <Input value={form.buyer_name} onChange={(e) => setForm({ ...form, buyer_name: e.target.value })} placeholder="JANI TEXTILES" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.buyer_phone} onChange={(e) => setForm({ ...form, buyer_phone: e.target.value })} placeholder="+91 ..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Article code</Label>
                  <Input value={form.article_code} onChange={(e) => setForm({ ...form, article_code: e.target.value })} placeholder="e.g. A130D146" className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Quality category</Label>
                  <Input value={form.quality_category} onChange={(e) => setForm({ ...form, quality_category: e.target.value })} placeholder="e.g. LY-TWILL" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="e.g. INDIGO" />
                </div>
                <div className="space-y-2">
                  <Label>Min meters</Label>
                  <Input type="number" value={form.min_meters} onChange={(e) => setForm({ ...form, min_meters: e.target.value })} placeholder="5000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any specific requirements..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating || !form.buyer_name.trim()}>
                {creating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Bell className="mr-2 size-4" />}
                Log inquiry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active alerts banner */}
      {alerts.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="size-4 text-primary pulse-active" />
              <h3 className="font-medium">{alerts.length} buyer{alerts.length > 1 ? 's' : ''} waiting for stock in our warehouse</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Matching stock currently available for these pending inquiries. Alert them now.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Inquiry list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : inquiries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="mx-auto mb-3 size-10 text-muted-foreground/40" />
            <p className="font-medium">No inquiries yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Log what buyers ask for — system will alert you when matching stock arrives.
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
          {inquiries.map((inq) => (
            <motion.div key={inq.id} variants={staggerItem}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-medium">{inq.buyer_name}</span>
                        <Badge variant="outline" className={`capitalize text-[10px] ${statusColor(inq.status)}`}>
                          {inq.status}
                        </Badge>
                        {inq.alert_count > 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            Alerted {inq.alert_count}×
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {inq.article_code && (
                          <span className="flex items-center gap-1">
                            <Package className="size-3" /> <span className="font-mono">{inq.article_code}</span>
                          </span>
                        )}
                        {inq.quality_category && <span>Quality: {inq.quality_category}</span>}
                        {inq.color && <span>Color: {inq.color}</span>}
                        {inq.min_meters ? <span>Min: {inq.min_meters}m</span> : null}
                        {inq.buyer_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="size-3" /> {inq.buyer_phone}
                          </span>
                        )}
                      </div>
                      {inq.notes && (
                        <p className="text-xs italic text-muted-foreground mt-1.5">{inq.notes}</p>
                      )}
                    </div>

                    <div className="flex gap-1 shrink-0">
                      {inq.status === 'open' && (
                        <Button size="sm" onClick={() => alertBuyer(inq)}>
                          <MessageCircle className="mr-1.5 size-3" /> WhatsApp
                        </Button>
                      )}
                      {inq.status !== 'fulfilled' && (
                        <Button size="sm" variant="outline" onClick={() => closeInquiry(inq.id, 'fulfilled')}>
                          <CheckCircle2 className="size-3" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => remove(inq.id)}>
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
