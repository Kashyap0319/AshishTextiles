'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { Globe, RefreshCw, Loader2, Package, Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface LiveStock {
  article_code: string
  quality_group: string
  total_meters: number
  lot_count: number
  discount_pct?: number
}

interface SyncSummary {
  unique_articles: number
  total_meters: number
  total_lots: number
}

export function WebsiteSync() {
  const [stocks, setStocks] = useState<LiveStock[]>([])
  const [summary, setSummary] = useState<SyncSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [wooStatus, setWooStatus] = useState<{ configured: boolean; url?: string; message: string } | null>(null)
  const [pushing, setPushing] = useState(false)
  const [pushResult, setPushResult] = useState<any>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [stockRes, summaryRes, wooRes] = await Promise.all([
        api.get('/website-sync/live-stock?limit=50'),
        api.get('/website-sync/summary'),
        api.get('/website-sync/woo-status').catch(() => ({ data: { configured: false, message: 'Not connected' } })),
      ])
      setStocks(Array.isArray(stockRes.data) ? stockRes.data : stockRes.data?.items || [])
      setSummary(summaryRes.data)
      setWooStatus(wooRes.data)
    } catch {
      setStocks([])
    } finally {
      setLoading(false)
    }
  }

  const pushToWoo = async () => {
    setPushing(true)
    setPushResult(null)
    try {
      const res = await api.post('/website-sync/push-to-woocommerce', null, { params: { limit: 100 } })
      setPushResult(res.data)
    } catch (e: any) {
      setPushResult({ error: e?.response?.data?.detail || 'Push failed' })
    } finally { setPushing(false) }
  }

  useEffect(() => { fetchData() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-foreground flex items-center gap-2">
            <Globe className="size-5 text-primary" /> Website live stock
          </h2>
          <p className="text-sm text-muted-foreground">Sync inventory to sample.tdmfabric.com in real-time</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* WooCommerce Push Card */}
      <Card className={wooStatus?.configured ? 'border-primary/30 bg-primary/5' : 'border-warning/30 bg-warning/5'}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {wooStatus?.configured ? (
                <CheckCircle2 className="size-5 text-primary mt-0.5" />
              ) : (
                <AlertCircle className="size-5 text-warning mt-0.5" />
              )}
              <div>
                <p className="font-medium">WooCommerce sync — sample.tdmfabric.com</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {wooStatus?.message || 'Checking...'}
                </p>
                {!wooStatus?.configured && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Setup: wp-admin → WooCommerce → Settings → Advanced → REST API → Add key.
                    Then set WOO_URL, WOO_KEY, WOO_SECRET in backend .env.
                  </p>
                )}
              </div>
            </div>
            {wooStatus?.configured && (
              <Button onClick={pushToWoo} disabled={pushing}>
                {pushing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
                Push to website
              </Button>
            )}
          </div>
          {pushResult && (
            <div className="mt-3 pt-3 border-t border-border text-xs">
              {pushResult.error ? (
                <span className="text-destructive">Error: {pushResult.error}</span>
              ) : (
                <div className="flex gap-4 flex-wrap">
                  <span className="text-success">✓ Synced: {pushResult.synced}</span>
                  <span>Created: {pushResult.created}</span>
                  <span>Updated: {pushResult.updated}</span>
                  {pushResult.failed_count > 0 && (
                    <span className="text-destructive">Failed: {pushResult.failed_count}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Articles Live', value: summary.unique_articles },
            { label: 'Total Meters', value: `${(summary.total_meters / 1000).toFixed(0)}K` },
            { label: 'Total Lots', value: summary.total_lots },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
          {stocks.map((s, i) => (
            <motion.div key={`${s.article_code}-${i}`} variants={staggerItem}>
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="size-4 text-muted-foreground" />
                    <div>
                      <span className="font-mono font-medium">{s.article_code}</span>
                      {s.quality_group && <Badge variant="secondary" className="ml-2 text-xs">{s.quality_group}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>{s.total_meters?.toLocaleString()}m</span>
                    <span className="text-muted-foreground">{s.lot_count} lots</span>
                    {s.discount_pct && s.discount_pct > 0 && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">-{s.discount_pct}%</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {stocks.length === 0 && (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No stock published to website yet</CardContent></Card>
          )}
        </motion.div>
      )}
    </div>
  )
}
