'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { Factory, Loader2, TrendingUp } from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface Supplier {
  supplier: string
  total_meters: number
  deliveries: number
  last_delivery: string
  score: number
}

export function SupplierScorecard() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/supplier-scorecard')
      .then((res) => setSuppliers(Array.isArray(res.data) ? res.data : res.data?.suppliers || []))
      .catch(() => setSuppliers([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Factory className="size-5 text-primary" /> Supplier Scorecard
      </h2>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
          {suppliers.map((s, i) => (
            <motion.div key={s.supplier} variants={staggerItem}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">{i + 1}</span>
                      <div>
                        <p className="font-medium">{s.supplier}</p>
                        <p className="text-xs text-muted-foreground">{s.deliveries} deliveries | Last: {s.last_delivery ? new Date(s.last_delivery).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={s.score > 70 ? 'text-emerald-400 border-emerald-500/30' : s.score > 40 ? 'text-amber-400 border-amber-500/30' : 'text-red-400 border-red-500/30'}>
                        Score: {Math.round(s.score)}
                      </Badge>
                      <p className="text-sm font-mono mt-1">{(s.total_meters / 1000).toFixed(1)}K meters</p>
                    </div>
                  </div>
                  <Progress value={s.score} className="h-1.5" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {suppliers.length === 0 && (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No supplier data available</CardContent></Card>
          )}
        </motion.div>
      )}
    </div>
  )
}
