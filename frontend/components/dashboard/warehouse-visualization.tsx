'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { Package, MapPin, Search, Warehouse, ChevronRight, LayoutGrid, Map, X } from 'lucide-react'
import rackData from '@/lib/rack-data.json'
import { FLOOR_PLANS, getHallsByFloor, type HallLayout, type RackPosition } from '@/lib/floor-plans'
import { FloorPlan } from './floor-plan'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const hallBadgeColors: Record<string, string> = {
  'Hall 2': 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  'Hall 3': 'bg-slate-500/10 text-slate-500 border-slate-500/30',
  'Hall 4': 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  'Hall 5': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
  'Hall 6': 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  'Hall 7': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  'Hall 8': 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  'Hall 9': 'bg-pink-500/10 text-pink-500 border-pink-500/30',
  'Hall 10': 'bg-red-500/10 text-red-500 border-red-500/30',
}

const hallDescriptions: Record<string, string> = {
  'Hall 100': 'Entry hall — first floor',
  'Hall 200': 'Staircase zone, sofa side',
  'Hall 300': 'Optional center racks',
  'Hall 400': '4-cluster layout',
  'Hall 500': 'Staircase to first floor',
  'Hall 600': 'Largest hall — second floor',
  'Hall 800': 'Center pillar section',
  'Hall 900': 'Multi-cluster layout',
}

interface RackItem { number: number; goods: string }

// Build goods lookup from old rack-data.json
const goodsByRack: Record<number, string> = {}
Object.values(rackData.halls).forEach((hall: any) => {
  hall.racks?.forEach((r: any) => {
    if (r.number && r.goods) goodsByRack[r.number] = r.goods
  })
})

