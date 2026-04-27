'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import {
  AlertTriangle, Package, CheckCircle2, Loader2, User, Calendar, Eye,
} from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface SaleFlag {
  voucher_number: string
  voucher_date: string
  buyer_name: string
  quality_categories: string[]
  roll_count: number
  total_meters: number
  severity: 'medium' | 'high'
  recommendation?: string
}

interface ClassificationStats {
  dead_stock: { count: number; meters: number }
  slow_moving: { count: number; meters: number }
  surplus: { count: number; meters: number }
  fresh: { count: number; meters: number }
}

export function QualityMixAlerts() {
  const [flags, setFlags] = useState<SaleFlag[]>([])
  const [classification, setClassification] = useState<ClassificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewed, setReviewed] = useState<Set<string>>(new Set())

  useEffect(() => {
    Promise.all([
      api.get('/quality-check/sale-flags').then((r) => {
        const data = Array.isArray(r.data) ? r.data : r.data?.items || r.data?.flags || []
        setFlags(data)
      }).catch(() => setFlags([])),
      api.get('/quality-check/stock-classification')
        .then((r) => setClassification(r.data))
        .catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const severityClass = (s: string) =>
    s === 'high' ? 'text-destructive border-destructive/30 bg-destructive/10'
      : 'text-warning border-warning/30 bg-warning/10'

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-serif text-2xl text-foreground mb-1">Sale quality audit</h2>
        <p className="text-sm text-muted-foreground">
          System automatically flags sales where a different-quality roll was dispatched accidentally. Review and correct before invoice.
        </p>
      </div>

      {/* Stock classification cards */}
      {classification && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Fresh', key: 'fresh', tone: 'text-success' },
            { label: 'Surplus', key: 'surplus', tone: 'text-primary' },
            { label: 'Slow Moving', key: 'slow_moving', tone: 'text-warning' },
            { label: 'Dead Stock', key: 'dead_stock', tone: 'text-destructive' },
          ].map((c) => {
            const d = (classification as any)[c.key] || { count: 0, meters: 0 }
            return (
              <Card key={c.key}>
                <CardContent className="p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</p>
                  <p className={`font-serif text-3xl ${c.tone} ticker mt-1`}>{d.count}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(d.meters / 1000).toFixed(1)}K meters
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Alert cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-warning" />
            <h3 className="font-medium">Mixed quality sales detected</h3>
            <Badge variant="outline">{flags.length}</Badge>
          </div>
          <span className="text-xs text-muted-foreground">{reviewed.size} reviewed</span>
        </div>

        {flags.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="mx-auto mb-3 size-10 text-success/60" />
              <p className="font-medium">All clear.</p>
              <p className="text-sm text-muted-foreground mt-1">
                No mixed-quality sales detected. Every sale has rolls of a single quality category.
              </p>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {flags.map((f) => {
              const isReviewed = reviewed.has(f.voucher_number)
              return (
                <motion.div key={f.voucher_number} variants={staggerItem}>
                  <Card className={`${severityClass(f.severity)} border ${isReviewed ? 'opacity-50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={`size-5 mt-0.5 ${f.severity === 'high' ? 'text-destructive' : 'text-warning'}`} />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono font-medium">{f.voucher_number}</span>
                              <Badge variant="outline" className="text-[10px] capitalize">{f.severity} severity</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="size-3" /> {f.buyer_name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="size-3" />
                                {f.voucher_date ? new Date(f.voucher_date).toLocaleDateString() : '—'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Package className="size-3" /> {f.roll_count} rolls • {f.total_meters}m
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="ml-8">
                        <p className="text-xs text-muted-foreground mb-1.5">Quality categories in this sale:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {f.quality_categories.map((q) => (
                            <Badge key={q} variant="secondary" className="text-xs font-mono">{q}</Badge>
                          ))}
                        </div>
                        {f.recommendation && (
                          <p className="text-xs mt-2 text-muted-foreground italic">
                            💡 {f.recommendation}
                          </p>
                        )}

                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline">
                            <Eye className="mr-2 size-3" /> View sale
                          </Button>
                          <Button
                            size="sm"
                            variant={isReviewed ? 'secondary' : 'default'}
                            onClick={() => {
                              const next = new Set(reviewed)
                              if (isReviewed) next.delete(f.voucher_number)
                              else next.add(f.voucher_number)
                              setReviewed(next)
                            }}
                          >
                            <CheckCircle2 className="mr-2 size-3" />
                            {isReviewed ? 'Reviewed' : 'Mark reviewed'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>
    </div>
  )
}
