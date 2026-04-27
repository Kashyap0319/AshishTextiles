import { Nav } from '@/components/marketing/nav'
import { Hero } from '@/components/marketing/hero'
import { Features } from '@/components/marketing/features'
import { ProductPreview } from '@/components/marketing/product-preview'
import { SystemDiagram } from '@/components/marketing/system-diagram'
import { CTA } from '@/components/marketing/cta'
import { Footer } from '@/components/marketing/footer'

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Nav />
      <Hero />
      <section id="features">
        <Features />
      </section>
      <ProductPreview />
      <section id="how-it-works">
        <SystemDiagram />
      </section>
      <section id="pricing">
        <CTA />
      </section>
      <Footer />
    </main>
  )
}
