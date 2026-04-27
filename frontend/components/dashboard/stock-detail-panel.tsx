'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Edit, Trash2, Tag, MapPin, Users, Phone, Send } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { slidePanel } from '@/lib/animations'
import { stockTypeLabels, stockTypeColors, getMatchingBuyers } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'

export function StockDetailPanel() {
  const { stocks, selectedStockId, setSelectedStock, detailPanelOpen, setDetailPanelOpen } = useAppStore()

  const stock = stocks.find((s) => s.id === selectedStockId)

  const matches = stock ? getMatchingBuyers(stock) : []
  const topMatches = matches.slice(0, 5)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'urgent':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'reserved':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'sold':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    }
  }

  return (
    <AnimatePresence>
    {detailPanelOpen && stock && (
    <motion.div
      variants={slidePanel}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex w-[400px] flex-col border-l border-border bg-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h2 className="font-mono text-lg font-semibold">{stock.code}</h2>
          <p className="text-sm text-muted-foreground">{stock.fabricType}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setSelectedStock(null)
            setDetailPanelOpen(false)
          }}
        >
          <X className="size-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Status & Type */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={getStatusColor(stock.status)}>
              {stock.status}
            </Badge>
            <Badge variant="outline" className={stockTypeColors[stock.stockType]}>
              {stockTypeLabels[stock.stockType]}
            </Badge>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border p-3">
              <span className="text-xs text-muted-foreground">Quantity</span>
              <p className="font-mono text-xl font-bold">{stock.quantity.toLocaleString()}m</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <span className="text-xs text-muted-foreground">Purchase Price</span>
              <p className="font-mono text-xl font-bold">Rs {stock.purchasePrice}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <span className="text-xs text-muted-foreground">Selling Price</span>
              <p className="font-mono text-xl font-bold">Rs {stock.sellingPrice || '-'}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <span className="text-xs text-muted-foreground">Days in Stock</span>
              <p
                className={`font-mono text-xl font-bold ${
                  stock.daysInStock > 60
                    ? 'text-red-400'
                    : stock.daysInStock > 30
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {stock.daysInStock}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Manufacturer</span>
                <span className="font-medium">{stock.manufacturer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location</span>
                <Badge variant="secondary" className="font-mono">
                  {stock.rackLocation}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date Added</span>
                <span className="font-medium">{stock.dateAdded}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="font-medium">{stock.lastUpdated}</span>
              </div>
            </div>
          </div>

          {/* Defect Notes */}
          {stock.defectNotes && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Defect Notes</h3>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                {stock.defectNotes}
              </div>
            </div>
          )}

          {/* Tags */}
          {stock.tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Tags</h3>
              <div className="flex flex-wrap gap-1">
                {stock.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* AI Matching */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <Users className="size-4 text-primary" />
                AI Buyer Matches
              </h3>
              <span className="text-xs text-muted-foreground">{matches.length} matches</span>
            </div>
            <div className="space-y-3">
              {topMatches.map((match) => (
                <div
                  key={match.buyer.id}
                  className="rounded-lg border border-border p-3 transition-colors hover:border-primary/50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{match.buyer.name}</h4>
                      <p className="text-xs text-muted-foreground capitalize">
                        {match.buyer.type} buyer
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-mono text-lg font-bold ${
                          match.score >= 80
                            ? 'text-emerald-400'
                            : match.score >= 60
                            ? 'text-amber-400'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {match.score}%
                      </div>
                      <Progress
                        value={match.score}
                        className="mt-1 h-1 w-16"
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {match.reasons.slice(0, 2).map((reason, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Phone className="mr-1 size-3" />
                      Call
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Send className="mr-1 size-3" />
                      WhatsApp
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="flex gap-2 border-t border-border p-4">
        <Button variant="outline" size="sm" className="flex-1">
          <Edit className="mr-1 size-3" />
          Edit
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          <Tag className="mr-1 size-3" />
          Tag
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          <MapPin className="mr-1 size-3" />
          Move
        </Button>
        <Button variant="outline" size="icon" className="text-destructive">
          <Trash2 className="size-4" />
        </Button>
      </div>
    </motion.div>
    )}
    </AnimatePresence>
  )
}
