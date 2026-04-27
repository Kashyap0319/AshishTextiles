'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import {
  MapPin, Shield, Crosshair, Loader2, CheckCircle2, AlertCircle, Globe, User as UserIcon,
} from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

interface Employee {
  id: number
  name: string
  email: string
  role: string
  geo_lat: number | null
  geo_lng: number | null
  geo_radius_meters: number
  geofence_enabled: boolean
  is_active: boolean
}

interface SecurityConfig {
  ip_restriction_enabled: boolean
  allowed_ips: string[]
  geofence_default_radius_meters: number
}

export function SecuritySettings() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [config, setConfig] = useState<SecurityConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [geoForm, setGeoForm] = useState({ lat: '', lng: '', radius: '200' })
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      api.get('/admin/employees/with-geofence').then((r) => setEmployees(r.data)).catch(() => setEmployees([])),
      api.get('/admin/security-config').then((r) => setConfig(r.data)).catch(() => setConfig(null)),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      setGeoForm({
        lat: pos.coords.latitude.toFixed(6),
        lng: pos.coords.longitude.toFixed(6),
        radius: geoForm.radius,
      })
    })
  }

  const startEdit = (emp: Employee) => {
    setEditing(emp)
    setGeoForm({
      lat: emp.geo_lat?.toString() || '',
      lng: emp.geo_lng?.toString() || '',
      radius: emp.geo_radius_meters?.toString() || '200',
    })
    setTestResult(null)
  }

  const saveGeofence = async () => {
    if (!editing || !geoForm.lat || !geoForm.lng) return
    setSaving(true)
    try {
      await api.post(`/admin/employees/${editing.id}/geofence`, {
        geo_lat: parseFloat(geoForm.lat),
        geo_lng: parseFloat(geoForm.lng),
        geo_radius_meters: parseFloat(geoForm.radius || '200'),
      })
      setEditing(null)
      fetchData()
    } catch {} finally {
      setSaving(false)
    }
  }

  const testLocation = async () => {
    if (!editing) return
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await api.post('/admin/test-current-location', null, {
          params: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            user_id: editing.id,
          },
        })
        setTestResult(res.data)
      } catch {}
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl text-foreground mb-1">Security & access control</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Configure per-employee geofencing (warehouse-only login) and IP restrictions
          (warehouse + shop network only).
        </p>
      </div>

      {/* IP Restriction status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="size-4 text-primary" /> IP whitelist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                Status:{' '}
                {config?.ip_restriction_enabled ? (
                  <Badge className="bg-success/15 text-success border-success/30">Enabled</Badge>
                ) : (
                  <Badge variant="outline" className="text-warning border-warning/30">Disabled</Badge>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Set <code className="text-[10px]">IP_RESTRICTION_ENABLED=true</code> and{' '}
                <code className="text-[10px]">ALLOWED_IPS=ip1,ip2</code> in backend <code>.env</code> to enable.
              </p>
            </div>
          </div>
          {config?.allowed_ips && config.allowed_ips.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Whitelisted IPs</p>
              <div className="flex flex-wrap gap-2">
                {config.allowed_ips.map((ip) => (
                  <Badge key={ip} variant="secondary" className="font-mono text-xs">
                    <Shield className="mr-1 size-3" /> {ip}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Geofence per employee */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-primary" />
            <h3 className="font-medium">Per-employee geofence</h3>
            <Badge variant="outline">{employees.length} users</Badge>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : employees.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <UserIcon className="mx-auto mb-3 size-10 opacity-40" />
              <p>No employees yet. Create them in Admin module first.</p>
            </CardContent>
          </Card>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
            {employees.map((emp) => (
              <motion.div key={emp.id} variants={staggerItem}>
                <Card>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-serif text-base">
                        {emp.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{emp.name}</span>
                          <Badge variant="outline" className="text-[10px] capitalize">{emp.role}</Badge>
                          {!emp.is_active && <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">Inactive</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {emp.geofence_enabled ? (
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wider text-success flex items-center gap-1 justify-end">
                            <CheckCircle2 className="size-3" /> Geofenced
                          </p>
                          <p className="text-xs font-mono text-muted-foreground">
                            {emp.geo_lat?.toFixed(4)}, {emp.geo_lng?.toFixed(4)} · {emp.geo_radius_meters}m
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No geofence set</p>
                      )}
                      <Button size="sm" variant="outline" onClick={() => startEdit(emp)}>
                        <Crosshair className="mr-1.5 size-3" /> Configure
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              Geofence for {editing?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set warehouse coordinates. {editing?.name} will only be able to log in
              within the radius.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="0.000001"
                  placeholder="28.6139"
                  value={geoForm.lat}
                  onChange={(e) => setGeoForm({ ...geoForm, lat: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="0.000001"
                  placeholder="77.2090"
                  value={geoForm.lng}
                  onChange={(e) => setGeoForm({ ...geoForm, lng: e.target.value })}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Allowed radius (meters)</Label>
              <Input
                type="number"
                placeholder="200"
                value={geoForm.radius}
                onChange={(e) => setGeoForm({ ...geoForm, radius: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 100-300m for a warehouse.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={useCurrentLocation} className="flex-1">
                <MapPin className="mr-2 size-3" /> Use my current location
              </Button>
              <Button variant="outline" size="sm" onClick={testLocation} disabled={!editing?.geo_lat} className="flex-1">
                <Crosshair className="mr-2 size-3" /> Test from here
              </Button>
            </div>

            {testResult && (
              <div className={`rounded-md border p-3 ${testResult.is_inside_geofence ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}`}>
                <div className="flex items-start gap-2">
                  {testResult.is_inside_geofence ? (
                    <CheckCircle2 className="size-4 text-success mt-0.5" />
                  ) : (
                    <AlertCircle className="size-4 text-destructive mt-0.5" />
                  )}
                  <div className="text-xs">
                    <p className="font-medium">
                      {testResult.is_inside_geofence ? 'Inside geofence ✓' : 'Outside geofence ✗'}
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      Distance: {testResult.distance_meters}m · Allowed: {testResult.allowed_radius_meters}m
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveGeofence} disabled={saving || !geoForm.lat || !geoForm.lng}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
              Save geofence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
