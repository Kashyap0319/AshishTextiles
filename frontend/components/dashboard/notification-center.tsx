'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import {
  Bell, MessageCircle, Loader2, AlertCircle, Clock, Package, Users, Send, Copy, Check,
} from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface QueuedNotification {
  type: string
  target_phone?: string
  target_name: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  triggered_by?: string
  whatsapp_link?: string
}

const typeIcons: Record<string, any> = {
  inquiry_match: Users,
  dormant_buyer: Clock,
  quality_mix: AlertCircle,
  low_stock: Package,
}

const sevTone = (s: string) =>
  s === 'critical' ? 'border-destructive/30 bg-destructive/5'
    : s === 'warning' ? 'border-warning/30 bg-warning/5'
      : 'border-primary/20 bg-primary/5'

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<QueuedNotification[]>([])
  const [stats, setStats] = useState<any>(null)
  const [digest, setDigest] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      api.get('/notification-queue/pending').then((r) => {
        setNotifications(r.data?.notifications || [])
        setStats(r.data)
      }),
      api.get('/notification-queue/digest').then((r) => setDigest(r.data?.digest_text || '')),
    ]).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const sendWA = (n: QueuedNotification) => {
    if (n.whatsapp_link) window.open(n.whatsapp_link, '_blank')
  }

  const copyDigest = () => {
    navigator.clipboard.writeText(digest)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sendDigestWA = () => {
    const encoded = encodeURIComponent(digest)
    window.open(`https://wa.me/?text=${encoded}`, '_blank')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-2xl text-foreground mb-1 flex items-center gap-2">
            <Bell className="size-5 text-primary" /> Notification center
          </h2>
          <p className="text-sm text-muted-foreground">
            Auto-generated alerts for buyers, stock, and sales — ready to WhatsApp in one click.
          </p>
        </div>
        {stats && (
          <div className="flex gap-2">
            {stats.by_severity?.critical > 0 && <Badge className="bg-destructive/15 text-destructive border-destructive/30">{stats.by_severity.critical} critical</Badge>}
            {stats.by_severity?.warning > 0 && <Badge className="bg-warning/15 text-warning border-warning/30">{stats.by_severity.warning} warning</Badge>}
            {stats.by_severity?.info > 0 && <Badge variant="outline">{stats.by_severity.info} info</Badge>}
          </div>
        )}
      </div>

      {/* Daily digest card */}
      {digest && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="size-4 text-primary" /> Daily digest
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap font-sans bg-muted rounded-md p-3 mb-3">
              {digest}
            </pre>
            <div className="flex gap-2">
              <Button size="sm" onClick={sendDigestWA}>
                <Send className="mr-2 size-3" /> Send via WhatsApp
              </Button>
              <Button size="sm" variant="outline" onClick={copyDigest}>
                {copied ? <Check className="mr-2 size-3" /> : <Copy className="mr-2 size-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="mx-auto mb-3 size-10 text-muted-foreground/40" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm text-muted-foreground">No pending notifications.</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
          {notifications.map((n, i) => {
            const Icon = typeIcons[n.type] || Bell
            return (
              <motion.div key={i} variants={staggerItem}>
                <Card className={`border ${sevTone(n.severity)}`}>
                  <CardContent className="p-3 flex items-start gap-3">
                    <Icon className="size-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{n.title}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">{n.severity}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                      {n.triggered_by && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 italic">→ {n.triggered_by}</p>
                      )}
                    </div>
                    {n.whatsapp_link && (
                      <Button size="sm" variant="outline" onClick={() => sendWA(n)} className="shrink-0">
                        <MessageCircle className="size-3 mr-1" /> WhatsApp
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
