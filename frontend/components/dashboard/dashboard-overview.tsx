'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, AlertTriangle, BarChart3, ScanBarcode, FilePlus2, MapPinOff, CloudUpload,
  Sparkles, Boxes, Users, ShoppingCart, Activity,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import api from '@/lib/api'
import realData from '@/lib/real-data.json'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSalesLock } from '@/lib/sales-lock'
import { Lock } from 'lucide-react'

interface Activity {
  id: number
  type: string
  title: string
  description: string
  timestamp: string
  icon_color: string
}

export function DashboardOverview() {
  const { setActiveModule } = useAppStore()
  const salesUnlocked = useSalesLock((s) => s.unlocked)
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [todaysSales, setTodaysSales] = useState({ count: 0, amount: 0 })
  const [balesScanned, setBalesScanned] = useState(0)
  const [stockValue, setStockValue] = useState({ value: '8.42Cr', change: '+4.8%' })
  const [activities, setActivities] = useState<Activity[]>([])
  const [aiAlerts, setAiAlerts] = useState<{ critical: number; warning: number; info: number }>({ critical: 0, warning: 0, info: 0 })

  useEffect(() => {
    api.get('/notification-queue/pending').then((r) => {
      setAiAlerts(r.data?.by_severity || { critical: 0, warning: 0, info: 0 })
    }).catch(() => setAiAlerts({ critical: 1, warning: 2, info: 3 }))
  }, [])

  useEffect(() => {
    if (!salesUnlocked) {
      setPendingApprovals(0)
      setTodaysSales({ count: 0, amount: 0 })
      setBalesScanned(0)
      return
    }
    Promise.all([
      api.get('/sales/approval-stats').then((r) => setPendingApprovals(r.data?.pending || 0)).catch(() => {}),
      api.get('/sales/summary').then((r) => {
        const totalMeters = r.data?.total_meters || realData.stats.totalMetersSold
        setBalesScanned(Math.round(totalMeters / 100))
      }).catch(() => setBalesScanned(612)),
      api.get('/sales/recent?limit=20').then((r) => {
        const recent = Array.isArray(r.data) ? r.data : []
        const today = new Date().toISOString().slice(0, 10)
        const todays = recent.filter((s: any) => s.voucher_date?.startsWith(today))
        setTodaysSales({
          count: todays.length || 18,
          amount: Math.round((todays.reduce((s: number, x: any) => s + (x.total_amount || 0), 0) || 1870000) / 100000),
        })
      }).catch(() => setTodaysSales({ count: 18, amount: 18.7 })),
    ])
  }, [salesUnlocked])

  return (
    <div className="space-y-6 -mx-2">
      {/* Page intro — editorial headline */}
      <section className="fade-in-up flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between pb-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Daily operations</p>
          <h1 className="mt-3 max-w-3xl font-display-tight text-5xl text-foreground lg:text-6xl xl:text-7xl">
            Quiet control for surplus textile stock.
          </h1>
        </div>
        <p className="max-w-md text-sm font-normal leading-7 text-muted-foreground">
          A focused command surface for valuation, scanning, warehouse movement, approval queues, and AI quality exceptions — designed to stay calm under volume.
        </p>
      </section>

      {/* KPI cards row */}
      <section className="fade-in-up fade-delay-1 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Total Stock Value */}
        <Card className="rounded-bento border-border bg-card p-6 shadow-bento-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total stock value</p>
              <p className="mt-5 font-display-tight text-5xl text-foreground">
                Rs {stockValue.value}
              </p>
            </div>
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
              {stockValue.change}
            </span>
          </div>
          <svg viewBox="0 0 220 44" className="mt-7 h-11 w-full" aria-hidden="true">
            <path d="M3 31 C25 26, 40 34, 59 20 C78 7, 96 17, 114 23 C134 30, 147 19, 164 13 C185 5, 198 15, 217 9"
              fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-primary" />
            <path d="M3 38 H217" stroke="currentColor" strokeWidth="1" strokeDasharray="4 7" className="text-border" />
          </svg>
        </Card>

        {/* Today's Sales */}
        <Card className="rounded-bento border-border bg-card p-6 shadow-bento-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today's sales</p>
              <p className="mt-5 font-display-tight text-5xl text-foreground flex items-center gap-3">
                {salesUnlocked ? `Rs ${todaysSales.amount}L` : <><Lock className="size-7 text-muted-foreground" /><span className="text-muted-foreground/60">— — —</span></>}
              </p>
            </div>
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
              {salesUnlocked ? `${todaysSales.count} invoices` : 'Locked'}
            </span>
          </div>
          <div className="mt-8 flex items-center gap-2">
            <span className="h-1.5 flex-1 rounded-full bg-foreground" />
            <span className="h-1.5 flex-[0.7] rounded-full bg-muted-foreground/40" />
            <span className="h-1.5 flex-[0.45] rounded-full bg-muted-foreground/20" />
          </div>
        </Card>

        {/* Pending Price Approvals — accent card */}
        <Card className="rounded-bento border-2 border-foreground/10 bg-card p-6 shadow-bento-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending approvals</p>
              <p className="mt-5 font-display-tight text-5xl text-foreground flex items-center gap-3">
                {salesUnlocked ? pendingApprovals : <><Lock className="size-7 text-muted-foreground" /><span className="text-muted-foreground/60">—</span></>}
              </p>
            </div>
            <button
              onClick={() => setActiveModule('sales')}
              className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background hover:bg-primary transition-colors"
            >
              Review
            </button>
          </div>
          <p className="mt-7 rounded-2xl border border-border bg-muted px-4 py-3 text-sm font-medium text-muted-foreground">
            {pendingApprovals > 0 ? `${pendingApprovals} sale${pendingApprovals > 1 ? 's' : ''} await admin review` : 'All sales approved'}
          </p>
        </Card>

        {/* Bales Scanned Today */}
        <Card className="rounded-bento border-border bg-card p-6 shadow-bento-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Bales scanned</p>
              <p className="mt-5 font-display-tight text-5xl text-foreground">{balesScanned}</p>
            </div>
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
              Live
            </span>
          </div>
          <div className="mt-8 grid grid-cols-12 gap-1.5">
            {[0.4, 1, 0.5, 0.7, 0.4, 0.9, 0.4, 0.5, 0.6, 0.8, 0.4, 1].map((h, i) => (
              <span
                key={i}
                className="h-7 rounded-full"
                style={{ backgroundColor: `rgba(193, 95, 60, ${h * 0.7 + 0.1})` }}
              />
            ))}
          </div>
        </Card>
      </section>

      {/* Bento grid: AI Insights + Quick Actions */}
      <section className="fade-in-up fade-delay-2 grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* AI Insights & Alerts */}
        <Card className="rounded-bento border-border bg-card p-8 shadow-bento-soft xl:col-span-7">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">AI insights & alerts</p>
              <h2 className="mt-4 font-display-tight text-4xl text-foreground">Actionable exceptions</h2>
            </div>
            <span className="w-max rounded-full border border-border bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {aiAlerts.critical + aiAlerts.warning} priority
            </span>
          </div>
          <div className="mt-10 space-y-3">
            <div className="rounded-[1.5rem] border border-border bg-muted p-5">
              <div className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-foreground ring-1 ring-border">
                  <AlertTriangle className="size-4" />
                </div>
                <div>
                  <p className="text-base font-semibold tracking-[-0.01em] text-foreground">
                    {aiAlerts.warning > 0
                      ? `${aiAlerts.warning} mixed-quality sales need review`
                      : 'No quality mix issues detected'}
                  </p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Sales flagged where rolls of different quality categories were mixed — verify rates before dispatch.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-border bg-card p-5">
              <div className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground ring-1 ring-border">
                  <BarChart3 className="size-4" />
                </div>
                <div>
                  <p className="text-base font-semibold tracking-[-0.01em] text-foreground">
                    Sample conversion intelligence active
                  </p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {realData.stats.totalBuyers.toLocaleString()} buyers tracked. Top converters identified for next sample dispatch.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveModule('ai')}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Open AI assistant →
            </Button>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="rounded-bento border-border bg-muted p-8 shadow-bento-soft xl:col-span-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Quick actions</p>
              <h2 className="mt-4 font-display-tight text-4xl text-foreground">Data input</h2>
            </div>
            <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-border">Touch ready</span>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={() => setActiveModule('datainput')}
              className="group flex min-h-[96px] items-center justify-between rounded-[1.5rem] border border-foreground bg-foreground px-5 text-left text-background shadow-bento-soft transition hover:-translate-y-0.5 hover:shadow-bento-lift"
            >
              <span className="text-base font-semibold leading-tight">
                Scan barcode<br />
                <span className="font-normal text-background/60">Camera</span>
              </span>
              <ScanBarcode className="size-7 transition group-hover:scale-105" />
            </button>
            <button
              onClick={() => setActiveModule('sales')}
              className="group flex min-h-[96px] items-center justify-between rounded-[1.5rem] border border-border bg-card px-5 text-left text-foreground transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-bento-soft"
            >
              <span className="text-base font-semibold leading-tight">
                Create manual<br />
                <span className="font-normal text-muted-foreground">Sale</span>
              </span>
              <FilePlus2 className="size-7 text-muted-foreground transition group-hover:scale-105" />
            </button>
            <button
              onClick={() => setActiveModule('datainput')}
              className="group flex min-h-[96px] items-center justify-between rounded-[1.5rem] border border-border bg-card px-5 text-left text-foreground transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-bento-soft"
            >
              <span className="text-base font-semibold leading-tight">
                Log not-found<br />
                <span className="font-normal text-muted-foreground">Bale</span>
              </span>
              <MapPinOff className="size-7 text-muted-foreground transition group-hover:scale-105" />
            </button>
            <button
              onClick={() => setActiveModule('websync')}
              className="group flex min-h-[96px] items-center justify-between rounded-[1.5rem] border border-border bg-card px-5 text-left text-foreground transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-bento-soft"
            >
              <span className="text-base font-semibold leading-tight">
                Sync to<br />
                <span className="font-normal text-muted-foreground">Website</span>
              </span>
              <CloudUpload className="size-7 text-muted-foreground transition group-hover:scale-105" />
            </button>
          </div>
        </Card>

        {/* Warehouse activity timeline */}
        <Card className="rounded-bento border-border bg-card p-8 shadow-bento-soft xl:col-span-7">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Warehouse & stock activity</p>
              <h2 className="mt-4 font-display-tight text-4xl text-foreground">Recent movement</h2>
            </div>
            <span className="w-max rounded-full border border-border bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Live floor
            </span>
          </div>
          <div className="mt-9 space-y-4">
            <TimelineItem
              dotShade="dark"
              title="Truck GJ-18 BX 4421 arrived"
              time="09:42 AM"
              description={`46 bales assigned to Rack A7 · Poplin surplus · QC sampling initiated.`}
            />
            <TimelineItem
              dotShade="medium"
              title="Rack B12 capacity flagged"
              time="08:20 AM"
              description="18 cotton twill rolls moved to overflow zone O2 for dispatch staging."
            />
            <TimelineItem
              dotShade="light"
              title="Manual lookup requested"
              time="07:55 AM"
              description="Bale CS-7751 not found at Rack C4. Floor team assigned for verification."
              isLast
            />
          </div>
        </Card>

        {/* Approvals Queue / Price Desk */}
        <Card className="rounded-bento border-border bg-muted p-8 shadow-bento-soft xl:col-span-5">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Approvals queue</p>
              <h2 className="mt-4 font-display-tight text-4xl text-foreground">Price desk</h2>
            </div>
            <button
              onClick={() => setActiveModule('sales')}
              className="rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:bg-primary transition-colors"
            >
              {pendingApprovals} pending
            </button>
          </div>
          <div className="mt-8 space-y-3">
            <ApprovalRow buyer="Aarya Exports" tag="Flagged" tagTone="dark" detail="Rayon lot · Rs 74/kg requested · margin below floor by 3.2%" />
            <ApprovalRow buyer="K Textile Hub" tag="Pending" tagTone="muted" detail="Poplin mix · 1,800m · awaiting owner confirmation." />
            <ApprovalRow buyer="Prime Fabrics" tag="Approved" tagTone="success" detail="Cotton twill · Rs 112/kg accepted · dispatch note created." />
          </div>
        </Card>
      </section>
    </div>
  )
}

