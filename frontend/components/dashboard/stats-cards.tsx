'use client'

import { motion } from 'framer-motion'
import { Package, IndianRupee, Users, BarChart3, Layers, TrendingUp } from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { Card, CardContent } from '@/components/ui/card'
import realData from '@/lib/real-data.json'

// Fixed locale formatter to avoid SSR/client mismatch
const fmt = (n: number) => n.toLocaleString('en-IN')

export function StatsCards() {
  const s = realData.stats

  const cards = [
    {
      title: 'Total Stock',
      value: `${(s.totalMeters / 1000).toFixed(0)}K`,
      subtitle: `${fmt(s.totalStockItems)} items in inventory`,
      icon: Package,
    },
    {
      title: 'Total Pieces',
      value: fmt(s.totalPieces),
      subtitle: `${fmt(s.totalMeters)} meters`,
      icon: Layers,
    },
    {
      title: 'Meters Sold',
      value: `${(s.totalMetersSold / 1000).toFixed(0)}K`,
      subtitle: `${fmt(s.totalSalesTransactions)} transactions`,
      icon: TrendingUp,
    },
    {
      title: 'Active Buyers',
      value: fmt(s.totalBuyers),
      subtitle: 'unique buyers on record',
      icon: Users,
    },
    {
      title: 'Quality Types',
      value: s.qualityCategories.toString(),
      subtitle: `${fmt(s.uniqueArticles)} unique articles`,
      icon: BarChart3,
    },
    {
      title: 'Sell-Through',
      value: `${Math.round((s.totalMetersSold / s.totalMeters) * 100)}%`,
      subtitle: 'of stock meters sold',
      icon: IndianRupee,
    },
  ]

  return (
    <motion.div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6" variants={staggerContainer} initial="hidden" animate="visible">
      {cards.map((card) => (
        <motion.div key={card.title} variants={staggerItem} whileHover={{ scale: 1.02, y: -2 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">{card.title}</span>
                  <span className="text-2xl font-bold tracking-tight" suppressHydrationWarning>{card.value}</span>
                  <span className="text-xs text-muted-foreground" suppressHydrationWarning>{card.subtitle}</span>
                </div>
                <div className="rounded-lg p-2 bg-primary/10 text-primary">
                  <card.icon className="size-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}
