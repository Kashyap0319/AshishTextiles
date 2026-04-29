'use client'

/**
 * Sales-data lock — gates ALL sales access behind a 16-char alphanumeric key.
 *
 * Security model:
 * - Plain key NEVER appears in source code (only SHA-256 hash here).
 * - When locked: NO sales fetch, NO sales render → invisible in DOM/inspect element.
 * - Unlocked state lives in sessionStorage (cleared on tab close).
 * - Auto-relock after 30 min of inactivity.
 */
import { create } from 'zustand'

// SHA-256 hash of the secret 16-char alphanumeric key.
// Keep this opaque — the actual key is shared out-of-band.
const UNLOCK_HASH = '53fd2933b4a952a3ea875f0d1ff16097709fd717d64d47bdc472933ce6c4a8fe'

const SS_KEY = 'cs_sales_unlock_v1'
const TIMEOUT_MS = 30 * 60 * 1000  // 30 minutes

async function sha256(text: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return ''
  const buf = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

interface SalesLockState {
  unlocked: boolean
  lastActivity: number
  unlock: (key: string) => Promise<boolean>
  lock: () => void
  touch: () => void
  isExpired: () => boolean
}

export const useSalesLock = create<SalesLockState>((set, get) => {
  // Hydrate from sessionStorage on init
  let initialUnlocked = false
  let initialActivity = 0
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(SS_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        if (data.unlocked && data.lastActivity && Date.now() - data.lastActivity < TIMEOUT_MS) {
          initialUnlocked = true
          initialActivity = data.lastActivity
        } else {
          sessionStorage.removeItem(SS_KEY)
        }
      }
    } catch {}
  }

  return {
    unlocked: initialUnlocked,
    lastActivity: initialActivity,

    unlock: async (key: string) => {
      const trimmed = (key || '').trim().toUpperCase()
      if (trimmed.length !== 16) return false
      const hash = await sha256(trimmed)
      if (hash === UNLOCK_HASH) {
        const now = Date.now()
        set({ unlocked: true, lastActivity: now })
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(SS_KEY, JSON.stringify({ unlocked: true, lastActivity: now }))
        }
        return true
      }
      return false
    },

    lock: () => {
      set({ unlocked: false, lastActivity: 0 })
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(SS_KEY)
      }
    },

    touch: () => {
      const now = Date.now()
      set({ lastActivity: now })
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(SS_KEY, JSON.stringify({ unlocked: true, lastActivity: now }))
      }
    },

    isExpired: () => {
      const { unlocked, lastActivity } = get()
      if (!unlocked) return true
      return Date.now() - lastActivity > TIMEOUT_MS
    },
  }
})
