'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import useAuth from '@/hooks/use-auth'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [geoError, setGeoError] = useState('')
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true); setError(''); setGeoError('')
    try {
      let lat: number | null = null, lng: number | null = null
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        )
        lat = pos.coords.latitude; lng = pos.coords.longitude
      } catch {}
      await login(email, password, lat, lng)
      router.push('/dashboard')
    } catch (err: any) {
      const d = err.response?.data?.detail
      if (d?.includes('outside')) setGeoError(d)
      else setError(d || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left — editorial panel */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex flex-col justify-between p-12 bg-card border-r border-border relative overflow-hidden"
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 50% 40% at 30% 20%, rgba(193, 95, 60, 0.08), transparent 70%)',
          }}
        />

        <div className="relative">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <span className="font-serif text-primary-foreground text-base">C</span>
            </div>
            <span className="font-serif text-xl text-foreground">CaratSense</span>
          </Link>
        </div>

        <div className="relative max-w-md">
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-6">— Welcome back</p>
          <h1 className="font-serif text-5xl text-foreground leading-[1.05] tracking-tight mb-6">
            Your surplus,<br />
            <em className="italic text-primary">organised.</em>
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Sign in to view live stock, match buyers, track sales, and run the warehouse from one place.
          </p>
        </div>

        <div className="relative text-xs text-muted-foreground font-serif italic">
          Built for textile stockists — custom, not generic.
        </div>
      </motion.div>

      {/* Right — form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex items-center justify-center p-6 lg:p-12"
      >
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <span className="font-serif text-primary-foreground text-base">C</span>
            </div>
            <span className="font-serif text-xl">CaratSense</span>
          </div>

          <div className="mb-8">
            <h2 className="font-serif text-4xl text-foreground mb-2 tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">
              Use your admin credentials to access the dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wide text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@caratsense.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                className="h-11 bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wide text-muted-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-background"
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}
            {geoError && (
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-md p-3">
                <MapPin className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{geoError}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md group"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Signing in
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Location-based access
            </span>
            <Link href="/" className="hover:text-foreground transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
