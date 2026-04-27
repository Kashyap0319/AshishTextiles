'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

const footerLinks = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Contact', href: '#' },
  ],
  Legal: [
    { label: 'Privacy', href: '#' },
    { label: 'Terms', href: '#' },
  ],
}

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6 }}
      className="border-t border-border bg-card/50"
    >
      <div className="max-w-6xl mx-auto px-6 py-20">
        {/* Big wordmark */}
        <div className="mb-16 pb-10 border-b border-border">
          <h3 className="font-serif text-5xl md:text-7xl text-foreground leading-none tracking-tight">
            CaratSense.
          </h3>
          <p className="mt-4 text-muted-foreground text-lg max-w-md font-serif italic">
            See beyond inventory. Intelligent surplus, for textile.
          </p>
        </div>

        <div className="grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-10 mb-14">
          {/* Brand column */}
          <div>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              Custom AI solutions & business automation. We build bespoke software for surplus-stock stockists — not generic ERP.
            </p>
            <p className="mt-4 text-xs text-muted-foreground/70">
              caratsense.in — Delhi, India
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-xs uppercase tracking-[0.15em] text-primary mb-4">{section}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="group inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors relative"
                    >
                      {link.label}
                      <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-foreground group-hover:w-full transition-all duration-300" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground font-serif italic">
            © {new Date().getFullYear()} CaratSense. See beyond.
          </p>
          <div className="flex items-center gap-5">
            <Link href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Twitter</Link>
            <Link href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">LinkedIn</Link>
          </div>
        </div>
      </div>
    </motion.footer>
  )
}
