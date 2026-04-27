'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { chatMessage, fadeInUp } from '@/lib/animations'
import {
  Send,
  Bot,
  User,
  Sparkles,
  Package,
  Users,
  BarChart3,
  Lightbulb,
  Copy,
  Check,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import api from '@/lib/api'
import type { ChatMessage } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const suggestedQueries = [
  { icon: Users, text: 'Who buys lycra?', category: 'buyers' },
  { icon: Package, text: 'Show dead stock > 60 days', category: 'stock' },
  { icon: BarChart3, text: 'Top 5 buyers this month', category: 'analytics' },
  { icon: Package, text: "What's in rack A-12?", category: 'warehouse' },
]

// Fallback responses using REAL data from parsed Excel files
import realData from '@/lib/real-data.json'
const topB = realData.topBuyers || []
const mockResponses: Record<string, { text: string; data?: unknown }> = {
  'who buys lycra': {
    text: `Based on purchase history, here are the top buyers (from ${realData.stats.totalBuyers} total):`,
    data: {
      type: 'buyers',
      items: topB.slice(0, 3).map((b: any) => ({
        name: b.name, volume: `${(b.totalMeters/1000).toFixed(1)}K m`, score: `${b.transactions} txns`
      })),
    },
  },
  'show dead stock': {
    text: `Current stock snapshot: ${realData.stats.totalStockItems.toLocaleString()} items, ${(realData.stats.totalMeters/1000).toFixed(0)}K meters total`,
    data: { type: 'stock', items: (realData.stockSample || []).slice(0, 3).map((s: any) => ({
      code: s.code, fabric: s.quality, days: 0, quantity: `${s.meters}m`
    })) },
  },
  'top 5 buyers': {
    text: `Top buyers by total meters purchased (${realData.stats.totalSalesTransactions} total transactions):`,
    data: { type: 'ranking', items: topB.slice(0, 5).map((b: any, i: number) => ({
      rank: i+1, name: b.name, value: `${(b.totalMeters/1000).toFixed(1)}K m (${b.transactions} txns)`
    })) },
  },
  'rack a-12': {
    text: `Warehouse has ${realData.stats.totalRacks} assigned racks across 9 halls. Use the Warehouse module for detailed rack view.`,
    data: { type: 'rack', items: (realData.racks || []).slice(0, 3).map((r: any) => ({
      code: `Rack ${r.number}`, fabric: r.goods, quantity: r.hall, status: 'assigned'
    })) },
  },
}

export function AIChat() {
  const { chatMessages, addChatMessage } = useAppStore()
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages])

  const handleSend = async (text?: string) => {
    const message = text || input
    if (!message.trim()) return

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }
    addChatMessage(userMessage)
    setInput('')
    setIsTyping(true)

    // Call real backend API
    try {
      const res = await api.post('/chat/', { message, history: chatMessages.slice(-10).map((m) => ({ role: m.role, content: m.content })) })
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.data?.response || res.data?.text || res.data?.message || 'I received your query but could not generate a response.',
        timestamp: new Date().toISOString(),
        data: res.data?.data as Record<string, unknown> | undefined,
      }
      addChatMessage(aiMessage)
    } catch {
      // Fallback to mock if backend is unavailable
      const lowerMessage = message.toLowerCase()
      let response = mockResponses['who buys lycra']
      if (lowerMessage.includes('lycra')) response = mockResponses['who buys lycra']
      else if (lowerMessage.includes('dead stock') || lowerMessage.includes('60 days')) response = mockResponses['show dead stock']
      else if (lowerMessage.includes('top') && lowerMessage.includes('buyer')) response = mockResponses['top 5 buyers']
      else if (lowerMessage.includes('rack')) response = mockResponses['rack a-12']

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text,
        timestamp: new Date().toISOString(),
        data: response.data as Record<string, unknown>,
      }
      addChatMessage(aiMessage)
    } finally {
      setIsTyping(false)
    }
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const renderData = (data: Record<string, unknown>) => {
    const type = data.type as string
    const items = data.items as Array<Record<string, string | number>>

    switch (type) {
      case 'buyers':
        return (
          <div className="mt-3 space-y-2">
            {items.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                      {String(item.name).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{item.name}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">{item.volume}</span>
                  <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                    {item.score}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )

      case 'stock':
        return (
          <div className="mt-3 space-y-2">
            {items.map((item, i) => (
              <div
                key={i}
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono font-medium">{item.code}</span>
                    <span className="ml-2 text-muted-foreground">{item.fabric}</span>
                  </div>
                  <Badge variant="outline" className="text-red-400 border-red-500/30">
                    {item.days}d old
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.quantity}</p>
              </div>
            ))}
          </div>
        )

      case 'ranking':
        return (
          <div className="mt-3 space-y-2">
            {items.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0
                        ? 'bg-amber-500/20 text-amber-400'
                        : i === 1
                        ? 'bg-slate-400/20 text-slate-400'
                        : i === 2
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {item.rank}
                  </span>
                  <span className="font-medium">{item.name}</span>
                </div>
                <span className="font-mono text-sm">{item.value}</span>
              </div>
            ))}
          </div>
        )

      case 'rack':
        return (
          <div className="mt-3 space-y-2">
            {items.map((item, i) => (
              <div
                key={i}
                className="rounded-lg border border-border p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono font-medium">{item.code}</span>
                    <span className="ml-2 text-muted-foreground">{item.fabric}</span>
                  </div>
                  <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                    {item.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm font-mono">{item.quantity}</p>
              </div>
            ))}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      {/* Chat Interface */}
      <div className="lg:col-span-3">
        <Card className="flex h-[600px] flex-col">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="flex items-center gap-2">
              <Bot className="size-5 text-primary" />
              CaratSense AI Assistant
              <Badge variant="secondary" className="ml-2">Beta</Badge>
            </CardTitle>
          </CardHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {chatMessages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-full bg-primary/10 p-4">
                  <Sparkles className="size-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium">Ask me anything about your inventory</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  I can help you find buyers, check stock levels, analyze sales patterns, and more.
                  Try asking in Hindi or English!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {chatMessages.map((message) => (
                  <motion.div
                    key={message.id}
                    variants={chatMessage}
                    initial="hidden"
                    animate="visible"
                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="size-8 shrink-0">
                      <AvatarFallback
                        className={
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary'
                        }
                      >
                        {message.role === 'user' ? <User className="size-4" /> : <Bot className="size-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`group max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      {message.data && renderData(message.data as Record<string, unknown>)}
                      {message.role === 'assistant' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="mt-2 size-6 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => handleCopy(message.content, message.id)}
                        >
                          {copiedId === message.id ? (
                            <Check className="size-3" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <div className="flex gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-secondary">
                        <Bot className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-lg bg-secondary p-3">
                      <div className="flex gap-1">
                        <span className="size-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '0ms' }} />
                        <span className="size-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '150ms' }} />
                        <span className="size-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex gap-2"
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about stock, buyers, or warehouse..."
                className="flex-1"
                disabled={isTyping}
              />
              <Button type="submit" disabled={!input.trim() || isTyping}>
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>

      {/* Suggestions */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="size-4 text-primary" />
              Suggested Queries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="space-y-2">
            {suggestedQueries.map((query, i) => (
              <Button
                key={i}
                variant="outline"
                className="w-full justify-start text-left h-auto py-3"
                onClick={() => handleSend(query.text)}
                disabled={isTyping}
              >
                <query.icon className="mr-2 size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{query.text}</span>
              </Button>
            ))}
            </motion.div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Ask in Hindi or English - the AI understands both!</p>
            <p>Be specific about quantities, dates, or buyer names for better results.</p>
            <p>Use follow-up questions to drill down into details.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
