'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  ChevronRight, 
  Sparkles,
  MapPin,
  Users,
  Package,
  MessageSquare,
  TrendingUp
} from 'lucide-react'

const demoQueries = [
  { query: "Who buys lycra?", type: "buyer" },
  { query: "What is in rack 736?", type: "stock" },
  { query: "Low-selling items this month", type: "analytics" },
]

const mockResponses: Record<string, { title: string; items: { label: string; value: string; icon: typeof Users }[] }> = {
  buyer: {
    title: "Top Lycra Buyers",
    items: [
      { label: "Fabric House Mumbai", value: "92% match", icon: Users },
      { label: "Textile Corp Delhi", value: "87% match", icon: Users },
      { label: "Premium Weaves", value: "84% match", icon: Users },
    ]
  },
  stock: {
    title: "Rack 736 Contents",
    items: [
      { label: "Cotton Blend #4521", value: "450 meters", icon: Package },
      { label: "Polyester Mix #7823", value: "320 meters", icon: Package },
      { label: "Silk Remnant #1092", value: "180 meters", icon: Package },
    ]
  },
  analytics: {
    title: "Slow-Moving Stock",
    items: [
      { label: "Wool Blend Offshade", value: "90+ days", icon: TrendingUp },
      { label: "Denim Remnants", value: "75+ days", icon: TrendingUp },
      { label: "Linen Surplus", value: "60+ days", icon: TrendingUp },
    ]
  },
}

export function ProductPreview() {
  const [activeQuery, setActiveQuery] = useState<string | null>(null)
  const [isThinking, setIsThinking] = useState(false)
  const [isMac, setIsMac] = useState(false)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  useEffect(() => {
    setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent))
  }, [])
  
  const handleQueryClick = (type: string) => {
    setIsThinking(true)
    setActiveQuery(null)
    setTimeout(() => {
      setIsThinking(false)
      setActiveQuery(type)
    }, 1200)
  }

  return (
    <section className="py-32 relative" ref={ref}>
      {/* Background gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(79, 140, 255, 0.05), transparent)',
        }}
      />
      
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-semibold text-[#E6EAF2] mb-6 text-balance">
            Ask your inventory anything
          </h2>
          <p className="text-lg text-[#9AA4B2] max-w-2xl mx-auto text-pretty">
            Natural language queries that actually understand your business. 
            Try it yourself.
          </p>
        </motion.div>

        {/* Interactive demo */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative max-w-4xl mx-auto"
        >
          {/* Mock window chrome */}
          <div className="rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.06)] bg-[#0B0D10]">
            {/* Window header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#111318] border-b border-[rgba(255,255,255,0.06)]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#EF4444]/60" />
                <div className="w-3 h-3 rounded-full bg-[#F59E0B]/60" />
                <div className="w-3 h-3 rounded-full bg-[#22C55E]/60" />
              </div>
              <div className="flex-1 text-center">
                <span className="text-xs text-[#6B7280]">CaratSense Dashboard</span>
              </div>
            </div>

            {/* Content area */}
            <div className="p-6 md:p-8">
              {/* Command bar */}
              <div className="relative mb-8">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#111318] border border-[rgba(255,255,255,0.06)]">
                  <Search className="w-5 h-5 text-[#6B7280]" />
                  <span className="text-[#6B7280]">Ask CaratSense...</span>
                  <div className="ml-auto flex items-center gap-1 px-2 py-1 rounded bg-[#171A21] border border-[rgba(255,255,255,0.06)]">
                    <span className="text-xs text-[#6B7280]">{isMac ? 'Cmd' : 'Ctrl'}</span>
                    <span className="text-xs text-[#6B7280]">K</span>
                  </div>
                </div>
              </div>

              {/* Query suggestions */}
              <div className="flex flex-wrap gap-3 mb-8">
                {demoQueries.map((item) => (
                  <button
                    key={item.query}
                    onClick={() => handleQueryClick(item.type)}
                    className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-[#171A21] border border-[rgba(255,255,255,0.06)] hover:border-primary/50 hover:bg-[#1A1D25] transition-all duration-200"
                  >
                    <MessageSquare className="w-4 h-4 text-[#6B7280] group-hover:text-primary transition-colors" />
                    <span className="text-sm text-[#9AA4B2] group-hover:text-[#E6EAF2] transition-colors">
                      {item.query}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#6B7280] group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>

              {/* Response area */}
              <div className="min-h-[280px] rounded-xl bg-[#111318] border border-[rgba(255,255,255,0.06)] p-6">
                <AnimatePresence mode="wait">
                  {isThinking && (
                    <motion.div
                      key="thinking"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center h-[200px]"
                    >
                      <div className="relative">
                        <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                        <motion.div
                          className="absolute inset-0 rounded-full bg-primary/20"
                          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                        />
                      </div>
                      <p className="text-sm text-[#6B7280] mt-4">AI is thinking...</p>
                    </motion.div>
                  )}

                  {!isThinking && activeQuery && mockResponses[activeQuery] && (
                    <motion.div
                      key="response"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center gap-2 mb-6">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <h4 className="text-sm font-medium text-[#E6EAF2]">
                          {mockResponses[activeQuery].title}
                        </h4>
                      </div>
                      
                      <div className="space-y-3">
                        {mockResponses[activeQuery].items.map((item, idx) => (
                          <motion.div
                            key={item.label}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex items-center justify-between p-4 rounded-lg bg-[#0B0D10] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)] transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#171A21] flex items-center justify-center">
                                <item.icon className="w-4 h-4 text-[#9AA4B2]" />
                              </div>
                              <span className="text-[#E6EAF2]">{item.label}</span>
                            </div>
                            <span className="text-sm text-primary font-medium">{item.value}</span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {!isThinking && !activeQuery && (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center h-[200px] text-center"
                    >
                      <MapPin className="w-8 h-8 text-[#6B7280]/50 mb-4" />
                      <p className="text-[#6B7280]">Click a query above to see CaratSense in action</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute -z-10 -top-8 -left-8 w-32 h-32 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -z-10 -bottom-8 -right-8 w-48 h-48 rounded-full bg-primary/5 blur-3xl" />
        </motion.div>
      </div>
    </section>
  )
}
