'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { FileSpreadsheet, Upload, Loader2, Check, AlertTriangle, Package, MapPin } from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

interface Bale {
  sno: number
  bale_no: string
  meters: number
  nett_weight_kg: number
  colour: string
  group_no: string
}

interface ParsedSheet {
  sheet: string
  sale_order: string
  customer: string
  invoice: string
  article_code: string
  article_desc: string
  quality_category: string
  suggested_rack: string
  status: string
  bales: Bale[]
  total_meters: number
  total_pieces: number
}

interface PreviewResult {
  sheets: number
  total_articles_found: number
  known_in_master: number
  unknown_new: number
  match_rate: number
  total_bales: number
  total_meters: number
  unknown_articles: { code: string; description: string }[]
  parsed_data: ParsedSheet[]
}

export function PackingProcessor() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PreviewResult | null>(null)

  const handlePreview = async () => {
    if (!file) return
    setLoading(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/packing-processor/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(res.data)
    } catch {
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const handleProcess = async () => {
    if (!file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/packing-processor/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `processed_${file.name}`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {} finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="size-5 text-primary" />
            Mill Packing List Processor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload packing list from mill (.xlsx or .xls). Supports WITH/WITHOUT Godown, Google Sheet, and old formats.
            Auto-fills quality, suggests rack, shows bale-level detail.
          </p>
          <div className="flex items-center gap-4">
            <label className="flex-1 cursor-pointer rounded-lg border-2 border-dashed border-border p-6 text-center hover:border-primary/50 transition-colors">
              <Upload className="mx-auto mb-2 size-8 text-muted-foreground" />
              <p className="text-sm font-medium">{file ? file.name : 'Click to select Excel file'}</p>
              <p className="text-xs text-muted-foreground mt-1">.xlsx or .xls</p>
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          <div className="flex gap-3">
            <Button onClick={handlePreview} disabled={!file || loading} variant="outline" className="flex-1">
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileSpreadsheet className="mr-2 size-4" />}
              Preview
            </Button>
            <Button onClick={handleProcess} disabled={!file || loading} className="flex-1">
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
              Process & Download
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{result.sheets}</p>
              <p className="text-xs text-muted-foreground">Sheets</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{result.total_bales || 0}</p>
              <p className="text-xs text-muted-foreground">Bales</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{(result.total_meters || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Meters</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{result.known_in_master}</p>
              <p className="text-xs text-muted-foreground">Matched</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{result.unknown_new}</p>
              <p className="text-xs text-muted-foreground">Unknown</p>
            </CardContent></Card>
          </div>

          {/* Match Rate */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Match Rate</span>
                <Progress value={result.match_rate || 0} className="flex-1" />
                <Badge variant="outline" className={
                  (result.match_rate || 0) > 80 ? 'text-emerald-400 border-emerald-500/30' :
                  (result.match_rate || 0) > 50 ? 'text-amber-400 border-amber-500/30' :
                  'text-red-400 border-red-500/30'
                }>{Math.round(result.match_rate || 0)}%</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Unknown Articles */}
          {result.unknown_articles && result.unknown_articles.length > 0 && (
            <Card className="border-amber-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-400" />
                  Unknown Articles ({result.unknown_articles.length}) — need manual quality assignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.unknown_articles.map((a) => (
                    <Badge key={a.code} variant="outline" className="font-mono text-xs border-amber-500/30">
                      {a.code}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bale-Level Detail per Sheet */}
          {result.parsed_data && result.parsed_data.length > 0 && (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
              {result.parsed_data.map((sheet, si) => (
                <motion.div key={si} variants={staggerItem}>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="size-4 text-primary" />
                          <span className="font-mono">{sheet.article_code}</span>
                          <span className="text-muted-foreground font-normal text-sm">{sheet.article_desc?.slice(0, 40)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={sheet.status === 'AUTO-FILLED' ? 'default' : 'outline'}
                            className={sheet.status === 'AUTO-FILLED' ? 'bg-emerald-500/20 text-emerald-400' : 'text-amber-400 border-amber-500/30'}>
                            {sheet.status}
                          </Badge>
                        </div>
                      </CardTitle>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                        {sheet.invoice && <span>Invoice: {sheet.invoice}</span>}
                        {sheet.customer && <span>Customer: {sheet.customer}</span>}
                        <span>{sheet.total_pieces} bales | {sheet.total_meters}m total</span>
                      </div>
                      <div className="flex gap-3 mt-2">
                        {sheet.quality_category && !sheet.quality_category.includes('UNKNOWN') && (
                          <Badge variant="secondary">{sheet.quality_category}</Badge>
                        )}
                        {sheet.suggested_rack && sheet.suggested_rack !== 'CHECK MANUALLY' && (
                          <Badge variant="outline" className="text-primary border-primary/30">
                            <MapPin className="mr-1 size-3" />{sheet.suggested_rack}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    {sheet.bales && sheet.bales.length > 0 && (
                      <CardContent className="pt-2">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">#</TableHead>
                              <TableHead>Bale No</TableHead>
                              <TableHead>Meters</TableHead>
                              <TableHead>Weight (kg)</TableHead>
                              {sheet.bales.some(b => b.colour) && <TableHead>Colour</TableHead>}
                              {sheet.bales.some(b => b.group_no) && <TableHead>Lot/Group</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sheet.bales.map((bale, bi) => (
                              <TableRow key={bi}>
                                <TableCell className="text-muted-foreground">{bale.sno}</TableCell>
                                <TableCell className="font-mono font-medium">{bale.bale_no}</TableCell>
                                <TableCell>{bale.meters}m</TableCell>
                                <TableCell>{bale.nett_weight_kg > 0 ? `${bale.nett_weight_kg} kg` : '—'}</TableCell>
                                {sheet.bales.some(b => b.colour) && <TableCell>{bale.colour || '—'}</TableCell>}
                                {sheet.bales.some(b => b.group_no) && <TableCell>{bale.group_no || '—'}</TableCell>}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    )}
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}
