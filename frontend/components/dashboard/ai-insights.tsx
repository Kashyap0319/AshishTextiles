'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import {
  Brain, TrendingUp, TrendingDown, AlertTriangle, Users, Package, Clock, Loader2, BarChart3,
} from 'lucide-react'
import api from '@/lib/api'
import { QualityMixAlerts } from './quality-mix-alerts'
import { SampleTracking } from './sample-tracking'
import { Inquiries } from './inquiries'
import { LowStockAlerts } from './low-stock-alerts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, PieChart, Pie, Cell,
} from 'recharts'
import realData from '@/lib/real-data.json'

const COLORS = ['#4F8CFF', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6', '#f97316']

interface DormantBuyer {
  id: number; name: string; total_meters: number; days_dormant: number; last_purchase_date: string
}
interface ClearanceItem {
  article_code: string; meters: number; velocity: number; days_to_sell: number; risk: string
}
interface ClusterData {
  cluster: string; count: number; avg_meters: number; top_buyers: string[]
}

export function AIInsights() {
  const [dormant, setDormant] = useState<DormantBuyer[]>([])
  const [clearance, setClearance] = useState<ClearanceItem[]>([])
  const [clusters, setClusters] = useState<ClusterData[]>([])
  const [aging, setAging] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/buyers/dormant').then((r) => setDormant(Array.isArray(r.data) ? r.data : [])).catch(() => {}),
      api.get('/ml/clearance').then((r) => setClearance(Array.isArray(r.data) ? r.data : r.data?.items || [])).catch(() => {}),
      api.get('/ml/clusters').then((r) => setClusters(Array.isArray(r.data) ? r.data : r.data?.clusters || [])).catch(() => {}),
      api.get('/stock/aging').then((r) => setAging(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const riskColor = (risk: string) => {
    if (risk === 'critical') return 'text-red-400 border-red-500/30'
    if (risk === 'high') return 'text-amber-400 border-amber-500/30'
    if (risk === 'medium') return 'text-yellow-400 border-yellow-500/30'
    return 'text-emerald-400 border-emerald-500/30'
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Brain className="size-5 text-primary" /> AI Insights & Analytics
      </h2>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quality">Quality Audit</TabsTrigger>
          <TabsTrigger value="lowstock">Low Stock</TabsTrigger>
          <TabsTrigger value="inquiries">Inquiries & Alerts</TabsTrigger>
          <TabsTrigger value="samples">Sample Conversion</TabsTrigger>
          <TabsTrigger value="dormant">Dormant Buyers</TabsTrigger>
          <TabsTrigger value="clearance">Clearance Risk</TabsTrigger>
          <TabsTrigger value="clusters">Buyer Clusters</TabsTrigger>
          <TabsTrigger value="aging">Stock Aging</TabsTrigger>
        </TabsList>

        <TabsContent value="quality"><QualityMixAlerts /></TabsContent>
        <TabsContent value="lowstock"><LowStockAlerts /></TabsContent>
        <TabsContent value="inquiries"><Inquiries /></TabsContent>
        <TabsContent value="samples"><SampleTracking /></TabsContent>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-red-500/10 p-2"><AlertTriangle className="size-5 text-red-400" /></div>
                  <div>
                    <p className="text-2xl font-bold">{dormant.length}</p>
                    <p className="text-xs text-muted-foreground">Dormant Buyers (60+ days)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-500/10 p-2"><Clock className="size-5 text-amber-400" /></div>
                  <div>
                    <p className="text-2xl font-bold">{clearance.filter((c) => c.risk === 'critical' || c.risk === 'high').length}</p>
                    <p className="text-xs text-muted-foreground">High-Risk Clearance Items</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2"><Users className="size-5 text-primary" /></div>
                  <div>
                    <p className="text-2xl font-bold">{clusters.length}</p>
                    <p className="text-xs text-muted-foreground">Buyer Segments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-2"><TrendingUp className="size-5 text-emerald-400" /></div>
                  <div>
                    <p className="text-2xl font-bold">{realData.topBuyers.length}</p>
                    <p className="text-xs text-muted-foreground">Active Top Buyers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fast vs Slow Products */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="size-4 text-emerald-400" /> Fast Moving Qualities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={realData.qualityDistribution.slice(0, 6).map((q, i) => ({ name: q.category, count: q.count, fill: COLORS[i] }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#888" fontSize={10} />
                    <YAxis stroke="#888" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', borderRadius: '8px' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {realData.qualityDistribution.slice(0, 6).map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingDown className="size-4 text-red-400" /> Slow Moving (Needs Clearance)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {clearance.filter((c) => c.risk === 'critical' || c.risk === 'high').slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-sm">{item.article_code}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{item.meters?.toLocaleString()}m</span>
                    </div>
                    <Badge variant="outline" className={riskColor(item.risk)}>{item.risk}</Badge>
                  </div>
                ))}
                {clearance.filter((c) => c.risk === 'critical' || c.risk === 'high').length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No high-risk items</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Dormant Buyers */}
        <TabsContent value="dormant">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
            {dormant.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No dormant buyers found</CardContent></Card>}
            {dormant.map((buyer) => (
              <motion.div key={buyer.id} variants={staggerItem}>
                <Card className="border-amber-500/20">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{buyer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Last purchase: {buyer.last_purchase_date ? new Date(buyer.last_purchase_date).toLocaleDateString() : 'N/A'}
                        {' | '}{(buyer.total_meters || 0).toLocaleString()}m total
                      </p>
                    </div>
                    <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                      {buyer.days_dormant}d inactive
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>

        {/* Clearance Risk */}
        <TabsContent value="clearance">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
            {clearance.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No clearance data available</CardContent></Card>}
            {clearance.slice(0, 20).map((item, i) => (
              <motion.div key={i} variants={staggerItem}>
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-medium">{item.article_code}</span>
                      <span className="ml-3 text-sm text-muted-foreground">{item.meters?.toLocaleString()}m</span>
                      {item.velocity > 0 && <span className="ml-3 text-xs text-muted-foreground">{item.velocity.toFixed(1)}m/day</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      {item.days_to_sell > 0 && <span className="text-xs text-muted-foreground">~{Math.round(item.days_to_sell)}d to sell</span>}
                      <Badge variant="outline" className={riskColor(item.risk)}>{item.risk}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>

        {/* Buyer Clusters */}
        <TabsContent value="clusters">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid gap-4 md:grid-cols-2">
            {clusters.length === 0 && <Card className="col-span-2"><CardContent className="py-8 text-center text-muted-foreground">No cluster data available</CardContent></Card>}
            {clusters.map((cluster, i) => (
              <motion.div key={cluster.cluster} variants={staggerItem}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="size-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {cluster.cluster}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 text-sm mb-3">
                      <span>{cluster.count} buyers</span>
                      <span className="text-muted-foreground">Avg: {(cluster.avg_meters / 1000).toFixed(1)}K meters</span>
                    </div>
                    {cluster.top_buyers?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {cluster.top_buyers.slice(0, 5).map((b) => (
                          <Badge key={b} variant="secondary" className="text-xs">{b}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>

        {/* Stock Aging */}
        <TabsContent value="aging" className="space-y-4">
          {aging ? (
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: '0-30 days (Fresh)', count: aging.bucket_0_30?.count || 0, meters: aging.bucket_0_30?.meters || 0, color: 'emerald' },
                { label: '31-60 days', count: aging.bucket_31_60?.count || 0, meters: aging.bucket_31_60?.meters || 0, color: 'blue' },
                { label: '61-90 days (Warning)', count: aging.bucket_61_90?.count || 0, meters: aging.bucket_61_90?.meters || 0, color: 'amber' },
                { label: '90+ days (Critical)', count: aging.bucket_90_plus?.count || 0, meters: aging.bucket_90_plus?.meters || 0, color: 'red' },
              ].map((bucket) => (
                <Card key={bucket.label} className={`border-${bucket.color}-500/20`}>
                  <CardContent className="p-4">
                    <p className={`text-2xl font-bold text-${bucket.color}-400`}>{bucket.count}</p>
                    <p className="text-xs text-muted-foreground">{bucket.label}</p>
                    <p className="text-sm mt-1 font-mono">{(bucket.meters / 1000).toFixed(1)}K meters</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No aging data available</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
