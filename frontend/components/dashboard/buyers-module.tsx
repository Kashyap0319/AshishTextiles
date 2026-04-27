'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BuyerIntelligence } from './buyer-intelligence'
import { DuplicateBuyers } from './duplicate-buyers'
import { BuyerPortal } from './buyer-portal'

export function BuyersModule() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="portal">
        <TabsList>
          <TabsTrigger value="portal">Buyer Portal</TabsTrigger>
          <TabsTrigger value="buyers">Intelligence</TabsTrigger>
          <TabsTrigger value="duplicates">Duplicate Detection</TabsTrigger>
        </TabsList>
        <TabsContent value="portal"><BuyerPortal /></TabsContent>
        <TabsContent value="buyers"><BuyerIntelligence /></TabsContent>
        <TabsContent value="duplicates"><DuplicateBuyers /></TabsContent>
      </Tabs>
    </div>
  )
}
