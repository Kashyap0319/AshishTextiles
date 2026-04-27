'use client'

import { Brain } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AIMatching } from './ai-matching'
import { AIInsights } from './ai-insights'
import { AIChat } from './ai-chat'

export function AIAssistant() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="matching">
        <TabsList>
          <TabsTrigger value="matching">Buyer Matching</TabsTrigger>
          <TabsTrigger value="insights">Insights & Analytics</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>
        <TabsContent value="matching"><AIMatching /></TabsContent>
        <TabsContent value="insights"><AIInsights /></TabsContent>
        <TabsContent value="chat"><AIChat /></TabsContent>
      </Tabs>
    </div>
  )
}
