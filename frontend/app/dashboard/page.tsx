'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { pageTransition } from '@/lib/animations'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { CommandPalette } from '@/components/dashboard/command-palette'
import { DashboardOverview } from '@/components/dashboard/dashboard-overview'
import { StockTable } from '@/components/dashboard/stock-table'
import { StockDetailPanel } from '@/components/dashboard/stock-detail-panel'
import { SalesTabs } from '@/components/dashboard/sales-tabs'
import { WarehouseVisualization } from '@/components/dashboard/warehouse-visualization'
import { BuyersModule } from '@/components/dashboard/buyers-module'
import { AIAssistant } from '@/components/dashboard/ai-assistant'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { StaffTagging } from '@/components/dashboard/staff-tagging'
import { TaskManager } from '@/components/dashboard/task-manager'
import { DataInput } from '@/components/dashboard/data-input'
import { WebsiteSync } from '@/components/dashboard/website-sync'
import { SecuritySettings } from '@/components/dashboard/security-settings'
import { NotificationCenter } from '@/components/dashboard/notification-center'
import { DataLoader } from '@/components/dashboard/data-loader'
import { AddStockDialog } from '@/components/dashboard/add-stock-dialog'
import { AddBuyerDialog } from '@/components/dashboard/add-buyer-dialog'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import {
  LayoutDashboard, Package, ShoppingCart, Warehouse, Users, Brain,
  Activity, Settings, Search, Bell, Plus, Download, Upload, UserCheck,
  ClipboardList, Globe,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import api from '@/lib/api'
import { useSalesLock } from '@/lib/sales-lock'
import { useState, useRef } from 'react'
import { toast, Toaster } from 'sonner'

const moduleIcons: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard, stock: Package, sales: ShoppingCart,
  warehouse: Warehouse, buyers: Users, ai: Brain, activity: Activity,
  tagging: UserCheck, tasks: ClipboardList, datainput: Upload,
  websync: Globe, notifications: Bell, settings: Settings,
}

const moduleTitles: Record<string, string> = {
  dashboard: 'Dashboard', stock: 'Smart Stock', sales: 'Sales',
  warehouse: 'Warehouse', buyers: 'Buyers', ai: 'AI Assistant',
  activity: 'Activity', tagging: 'Staff Tagging', tasks: 'Tasks',
  datainput: 'Data Input', websync: 'Website Sync',
  notifications: 'Notifications', settings: 'Settings',
}

const handleExport = async (type: string) => {
  try {
    const res = await api.get(`/export/${type}`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}_export.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch {}
}

const handleSalesPDF = async () => {
  try {
    const res = await api.get('/sales/report/pdf', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-report-${new Date().toISOString().slice(0, 10)}.pdf`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch {}
}

export default function DashboardPage() {
  const { activeModule, setCommandPaletteOpen, detailPanelOpen } = useAppStore()
  const { theme, setTheme } = useTheme()
  const ModuleIcon = moduleIcons[activeModule] || LayoutDashboard
  const unlocked = useSalesLock((s) => s.unlocked)
  const unlockFn = useSalesLock((s) => s.unlock)
  const lockFn = useSalesLock((s) => s.lock)
  const [searchValue, setSearchValue] = useState('')
  const checkingRef = useRef(false)

  const handleSearchChange = async (raw: string) => {
    setSearchValue(raw)
    const candidate = raw.trim().toUpperCase()
    if (candidate.length === 16 && /^[A-Z0-9]+$/.test(candidate) && !checkingRef.current) {
      checkingRef.current = true
      const ok = await unlockFn(candidate)
      checkingRef.current = false
      if (ok) {
        toast.success('Sales access granted', { description: 'Locks again after 30 min of inactivity.' })
        setSearchValue('')
      }
    }
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard': return <DashboardOverview />
      case 'stock': return <StockTable />
      case 'sales': return <SalesTabs />
      case 'warehouse': return <WarehouseVisualization />
      case 'buyers': return <BuyersModule />
      case 'ai': return <AIAssistant />
      case 'activity': return <ActivityFeed />
      case 'tagging': return <StaffTagging />
      case 'tasks': return <TaskManager />
      case 'datainput': return <DataInput />
      case 'websync': return <WebsiteSync />
      case 'notifications': return <NotificationCenter />
      case 'settings':
        return <SecuritySettings />
      default: return <DashboardOverview />
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* New minimal-style header — large search bar, circular bell, user pill */}
        <header className="sticky top-0 z-10 flex flex-col gap-4 border-b border-border bg-background/95 px-5 py-4 backdrop-blur xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3 xl:flex-1 xl:max-w-3xl">
            <SidebarTrigger className="shrink-0" />
            {/* Large pill-shaped search */}
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <input
                type={searchValue.length >= 12 ? 'password' : 'text'}
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !searchValue.trim()) setCommandPaletteOpen(true)
                }}
                placeholder="Scan bale barcode or search article number..."
                className="h-12 w-full rounded-full border border-border bg-card pl-14 pr-28 text-sm font-medium text-foreground outline-none transition placeholder:text-muted-foreground hover:border-foreground/20 focus:border-foreground/30"
              />
              {unlocked ? (
                <button
                  onClick={() => { lockFn(); toast.message('Sales locked') }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 hover:bg-emerald-500/20"
                  title="Click to lock sales data"
                >
                  Unlocked
                </button>
              ) : (
                <button
                  onClick={() => setCommandPaletteOpen(true)}
                  className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground sm:block"
                >
                  ⌘K
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 xl:justify-end">
            {/* Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="size-12 rounded-full">
                  <Download className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('stock')}><Package className="mr-2 size-4" /> Export Stock</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('buyers')}><Users className="mr-2 size-4" /> Export Buyers</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('sales')}><ShoppingCart className="mr-2 size-4" /> Export Sales (Excel)</DropdownMenuItem>
                <DropdownMenuItem onClick={handleSalesPDF}><Download className="mr-2 size-4" /> Sales Report (PDF)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Add New */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-12 rounded-full px-5">
                  <Plus className="mr-2 size-4" /> Add new
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <AddStockDialog trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}><Package className="mr-2 size-4" /> Add Stock</DropdownMenuItem>} />
                <AddBuyerDialog trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}><Users className="mr-2 size-4" /> Add Buyer</DropdownMenuItem>} />
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notification bell — circular */}
            <button
              onClick={() => useAppStore.getState().setActiveModule('notifications')}
              className="relative flex size-12 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-muted"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
              <span className="absolute right-3 top-3 size-2 rounded-full bg-foreground ring-2 ring-card" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="relative flex size-12 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-muted"
              aria-label="Toggle Theme"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </button>

            {/* User pill */}
            <div className="flex h-12 items-center gap-3 rounded-full border border-border bg-card pl-2 pr-5">
              <div className="flex size-9 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                A
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold leading-tight text-foreground">Admin</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{moduleTitles[activeModule]}</p>
              </div>
            </div>
          </div>
        </header>
        <div className="flex flex-1">
          <main className="flex-1 overflow-auto p-6">
            <AnimatePresence mode="wait">
              <motion.div key={activeModule} variants={pageTransition} initial="hidden" animate="visible" exit="exit">
                {renderModule()}
              </motion.div>
            </AnimatePresence>
          </main>
          {activeModule === 'stock' && detailPanelOpen && <StockDetailPanel />}
        </div>
      </SidebarInset>
      <CommandPalette />
      <DataLoader />
      <Toaster theme="dark" position="top-right" />
    </SidebarProvider>
  )
}
