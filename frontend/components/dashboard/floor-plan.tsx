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
}

const featureColor = {
  pillar: '#8B7D6B',
  staircase: '#C89A4E',
  door: '#7D8A5D',
  sofa: '#C89A4E',
  'shair-case': '#C89A4E',
}

export function FloorPlan({ hall, utilization = {}, contents = {}, onRackClick, selectedRack }: Props) {
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
        className="w-full h-auto border border-border rounded-lg bg-[#FAF9F5] dark:bg-[#242320]"
        style={{ maxHeight: '70vh' }}
      >
        {/* Hall boundary */}
        <motion.rect
          x={2}
          y={2}
          width={hall.width - 4}
          height={hall.height - 4}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.3}
          className="text-border"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />

        {/* Grid pattern (subtle) */}
        <defs>
          <pattern id={`grid-${hall.hall}`} width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="currentColor" strokeWidth="0.08" className="text-muted-foreground/20" />
          </pattern>
        </defs>
        <rect x={2} y={2} width={hall.width - 4} height={hall.height - 4} fill={`url(#grid-${hall.hall})`} />

        {/* Hall label */}
        <text
          x={hall.width / 2}
          y={hall.height - 3}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: '2.5px', fontFamily: 'Instrument Serif, serif', fontStyle: 'italic' }}
        >
          {hall.label} · {hall.racks.length} racks
        </text>

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
                y={f.y + f.h / 2 + 0.5}
                textAnchor="middle"
                style={{ fontSize: '1.5px', fill: featureColor[f.type], fontStyle: 'italic' }}
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
              y={hall.entry.y + 0.5}
              style={{ fontSize: '1.8px', fill: '#C15F3C', fontStyle: 'italic' }}
            >
              {hall.entry.label || 'Entry'}
            </text>
          </g>
        )}

        {/* Racks */}
        {hall.racks.map((rack, i) => {
          const color = rackColor(rack.number)
          const isHovered = hovered === rack.number
          const isSelected = selectedRack === rack.number
          const isOptional = rack.note?.includes('sometimes')

          return (
            <motion.g
              key={rack.number}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: i * 0.01, ease: 'easeOut' }}
              onMouseEnter={() => setHovered(rack.number)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onRackClick?.(rack)}
              style={{ cursor: onRackClick ? 'pointer' : 'default' }}
            >
              <rect
                x={rack.x}
                y={rack.y}
                width={rack.w}
                height={rack.h}
                fill={color.fill}
                fillOpacity={isHovered || isSelected ? 0.95 : color.alpha}
                stroke={isSelected ? '#C15F3C' : color.stroke}
                strokeWidth={isSelected ? 0.5 : 0.2}
                strokeDasharray={isOptional ? '0.5 0.3' : '0'}
                rx={0.3}
                className="transition-all"
              />
              <text
                x={rack.x + rack.w / 2}
                y={rack.y + rack.h / 2 + 0.7}
                textAnchor="middle"
                style={{
                  fontSize: rack.w > 5 ? '1.8px' : '1.4px',
                  fill: isHovered || isSelected ? '#FAF9F5' : '#1F1E1C',
                  fontWeight: 500,
                  pointerEvents: 'none',
                  fontVariantNumeric: 'tabular-nums',
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
