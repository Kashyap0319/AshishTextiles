'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, ChevronDown, AlertCircle, Clock, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore, type StockItem } from '@/lib/store'
import { mockStockItems } from '@/lib/mock-data'

const urgencyColors = {
  low: 'text-[#22C55E] bg-[#22C55E]/10',
  medium: 'text-[#4F8CFF] bg-[#4F8CFF]/10',
  high: 'text-[#F59E0B] bg-[#F59E0B]/10',
  critical: 'text-[#EF4444] bg-[#EF4444]/10',
}

export function StockSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const { selectedStock, setSelectedStock, trackAction } = useStore()

  const handleSelect = (stock: StockItem) => {
    setSelectedStock(stock)
    setIsOpen(false)
    trackAction('select_stock', stock.id)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-3 rounded-xl border bg-card/80 backdrop-blur-xl px-4 py-3 w-full transition-all',
          isOpen ? 'border-primary/30' : 'border-border hover:border-border/80'
        )}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Package className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 text-left">
          {selectedStock ? (
            <>
              <p className="text-sm font-medium text-foreground truncate">
                {selectedStock.name}
              </p>
              <p className="text-xs text-muted-foreground">
                ${selectedStock.value.toLocaleString()} · {selectedStock.category}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">Select Stock</p>
              <p className="text-xs text-muted-foreground">Choose an item to find buyers</p>
            </>
          )}
        </div>
        <ChevronDown className={cn(
          'h-4 w-4 text-muted-foreground transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50"
          >
            <div className="p-2 max-h-80 overflow-y-auto">
              {mockStockItems.map((stock) => (
                <button
                  key={stock.id}
                  onClick={() => handleSelect(stock)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors',
                    selectedStock?.id === stock.id
                      ? 'bg-primary/10'
                      : 'hover:bg-muted'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {stock.name}
                      </p>
                      <span className={cn(
                        'px-1.5 py-0.5 text-[10px] font-medium rounded',
                        urgencyColors[stock.urgency]
                      )}>
                        {stock.urgency}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        {stock.value.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {stock.age} days
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Package className="h-3 w-3" />
                        {stock.quantity}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
