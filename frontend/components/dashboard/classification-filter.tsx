'use client'

import { X, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { ClassificationPath } from '@/lib/types'
import { getOptionsAt } from '@/lib/classification'

interface Props {
  value: ClassificationPath
  onChange: (next: ClassificationPath) => void
}

export function ClassificationFilter({ value, onChange }: Props) {
  const clearFrom = (level: keyof ClassificationPath) => {
    const keys: (keyof ClassificationPath)[] = ['category', 'subCategory', 'fabricBase', 'usage', 'stretch', 'quality']
    const idx = keys.indexOf(level)
    const next = { ...value }
    for (let i = idx; i < keys.length; i++) delete next[keys[i]]
    onChange(next)
  }

  const update = (level: keyof ClassificationPath, v: string) => {
    if (v === '__all__') {
      clearFrom(level)
      return
    }
    const keys: (keyof ClassificationPath)[] = ['category', 'subCategory', 'fabricBase', 'usage', 'stretch', 'quality']
    const idx = keys.indexOf(level)
    const next = { ...value, [level]: v } as any
    // Clear children when parent changes
    for (let i = idx + 1; i < keys.length; i++) delete next[keys[i]]
    onChange(next)
  }

  const levels: Array<{ key: keyof ClassificationPath; label: string; placeholder: string }> = [
    { key: 'category', label: 'Type', placeholder: 'Dyed / Grey' },
    { key: 'subCategory', label: 'Category', placeholder: 'Piece Dyed / Print / ...' },
    { key: 'fabricBase', label: 'Base', placeholder: 'Cotton / Poly-cotton' },
    { key: 'usage', label: 'Use', placeholder: 'Bottom / Shirting' },
    { key: 'stretch', label: 'Stretch', placeholder: 'Lycra / Non-Lycra' },
    { key: 'quality', label: 'Quality', placeholder: 'Twill / Poplin / ...' },
  ]

  const hasAny = Object.keys(value).length > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {levels.map((lvl, i) => {
          const opts = getOptionsAt(lvl.key as any, value)
          const disabled = i > 0 && !value[levels[i - 1].key]
          const selected = value[lvl.key] as string | undefined

          return (
            <div key={lvl.key} className="flex items-center gap-1">
              <Select
                value={selected || '__all__'}
                onValueChange={(v) => update(lvl.key, v)}
                disabled={disabled || opts.length === 0}
              >
                <SelectTrigger className={`h-8 text-xs ${selected ? 'border-primary/40 bg-primary/5' : ''}`} style={{ minWidth: 110 }}>
                  <SelectValue placeholder={lvl.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All {lvl.label.toLowerCase()}</SelectItem>
                  {opts.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {i < levels.length - 1 && <ChevronRight className="size-3 text-muted-foreground/50" />}
            </div>
          )
        })}

        {hasAny && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({})}
            className="h-8 text-xs text-muted-foreground"
          >
            <X className="size-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Active path breadcrumb */}
      {hasAny && (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Filter:</span>
          {levels.map((lvl) => {
            const v = value[lvl.key]
            if (!v) return null
            return (
              <Badge key={lvl.key} variant="secondary" className="text-xs font-normal">
                {v as string}
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
