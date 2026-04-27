'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { AIInsight } from '@/lib/store'
import { Lightbulb, AlertTriangle, TrendingUp } from 'lucide-react'

interface InsightCardProps {
  insight: AIInsight
  onAction?: () => void
  className?: string
}

const typeConfig = {
  suggestion: {
    icon: Lightbulb,
    color: 'text-[#4F8CFF]',
    bgColor: 'bg-[#4F8CFF]/10',
    borderColor: 'border-[#4F8CFF]/20',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-[#F59E0B]',
    bgColor: 'bg-[#F59E0B]/10',
    borderColor: 'border-[#F59E0B]/20',
  },
  opportunity: {
    icon: TrendingUp,
    color: 'text-[#22C55E]',
    bgColor: 'bg-[#22C55E]/10',
    borderColor: 'border-[#22C55E]/20',
  },
}

export function InsightCard({ insight, onAction, className }: InsightCardProps) {
  const config = typeConfig[insight.type]
  const Icon = config.icon

  return (
    <motion.div
      className={cn(
        'group relative rounded-xl border p-4 transition-colors',
        config.borderColor,
        config.bgColor,
        'hover:border-opacity-40',
        className
      )}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 rounded-lg p-2', config.bgColor)}>
          <Icon className={cn('h-4 w-4', config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground leading-tight">
            {insight.title}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {insight.description}
          </p>
          {insight.action && (
            <button
              onClick={onAction}
              className={cn(
                'mt-3 text-xs font-medium transition-colors',
                config.color,
                'hover:opacity-80'
              )}
            >
              {insight.action}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
