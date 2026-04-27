'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { TrendingDown, AlertTriangle, Loader2, Settings } from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'

interface LowStockAlert {
  quality_group: string
  current_meters: number
  lot_count: number
  monthly_demand_avg: number
  days_remaining: number
  threshold_meters: number
  severity: 'critical' | 'high' | 'medium'
  recommendation: string
}

export function LowStockAlerts() {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [threshold, setThreshold] = useState(10)
  const [showSettings, setShowSettings] = useState(false)

  const fetchAlerts = async (pct: number = threshold) => {
    setLoading(true)
    try {
      const res = await api.get(`/dashboard/low-stock-alerts?threshold_pct=${pct}&days=90`)
      setAlerts(res.data?.alerts || [])
    } catch {
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAlerts() }, [])

  const tone = (s: string) =>
    s === 'critical' ? 'text-destructive border-destructive/30 bg-destructive/10'
      : s === 'high' ? 'text-warning border-warning/30 bg-warning/10'
        : 'text-amber-500 border-amber-500/30 bg-amber-500/10'

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-serif text-2xl text-foreground mb-1 flex items-center gap-2">
            <TrendingDown className="size-5 text-primary" /> Low stock alerts
          </h2>
          <p className="text-sm text-muted-foreground">
            Fast-moving fabrics running below safety threshold. Reorder before stock-out.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
          <Settings className="mr-2 size-3" /> Threshold: {threshold}%
        </Button>
      </div>

      {showSettings && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Alert when stock &lt;</span>
              <span className="font-serif text-3xl text-primary ticker w-16">{threshold}%</span>
              <span className="text-sm text-muted-foreground whitespace-nowrap">of monthly demand</span>
              <Slider
                value={[threshold]}
                onValueChange={([v]) => setThreshold(v)}
                onValueCommit={([v]) => fetchAlerts(v)}
                min={1}
                max={50}
                step={1}
                className="flex-1 ml-4"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Badge className="mb-3 bg-success/15 text-success border-success/30">All stock healthy</Badge>
            <p className="text-sm text-muted-foreground">
              No fabrics below {threshold}% of monthly demand.
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="size-4 text-warning" />
            <p className="text-sm font-medium">{alerts.length} fabric{alerts.length > 1 ? 's' : ''} need attention</p>
          </div>
          {alerts.map((a) => (
            <motion.div key={a.quality_group} variants={staggerItem}>
              <Card className={`border ${tone(a.severity)}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-medium text-base">{a.quality_group}</span>
                        <Badge variant="outline" className={`capitalize text-[10px] ${tone(a.severity)}`}>
                          {a.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground italic">{a.recommendation}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-serif text-2xl text-foreground ticker">
                        {Math.round(a.days_remaining)}d
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">remaining</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Current stock</p>
                      <p className="font-medium font-mono">{a.current_meters.toLocaleString()}m</p>
                      <p className="text-[10px] text-muted-foreground">{a.lot_count} lots</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Monthly demand</p>
                      <p className="font-medium font-mono">{a.monthly_demand_avg.toLocaleString()}m</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Safety threshold</p>
                      <p className="font-medium font-mono">{a.threshold_meters.toLocaleString()}m</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <Progress
                      value={Math.min((a.current_meters / a.threshold_meters) * 100, 100)}
                      className="h-1.5"
                    />
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
