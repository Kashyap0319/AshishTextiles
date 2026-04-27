'use client'

import { motion } from 'framer-motion'
import { TrendingUp, Clock, Zap } from 'lucide-react'
import { Panel } from '@/components/ui/panel'
import { InsightCard } from '@/components/ui/insight-card'
import { mockInsights, mockBuyers } from '@/lib/mock-data'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export function InsightsPanel() {
  const { highlightedBuyerId, setHighlightedBuyer, trackAction } = useStore()
  
  const highlightedBuyer = highlightedBuyerId 
    ? mockBuyers.find(b => b.id === highlightedBuyerId)
    : null

  const handleInsightAction = (insight: typeof mockInsights[0]) => {
    trackAction('insight_action', insight.id)
    if (insight.relatedBuyerId) {
      setHighlightedBuyer(insight.relatedBuyerId)
    }
  }

  return (
    <Panel variant="glass" padding="none" className="w-72 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Insights</h3>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-medium text-primary">
            {mockInsights.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">AI-powered recommendations</p>
      </div>

      {/* Highlighted Buyer Details */}
      {highlightedBuyer && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-4 border-b border-border bg-primary/5"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-medium text-foreground">Selected Buyer</h4>
            <button 
              onClick={() => setHighlightedBuyer(null)}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
          
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-foreground">{highlightedBuyer.name}</p>
              <p className="text-xs text-muted-foreground">{highlightedBuyer.company}</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-primary" />
                <span className="text-xs text-foreground">{highlightedBuyer.matchScore}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{highlightedBuyer.lastActive}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1 mt-2">
              {highlightedBuyer.preferences.slice(0, 3).map((pref) => (
                <span 
                  key={pref}
                  className="px-2 py-0.5 text-[10px] rounded-full bg-muted text-muted-foreground"
                >
                  {pref}
                </span>
              ))}
            </div>
            
            <button className="w-full mt-3 px-3 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              Create Proposal
            </button>
          </div>
        </motion.div>
      )}

      {/* Insights List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {mockInsights.map((insight, index) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <InsightCard
              insight={insight}
              onAction={() => handleInsightAction(insight)}
            />
          </motion.div>
        ))}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-border">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Zap className="h-3 w-3" />
              <span className="text-[10px]">Active Matches</span>
            </div>
            <p className="text-lg font-medium text-foreground">
              {mockBuyers.filter(b => b.status === 'active').length}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-muted">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" />
              <span className="text-[10px]">Avg Score</span>
            </div>
            <p className="text-lg font-medium text-foreground">
              {Math.round(mockBuyers.reduce((acc, b) => acc + b.matchScore, 0) / mockBuyers.length)}%
            </p>
          </div>
        </div>
      </div>
    </Panel>
  )
}
