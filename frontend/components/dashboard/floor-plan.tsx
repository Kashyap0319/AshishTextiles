'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { DoorOpen, Package } from 'lucide-react'
import type { HallLayout, RackPosition } from '@/lib/floor-plans'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Props {
  hall: HallLayout
  /** Map of rack number → utilization % (0-100) */
  utilization?: Record<number, number>
  /** Map of rack number → goods/article stored */
  contents?: Record<number, string>
  onRackClick?: (rack: RackPosition) => void
  selectedRack?: number
  /** When true, applies preview sizing (larger labels, no inner hall caption) */
  compact?: boolean
}

const featureColor = {
  pillar: '#8B7D6B',
  staircase: '#C89A4E',
  door: '#7D8A5D',
  sofa: '#C89A4E',
  'shair-case': '#C89A4E',
}

export function FloorPlan({ hall, utilization = {}, contents = {}, onRackClick, selectedRack, compact }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  const rackColor = (num: number) => {
    const util = utilization[num] ?? 50
    if (util > 90) return { fill: '#C8553D', stroke: '#A03D2A', alpha: 0.85 }  // red - full
    if (util > 70) return { fill: '#C89A4E', stroke: '#A07A38', alpha: 0.7 }    // amber
    if (util > 30) return { fill: '#7D8A5D', stroke: '#5D6A45', alpha: 0.6 }    // green
    return { fill: '#D8D3C4', stroke: '#A09C90', alpha: 0.5 }                   // empty
  }

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${hall.width} ${hall.height}`}
        className="w-full h-auto rounded-lg border border-border"
        style={{
          maxHeight: compact ? '320px' : '78vh',
          background: 'linear-gradient(180deg, #FAF8F2 0%, #EFEAD9 100%)',
        }}
      >
        <defs>
          <pattern id={`grid-${hall.hall}`} width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="currentColor" strokeWidth="0.08" className="text-foreground/15" />
          </pattern>
          {/* Vertical gradients for subtle 3D top-light */}
          <linearGradient id={`rackGrad-empty-${hall.hall}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8E2D0" />
            <stop offset="100%" stopColor="#C2BBA6" />
          </linearGradient>
          <linearGradient id={`rackGrad-low-${hall.hall}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#92A26B" />
            <stop offset="100%" stopColor="#5D6A45" />
          </linearGradient>
          <linearGradient id={`rackGrad-mid-${hall.hall}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4A559" />
            <stop offset="100%" stopColor="#9A7234" />
          </linearGradient>
          <linearGradient id={`rackGrad-full-${hall.hall}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D26049" />
            <stop offset="100%" stopColor="#9A3826" />
          </linearGradient>
        </defs>

        {/* Floor with grid */}
        <rect
          x={2}
          y={2}
          width={hall.width - 4}
          height={hall.height - 4}
          fill={`url(#grid-${hall.hall})`}
          stroke="currentColor"
          strokeWidth={0.3}
          className="text-foreground/25"
          rx={0.5}
        />

        {/* Features (pillars, stairs) */}
        {hall.features.map((f, i) => (
          <g key={`f-${i}`}>
            <rect
              x={f.x}
              y={f.y}
              width={f.w}
              height={f.h}
              fill={featureColor[f.type]}
              fillOpacity={0.18}
              stroke={featureColor[f.type]}
              strokeWidth={0.2}
              strokeDasharray={f.type === 'pillar' ? '0.8 0.4' : '0'}
              rx={0.5}
            />
            {f.label && (
              <text
                x={f.x + f.w / 2}
                y={f.y + f.h / 2 + 0.7}
                textAnchor="middle"
                style={{ fontSize: '2px', fill: featureColor[f.type], fontStyle: 'italic', fontWeight: 500 }}
              >
                {f.label}
              </text>
            )}
          </g>
        ))}

        {/* Entry marker */}
        {hall.entry && (
          <g>
            <circle cx={hall.entry.x} cy={hall.entry.y} r={1} fill="#C15F3C" />
            <text
              x={hall.entry.x + 2}
              y={hall.entry.y + 0.6}
              style={{ fontSize: '2.2px', fill: '#C15F3C', fontStyle: 'italic', fontWeight: 500 }}
            >
              {hall.entry.label || 'Entry'}
            </text>
          </g>
        )}

        {/* Soft drop-shadows — drawn first so they sit under everything */}
        {hall.racks.map((rack) => (
          <rect
            key={`sh-${rack.number}`}
            x={rack.x + 0.18}
            y={rack.y + 0.22}
            width={rack.w}
            height={rack.h}
            fill="#000"
            fillOpacity={0.14}
            rx={0.35}
            pointerEvents="none"
          />
        ))}

        {/* Racks */}
        {hall.racks.map((rack, i) => {
          const util = utilization[rack.number] ?? 50
          const gradId =
            util > 90 ? `rackGrad-full-${hall.hall}` :
            util > 70 ? `rackGrad-mid-${hall.hall}` :
            util > 30 ? `rackGrad-low-${hall.hall}` :
            `rackGrad-empty-${hall.hall}`
          const strokeShade =
            util > 90 ? '#7A2D1F' :
            util > 70 ? '#7A5A2A' :
            util > 30 ? '#414B30' :
            '#8A8472'
          const bottomShade =
            util > 90 ? '#7A2D1F' :
            util > 70 ? '#7A5A2A' :
            util > 30 ? '#414B30' :
            '#9D9682'

          const isHovered = hovered === rack.number
          const isSelected = selectedRack === rack.number
          const isOptional = rack.note?.includes('sometimes')
          // Cap depth so it never bleeds into the next rack visually
          const depth = Math.min(rack.h * 0.18, 0.4)

          return (
            <motion.g
              key={rack.number}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: i * 0.005, ease: 'easeOut' }}
              onMouseEnter={() => setHovered(rack.number)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onRackClick?.(rack)}
              style={{ cursor: onRackClick ? 'pointer' : 'default' }}
            >
              {/* Bottom edge (creates depth without overlapping neighbors) */}
              <rect
                x={rack.x}
                y={rack.y + rack.h - depth}
                width={rack.w}
                height={depth}
                fill={bottomShade}
                fillOpacity={0.55}
                rx={0.35}
              />
              {/* Top face */}
              <rect
                x={rack.x}
                y={rack.y}
                width={rack.w}
                height={rack.h - depth + 0.05}
                fill={`url(#${gradId})`}
                stroke={isSelected ? '#C15F3C' : strokeShade}
                strokeWidth={isSelected ? 0.45 : 0.18}
                strokeOpacity={0.7}
                strokeDasharray={isOptional ? '0.5 0.35' : '0'}
                rx={0.35}
                style={{
                  filter: isHovered || isSelected ? 'brightness(1.08)' : 'none',
                  transition: 'filter 0.15s ease-out',
                }}
              />
              {/* Top highlight — a thin lighter band, only on larger racks */}
              {rack.h > 3 && (
                <rect
                  x={rack.x + 0.25}
                  y={rack.y + 0.2}
                  width={rack.w - 0.5}
                  height={0.5}
                  fill="white"
                  fillOpacity={0.22}
                  rx={0.2}
                  pointerEvents="none"
                />
              )}
              {/* Selection ring */}
              {isSelected && (
                <rect
                  x={rack.x - 0.4}
                  y={rack.y - 0.4}
                  width={rack.w + 0.8}
                  height={rack.h + 0.8}
                  fill="none"
                  stroke="#C15F3C"
                  strokeWidth={0.25}
                  rx={0.6}
                  pointerEvents="none"
                />
              )}
              <text
                x={rack.x + rack.w / 2}
                y={rack.y + (rack.h - depth) / 2 + 0.75}
                textAnchor="middle"
                style={{
                  fontSize: rack.w > 5 ? '2px' : '1.5px',
                  fill: util > 30 ? '#FAF9F5' : '#2A2725',
                  fontWeight: 600,
                  pointerEvents: 'none',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.05px',
                }}
              >
                {rack.number}
              </text>
            </motion.g>
          )
        })}
      </svg>

      {/* Hover tooltip */}
      {hovered && (
        <div className="absolute top-3 right-3 bg-card border border-border rounded-md px-3 py-2 shadow-md text-xs pointer-events-none">
          <p className="font-mono font-bold">Rack {hovered}</p>
          {contents[hovered] && <p className="text-muted-foreground mt-0.5">{contents[hovered]}</p>}
          {utilization[hovered] !== undefined && (
            <p className="text-[10px] mt-1">{utilization[hovered]}% utilized</p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[10px] flex-wrap">
        <LegendDot color="#D8D3C4" label="Empty" />
        <LegendDot color="#7D8A5D" label="< 70%" />
        <LegendDot color="#C89A4E" label="70–90%" />
        <LegendDot color="#C8553D" label="> 90% full" />
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-3 h-3 rounded-sm border border-dashed border-muted-foreground/50" />
          <span className="text-muted-foreground">Optional</span>
        </div>
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, opacity: 0.7 }} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  )
}
