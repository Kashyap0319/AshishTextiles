// Stock Types (legacy — kept for backward compat)
export type StockType =
  | 'dead-stock'
  | 'off-shade'
  | 'mill-seconds'
  | 'end-of-lot'
  | 'overproduction'
  | 'manufactured'

export type QualityGrade = 'A' | 'B' | 'C' | 'D'

// ═══════════════ TDM Classification Hierarchy (from Ashish's questionnaire) ═══════════════
// Dyed | Grey → Piece Dyed | Print | Yarndyed | Denim
//                → Cotton | Poly-cotton
//                  → Bottom | Shirting
//                    → Lycra | Non-Lycra
//                      → Quality (Twill, Dobby, Poplin, etc.)

export type Category = 'Dyed' | 'Grey'
export type SubCategory = 'Piece Dyed' | 'Print' | 'Yarndyed' | 'Denim'
export type FabricBase = 'Cotton' | 'Poly-cotton'
export type Usage = 'Bottom' | 'Shirting'
export type Stretch = 'Lycra' | 'Non-Lycra'

export interface ClassificationPath {
  category?: Category
  subCategory?: SubCategory
  fabricBase?: FabricBase
  usage?: Usage
  stretch?: Stretch
  quality?: string  // Twill, Dobby, Poplin, Satin, Matty, Tussur, etc.
}

// TDM's actual quality structure (from questionnaire pages 15-16)
export const TDM_CLASSIFICATION = {
  'Dyed': {
    'Piece Dyed': {
      'Cotton': {
        'Bottom': {
          'Lycra': ['Twill', 'Dobby', 'Knit', 'Satin', 'Matty', 'Tussur', 'A150C873'],
          'Non-Lycra': ['Twill', 'Drill', 'Matty', 'Dobby', 'Satin', 'Tussur', '130D07'],
        },
        'Shirting': {
          'Lycra': ['Lycre Poplin'],
          'Non-Lycra': ['Poplin', '130129', 'Oxford', 'Dobby', 'Satin', 'Cemric', 'A140D499'],
        },
      },
      'Poly-cotton': {
        'Bottom': {
          'Non-Lycra': ['Twill', 'Poplin'],
        },
      },
    },
    'Print': {
      'Cotton': {
        'Shirting': {
          'Non-Lycra': ['Poplin', 'Satin', 'Cemric', 'Viscose'],
        },
        'Bottom': {
          'Lycra': ['Twill', 'Poplin'],
          'Non-Lycra': ['Twill', 'Poplin'],
        },
      },
    },
    'Yarndyed': {
      'Cotton': { 'Shirting': { 'Non-Lycra': ['Various'] } },
    },
    'Denim': {
      'Cotton': {
        'Shirting': { 'Non-Lycra': ['Denim Shirting'] },
        'Bottom': {
          'Lycra': ['Bottom Lycre', 'Ecru Lycre', 'Poly Lycre'],
          'Non-Lycra': ['Bottom Rigid', 'Ecru Rigid', 'Selvage'],
        },
      },
    },
  },
  'Grey': {
    'Piece Dyed': {
      'Cotton': {
        'Bottom': {
          'Lycra': ['Twill', 'Dobby', 'Satin'],
          'Non-Lycra': ['Twill', 'Drill', 'Matty'],
        },
      },
    },
  },
} as const

export interface Stock {
  id: string
  code: string
  fabricType: string
  stockType: StockType
  qualityGrade: QualityGrade
  quantity: number // in meters
  unit: 'meters' | 'pieces'
  purchasePrice: number
  sellingPrice?: number
  manufacturer: string
  rackLocation: string
  defectNotes?: string
  daysInStock: number
  dateAdded: string
  lastUpdated: string
  tags: string[]
  status: 'available' | 'reserved' | 'sold' | 'urgent'
  // TDM Classification (new) — auto-inferred from quality category
  category?: Category
  subCategory?: SubCategory
  fabricBase?: FabricBase
  usage?: Usage
  stretch?: Stretch
  baleNumber?: string  // Physical bale barcode number
  colorCode?: string   // RFD0000000 or actual color
}

// Buyer Types
export type BuyerType = 'specialist' | 'generalist'

export interface Buyer {
  id: string
  name: string
  company?: string
  phone: string
  email?: string
  whatsapp?: string
  type: BuyerType
  preferredFabrics: string[]
  qualityPreference: QualityGrade[]
  volumeRange: { min: number; max: number }
  paymentBehavior: 'excellent' | 'good' | 'fair' | 'poor'
  totalPurchases: number
  lastOrderDate?: string
  assignedSalesperson?: string
  tags: string[]
  status: 'active' | 'inactive' | 'dormant'
  createdAt: string
}

export interface BuyerMatch {
  buyer: Buyer
  score: number
  reasons: string[]
  pastVolume: number
  timesBought: number
  lastOrder?: string
}

// Rack Types
export interface Rack {
  id: string
  code: string
  zone: string
  capacity: number // in meters
  currentStock: number
  stockItems: string[] // stock IDs
  stockType?: StockType // preferred stock type for this rack
  color: string
}

export interface WarehouseZone {
  id: string
  name: string
  racks: Rack[]
}

// Activity Types
export type ActivityType = 
  | 'stock_added'
  | 'stock_sold'
  | 'stock_moved'
  | 'buyer_contacted'
  | 'sample_sent'
  | 'price_updated'
  | 'stock_tagged'

export interface Activity {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: string
  user: string
  relatedId?: string
  relatedType?: 'stock' | 'buyer' | 'rack'
}

// Chat Types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  data?: Record<string, unknown>
}

// Dashboard Types
export type ViewMode = 'table' | 'grid' | 'kanban'

export interface DashboardWidget {
  id: string
  type: 'stats' | 'chart' | 'table' | 'activity' | 'chat' | 'rack-map'
  title: string
  size: 'small' | 'medium' | 'large'
  position: { x: number; y: number }
}

export interface SavedFilter {
  id: string
  name: string
  filters: Record<string, unknown>
  createdAt: string
}

// User & Role Types
export type UserRole = 'owner' | 'sales' | 'warehouse'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
}
