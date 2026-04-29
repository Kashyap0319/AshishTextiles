'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SalesModule } from './sales-module'
import { PriceApprovals } from './price-approvals'
import { SalesLockGate } from './sales-lock-gate'

export function SalesTabs() {
  return (
    <SalesLockGate label="Sales & approvals">
      <div className="space-y-4">
        <Tabs defaultValue="sales">
          <TabsList>
            <TabsTrigger value="sales">Sales History</TabsTrigger>
            <TabsTrigger value="approvals">Price Approvals</TabsTrigger>
          </TabsList>
          <TabsContent value="sales"><SalesModule /></TabsContent>
          <TabsContent value="approvals"><PriceApprovals /></TabsContent>
        </Tabs>
      </div>
    </SalesLockGate>
  )
}
