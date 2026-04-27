'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, fadeInUp } from '@/lib/animations'
import {
  Search,
  Phone,
  Mail,
  MessageCircle,
  Tag,
  TrendingUp,
  Clock,
  Star,
  Filter,
  Users,
  AlertCircle,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import type { Buyer } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function BuyerIntelligence() {
  const { buyers: storeBuyers } = useAppStore()
  const allBuyers = storeBuyers
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const filteredBuyers = allBuyers.filter((buyer) => {
    if (searchQuery && !buyer.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (filterType !== 'all' && buyer.type !== filterType) return false
    if (filterStatus !== 'all' && buyer.status !== filterStatus) return false
    return true
  })

  const activeCount = allBuyers.filter((b) => b.status === 'active').length
  const dormantCount = allBuyers.filter((b) => b.status === 'dormant').length
  const specialistCount = allBuyers.filter((b) => b.type === 'specialist').length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'dormant':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const getPaymentColor = (behavior: string) => {
    switch (behavior) {
      case 'excellent':
        return 'text-emerald-400'
      case 'good':
        return 'text-blue-400'
      case 'fair':
        return 'text-amber-400'
      default:
        return 'text-red-400'
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Buyer List */}
      <div className="lg:col-span-1 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-400">{dormantCount}</p>
              <p className="text-xs text-muted-foreground">Dormant</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{specialistCount}</p>
              <p className="text-xs text-muted-foreground">Specialists</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search buyers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="specialist">Specialist</SelectItem>
                <SelectItem value="generalist">Generalist</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="dormant">Dormant</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Buyer List */}
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="divide-y divide-border"
              >
                {filteredBuyers.map((buyer) => (
                  <motion.div key={buyer.id} variants={staggerItem} whileHover={{ scale: 1.01 }}>
                  <button
                    key={buyer.id}
                    onClick={() => setSelectedBuyer(buyer)}
                    className={`w-full p-4 text-left transition-colors hover:bg-secondary/50 ${
                      selectedBuyer?.id === buyer.id ? 'bg-secondary' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="size-10">
                        <AvatarFallback className="bg-primary/20 text-primary text-sm">
                          {buyer.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium truncate">{buyer.name}</h3>
                          <Badge variant="outline" className={getStatusColor(buyer.status)}>
                            {buyer.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">{buyer.type}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Rs {(buyer.totalPurchases / 100000).toFixed(1)}L</span>
                          <span>|</span>
                          <span className={getPaymentColor(buyer.paymentBehavior)}>
                            {buyer.paymentBehavior}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                  </motion.div>
                ))}
              </motion.div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Buyer Details */}
      <div className="lg:col-span-2">
        {selectedBuyer ? (
          <div className="space-y-4">
            {/* Header Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="size-16">
                      <AvatarFallback className="bg-primary/20 text-primary text-xl">
                        {selectedBuyer.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-xl font-semibold">{selectedBuyer.name}</h2>
                      {selectedBuyer.company && (
                        <p className="text-muted-foreground">{selectedBuyer.company}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline" className="capitalize">
                          {selectedBuyer.type}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(selectedBuyer.status)}>
                          {selectedBuyer.status}
                        </Badge>
                        {selectedBuyer.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => window.open(`tel:${selectedBuyer.phone}`)}>
                      <Phone className="size-4" />
                    </Button>
                    {selectedBuyer.email && (
                      <Button variant="outline" size="icon" onClick={() => window.open(`mailto:${selectedBuyer.email}`)}>
                        <Mail className="size-4" />
                      </Button>
                    )}
                    {(selectedBuyer.whatsapp || selectedBuyer.phone) && (
                      <Button variant="outline" size="icon" onClick={() => {
                        const phone = (selectedBuyer.whatsapp || selectedBuyer.phone).replace(/[^0-9]/g, '')
                        const text = encodeURIComponent(`Hi ${selectedBuyer.name}, we have new stock available that matches your preferences. Would you like to see samples?`)
                        window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
                      }}>
                        <MessageCircle className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedBuyer.phone}</p>
                  </div>
                  {selectedBuyer.email && (
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium truncate">{selectedBuyer.email}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Last Order</p>
                    <p className="font-medium">{selectedBuyer.lastOrderDate || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned To</p>
                    <p className="font-medium">{selectedBuyer.assignedSalesperson || 'Unassigned'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Total Purchases</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold">
                    Rs {(selectedBuyer.totalPurchases / 100000).toFixed(1)}L
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Star className="size-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Payment</span>
                  </div>
                  <p className={`mt-1 text-2xl font-bold capitalize ${getPaymentColor(selectedBuyer.paymentBehavior)}`}>
                    {selectedBuyer.paymentBehavior}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Tag className="size-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Volume Range</span>
                  </div>
                  <p className="mt-1 text-lg font-bold">
                    {(selectedBuyer.volumeRange.min / 1000).toFixed(0)}K - {(selectedBuyer.volumeRange.max / 1000).toFixed(0)}K
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Customer Since</span>
                  </div>
                  <p className="mt-1 text-lg font-bold">{selectedBuyer.createdAt}</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Card>
              <Tabs defaultValue="history" className="w-full">
                <CardHeader className="pb-0">
                  <TabsList>
                    <TabsTrigger value="history">Purchase History</TabsTrigger>
                    <TabsTrigger value="preferences">Preferences</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="pt-4">
                  <TabsContent value="history" className="mt-0">
                    <div className="space-y-3">
                      {(selectedBuyer?.preferredFabrics || []).map((fabric, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-lg border border-border p-3"
                        >
                          <div>
                            <p className="font-medium">{fabric}</p>
                            <p className="text-xs text-muted-foreground">Purchased item</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-medium text-muted-foreground">
                              Purchased article
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="preferences" className="mt-0 space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Quality Preference</h3>
                      <div className="flex gap-2">
                        {selectedBuyer.qualityPreference.map((grade) => (
                          <Badge key={grade} variant="outline">
                            Grade {grade}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {selectedBuyer.preferredFabrics.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Preferred Fabrics</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedBuyer.preferredFabrics.map((fabric) => (
                            <Badge key={fabric} variant="secondary">
                              {fabric}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-medium mb-2">Buyer Type Analysis</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedBuyer.type === 'specialist'
                          ? 'This buyer focuses on specific fabric types and should be prioritized for matching products.'
                          : 'This buyer considers all fabric types and is good for clearing diverse inventory.'}
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="timeline" className="mt-0">
                    <div className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border">
                      <div className="relative">
                        <div className="absolute -left-6 top-1 size-4 rounded-full border-2 border-primary bg-background" />
                        <div>
                          <p className="text-sm font-medium">
                            Total purchased: {selectedBuyer?.totalPurchases?.toLocaleString()}m
                          </p>
                          <p className="text-xs text-muted-foreground">Last order: {selectedBuyer?.lastOrderDate || 'N/A'}</p>
                        </div>
                      </div>
                      {(selectedBuyer?.preferredFabrics || []).map((fabric, i) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-6 top-1 size-4 rounded-full border-2 border-border bg-background" />
                          <div>
                            <p className="text-sm font-medium">{fabric}</p>
                            <p className="text-xs text-muted-foreground">Purchased article</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>
        ) : (
          <Card className="flex h-full min-h-[400px] items-center justify-center">
            <CardContent className="text-center">
              <Users className="mx-auto mb-3 size-12 text-muted-foreground/50" />
              <h3 className="font-medium">Select a Buyer</h3>
              <p className="text-sm text-muted-foreground">
                Click on any buyer to view their profile and history
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
