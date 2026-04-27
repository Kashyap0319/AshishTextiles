'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Brain, Warehouse, MessageSquare, RefreshCw } from 'lucide-react'

const features = [
  {
    icon: Brain,
    number: '01',
    title: 'Buyer matching',
    description:
      'Machine learning surfaces the right buyers for every lot — scored on past volume, quality preference, and recency.',
  },
  {
    icon: Warehouse,
    number: '02',
    title: 'Live rack map',
    description:
      'Know exactly what is in rack 736. Visual warehouse with real-time bale positions and aging alerts.',
  },
  {
    icon: MessageSquare,
    number: '03',
    title: 'Chat in Hindi',
    description:
      'Ask "kaun buyer lycra lega?" or "60 din se purana stock dikhao." Plain language, instant answers.',
  },
  {
    icon: RefreshCw,
    number: '04',
    title: 'Website sync',
    description:
      'Stock updates flow automatically to sample.tdmfabric.com. No CSV uploads, no stale listings.',
  },
]

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="group relative border-b border-border py-10 first:pt-0 last:border-b-0"
    >
      <div className="grid md:grid-cols-[auto_1fr_auto] gap-6 md:gap-10 items-start">
        {/* Number */}
        <div className="font-serif text-5xl text-muted-foreground/40 ticker">{feature.number}</div>

        {/* Content */}
        <div>
          <h3 className="font-serif text-3xl md:text-4xl text-foreground mb-3 tracking-tight">
            {feature.title}
          </h3>
          <p className="text-muted-foreground leading-relaxed max-w-xl">
            {feature.description}
          </p>
        </div>

        {/* Icon */}
        <div className="hidden md:flex w-14 h-14 rounded-full bg-accent items-center justify-center group-hover:bg-primary group-hover:rotate-6 transition-all duration-500">
          <feature.icon className="w-5 h-5 text-foreground group-hover:text-primary-foreground" />
        </div>
      </div>
    </motion.div>
  )
}

export function Features() {
  const headerRef = useRef(null)
  const isHeaderInView = useInView(headerRef, { once: true, margin: '-100px' })

  return (
    <section className="py-32 relative">
      <div className="max-w-5xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-20 max-w-2xl"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-6">— The product</p>
          <h2 className="font-serif text-5xl md:text-6xl text-foreground mb-6 leading-[1.05] tracking-tight">
            Built for <em className="italic">textile</em> surplus — not generic ERP.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Every module designed around how surplus actually moves. Bale-level tracking, quality-mix detection, FIFO dispatch — the way your team already works.
          </p>
        </motion.div>

        {/* Feature list — editorial */}
        <div>
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