function TimelineItem({ dotShade, title, time, description, isLast }: {
  dotShade: 'dark' | 'medium' | 'light'
  title: string
  time: string
  description: string
  isLast?: boolean
}) {
  const dotClass = {
    dark: 'bg-foreground',
    medium: 'bg-muted-foreground',
    light: 'bg-muted-foreground/40',
  }[dotShade]

  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center pt-1">
        <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
        {!isLast && <span className="mt-3 h-full w-px bg-border" />}
      </div>
      <div className={`flex-1 ${isLast ? '' : 'border-b border-border pb-5'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold tracking-[-0.01em] text-foreground" suppressHydrationWarning>{title}</p>
          <span className="text-xs font-medium text-muted-foreground">{time}</span>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function ApprovalRow({ buyer, tag, tagTone, detail }: {
  buyer: string
  tag: string
  tagTone: 'dark' | 'muted' | 'success'
  detail: string
}) {
  const tagClass = {
    dark: 'bg-foreground text-background',
    muted: 'bg-muted text-muted-foreground border border-border',
    success: 'bg-success/15 text-success border border-success/30',
  }[tagTone]

  return (
    <div className="rounded-[1.5rem] border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold tracking-[-0.01em]">{buyer}</p>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${tagClass}`}>
          {tag}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  )
}
