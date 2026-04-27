'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const benefits = [
  'Custom-built for your workflow',
  '8-week build, working software',
  'Data stays on your infrastructure',
]

export function CTA() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="py-32 relative overflow-hidden" ref={ref}>
      {/* Warm ambient */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'radial-gradient(ellipse 60% 40% at 50% 100%, rgba(193, 95, 60, 0.12), transparent 70%)',
            'radial-gradient(ellipse 60% 40% at 50% 100%, rgba(217, 119, 87, 0.18), transparent 70%)',
            'radial-gradient(ellipse 60% 40% at 50% 100%, rgba(193, 95, 60, 0.12), transparent 70%)',
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-6">— Begin</p>

          <h2 className="font-serif text-6xl md:text-7xl text-foreground mb-8 leading-[1] tracking-tight text-balance">
            Ready to move surplus{' '}
            <em className="italic text-primary">faster?</em>
          </h2>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-12 leading-relaxed">
            Custom ERP for surplus textile stockists. Built on your exact workflow — packing lists, bale tracking, buyer matching, website sync.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mb-10 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link href="/login">
              <Button
                size="lg"
                className="h-14 px-10 text-base bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-md hover:shadow-xl transition-all group"
              >
                Sign in to get started
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                size="lg"
                variant="ghost"
                className="h-14 px-10 text-base rounded-full hover:bg-accent"
              >
                Explore dashboard
              </Button>
            </Link>
          </motion.div>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-x-8 gap-y-3"
          >
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">{benefit}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
