'use client'

import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { useSalesLock } from '@/lib/sales-lock'

/**
 * Gates sales-sensitive children behind the 16-char access key.
 * When locked: renders ONLY a lock notice — children are not mounted,
 * so no API fetch fires and no sales data ever lands in the DOM.
 */
export function SalesLockGate({ children, label = 'Sales data' }: { children: React.ReactNode; label?: string }) {
  const unlocked = useSalesLock((s) => s.unlocked)
  const isExpired = useSalesLock((s) => s.isExpired)
  const lock = useSalesLock((s) => s.lock)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
    if (unlocked && isExpired()) lock()
  }, [unlocked, isExpired, lock])

  if (!hydrated || !unlocked) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-bento border border-dashed border-border bg-card/40 p-12 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-foreground/5">
          <Lock className="size-7 text-muted-foreground" />
        </div>
        <h3 className="font-display-tight text-2xl text-foreground">{label} is private</h3>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          Type the 16-character access key in the search bar above to view this section.
          The session will auto-lock after 30 minutes of inactivity.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
