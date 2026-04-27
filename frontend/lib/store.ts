'use client'

import { create } from 'zustand'
import type { Stock, Buyer, Activity, ChatMessage, ViewMode, SavedFilter, UserRole } from './types'
import { mockStocks, mockBuyers, mockActivities } from './data'

interface AppState {
  // UI State
  activeModule: string
  sidebarCollapsed: boolean
  commandPaletteOpen: boolean
  viewMode: ViewMode
  selectedStockId: string | null
  selectedBuyerId: string | null
  detailPanelOpen: boolean

  // Data State
  stocks: Stock[]
  buyers: Buyer[]
  activities: Activity[]
  chatMessages: ChatMessage[]
  
  // Filters
  stockFilters: {
    search: string
    stockType: string[]
    qualityGrade: string[]
    status: string[]
    rackLocation: string
    minDaysInStock: number
    maxDaysInStock: number
  }
  savedFilters: SavedFilter[]
  
  // User
  currentUser: {
    id: string
    name: string
    role: UserRole
    avatar?: string
  }

  // Actions
  setActiveModule: (module: string) => void
  toggleSidebar: () => void
  setCommandPaletteOpen: (open: boolean) => void
  setViewMode: (mode: ViewMode) => void
  setSelectedStock: (id: string | null) => void
  setSelectedBuyer: (id: string | null) => void
  setDetailPanelOpen: (open: boolean) => void
  
  setStocks: (stocks: Stock[]) => void
  setBuyers: (buyers: Buyer[]) => void
  setActivities: (activities: Activity[]) => void

  updateStock: (id: string, updates: Partial<Stock>) => void
  addStock: (stock: Stock) => void
  deleteStock: (id: string) => void
  
  updateBuyer: (id: string, updates: Partial<Buyer>) => void
  
  addActivity: (activity: Activity) => void
  addChatMessage: (message: ChatMessage) => void
  
  setStockFilters: (filters: Partial<AppState['stockFilters']>) => void
  resetStockFilters: () => void
  saveFilter: (filter: SavedFilter) => void
}

const defaultStockFilters = {
  search: '',
  stockType: [],
  qualityGrade: [],
  status: [],
  rackLocation: '',
  minDaysInStock: 0,
  maxDaysInStock: 999,
}

export const useAppStore = create<AppState>((set) => ({
  // Initial UI State
  activeModule: 'dashboard',
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  viewMode: 'table',
  selectedStockId: null,
  selectedBuyerId: null,
  detailPanelOpen: false,

  // Initial Data
  stocks: mockStocks,
  buyers: mockBuyers,
  activities: mockActivities,
  chatMessages: [],
  
  // Initial Filters
  stockFilters: defaultStockFilters,
  savedFilters: [],
  
  // Current User (Owner by default)
  currentUser: {
    id: '1',
    name: 'Rajesh Kumar',
    role: 'owner',
    avatar: undefined,
  },

  // Actions
  setActiveModule: (module) => set({ activeModule: module }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedStock: (id) => set({ selectedStockId: id, detailPanelOpen: !!id }),
  setSelectedBuyer: (id) => set({ selectedBuyerId: id, detailPanelOpen: !!id }),
  setDetailPanelOpen: (open) => set({ detailPanelOpen: open }),
  
  setStocks: (stocks) => set({ stocks }),
  setBuyers: (buyers) => set({ buyers }),
  setActivities: (activities) => set({ activities }),

  updateStock: (id, updates) =>
    set((state) => ({
      stocks: state.stocks.map((s) =>
        s.id === id ? { ...s, ...updates, lastUpdated: new Date().toISOString() } : s
      ),
    })),
    
  addStock: (stock) =>
    set((state) => ({
      stocks: [stock, ...state.stocks],
    })),
    
  deleteStock: (id) =>
    set((state) => ({
      stocks: state.stocks.filter((s) => s.id !== id),
    })),
  
  updateBuyer: (id, updates) =>
    set((state) => ({
      buyers: state.buyers.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    })),
  
  addActivity: (activity) =>
    set((state) => ({
      activities: [activity, ...state.activities],
    })),
    
  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),
  
  setStockFilters: (filters) =>
    set((state) => ({
      stockFilters: { ...state.stockFilters, ...filters },
    })),
    
  resetStockFilters: () =>
    set({ stockFilters: defaultStockFilters }),
    
  saveFilter: (filter) =>
    set((state) => ({
      savedFilters: [...state.savedFilters, filter],
    })),
}))
