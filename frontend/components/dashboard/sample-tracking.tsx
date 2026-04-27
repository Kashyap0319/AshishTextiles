'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import {
  Send, Upload, Loader2, TrendingUp, Target, Users, Award,
} from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'

interface Converter {
  buyer_name: string
  sale_count: number
  total_meters: number
  last_sale_date: string | null
  conversion_score: number
}

interface Insights {
  total_buyers_in_system: number
  buyers_with_purchases: number
  approx_conversion_rate: number
  daily_sample_target: number
  expected_conversions: number
}

export function SampleTracking() {
  const [converters, setConverters] = useState<Converter[]>([])
  const [insights, setInsights] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [articleCode, setArticleCode] = useState('')
  const [articleRecs, setArticleRecs] = useState<any[]>([])
  const [recLoading, setRecLoading] = useState(false)

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      api.get('/sample-tracking/conversion-stats').then((r) => setConverters(r.data?.top_converting_buyers || [])),
      api.get('/sample-tracking/insights').then((r) => setInsights(r.data)),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/sample-tracking/upload-courier-bill', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploadResult(res.data)
    } catch {} finally {
      setUploading(false)
    }
  }

  const getArticleRecs = async () => {
    if (!articleCode.trim()) return
    setRecLoading(true)
    try {
      const res = await api.get(`/sample-tracking/article-match-recommendations/${articleCode.trim()}`)
      setArticleRecs(res.data?.recommended_sample_recipients || [])
    } catch { setArticleRecs([]) } finally { setRecLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl text-foreground mb-1">Sample conversion intelligence</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Track which buyers of the ~64 daily courier samples actually convert to sales. System learns
          patterns so future sample dispatches target the right buyers.
        </p>
      </div>

      {/* Insights cards */}
      {insights && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <Users className="size-4 text-muted-foreground mb-2" />
              <p className="font-serif text-3xl ticker">{insights.total_buyers_in_system.toLocaleString()}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Total buyers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <Target className="size-4 text-primary mb-2" />
              <p className="font-serif text-3xl ticker text-primary">{insights.buyers_with_purchases.toLocaleString()}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Active converters</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <TrendingUp className="size-4 text-success mb-2" />
              <p className="font-serif text-3xl ticker text-success">{insights.approx_conversion_rate}%</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Conversion rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <Send className="size-4 text-warning mb-2" />
              <p className="font-serif text-3xl ticker">{insights.daily_sample_target}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Daily samples</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Courier bill upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="size-4 text-primary" /> Upload today's courier bill
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload the daily courier Excel to log sample dispatches. System will track conversions over next 30 days.
            </p>
            <label className="flex items-center gap-3 cursor-pointer rounded-md border-2 border-dashed border-border p-4 hover:border-primary/50">
              <Upload className="size-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">{file ? file.name : 'Select courier bill Excel'}</p>
                <p className="text-xs text-muted-foreground">.xlsx with buyer_name column</p>
              </div>
              <input type="file" accept=".xlsx,.xls" className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
            <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
              {uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
              Log sample dispatches
            </Button>
            {uploadResult && (
              <div className="rounded-md bg-success/10 border border-success/30 p-3">
                <p className="text-sm font-medium text-success">{uploadResult.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Date: {uploadResult.bill_date} · {uploadResult.samples_extracted} samples
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Article-specific recommendation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="size-4 text-primary" /> Smart sample targets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter an article code → get recommended buyers to send samples to.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. A130D146"
                value={articleCode}
                onChange={(e) => setArticleCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && getArticleRecs()}
                className="font-mono"
              />
              <Button onClick={getArticleRecs} disabled={recLoading}>
                {recLoading ? <Loader2 className="size-4 animate-spin" /> : 'Match'}
              </Button>
            </div>
            {articleRecs.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {articleRecs.slice(0, 8).map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-xs rounded-md bg-secondary/50 p-2">
                    <span className="font-medium truncate">{r.buyer_name}</span>
                    <Badge variant="outline" className="text-[10px]">{r.past_purchase_count}× past</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top converters */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Award className="size-4 text-primary" />
          <h3 className="font-medium">Top converting buyers (last 30 days)</h3>
          <Badge variant="outline">{converters.length}</Badge>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid gap-2 md:grid-cols-2">
            {converters.slice(0, 20).map((c, i) => (
              <motion.div key={i} variants={staggerItem}>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`flex size-6 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                          i < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {i + 1}
                        </span>
                        <span className="font-medium text-sm truncate">{c.buyer_name}</span>
                      </div>
                      <span className="text-xs font-mono shrink-0">{(c.total_meters / 1000).toFixed(1)}K m</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={c.conversion_score} className="h-1.5" />
                      <span className="text-[10px] text-muted-foreground shrink-0">{c.sale_count} sales</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
