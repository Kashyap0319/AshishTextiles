'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import api from '@/lib/api'

interface User {
  id: number
  name: string
  email: string
  role: string
  permissions?: string[]
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string, lat?: number | null, lng?: number | null) => Promise<User>
  logout: () => void
  isAdmin: boolean
  permissions: string[]
  hasPermission: (page: string) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('caratsense_token')
    }
    return null
  })
  const [loading, setLoading] = useState(true)

  // Set token on api instance
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete api.defaults.headers.common['Authorization']
    }
  }, [token])

  // Load user on mount if token exists
  useEffect(() => {
    if (!token) { setLoading(false); return }
    api.get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => { localStorage.removeItem('caratsense_token'); setToken(null) })
      .finally(() => setLoading(false))
  }, [token])

  const login = useCallback(async (email: string, password: string, lat?: number | null, lng?: number | null) => {
    const res = await api.post('/auth/login', { email, password, lat, lng })
    const { token: newToken, user: userData } = res.data
    localStorage.setItem('caratsense_token', newToken)
    setToken(newToken)
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('caratsense_token')
    setToken(null)
    setUser(null)
  }, [])

  const isAdmin = user?.role === 'admin'
  const permissions = user?.permissions || []
  const hasPermission = useCallback((page: string) => {
    if (!user) return false
    if (user.role === 'admin') return true
    return permissions.includes(page)
  }, [user, permissions])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin, permissions, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export default function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
