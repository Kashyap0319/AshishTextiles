'use client'

import { motion } from 'framer-motion'
import {
  Package,
  DollarSign,
  MapPin,
  Phone,
  Send,
  Tag,
  TrendingDown,
  AlertTriangle,
  Clock,
  Filter,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { staggerContainer, staggerItem } from '@/lib/animations'
import type { ActivityType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'

const activityIcons: Record<ActivityType, typeof Package> = {
  stock_added: Package,
  stock_sold: DollarSign,
  stock_moved: MapPin,
  buyer_contacted: Phone,
  sample_sent: Send,
  price_updated: TrendingDown,
  stock_tagged: Tag,
}

const activityColors: Record<ActivityType, string> = {
  stock_added: 'bg-emerald-500/20 text-emerald-400',
  stock_sold: 'bg-blue-500/20 text-blue-400',
  stock_moved: 'bg-amber-500/20 text-amber-400',
  buyer_contacted: 'bg-purple-500/20 text-purple-400',
  sample_sent: 'bg-cyan-500/20 text-cyan-400',
  price_updated: 'bg-orange-500/20 text-orange-400',
  stock_tagged: 'bg-pink-500/20 text-pink-400',
}

export function ActivityFeed() {
  const { activities } = useAppStore()
  const [filterType, setFilterType] = useState<string>('all')
  const [filterTime, setFilterTime] = useState<string>('all')

  const filteredActivities = activities.filter((activity) => {
    if (filterType !== 'all' && activity.type !== filterType) return false
    if (filterTime !== 'all') {
      const activityDate = new Date(activity.timestamp)
      const now = new Date()
      const hoursDiff = (now.getTime() - activityDate.getTime()) / (1000 * 60 * 60)
      
      if (filterTime === 'hour' && hoursDiff > 1) return false
      if (filterTime === 'today' && hoursDiff > 24) return false
      if (filterTime === 'week' && hoursDiff > 168) return false
    }
    return true
  })

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  // Stats
  const todayCount = activities.filter((a) => {
    const hours = (new Date().getTime() - new Date(a.timestamp).getTime()) / (1000 * 60 * 60)
    return hours < 24
  }).length

  const stockAddedCount = activities.filter((a) => a.type === 'stock_added').length
  const salesCount = activities.filter((a) => a.type === 'stock_sold').length

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      {/* Activity Feed */}
      <div className="lg:col-span-3">
        <div className="rounded-bento border border-border bg-card p-6 shadow-bento-soft">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Clock className="size-6 text-primary" />
              <h2 className="text-2xl font-display-tight text-foreground">Activity Feed</h2>
              <Badge variant="secondary" className="ml-2 rounded-full">
                {filteredActivities.length} activities
              </Badge>
            </div>
              <div className="flex items-center gap-2">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="mr-2 size-4" />
                    <SelectValue placeholder="Filter type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="stock_added">Stock Added</SelectItem>
                    <SelectItem value="stock_sold">Stock Sold</SelectItem>
                    <SelectItem value="stock_moved">Stock Moved</SelectItem>
                    <SelectItem value="buyer_contacted">Buyer Contacted</SelectItem>
                    <SelectItem value="sample_sent">Sample Sent</SelectItem>
                    <SelectItem value="price_updated">Price Updated</SelectItem>
                    <SelectItem value="stock_tagged">Stock Tagged</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterTime} onValueChange={setFilterTime}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Time range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="hour">Last Hour</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          <div className="mt-6">
            <ScrollArea className="h-[600px] pr-4">
              <motion.div className="space-y-3" variants={staggerContainer} initial="hidden" animate="visible">
                {filteredActivities.map((activity) => {
                  const Icon = activityIcons[activity.type]
                  const colorClass = activityColors[activity.type]

                  return (
                    <motion.div
                      key={activity.id}
                      variants={staggerItem}
                      className="flex items-start gap-4 rounded-2xl border border-border bg-background/50 p-4 transition-colors hover:bg-muted"
                    >
                      <div className={`rounded-xl p-2.5 ${colorClass}`}>
                        <Icon className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-medium">{activity.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {activity.description}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatTime(activity.timestamp)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {activity.user}
                          </Badge>
                          {activity.relatedType && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {activity.relatedType}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Stats & Quick Actions */}
      <div className="space-y-4">
        <div className="rounded-bento border border-border bg-muted p-6 shadow-bento-soft">
          <h3 className="mb-5 text-xl font-display-tight text-foreground">Activity Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Today</span>
              <span className="font-mono font-bold text-lg">{todayCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Stock Added</span>
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">
                {stockAddedCount}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sales Made</span>
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                {salesCount}
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-bento border border-border bg-card p-6 shadow-bento-soft">
          <div className="mb-5 flex items-center gap-2">
            <AlertTriangle className="size-5 text-warning" />
            <h3 className="text-xl font-display-tight text-foreground">Attention Needed</h3>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="text-sm font-medium">2 items flagged urgent</p>
              <p className="text-xs text-muted-foreground">Dead stock over 60 days</p>
            </div>
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
              <p className="text-sm font-medium">3 pending follow-ups</p>
              <p className="text-xs text-muted-foreground">Samples awaiting response</p>
            </div>
            <div className="rounded-lg border border-slate-500/30 bg-slate-500/10 p-3">
              <p className="text-sm font-medium">1 dormant buyer</p>
              <p className="text-xs text-muted-foreground">No orders in 30+ days</p>
            </div>
          </div>
        </div>

        <div className="rounded-bento border border-border bg-muted p-6 shadow-bento-soft">
          <h3 className="mb-5 text-xl font-display-tight text-foreground">Quick Actions</h3>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start rounded-full h-11 bg-card">
              <Package className="mr-2 size-4" />
              Add New Stock
            </Button>
            <Button variant="outline" className="w-full justify-start rounded-full h-11 bg-card">
              <Phone className="mr-2 size-4" />
              Contact Buyer
            </Button>
            <Button variant="outline" className="w-full justify-start rounded-full h-11 bg-card">
              <Send className="mr-2 size-4" />
              Send Sample
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
