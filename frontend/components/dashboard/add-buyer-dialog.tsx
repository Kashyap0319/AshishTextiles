'use client'

import { useState } from 'react'
import { Users, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export function AddBuyerDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    city: '',
    buyer_type: 'generalist',
    preferred_fabric_type: 'both',
    preferred_qualities: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/buyers/', {
        name: form.name,
        phone: form.phone,
        city: form.city,
        buyer_type: form.buyer_type,
        preferred_fabric_type: form.preferred_fabric_type,
        preferred_qualities: form.preferred_qualities ? form.preferred_qualities.split(',').map((q) => q.trim()) : [],
      })
      setOpen(false)
      setForm({ name: '', phone: '', city: '', buyer_type: 'generalist', preferred_fabric_type: 'both', preferred_qualities: '' })
    } catch {
      // Error handled by axios interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" /> Add New Buyer
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Buyer Name *</Label>
            <Input placeholder="e.g. JANI TEXTILES" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="+91 ..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input placeholder="e.g. Surat" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Buyer Type</Label>
              <Select value={form.buyer_type} onValueChange={(v) => setForm({ ...form, buyer_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="specialist">Specialist</SelectItem>
                  <SelectItem value="generalist">Generalist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fabric Preference</Label>
              <Select value={form.preferred_fabric_type} onValueChange={(v) => setForm({ ...form, preferred_fabric_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dyed">Dyed</SelectItem>
                  <SelectItem value="grey">Grey</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Preferred Qualities</Label>
            <Input placeholder="e.g. SATIN, TUSSUR, POPLIN (comma separated)" value={form.preferred_qualities} onChange={(e) => setForm({ ...form, preferred_qualities: e.target.value })} />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Users className="mr-2 size-4" />}
            {loading ? 'Adding...' : 'Add Buyer'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
