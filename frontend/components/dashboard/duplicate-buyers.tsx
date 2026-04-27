'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { GitMerge, Search, Loader2, AlertTriangle, Check } from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'

interface DuplicatePair {
  buyer1: { id: number; name: string; total_meters: number }
  buyer2: { id: number; name: string; total_meters: number }
  similarity: number
}

export function DuplicateBuyers() {
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([])
  const [loading, setLoading] = useState(false)
  const [merging, setMerging] = useState<string | null>(null)
  const [threshold, setThreshold] = useState(75)
  const [merged, setMerged] = useState<Set<string>>(new Set())

  const findDuplicates = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/buyers/duplicates/find?threshold=${threshold}`)
      setDuplicates(Array.isArray(res.data) ? res.data : res.data?.pairs || [])
    } catch {
      setDuplicates([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { findDuplicates() }, [])

  const handleMerge = async (keep: number, merge: number, key: string) => {
    setMerging(key)
    try {
      await api.post(`/buyers/duplicates/merge?keep_id=${keep}&merge_ids=${merge}`)
      setMerged((prev) => new Set(prev).add(key))
      setDuplicates((prev) => prev.filter((d) => `${d.buyer1.id}-${d.buyer2.id}` !== key))
    } catch {
      // handled
    } finally {
      setMerging(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitMerge className="size-5 text-primary" />
            Duplicate Buyer Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Similarity: {threshold}%</span>
            <Slider value={[threshold]} onValueChange={([v]) => setThreshold(v)} min={50} max={95} step={5} className="flex-1" />
            <Button size="sm" onClick={findDuplicates} disabled={loading}>
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Search className="mr-2 size-4" />}
              Scan
            </Button>
          </div>
        </CardContent>
      </Card>

      {duplicates.length === 0 && !loading && (
        <Card>
          <CardContent className="py-8 text-center">
            <Check className="mx-auto mb-2 size-8 text-emerald-400" />
            <p className="text-muted-foreground">No duplicate buyers found at {threshold}% threshold</p>
          </CardContent>
        </Card>
      )}

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
        {duplicates.map((dup) => {
          const key = `${dup.buyer1.id}-${dup.buyer2.id}`
          return (
            <motion.div key={key} variants={staggerItem}>
              <Card className="border-amber-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <AlertTriangle className="size-4 text-amber-400" />
                      <div>
                        <span className="font-medium">{dup.buyer1.name}</span>
                        <span className="mx-2 text-muted-foreground">↔</span>
                        <span className="font-medium">{dup.buyer2.name}</span>
                      </div>
                      <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                        {Math.round(dup.similarity)}% match
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={merging === key}
                        onClick={() => handleMerge(dup.buyer1.id, dup.buyer2.id, key)}
                      >
                        {merging === key ? <Loader2 className="size-3 animate-spin" /> : 'Keep Left'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={merging === key}
                        onClick={() => handleMerge(dup.buyer2.id, dup.buyer1.id, key)}
                      >
                        {merging === key ? <Loader2 className="size-3 animate-spin" /> : 'Keep Right'}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-6 text-xs text-muted-foreground">
                    <span>{dup.buyer1.name}: {(dup.buyer1.total_meters || 0).toLocaleString()}m</span>
                    <span>{dup.buyer2.name}: {(dup.buyer2.total_meters || 0).toLocaleString()}m</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
