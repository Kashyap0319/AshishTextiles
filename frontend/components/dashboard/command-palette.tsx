'use client'

import { useEffect, useCallback } from 'react'
import {
  Package,
  Users,
  Warehouse,
  MessageSquare,
  LayoutDashboard,
  Search,
  Brain,
  Activity,
  Settings,
  Plus,
  Filter,
  Download,
  FileText,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: '1' },
  { id: 'stock', label: 'Smart Stock', icon: Package, shortcut: '2' },
  { id: 'warehouse', label: 'Warehouse', icon: Warehouse, shortcut: '3' },
  { id: 'buyers', label: 'Buyer Intelligence', icon: Users, shortcut: '4' },
  { id: 'matching', label: 'AI Matching', icon: Brain, shortcut: '5' },
  { id: 'chat', label: 'AI Chat', icon: MessageSquare, shortcut: '6' },
  { id: 'activity', label: 'Activity Feed', icon: Activity, shortcut: '7' },
  { id: 'settings', label: 'Settings', icon: Settings, shortcut: '8' },
]

const actionItems = [
  { id: 'add-stock', label: 'Add New Stock', icon: Plus },
  { id: 'filter-stock', label: 'Filter Stock', icon: Filter },
  { id: 'export-data', label: 'Export Data', icon: Download },
  { id: 'generate-report', label: 'Generate Report', icon: FileText },
]

const recentSearches = [
  { id: 's1', label: 'Who buys lycra?', type: 'query' },
  { id: 's2', label: 'Dead stock > 60 days', type: 'query' },
  { id: 's3', label: 'JANI TEXTILES', type: 'buyer' },
  { id: 's4', label: 'Rack A-12', type: 'location' },
]

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setActiveModule, stocks, buyers } = useAppStore()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
      }
    },
    [commandPaletteOpen, setCommandPaletteOpen]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleSelect = (id: string) => {
    const navItem = navigationItems.find((item) => item.id === id)
    if (navItem) {
      setActiveModule(navItem.id)
    }
    setCommandPaletteOpen(false)
  }

  return (
    <CommandDialog
      open={commandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
      title="Command Palette"
      description="Search for commands, stock, buyers, or navigate modules"
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Recent Searches */}
        <CommandGroup heading="Recent">
          {recentSearches.map((item) => (
            <CommandItem key={item.id} onSelect={() => handleSelect('chat')}>
              <Search className="mr-2 size-4 text-muted-foreground" />
              <span>{item.label}</span>
              <CommandShortcut className="text-xs text-muted-foreground">
                {item.type}
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="Navigate">
          {navigationItems.map((item) => (
            <CommandItem key={item.id} onSelect={() => handleSelect(item.id)}>
              <item.icon className="mr-2 size-4" />
              <span>{item.label}</span>
              <CommandShortcut>⌘{item.shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Actions */}
        <CommandGroup heading="Actions">
          {actionItems.map((item) => (
            <CommandItem key={item.id} onSelect={() => setCommandPaletteOpen(false)}>
              <item.icon className="mr-2 size-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Quick Stock Search */}
        <CommandGroup heading="Stock">
          {stocks.slice(0, 4).map((stock) => (
            <CommandItem
              key={stock.id}
              onSelect={() => {
                setActiveModule('stock')
                setCommandPaletteOpen(false)
              }}
            >
              <Package className="mr-2 size-4 text-muted-foreground" />
              <span className="font-mono">{stock.code}</span>
              <span className="ml-2 text-muted-foreground">{stock.fabricType}</span>
              <CommandShortcut>{stock.quantity.toLocaleString()}m</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Quick Buyer Search */}
        <CommandGroup heading="Buyers">
          {buyers.slice(0, 4).map((buyer) => (
            <CommandItem
              key={buyer.id}
              onSelect={() => {
                setActiveModule('buyers')
                setCommandPaletteOpen(false)
              }}
            >
              <Users className="mr-2 size-4 text-muted-foreground" />
              <span>{buyer.name}</span>
              <CommandShortcut className="capitalize">{buyer.type}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