export function WarehouseVisualization() {
  const [view, setView] = useState<'plan' | 'list'>('plan')
  const [floor, setFloor] = useState<'first' | 'second'>('first')
  const [selectedHall, setSelectedHall] = useState<string | null>(null)
  const [selectedRack, setSelectedRack] = useState<RackPosition | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const hallsOnFloor = useMemo(() => getHallsByFloor(floor), [floor])
  const activeHall = selectedHall ? FLOOR_PLANS.find((h) => h.hall === selectedHall) : null

  // Random-but-stable utilization for demo
  const utilizationMap = useMemo(() => {
    const map: Record<number, number> = {}
    FLOOR_PLANS.forEach((hall) => {
      hall.racks.forEach((r) => {
        // Stable pseudo-random based on rack number
        map[r.number] = (r.number * 17) % 100
      })
    })
    return map
  }, [])

  // Search across all racks
  const searchResults = searchQuery.length >= 2
    ? FLOOR_PLANS.flatMap((hall) =>
        hall.racks.filter((r) =>
          String(r.number).includes(searchQuery) ||
          (goodsByRack[r.number] || '').toLowerCase().includes(searchQuery.toLowerCase())
        ).map((r) => ({ ...r, hall: hall.label, floor: hall.floor }))
      )
    : []

  const totalRacks = FLOOR_PLANS.reduce((s, h) => s + h.racks.length, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-2xl text-foreground mb-1">Warehouse layout</h2>
          <p className="text-sm text-muted-foreground">
            Interactive floor plans — click any rack to see contents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setView('plan')}
              className={`px-3 py-1.5 text-xs flex items-center gap-1.5 ${view === 'plan' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
            >
              <Map className="size-3" /> Floor plan
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-xs flex items-center gap-1.5 ${view === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
            >
              <LayoutGrid className="size-3" /> List
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Floors', val: 2 },
          { label: 'Halls mapped', val: FLOOR_PLANS.length },
          { label: 'Total racks', val: totalRacks },
          { label: 'Utilization', val: `${Math.round(Object.values(utilizationMap).reduce((a, b) => a + b, 0) / Object.values(utilizationMap).length)}%` },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3">
              <p className="font-serif text-2xl ticker">{s.val}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search rack 621 or goods 'POPLIN'..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Search results ({searchResults.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Rack</TableHead><TableHead>Hall</TableHead><TableHead>Floor</TableHead><TableHead>Goods</TableHead></TableRow></TableHeader>
              <TableBody>
                {searchResults.slice(0, 20).map((r) => (
                  <TableRow key={`${r.hall}-${r.number}`}
                    onClick={() => {
                      const h = FLOOR_PLANS.find(fp => fp.label === r.hall)
                      if (h) {
                        setFloor(h.floor); setSelectedHall(h.hall)
                      }
                    }}
                    className="cursor-pointer hover:bg-accent"
                  >
                    <TableCell className="font-mono font-bold">{r.number}</TableCell>
                    <TableCell>{r.hall}</TableCell>
                    <TableCell className="capitalize">{r.floor}</TableCell>
                    <TableCell className="text-muted-foreground">{goodsByRack[r.number] || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* FLOOR PLAN VIEW */}
      {view === 'plan' && (
        <>
          {/* Floor switcher */}
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground mr-2">Floor:</span>
            {(['first', 'second'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFloor(f); setSelectedHall(null) }}
                className={`px-3 py-1 rounded-md text-xs capitalize transition-colors ${
                  floor === f ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground'
                }`}
              >
                {f} floor
                <span className="ml-1.5 text-[10px] opacity-70">
                  ({getHallsByFloor(f).length} halls)
                </span>
              </button>
            ))}
          </div>

          {selectedHall && activeHall ? (
            /* Single hall focus view */
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setSelectedHall(null)}>
                    ← All halls
                  </Button>
                  <h3 className="font-serif text-xl">{activeHall.label}</h3>
                  <Badge variant="outline">{activeHall.racks.length} racks</Badge>
                </div>
              </div>
              <Card>
                <CardContent className="p-4">
                  <FloorPlan
                    hall={activeHall}
                    utilization={utilizationMap}
                    contents={goodsByRack}
                    selectedRack={selectedRack?.number}
                    onRackClick={setSelectedRack}
                  />
                </CardContent>
              </Card>
            </div>
          ) : (
            /* All halls on floor — grid preview */
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {hallsOnFloor.map((hall) => (
                <motion.div key={hall.hall} variants={staggerItem}>
                  <Card
                    className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                    onClick={() => setSelectedHall(hall.hall)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Warehouse className="size-4 text-primary" />
                          <span className="font-serif text-base">{hall.label}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{hall.racks.length}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-2">
                        {hallDescriptions[hall.label] || 'Warehouse section'}
                      </p>
                      <div className="pointer-events-none">
                        <FloorPlan hall={hall} utilization={utilizationMap} contents={goodsByRack} />
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                        Click to expand <ChevronRight className="size-3" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
          {FLOOR_PLANS.map((hall) => (
            <motion.div key={hall.hall} variants={staggerItem}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Warehouse className="size-4 text-primary" />
                    {hall.label}
                    <Badge variant="secondary" className="text-[10px] capitalize">{hall.floor} floor</Badge>
                    <Badge variant="outline" className="text-[10px]">{hall.racks.length} racks</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex flex-wrap gap-1">
                    {hall.racks.map((r) => (
                      <Badge
                        key={r.number}
                        variant="secondary"
                        className="font-mono text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => { setSelectedHall(hall.hall); setView('plan'); setFloor(hall.floor) }}
                      >
                        {r.number}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Rack detail panel */}
      <AnimatePresence>
        {selectedRack && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 w-80 z-50"
          >
            <Card className="border-primary shadow-xl">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-primary mb-1">Rack selected</p>
                    <p className="font-serif text-3xl ticker">{selectedRack.number}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedRack(null)}>
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Goods</span>
                    <span className="font-medium">{goodsByRack[selectedRack.number] || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Utilization</span>
                    <span className="font-medium">{utilizationMap[selectedRack.number]}%</span>
                  </div>
                  {selectedRack.note && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Note</span>
                      <span className="font-medium italic text-xs">{selectedRack.note}</span>
                    </div>
                  )}
                </div>
                <Button size="sm" className="w-full mt-3">
                  <Package className="mr-2 size-3" /> View stock in rack
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
