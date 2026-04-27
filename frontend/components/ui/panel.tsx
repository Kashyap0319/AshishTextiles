'use client'

import { cn } from '@/lib/utils'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { forwardRef } from 'react'

interface PanelProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode
  variant?: 'default' | 'elevated' | 'glass'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ className, children, variant = 'default', padding = 'md', ...props }, ref) => {
    const variants = {
      default: 'bg-card',
      elevated: 'bg-[#171A21]',
      glass: 'bg-card/80 backdrop-blur-xl',
    }

    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    }

    return (
      <motion.div
        ref={ref}
        className={cn(
          'rounded-xl border border-border',
          variants[variant],
          paddings[padding],
          className
        )}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

Panel.displayName = 'Panel'

export { Panel }
