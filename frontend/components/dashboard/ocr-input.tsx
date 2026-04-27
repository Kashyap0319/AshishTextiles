'use client'

import { useState, useRef } from 'react'
import { Camera, Upload, Loader2, Check, FileText, RotateCcw, Package, Search } from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

export function OCRInput() {
  const [image, setImage] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [parsed, setParsed] = useState<any[]>([])
  const [manualBale, setManualBale] = useState('')
  const [searchResult, setSearchResult] = useState<any>(null)
  const [searching, setSearching] = useState(false)

  const handleFile = (f: File) => {
    setFile(f)
    setResult(null)
    setParsed([])
    const reader = new FileReader()
    reader.onload = (e) => setImage(e.target?.result as string)
    reader.readAsDataURL(f)
  }

  const processOCR = async () => {
    if (!file) return
    setLoading(true)
    try {
      // Send to AI chat to extract bale label data
      const res = await api.post('/chat/', {
        message: `Extract ALL text from this bale label image. Look for: BALE NO (starts with 3400 or 3700), ARTICLE NO, SALES ORDER NO, CUSTOMER NAME, and any other visible numbers. Return each field on a separate line in format: FIELD: VALUE`,
      })
      const text = res.data?.response || res.data?.text || ''
      setResult(text)

      // Try to extract bale numbers (pattern: 12+ digit numbers starting with 3)
      const balePattern = /\b(3[4-7]\d{10,})\b/g
      const bales = text.match(balePattern) || []

      // Also try to extract article codes (pattern: A followed by digits)
      const articlePattern = /\b(A\d{3,}[A-Z]?\d*)\b/gi
      const articles = text.match(articlePattern) || []

      const items = bales.map((b: string, i: number) => ({
        bale_no: b,
        article: articles[0] || 'Unknown',
        source: 'OCR',
      }))
      setParsed(items)
    } catch {
      setResult('OCR failed. Try manual bale number entry below, or upload a clearer photo.')
    } finally {
      setLoading(false)
    }
  }

  // Manual bale number search — find stock by bale no
  const searchBale = async () => {
    if (!manualBale.trim()) return
    setSearching(true)
    setSearchResult(null)
    try {
      const res = await api.get(`/stock/?search=${manualBale.trim()}&per_page=5`)
      const items = Array.isArray(res.data) ? res.data : res.data?.items || []
      setSearchResult(items)
    } catch {
      setSearchResult([])
    } finally {
      setSearching(false)
    }
  }

  const reset = () => {
    setImage(null); setFile(null); setResult(null); setParsed([])
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* OCR Scan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Camera className="size-5 text-primary" />
              Scan Bale Label
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Photo lo bale label ki — system extract karega Bale No, Article No, Customer name.
            </p>

            {!image ? (
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col items-center justify-center cursor-pointer rounded-lg border-2 border-dashed border-border p-6 hover:border-primary/50 transition-colors">
                  <Camera className="mb-2 size-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Camera</p>
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                </label>
                <label className="flex flex-col items-center justify-center cursor-pointer rounded-lg border-2 border-dashed border-border p-6 hover:border-primary/50 transition-colors">
                  <Upload className="mb-2 size-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Upload</p>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={image} alt="Bale label" className="w-full max-h-48 object-contain bg-black/50" />
                  <Button size="icon" variant="secondary" className="absolute top-2 right-2" onClick={reset}>
                    <RotateCcw className="size-4" />
                  </Button>
                </div>
                <Button onClick={processOCR} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileText className="mr-2 size-4" />}
                  {loading ? 'Extracting...' : 'Extract Bale Data'}
                </Button>
              </div>
            )}

            {result && (
              <div className="rounded-lg bg-secondary/50 p-3">
                <p className="text-xs font-medium mb-1">Extracted Text:</p>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">{result}</pre>
              </div>
            )}

            {parsed.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Check className="size-4 text-emerald-400" /> Found {parsed.length} bale(s)
                </p>
                {parsed.map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
                    <div>
                      <span className="font-mono font-medium">{item.bale_no}</span>
                      {item.article !== 'Unknown' && (
                        <Badge variant="secondary" className="ml-2 text-xs">{item.article}</Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">OCR</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Bale Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="size-5 text-primary" />
              Bale Number Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Manually type bale number or article code to find stock in the system.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. 370005170774 or A130D146"
                value={manualBale}
                onChange={(e) => setManualBale(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchBale()}
                className="flex-1 font-mono"
              />
              <Button onClick={searchBale} disabled={searching}>
                {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              </Button>
            </div>

            {searchResult !== null && (
              <div>
                {Array.isArray(searchResult) && searchResult.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Article</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Meters</TableHead>
                        <TableHead>Hall/Rack</TableHead>
                        <TableHead>Days</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResult.map((item: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono">{item.article_code || item.code || '—'}</TableCell>
                          <TableCell className="font-mono text-xs">{item.batch_number || '—'}</TableCell>
                          <TableCell>{item.meters || item.quantity || 0}m</TableCell>
                          <TableCell>{item.hall || ''} / {item.rack_number || item.rack || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              (item.aging_days || 0) > 60 ? 'text-red-400 border-red-500/30' :
                              (item.aging_days || 0) > 30 ? 'text-amber-400 border-amber-500/30' :
                              'text-emerald-400 border-emerald-500/30'
                            }>{item.aging_days || 0}d</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Package className="mx-auto mb-2 size-8 opacity-50" />
                    <p className="text-sm">No stock found for "{manualBale}"</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
