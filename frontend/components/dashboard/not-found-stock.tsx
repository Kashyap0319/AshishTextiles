'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import {
  AlertTriangle, Plus, ArrowRightLeft, Loader2, PackageX, CheckCircle2, Trash2,
} from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface NotFoundBale {
  id: number
  voucher_number: string
  voucher_date: string
  batch_number: string
  narration: string
  quantity_meters: number
  created_at: string
}

export function NotFoundStock() {
  const [bales, setBales] = useState<NotFoundBale[]>([])
  const [loading, setLoading] = useState(true)
  const [bulkInput, setBulkInput] = useState('')
  const [notes, setNotes] = useState('')
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState(false)
  const [reconcile, setReconcile] = useState<NotFoundBale | null>(null)
  const [saleId, setSaleId] = useState('')

  const fetchData = () => {
    setLoading(true)
    api.get('/stock/not-found')
      .then((r) => setBales(Array.isArray(r.data) ? r.data : []))
      .catch(() => setBales([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const handleAdd = async () => {
    const baleList = bulkInput
      .split(/[\s,\n]+/)
      .map((b) => b.trim())
      .filter(Boolean)
    if (baleList.length === 0) return
    setAdding(true)
    try {
      await api.post('/stock/not-found', baleList, { params: { notes } })
      setBulkInput('')
      setNotes('')
      setOpen(false)
      fetchData()
    } catch {} finally {
      setAdding(false)
    }
  }

  const handleReconcile = async () => {
    if (!reconcile || !saleId) return
    try {
      await api.post(`/stock/not-found/${reconcile.batch_number}/reconcile`, null, {
        params: { target_sale_id: parseInt(saleId) },
      })
      setReconcile(null)
      setSaleId('')
      fetchData()
    } catch {}
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-serif text-2xl text-foreground mb-1">Not-Found reconciliation</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Missing rolls during packing go here. When a bale later appears in a real buyer sale, transfer it to reconcile the count.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" /> Mark bales missing
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Mark bales as Not Found</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Bale numbers</Label>
                <Textarea
                  placeholder="Paste bale numbers, one per line or comma-separated&#10;e.g. 370005170774&#10;370005170777"
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {bulkInput.split(/[\s,\n]+/).filter(Boolean).length} bales detected
                </p>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input
                  placeholder="e.g. Short from mill / Missed in tally"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={adding}>
                {adding ? <Loader2 className="mr-2 size-4 animate-spin" /> : <AlertTriangle className="mr-2 size-4" />}
                Mark as Not Found
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : bales.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="mx-auto mb-3 size-10 text-success/60" />
            <p className="font-medium">All bales accounted for.</p>
            <p className="text-sm text-muted-foreground mt-1">No missing bales currently.</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <PackageX className="size-4 text-warning" />
            <h3 className="font-medium">Missing bales</h3>
            <Badge variant="outline">{bales.length}</Badge>
          </div>
          {bales.map((b) => (
            <motion.div key={b.id} variants={staggerItem}>
              <Card>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-warning/10 p-2">
                      <PackageX className="size-4 text-warning" />
                    </div>
                    <div>
                      <p className="font-mono font-medium text-lg">{b.batch_number || '—'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Marked missing on {b.voucher_date ? new Date(b.voucher_date).toLocaleDateString() : '—'}
                      </p>
                      {b.narration && b.narration !== '*NOT FOUND/TRACED*' && (
                        <p className="text-xs italic text-muted-foreground mt-1">
                          {b.narration.replace('*NOT FOUND/TRACED*', '').trim()}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setReconcile(b)}>
                    <ArrowRightLeft className="mr-2 size-3" /> Transfer to buyer
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Reconcile dialog */}
      <Dialog open={!!reconcile} onOpenChange={(v) => !v && setReconcile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Transfer bale to buyer sale</DialogTitle>
          </DialogHeader>
          {reconcile && (
            <div className="space-y-4">
              <Card className="bg-muted/50">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Bale number</p>
                  <p className="font-mono font-medium text-lg">{reconcile.batch_number}</p>
                </CardContent>
              </Card>
              <div className="space-y-2">
                <Label>Target buyer sale ID</Label>
                <Input
                  type="number"
                  placeholder="e.g. 12345"
                  value={saleId}
                  onChange={(e) => setSaleId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Find the sale ID where this bale was actually dispatched. Not-Found entry will be deleted.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReconcile(null)}>Cancel</Button>
            <Button onClick={handleReconcile} disabled={!saleId}>
              <ArrowRightLeft className="mr-2 size-4" /> Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
