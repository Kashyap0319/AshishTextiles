'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { 
  Warehouse, 
  Brain, 
  Users, 
  Globe,
  ArrowRight,
  Zap
} from 'lucide-react'

const nodes = [
  { id: 'warehouse', icon: Warehouse, label: 'Warehouse', sublabel: 'Inventory Data', x: 10, y: 50 },
  { id: 'ai', icon: Brain, label: 'AI Engine', sublabel: 'Processing', x: 40, y: 30 },
  { id: 'buyers', icon: Users, label: 'Buyers', sublabel: 'Matching', x: 70, y: 50 },
  { id: 'website', icon: Globe, label: 'Website', sublabel: 'Live Sync', x: 40, y: 70 },
]

const connections = [
  { from: 'warehouse', to: 'ai' },
  { from: 'ai', to: 'buyers' },
  { from: 'ai', to: 'website' },
]

export function SystemDiagram() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="py-32 relative overflow-hidden" ref={ref}>
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#171A21] border border-[rgba(255,255,255,0.06)] mb-6">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm text-[#9AA4B2]">How It Works</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-semibold text-[#E6EAF2] mb-6 text-balance">
            Data flows, decisions happen
          </h2>
          <p className="text-lg text-[#9AA4B2] max-w-2xl mx-auto text-pretty">
            From warehouse floor to buyer inbox in milliseconds. 
            Real-time intelligence that never sleeps.
          </p>
        </motion.div>

        {/* Animated system diagram */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative aspect-[16/9] max-w-4xl mx-auto"
        >
          {/* SVG Connections */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="System architecture diagram showing data flow between Warehouse, AI Engine, Buyers, and Website">
            {connections.map((conn, idx) => {
              const fromNode = nodes.find(n => n.id === conn.from)!
              const toNode = nodes.find(n => n.id === conn.to)!
              
              return (
                <motion.g key={`${conn.from}-${conn.to}`}>
                  {/* Connection line */}
                  <motion.line
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke="url(#lineGradient)"
                    strokeWidth="0.3"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={isInView ? { pathLength: 1, opacity: 0.6 } : {}}
                    transition={{ duration: 0.8, delay: 0.5 + idx * 0.2 }}
                  />
                  
                  {/* Animated particle */}
                  <motion.circle
                    r="0.8"
                    fill="#4F8CFF"
                    style={{ willChange: 'transform' }}
                    initial={{ opacity: 0 }}
                    animate={isInView ? {
                      opacity: [0, 1, 1, 0],
                      cx: [fromNode.x, toNode.x],
                      cy: [fromNode.y, toNode.y],
                    } : {}}
                    transition={{
                      duration: 2,
                      delay: 1 + idx * 0.3,
                      repeat: Infinity,
                      repeatDelay: 1,
                    }}
                  />
                </motion.g>
              )
            })}
            
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4F8CFF" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#4F8CFF" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#4F8CFF" stopOpacity="0.2" />
              </linearGradient>
            </defs>
          </svg>

          {/* Nodes */}
          {nodes.map((node, idx) => (
            <motion.div
              key={node.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${node.x}%`, top: `${node.y}%`, willChange: 'transform' }}
              initial={{ opacity: 0, scale: 0 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ 
                duration: 0.5, 
                delay: 0.3 + idx * 0.1,
                type: 'spring',
                stiffness: 200,
              }}
            >
              <div className="relative group">
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Node card */}
                <div className="relative flex flex-col items-center gap-2 p-4 md:p-6 rounded-2xl bg-[#111318] border border-[rgba(255,255,255,0.06)] hover:border-primary/30 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <node.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-[#E6EAF2]">{node.label}</div>
                    <div className="text-xs text-[#6B7280]">{node.sublabel}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Process steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="flex flex-wrap justify-center gap-4 mt-16"
        >
          {['Scan inventory', 'AI processes', 'Match buyers', 'Sync everywhere'].map((step, idx) => (
            <div key={step} className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#171A21] border border-[rgba(255,255,255,0.06)]">
                <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-medium">
                  {idx + 1}
                </span>
                <span className="text-sm text-[#9AA4B2]">{step}</span>
              </div>
              {idx < 3 && <ArrowRight className="w-4 h-4 text-[#6B7280] hidden sm:block" />}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
