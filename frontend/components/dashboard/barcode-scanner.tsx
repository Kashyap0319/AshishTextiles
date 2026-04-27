'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera, X, CheckCircle2, AlertCircle, Package, MapPin, ScanLine, Loader2, Search,
} from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface ScanResult {
  bale_no: string
  article_code?: string
  meters?: number
  hall?: string
  rack_number?: string
  quality?: string
  found: boolean
  aging_days?: number
  status?: string
}

export function BarcodeScanner() {
  const [scanning, setScanning] = useState(false)
  const [manualBale, setManualBale] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [history, setHistory] = useState<ScanResult[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const scannerRef = useRef<any>(null)
  const scannerId = 'barcode-reader'

  // Lookup function (shared between camera + manual)
  const lookupBale = async (bale: string): Promise<ScanResult> => {
    try {
      const res = await api.get(`/stock/?search=${encodeURIComponent(bale)}&per_page=1`)
      const items = Array.isArray(res.data) ? res.data : res.data?.items || []
      const item = items[0]
      if (item) {
        return {
          bale_no: bale,
          article_code: item.article_code || item.code,
          meters: item.meters || item.quantity,
          hall: item.hall,
          rack_number: item.rack_number || item.rack,
          quality: item.quality_category || item.fabric_type,
          aging_days: item.aging_days,
          status: item.status,
          found: true,
        }
      }
    } catch {}
    return { bale_no: bale, found: false }
  }

  const handleScan = async (decodedText: string) => {
    // Beep
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 800; gain.gain.value = 0.1
      osc.start(); osc.stop(ctx.currentTime + 0.1)
    } catch {}
    // Vibrate
    if (navigator.vibrate) navigator.vibrate(80)

    setLoading(true)
    const r = await lookupBale(decodedText)
    setResult(r)
    setHistory((prev) => [r, ...prev].slice(0, 10))
    setLoading(false)
  }

  const startScanner = async () => {
    setError('')
    setScanning(true)
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      // Small delay for DOM
      setTimeout(async () => {
        try {
          const scanner = new Html5Qrcode(scannerId)
          scannerRef.current = scanner
          await scanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 280, height: 120 } },
            (text) => {
              handleScan(text)
              stopScanner()
            },
            () => {} // ignore decode failures
          )
        } catch (e: any) {
          setError(e?.message || 'Camera access denied')
          setScanning(false)
        }
      }, 100)
    } catch (e: any) {
      setError('Failed to load scanner library')
      setScanning(false)
    }
  }

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop()
        scannerRef.current.clear()
        scannerRef.current = null
      }
    } catch {}
    setScanning(false)
  }

  useEffect(() => {
    return () => { stopScanner() }
  }, [])

  const handleManual = async () => {
    if (!manualBale.trim()) return
    setLoading(true)
    const r = await lookupBale(manualBale.trim())
    setResult(r)
    setHistory((prev) => [r, ...prev].slice(0, 10))
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Scanner panel */}
        <div className="rounded-bento border border-border bg-card p-6 shadow-bento-soft">
          <div className="mb-6 flex items-center gap-2">
            <ScanLine className="size-5 text-primary" />
            <h2 className="text-xl font-display-tight text-foreground">Bale Barcode Scanner</h2>
          </div>
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Point camera at bale barcode sticker. System will scan, lookup article details, and show rack location.
            </p>

            {scanning ? (
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                <div id={scannerId} className="w-full h-full" />
                {/* Scan line overlay */}
                <motion.div
                  animate={{ y: [0, 200, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute left-8 right-8 top-4 h-0.5 bg-primary shadow-[0_0_20px_rgba(193,95,60,0.8)]"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={stopScanner}
                  className="absolute top-2 right-2"
                >
                  <X className="size-4" /> Stop
                </Button>
                <div className="absolute bottom-2 left-0 right-0 text-center text-white text-sm font-serif italic">
                  Align barcode inside the frame
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Button onClick={startScanner} size="lg" className="w-full h-14 rounded-md">
                  <Camera className="mr-2 size-5" /> Open Camera Scanner
                </Button>

                <div className="divider-serif text-xs">or enter manually</div>

                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 370005170774"
                    value={manualBale}
                    onChange={(e) => setManualBale(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManual()}
                    className="font-mono h-11"
                  />
                  <Button onClick={handleManual} disabled={loading} className="h-11 px-5">
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-start gap-3">
                <AlertCircle className="size-5 text-destructive mt-0.5" />
                <div className="text-sm text-destructive font-medium">{error}</div>
              </div>
            )}
          </div>
        </div>

        {/* History panel */}
        <div className="rounded-bento border border-border bg-muted p-6 shadow-bento-soft">
          <div className="mb-6">
            <h2 className="text-xl font-display-tight text-foreground">Recent Scans</h2>
          </div>
          <div>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No scans yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div
                    key={i}
                    onClick={() => setResult(h)}
                    className="cursor-pointer rounded-md border border-border p-2.5 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs">{h.bale_no}</span>
                      {h.found ? (
                        <CheckCircle2 className="size-3 text-primary" />
                      ) : (
                        <AlertCircle className="size-3 text-destructive" />
                      )}
                    </div>
                    {h.found && (
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">
                        {h.article_code} • {h.meters}m
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Result card */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.bale_no}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            {result.found ? (
              <div className="mt-5 rounded-bento border border-primary/30 bg-primary/5 p-6 shadow-bento-soft">
                <div>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="size-5 text-primary" />
                        <span className="text-xs uppercase tracking-wider text-primary">Found in stock</span>
                      </div>
                      <div className="font-mono text-2xl font-semibold">{result.bale_no}</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setResult(null)}>
                      <X className="size-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Article</p>
                      <p className="font-mono font-medium">{result.article_code || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Meters</p>
                      <p className="font-serif text-2xl ticker">{result.meters?.toLocaleString() || 0}m</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Location</p>
                      <p className="font-medium flex items-center gap-1">
                        <MapPin className="size-3" />
                        Hall {result.hall} / Rack {result.rack_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Aging</p>
                      <Badge variant="outline" className={
                        (result.aging_days || 0) > 60 ? 'text-destructive border-destructive/30' :
                        (result.aging_days || 0) > 30 ? 'text-warning border-warning/30' :
                        'text-success border-success/30'
                      }>
                        {result.aging_days || 0} days
                      </Badge>
                    </div>
                  </div>

                  {result.quality && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-1">Quality</p>
                      <Badge variant="secondary">{result.quality}</Badge>
                      {result.status && (
                        <Badge variant="outline" className="ml-2 capitalize">{result.status}</Badge>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Package className="mr-2 size-3" /> Move to rack
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 rounded-full h-11">
                      Mark dispatched
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-bento border border-destructive/30 bg-destructive/5 p-6 shadow-bento-soft">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="size-5 text-destructive mt-0.5" />
                      <div>
                        <p className="font-medium mb-1">Bale not in system</p>
                        <p className="font-mono text-lg">{result.bale_no}</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          This bale is not registered. Add it as new stock or mark as "Not Found" for reconciliation later.
                        </p>
                        <div className="mt-5 flex gap-3">
                          <Button className="rounded-full px-6">Add as new stock</Button>
                          <Button variant="outline" className="rounded-full px-6">Mark Not Found</Button>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setResult(null)} className="rounded-full hover:bg-destructive/10">
                      <X className="size-5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
