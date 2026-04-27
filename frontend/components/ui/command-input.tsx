'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Sparkles, Package, User, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { mockStockItems, mockBuyers } from '@/lib/mock-data'

interface Suggestion {
  id: string
  type: 'stock' | 'buyer' | 'action'
  label: string
  description?: string
}

export function CommandInput() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  
  const { setSelectedStock, setHighlightedBuyer, setCommandOpen } = useStore()

  const generateSuggestions = useCallback((q: string) => {
    if (!q.trim()) {
      return [
        { id: 'action-1', type: 'action' as const, label: 'Find best buyers', description: 'AI-powered matching' },
        { id: 'action-2', type: 'action' as const, label: 'Review urgent stock', description: '3 items need attention' },
        { id: 'action-3', type: 'action' as const, label: 'View insights', description: '4 new recommendations' },
      ]
    }

    const stockMatches = mockStockItems
      .filter(s => s.name.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 3)
      .map(s => ({
        id: s.id,
        type: 'stock' as const,
        label: s.name,
        description: `$${s.value.toLocaleString()} · ${s.urgency} urgency`,
      }))

    const buyerMatches = mockBuyers
      .filter(b => 
        b.name.toLowerCase().includes(q.toLowerCase()) ||
        b.company.toLowerCase().includes(q.toLowerCase())
      )
      .slice(0, 3)
      .map(b => ({
        id: b.id,
        type: 'buyer' as const,
        label: b.name,
        description: `${b.company} · ${b.matchScore}% match`,
      }))

    return [...stockMatches, ...buyerMatches]
  }, [])

  useEffect(() => {
    setSuggestions(generateSuggestions(query))
    setSelectedIndex(0)
  }, [query, generateSuggestions])

  const handleSelect = (suggestion: Suggestion) => {
    if (suggestion.type === 'stock') {
      const stock = mockStockItems.find(s => s.id === suggestion.id)
      if (stock) setSelectedStock(stock)
    } else if (suggestion.type === 'buyer') {
      setHighlightedBuyer(suggestion.id)
    }
    setQuery('')
    setFocused(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && suggestions[selectedIndex]) {
      e.preventDefault()
      handleSelect(suggestions[selectedIndex])
    } else if (e.key === 'Escape') {
      setFocused(false)
      setQuery('')
    }
  }

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen(true)
        setFocused(true)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [setCommandOpen])

  const iconMap = {
    stock: Package,
    buyer: User,
    action: Sparkles,
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <motion.div
        className={cn(
          'relative flex items-center gap-3 rounded-xl border bg-card/80 backdrop-blur-xl px-4 py-3 transition-all',
          focused ? 'border-primary/30 shadow-lg shadow-primary/5' : 'border-border'
        )}
        animate={{ scale: focused ? 1.01 : 1 }}
        transition={{ duration: 0.15 }}
      >
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="Search stock, buyers, or ask AI..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </motion.div>

      <AnimatePresence>
        {focused && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50"
          >
            <div className="p-2">
              {suggestions.map((suggestion, index) => {
                const Icon = iconMap[suggestion.type]
                return (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSelect(suggestion)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      index === selectedIndex
                        ? 'bg-primary/10 text-foreground'
                        : 'text-secondary-foreground hover:bg-muted'
                    )}
                  >
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg',
                      index === selectedIndex ? 'bg-primary/20' : 'bg-muted'
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{suggestion.label}</p>
                      {suggestion.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {suggestion.description}
                        </p>
                      )}
                    </div>
                    {index === selectedIndex && (
                      <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
