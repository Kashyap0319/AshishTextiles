'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import {
  UserCheck, Search, ScanLine, Zap, Users, Loader2, CheckCircle2,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'

const STAFF = ['Rajesh', 'Amit', 'Sanjay', 'Vikram', 'Sunil', 'Deepak', 'Pradeep', 'Ravi', 'Mohan', 'Arun']

// Auto-assign rules — admin configures
type AutoRule = {
  id: string
  fabric_keyword: string
  staff: string
  enabled: boolean
}

export function StaffTagging() {
  const { stocks, updateStock } = useAppStore()
  const [mode, setMode] = useState<'manual' | 'scan' | 'auto'>('manual')

  // Manual tab state
  const [search, setSearch] = useState('')
  const [filterStaff, setFilterStaff] = useState('all')
  const [filterTag, setFilterTag] = useState<'all' | 'tagged' | 'untagged'>('all')

  // Scan tab state
  const [scanInput, setScanInput] = useState('')
  const [scanStaff, setScanStaff] = useState(STAFF[0])
  const [recentScans, setRecentScans] = useState<{ code: string; staff: string; ok: boolean }[]>([])

  // Auto tab state
  const [autoRules, setAutoRules] = useState<AutoRule[]>([
    { id: '1', fabric_keyword: 'LYCRA', staff: 'Vikram', enabled: true },
    { id: '2', fabric_keyword: 'POPLIN', staff: 'Amit', enabled: true },
    { id: '3', fabric_keyword: 'TWILL', staff: 'Sanjay', enabled: true },
  ])
  const [newRuleKw, setNewRuleKw] = useState('')
  const [newRuleStaff, setNewRuleStaff] = useState(STAFF[0])
  const [autoApplying, setAutoApplying] = useState(false)
  const [autoApplied, setAutoApplied] = useState(0)

  const filtered = stocks.filter((s) => {
    if (search && !s.code.toLowerCase().includes(search.toLowerCase()) && !s.fabricType.toLowerCase().includes(search.toLowerCase())) return false
    const tagged = s.tags?.some((t) => STAFF.includes(t))
    if (filterTag === 'tagged' && !tagged) return false
    if (filterTag === 'untagged' && tagged) return false
    if (filterStaff !== 'all' && !s.tags?.includes(filterStaff)) return false
    return true
  })

  const handleTag = (stockId: string, person: string) => {
    const stock = stocks.find((s) => s.id === stockId)
    if (!stock) return
    const currentTags = stock.tags || []
    const newTags = currentTags.filter((t) => !STAFF.includes(t))
    if (person !== 'none') newTags.push(person)
    updateStock(stockId, { tags: newTags })
  }

  const getStaffTag = (tags: string[]) => tags?.find((t) => STAFF.includes(t)) || null

  // Scan-based tagging — employee scans bale code → auto-assigns to selected staff
  const handleScanTag = () => {
    if (!scanInput.trim()) return
    const stock = stocks.find((s) => s.code.toLowerCase() === scanInput.toLowerCase().trim())
    if (stock) {
      handleTag(stock.id, scanStaff)
      setRecentScans((prev) => [{ code: scanInput, staff: scanStaff, ok: true }, ...prev].slice(0, 10))
    } else {
      setRecentScans((prev) => [{ code: scanInput, staff: scanStaff, ok: false }, ...prev].slice(0, 10))
    }
    setScanInput('')
  }

  // Auto-assign by rules
  const applyAutoRules = () => {
    setAutoApplying(true)
    setAutoApplied(0)
    let count = 0
    stocks.forEach((stock) => {
      const tagged = stock.tags?.some((t) => STAFF.includes(t))
      if (tagged) return // Skip already tagged
      const matchingRule = autoRules.find((r) =>
        r.enabled && (
          stock.code.toUpperCase().includes(r.fabric_keyword.toUpperCase()) ||
          stock.fabricType.toUpperCase().includes(r.fabric_keyword.toUpperCase())
        )
      )
      if (matchingRule) {
        handleTag(stock.id, matchingRule.staff)
        count++
      }
    })
    setAutoApplied(count)
    setTimeout(() => setAutoApplying(false), 500)
  }

  const addRule = () => {
    if (!newRuleKw.trim()) return
    setAutoRules((prev) => [...prev, {
      id: Date.now().toString(),
      fabric_keyword: newRuleKw.trim().toUpperCase(),
      staff: newRuleStaff,
      enabled: true,
    }])
    setNewRuleKw('')
  }

  const removeRule = (id: string) => setAutoRules((prev) => prev.filter((r) => r.id !== id))

  const taggedCount = stocks.filter((s) => s.tags?.some((t) => STAFF.includes(t))).length
  const untaggedCount = stocks.length - taggedCount

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-foreground mb-1 flex items-center gap-2">
            <UserCheck className="size-5 text-primary" /> Staff stock tagging
          </h2>
          <p className="text-sm text-muted-foreground">
            Assign stock to salespeople — manually, by barcode scan, or auto-rules.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{taggedCount} tagged</Badge>
          <Badge variant="outline">{untaggedCount} untagged</Badge>
        </div>
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
        <TabsList>
          <TabsTrigger value="manual">
            <Users className="mr-2 size-3" /> Manual assign
          </TabsTrigger>
          <TabsTrigger value="scan">
            <ScanLine className="mr-2 size-3" /> Scan to tag
          </TabsTrigger>
          <TabsTrigger value="auto">
            <Zap className="mr-2 size-3" /> Auto rules
          </TabsTrigger>
        </TabsList>

        {/* Manual mode */}
        <TabsContent value="manual" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search by code or fabric..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterStaff} onValueChange={setFilterStaff}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Staff" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {STAFF.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              {(['all', 'tagged', 'untagged'] as const).map((f) => (
                <Button key={f} size="sm" variant={filterTag === f ? 'default' : 'outline'} onClick={() => setFilterTag(f)} className="capitalize">{f}</Button>
              ))}
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Fabric</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Rack</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Assigned to</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 50).map((stock) => {
                  const staffTag = getStaffTag(stock.tags)
                  return (
                    <TableRow key={stock.id}>
                      <TableCell className="font-mono font-medium">{stock.code}</TableCell>
                      <TableCell>{stock.fabricType}</TableCell>
                      <TableCell>{stock.quantity.toLocaleString()}m</TableCell>
                      <TableCell>{stock.rackLocation}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          stock.daysInStock > 60 ? 'text-destructive border-destructive/30' :
                            stock.daysInStock > 30 ? 'text-warning border-warning/30' :
                              'text-success border-success/30'
                        }>
                          {stock.daysInStock}d
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select value={staffTag || 'none'} onValueChange={(v) => handleTag(stock.id, v)}>
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue placeholder="Assign" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Unassign</SelectItem>
                            {STAFF.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No stock items found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Scan mode */}
        <TabsContent value="scan" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scan-to-tag mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Salesperson selects their name, scans/types stock codes one by one — auto-tagged to them.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>I am</Label>
                  <Select value={scanStaff} onValueChange={setScanStaff}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAFF.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Stock code / bale number</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type or scan..."
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleScanTag()}
                      className="font-mono"
                      autoFocus
                    />
                    <Button onClick={handleScanTag}><ScanLine className="size-4" /></Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {recentScans.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Recent scans</CardTitle></CardHeader>
              <CardContent>
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-1.5">
                  {recentScans.map((s, i) => (
                    <motion.div key={i} variants={staggerItem} className={`flex items-center justify-between rounded-md p-2 text-sm ${s.ok ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                      <div className="flex items-center gap-2">
                        {s.ok ? <CheckCircle2 className="size-4 text-success" /> : <span className="size-4 rounded-full bg-destructive flex items-center justify-center text-[10px] text-destructive-foreground">!</span>}
                        <span className="font-mono">{s.code}</span>
                      </div>
                      {s.ok ? (
                        <span className="text-xs text-muted-foreground">→ tagged to {s.staff}</span>
                      ) : (
                        <span className="text-xs text-destructive">not found in stock</span>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Auto-rules mode */}
        <TabsContent value="auto" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Auto-assignment rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                If a fabric matches a keyword, auto-assign to that staff. E.g. all "LYCRA" stock → Vikram.
              </p>

              {/* Existing rules */}
              <div className="space-y-2">
                {autoRules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(e) => setAutoRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, enabled: e.target.checked } : r))}
                      className="size-4"
                    />
                    <span className="text-sm">If fabric contains</span>
                    <Badge variant="secondary" className="font-mono">{rule.fabric_keyword}</Badge>
                    <span className="text-sm">→ assign to</span>
                    <Badge>{rule.staff}</Badge>
                    <Button size="icon" variant="ghost" className="ml-auto size-7" onClick={() => removeRule(rule.id)}>
                      ×
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add new rule */}
              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <Input
                  placeholder="Keyword (e.g. SATIN)"
                  value={newRuleKw}
                  onChange={(e) => setNewRuleKw(e.target.value)}
                  className="font-mono flex-1"
                />
                <span className="text-sm text-muted-foreground">→</span>
                <Select value={newRuleStaff} onValueChange={setNewRuleStaff}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAFF.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={addRule}>+ Add</Button>
              </div>

              {/* Apply button */}
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {autoApplied > 0 && (
                    <span className="text-success">✓ Last run: {autoApplied} stock items auto-tagged</span>
                  )}
                </p>
                <Button onClick={applyAutoRules} disabled={autoApplying}>
                  {autoApplying ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Zap className="mr-2 size-4" />}
                  Apply rules now
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
