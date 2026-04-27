'use client'

import { useState } from 'react'
import { Package, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export function AddStockDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    article_code: '',
    batch_number: '',
    meters: '',
    pieces: '1',
    hall: '',
    rack_number: '',
    status: 'available',
    fabric_type: '',
    quality_category: '',
    defect_notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/stock/', {
        article_code: form.article_code,
        batch_number: form.batch_number,
        meters: parseFloat(form.meters),
        pieces: parseInt(form.pieces),
        hall: form.hall,
        rack_number: form.rack_number,
        status: form.status,
        fabric_type: form.fabric_type,
        quality_category: form.quality_category,
        remarks: form.defect_notes,
      })
      setOpen(false)
      setForm({ article_code: '', batch_number: '', meters: '', pieces: '1', hall: '', rack_number: '', status: 'available', fabric_type: '', quality_category: '', defect_notes: '' })
    } catch {
      // Error handled by axios interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="size-5 text-primary" /> Add New Stock
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Article Code *</Label>
              <Input placeholder="e.g. A130D146" value={form.article_code} onChange={(e) => setForm({ ...form, article_code: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Batch Number</Label>
              <Input placeholder="e.g. 370004901478" value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Meters *</Label>
              <Input type="number" placeholder="e.g. 5000" value={form.meters} onChange={(e) => setForm({ ...form, meters: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Pieces</Label>
              <Input type="number" placeholder="1" value={form.pieces} onChange={(e) => setForm({ ...form, pieces: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fabric Type</Label>
              <Input placeholder="e.g. Lycra Cotton" value={form.fabric_type} onChange={(e) => setForm({ ...form, fabric_type: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Quality Category</Label>
              <Input placeholder="e.g. LY-TWILL" value={form.quality_category} onChange={(e) => setForm({ ...form, quality_category: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Hall *</Label>
              <Input placeholder="e.g. 3" value={form.hall} onChange={(e) => setForm({ ...form, hall: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Rack Number *</Label>
              <Input placeholder="e.g. 301" value={form.rack_number} onChange={(e) => setForm({ ...form, rack_number: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Defect Notes</Label>
            <Textarea placeholder="Any defects, shade issues, etc." value={form.defect_notes} onChange={(e) => setForm({ ...form, defect_notes: e.target.value })} />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Package className="mr-2 size-4" />}
            {loading ? 'Adding...' : 'Add Stock Entry'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
