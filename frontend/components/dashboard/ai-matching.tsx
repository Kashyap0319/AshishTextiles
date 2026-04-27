'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, staggerItem, scaleIn } from '@/lib/animations'
import {
  Brain,
  Package,
  Users,
  Phone,
  Send,
  Sparkles,
  ChevronRight,
  Info,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { getMatchingBuyers, stockTypeLabels, stockTypeColors } from '@/lib/data'
import type { Stock, BuyerMatch } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function AIMatching() {
  const { stocks, setActiveModule } = useAppStore()
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null)
  const [matches, setMatches] = useState<BuyerMatch[]>([])
  const [isMatching, setIsMatching] = useState(false)

  const handleSelectStock = (stockId: string) => {
    const stock = stocks.find((s) => s.id === stockId)
    if (stock) {
      setSelectedStock(stock)
      setIsMatching(true)
      // Simulate AI processing
      setTimeout(() => {
        setMatches(getMatchingBuyers(stock))
        setIsMatching(false)
      }, 800)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400'
    if (score >= 60) return 'text-amber-400'
    return 'text-muted-foreground'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/20'
    if (score >= 60) return 'bg-amber-500/20'
    return 'bg-secondary'
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Stock Selection */}
      <div className="space-y-4">
        <div className="rounded-bento border border-border bg-card p-6 shadow-bento-soft">
          <div className="mb-6">
            <h2 className="flex items-center gap-2 font-display-tight text-3xl">
              <Package className="size-6 text-primary" />
              Select Stock
            </h2>
            <p className="text-muted-foreground mt-2">Choose a stock item to find matching buyers</p>
          </div>
          <div>
            <Select onValueChange={handleSelectStock}>
              <SelectTrigger>
                <SelectValue placeholder="Select stock item" />
              </SelectTrigger>
              <SelectContent>
                {stocks.map((stock) => (
                  <SelectItem key={stock.id} value={stock.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{stock.code}</span>
                      <span className="text-muted-foreground">-</span>
                      <span>{stock.fabricType}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected Stock Details */}
        {selectedStock && (
          <div className="rounded-bento border border-border bg-card p-6 shadow-bento-soft">
            <div className="mb-5">
              <h3 className="font-display-tight text-2xl">Stock Details</h3>
            </div>
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-mono text-lg font-semibold">{selectedStock.code}</h3>
                  <p className="text-sm text-muted-foreground">{selectedStock.fabricType}</p>
                </div>
                <Badge
                  variant="outline"
                  className={stockTypeColors[selectedStock.stockType]}
                >
                  {stockTypeLabels[selectedStock.stockType]}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Quantity</p>
                  <p className="font-mono text-lg font-bold">
                    {selectedStock.quantity.toLocaleString()}m
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Quality</p>
                  <p className="text-lg font-bold">Grade {selectedStock.qualityGrade}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="font-mono text-lg font-bold">Rs {selectedStock.purchasePrice}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Age</p>
                  <p
                    className={`text-lg font-bold ${
                      selectedStock.daysInStock > 60
                        ? 'text-red-400'
                        : selectedStock.daysInStock > 30
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {selectedStock.daysInStock}d
                  </p>
                </div>
              </div>

              {selectedStock.defectNotes && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-xs font-medium text-amber-400">Defect Notes</p>
                  <p className="text-sm">{selectedStock.defectNotes}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-2">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {selectedStock.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Matching Results */}
      <div className="lg:col-span-2">
        <div className="rounded-bento border border-border bg-card p-6 shadow-bento-soft h-full">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 font-display-tight text-3xl">
                <Brain className="size-6 text-primary" />
                AI Buyer Matches
              </h2>
              <p className="text-muted-foreground mt-2">Intelligent buyer matching based on purchase history, preferences, and behavior</p>
            </div>
            {matches.length > 0 && (
              <Badge variant="secondary" className="rounded-full shrink-0">
                {matches.length} matches found
              </Badge>
            )}
          </div>
          <div>
            {!selectedStock ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 rounded-full bg-primary/10 p-4">
                  <Sparkles className="size-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium">Select Stock to Match</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Choose a stock item from the dropdown to see AI-powered buyer recommendations
                </p>
              </div>
            ) : isMatching ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 animate-pulse rounded-full bg-primary/10 p-4">
                  <Brain className="size-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium">Analyzing Buyer Data...</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Finding the best matches for {selectedStock.code}
                </p>
                <Progress value={66} className="mt-4 w-48" />
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <AnimatePresence>
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
                  {matches.map((match, index) => (
                    <motion.div key={match.buyer.id} variants={staggerItem}>
                    <TooltipProvider>
                      <div
                        className={`rounded-lg border transition-all hover:border-primary/50 ${
                          index === 0 ? 'border-primary/50 bg-primary/5' : 'border-border'
                        }`}
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Rank */}
                            <div
                              className={`flex size-10 shrink-0 items-center justify-center rounded-full ${getScoreBg(match.score)}`}
                            >
                              <span className={`font-mono font-bold ${getScoreColor(match.score)}`}>
                                #{index + 1}
                              </span>
                            </div>

                            {/* Buyer Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium truncate">{match.buyer.name}</h3>
                                {index === 0 && (
                                  <Badge className="bg-primary/20 text-primary border-primary/30">
                                    Best Match
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground capitalize">
                                {match.buyer.type} buyer
                              </p>
                              
                              {/* Stats */}
                              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="size-3 text-muted-foreground" />
                                  <span>{match.pastVolume.toLocaleString()}m past volume</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="size-3 text-muted-foreground" />
                                  <span>{match.timesBought}x bought similar</span>
                                </div>
                                {match.lastOrder && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="size-3 text-muted-foreground" />
                                    <span>Last: {match.lastOrder}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Score */}
                            <div className="text-center">
                              <div className={`font-mono text-2xl font-bold ${getScoreColor(match.score)}`}>
                                {match.score}%
                              </div>
                              <Progress
                                value={match.score}
                                className="mt-1 h-1.5 w-16"
                              />
                            </div>
                          </div>

                          {/* Match Reasons */}
                          <div className="mt-3 flex flex-wrap gap-1">
                            {match.reasons.map((reason, i) => (
                              <Tooltip key={i}>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-xs cursor-help">
                                    <CheckCircle2 className="mr-1 size-3 text-emerald-400" />
                                    {reason}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>AI Matching Factor</p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>

                          {/* Actions */}
                          <div className="mt-4 flex items-center gap-2">
                            <Button size="sm" className="flex-1" onClick={() => {
                              const phone = (match.buyer.phone || '').replace(/[^0-9]/g, '')
                              if (phone) window.open(`tel:${phone}`)
                            }}>
                              <Phone className="mr-1 size-3" />
                              Call Now
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                              const phone = (match.buyer.whatsapp || match.buyer.phone || '').replace(/[^0-9]/g, '')
                              const stockCode = selectedStock?.code || ''
                              const text = encodeURIComponent(`Hi ${match.buyer.name}, we have ${stockCode} (${selectedStock?.fabricType || ''}, ${selectedStock?.quantity || 0}m) available. Match score: ${match.score}%. Interested?`)
                              if (phone) window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
                            }}>
                              <Send className="mr-1 size-3" />
                              WhatsApp
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => {
                              setActiveModule('buyers')
                            }}>
                              View Profile
                              <ChevronRight className="ml-1 size-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TooltipProvider>
                    </motion.div>
                  ))}
                </motion.div>
                </AnimatePresence>
              </ScrollArea>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
