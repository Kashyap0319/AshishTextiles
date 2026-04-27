'use client'

import {
  LayoutDashboard, Package, ShoppingCart, Warehouse, Users, Brain,
  Activity, Settings, Search, ChevronDown, ScanSearch, ClipboardList,
  Upload, UserCheck, LogOut, Globe,
} from 'lucide-react'
import realData from '@/lib/real-data.json'
import { useAppStore } from '@/lib/store'
import useAuth from '@/hooks/use-auth'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Kbd } from '@/components/ui/kbd'

const mainNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'stock', label: 'Smart Stock', icon: Package },
  { id: 'sales', label: 'Sales', icon: ShoppingCart },
  { id: 'warehouse', label: 'Warehouse', icon: Warehouse },
  { id: 'buyers', label: 'Buyers', icon: Users },
  { id: 'ai', label: 'AI Assistant', icon: Brain },
  { id: 'activity', label: 'Activity', icon: Activity },
]

const toolsNavItems = [
  { id: 'tagging', label: 'Staff Tagging', icon: UserCheck },
  { id: 'tasks', label: 'Tasks', icon: ClipboardList },
  { id: 'datainput', label: 'Data Input', icon: Upload },
  { id: 'websync', label: 'Website Sync', icon: Globe },
]

const roleAccess: Record<string, string[]> = {
  admin: ['*'], owner: ['*'],
  sales: ['dashboard', 'stock', 'sales', 'buyers', 'ai', 'activity', 'tasks', 'tagging'],
  warehouse: ['dashboard', 'stock', 'warehouse', 'datainput', 'activity', 'tagging'],
  employee: ['dashboard', 'stock', 'sales', 'buyers', 'activity', 'tasks', 'tagging'],
}

export function AppSidebar() {
  const { activeModule, setActiveModule, setCommandPaletteOpen, currentUser } = useAppStore()
  const { user, logout } = useAuth()

  const role = user?.role || currentUser.role || 'owner'
  const allowed = roleAccess[role] || roleAccess['employee']
  const canAccess = (id: string) => allowed.includes('*') || allowed.includes(id)

  const displayName = user?.name || currentUser.name
  const displayRole = user?.role || currentUser.role

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border pb-5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-transparent">
              <div className="flex aspect-square size-11 items-center justify-center rounded-2xl border border-border bg-muted text-foreground">
                <ScanSearch className="size-[22px]" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="text-[22px] font-semibold tracking-tight text-sidebar-foreground">CaratSense</span>
                <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Textile Stock</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setCommandPaletteOpen(true)} className="text-muted-foreground" tooltip="Search">
                  <Search className="size-4" />
                  <span className="flex-1">Quick Search</span>
                  <Kbd className="hidden group-data-[collapsible=icon]:hidden"><span className="text-xs">⌘K</span></Kbd>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.filter((item) => canAccess(item.id)).map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeModule === item.id}
                    onClick={() => setActiveModule(item.id)}
                    tooltip={item.label}
                    className="transition-all duration-200 hover:translate-x-1"
                  >
                    <item.icon className="size-4" />
                    <span className="flex-1">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsNavItems.filter((item) => canAccess(item.id)).map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeModule === item.id}
                    onClick={() => setActiveModule(item.id)}
                    tooltip={item.label}
                    className="transition-all duration-200 hover:translate-x-1"
                  >
                    <item.icon className="size-4" />
                    <span className="flex-1">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeModule === 'settings'} onClick={() => setActiveModule('settings')} tooltip="Settings">
                  <Settings className="size-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Floor Sync card — minimal stats card */}
      <div className="px-3 pb-2 group-data-[collapsible=icon]:hidden">
        <div className="rounded-[1.75rem] border border-border bg-background/60 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Floor sync</span>
            <span className="flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
              <span className="size-1.5 rounded-full bg-foreground" />
              Live
            </span>
          </div>
          <p className="mt-6 text-4xl font-light tracking-[-0.05em] text-foreground">
            {realData.stats.totalStockItems.toLocaleString()}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Bales mapped across active warehouse racks.
          </p>
        </div>
      </div>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{displayName}</span>
                    <span className="truncate text-xs capitalize text-muted-foreground">{displayRole}</span>
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-56" side="top" align="start" sideOffset={4}>
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Preferences</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => { logout(); window.location.href = '/login' }}>
                  <LogOut className="mr-2 size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
