'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import { mockBuyers } from '@/lib/mock-data'

// Premium Touch #1: Subtle focus ring that follows the highlighted buyer
export function FocusIndicator() {
  const { highlightedBuyerId } = useStore()
  const buyer = highlightedBuyerId ? mockBuyers.find(b => b.id === highlightedBuyerId) : null

  return (
    <AnimatePresence>
      {buyer && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-card/95 backdrop-blur-xl border border-border shadow-2xl">
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ 
                  backgroundColor: buyer.matchScore >= 90 ? '#22C55E' : 
                                   buyer.matchScore >= 75 ? '#4F8CFF' : '#F59E0B' 
                }}
              />
              <span className="text-sm font-medium text-foreground">{buyer.name}</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <span className="text-xs text-muted-foreground">{buyer.company}</span>
            <div className="w-px h-4 bg-border" />
            <span className="text-xs font-medium text-primary">{buyer.matchScore}% match</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Premium Touch #2: Ambient glow effect based on system state
export function AmbientGlow() {
  const { selectedStock, highlightedBuyerId } = useStore()
  const buyer = highlightedBuyerId ? mockBuyers.find(b => b.id === highlightedBuyerId) : null
  
  // Determine glow color based on state
  const getGlowColor = () => {
    if (buyer && buyer.matchScore >= 90) return 'rgba(34, 197, 94, 0.03)'
    if (buyer && buyer.matchScore >= 75) return 'rgba(79, 140, 255, 0.03)'
    if (selectedStock) return 'rgba(79, 140, 255, 0.02)'
    return 'transparent'
  }

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-0"
      animate={{
        background: `radial-gradient(ellipse at center, ${getGlowColor()} 0%, transparent 70%)`,
      }}
      transition={{ duration: 1, ease: 'easeInOut' }}
    />
  )
}
