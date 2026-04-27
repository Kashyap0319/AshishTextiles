'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function Hero() {
  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden pt-16">
      {/* Warm ambient glow */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(193, 95, 60, 0.12), transparent 70%)',
            'radial-gradient(ellipse 70% 50% at 45% 5%, rgba(217, 119, 87, 0.15), transparent 70%)',
            'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(193, 95, 60, 0.12), transparent 70%)',
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),
                            linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Tagline label */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span className="w-6 h-px bg-primary" />
            Surplus intelligence, built for textile
            <span className="w-6 h-px bg-primary" />
          </span>
        </motion.div>

        {/* Headline — serif editorial */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-serif text-6xl md:text-8xl leading-[0.95] tracking-tight text-balance mb-8"
        >
          <span className="text-foreground">Turn dead stock into</span>{' '}
          <span className="italic text-primary">intelligent</span>{' '}
          <span className="text-foreground">revenue.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 text-pretty leading-relaxed"
        >
          Match surplus inventory with the right buyers using machine learning.
          Query your warehouse in plain Hindi or English. Ship faster, guess less.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link href="/dashboard">
            <Button
              size="lg"
              className="h-12 px-7 text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all rounded-full group"
            >
              Open dashboard
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <Link href="/login">
            <Button
              size="lg"
              variant="ghost"
              className="h-12 px-7 text-base text-foreground hover:bg-accent rounded-full"
            >
              Sign in to account
            </Button>
          </Link>
        </motion.div>

        {/* Editorial stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-24 pt-12 border-t border-border grid grid-cols-3 max-w-3xl mx-auto gap-8"
        >
          <Stat value="47%" label="faster sales cycles" />
          <Stat value="2.3×" label="higher match accuracy" />
          <Stat value="89%" label="inventory visibility" />
        </motion.div>

        {/* Credit footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 text-xs text-muted-foreground font-serif italic"
        >
          Trusted by surplus textile stockists across India
        </motion.p>
      </div>
    </section>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-left md:text-center">
      <div className="font-serif text-4xl md:text-5xl text-foreground ticker">{value}</div>
      <div className="text-sm text-muted-foreground mt-1 lowercase tracking-wide">{label}</div>
    </div>
  )
}
