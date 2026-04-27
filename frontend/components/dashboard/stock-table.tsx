'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/animations'
import {
  MoreHorizontal,
  ArrowUpDown,
  Eye,
  Edit,
  Trash2,
  Tag,
  MapPin,
  Filter,
  LayoutGrid,
  List,
  X,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { stockTypeLabels, stockTypeColors } from '@/lib/data'
import type { Stock, ClassificationPath } from '@/lib/types'
import { inferClassification, matchesClassification } from '@/lib/classification'
import { ClassificationFilter } from './classification-filter'
import { COLOR_CATEGORIES, COLOR_HEX, extractColorFromCode, getColorGender } from '@/lib/colors'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type SortField = 'code' | 'quantity' | 'daysInStock' | 'purchasePrice'
type SortDirection = 'asc' | 'desc'

export function StockTable() {
  const { stocks, stockFilters, setStockFilters, setSelectedStock, viewMode, setViewMode } = useAppStore()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>('daysInStock')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [colorFilter, setColorFilter] = useState('all')
  const [genderFilter, setGenderFilter] = useState<'all' | 'Ladies' | 'Gents' | 'Universal'>('all')
  const [classFilter, setClassFilter] = useState<ClassificationPath>({})

  // Use formal color taxonomy from lib/colors.ts
  const COLORS_LIST = [
    ...COLOR_CATEGORIES.Ladies,
    ...COLOR_CATEGORIES.Gents,
    ...COLOR_CATEGORIES.Universal,
  ]
  const getColor = (code: string) => extractColorFromCode(code)

  // Filter stocks
  const filteredStocks = stocks.filter((stock) => {
    if (
      stockFilters.search &&
      !stock.code.toLowerCase().includes(stockFilters.search.toLowerCase()) &&
      !stock.fabricType.toLowerCase().includes(stockFilters.search.toLowerCase())
    ) {
      return false
    }
    if (stockFilters.stockType.length > 0 && !stockFilters.stockType.includes(stock.stockType)) {
      return false
    }
    if (stockFilters.qualityGrade.length > 0 && !stockFilters.qualityGrade.includes(stock.qualityGrade)) {
      return false
    }
    if (stockFilters.status.length > 0 && !stockFilters.status.includes(stock.status)) {
      return false
    }
    if (colorFilter !== 'all' && !stock.code.toUpperCase().includes(colorFilter)) return false
    if (genderFilter !== 'all') {
      const c = extractColorFromCode(stock.code)
      if (!c || getColorGender(c) !== genderFilter) return false
    }
    // Hierarchical classification filter
    if (Object.keys(classFilter).length > 0) {
      const inferred = stock.category ? stock : { ...stock, ...inferClassification(stock.fabricType, stock.code) }
      if (!matchesClassification(inferred as any, classFilter)) return false
    }
    if (stock.daysInStock < stockFilters.minDaysInStock || stock.daysInStock > stockFilters.maxDaysInStock) {
      return false
    }
    return true
  })

  // Sort stocks
  const sortedStocks = [...filteredStocks].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    const modifier = sortDirection === 'asc' ? 1 : -1
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return aValue.localeCompare(bValue) * modifier
    }
    return ((aValue as number) - (bValue as number)) * modifier
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === sortedStocks.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(sortedStocks.map((s) => s.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const getStatusColor = (status: Stock['status']) => {
    switch (status) {
      case 'urgent':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'reserved':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'sold':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    }
  }

  const hasActiveFilters = 
    stockFilters.search || 
    stockFilters.stockType.length > 0 || 
    stockFilters.qualityGrade.length > 0 ||
    stockFilters.status.length > 0

  return (
    <div className="space-y-4">
      {/* TDM Hierarchical Classification Filter */}
      <div className="rounded-bento border border-border bg-card p-6 shadow-bento-soft">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Quality classification</p>
          <Badge variant="outline" className="rounded-full text-xs py-1 px-3 bg-muted">{filteredStocks.length} items</Badge>
        </div>
        <ClassificationFilter value={classFilter} onChange={setClassFilter} />
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder="Search stock code or fabric..."
            value={stockFilters.search}
            onChange={(e) => setStockFilters({ search: e.target.value })}
            className="pr-8"
          />
          {stockFilters.search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 size-6"
              onClick={() => setStockFilters({ search: '' })}
            >
              <X className="size-3" />
            </Button>
          )}
        </div>

        <Select
          value={stockFilters.stockType[0] || 'all'}
          onValueChange={(value) =>
            setStockFilters({ stockType: value === 'all' ? [] : [value] })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Stock Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(stockTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>


        <Select
          value={stockFilters.status[0] || 'all'}
          onValueChange={(value) =>
            setStockFilters({ status: value === 'all' ? [] : [value] })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
          </SelectContent>
        </Select>

        <Select value={genderFilter} onValueChange={(v) => setGenderFilter(v as any)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Color group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All groups</SelectItem>
            <SelectItem value="Ladies">👗 Ladies</SelectItem>
            <SelectItem value="Gents">🧥 Gents</SelectItem>
            <SelectItem value="Universal">⚪ Universal</SelectItem>
          </SelectContent>
        </Select>

        <Select value={colorFilter} onValueChange={setColorFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Color" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Colors</SelectItem>
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Ladies</div>
            {COLOR_CATEGORIES.Ladies.map((c) => (
              <SelectItem key={c} value={c}>
                <span className="inline-flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: COLOR_HEX[c] }} />
                  {c}
                </span>
              </SelectItem>
            ))}
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Gents</div>
            {COLOR_CATEGORIES.Gents.map((c) => (
              <SelectItem key={c} value={c}>
                <span className="inline-flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: COLOR_HEX[c] }} />
                  {c}
                </span>
              </SelectItem>
            ))}
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Universal</div>
            {COLOR_CATEGORIES.Universal.map((c) => (
              <SelectItem key={c} value={c}>
                <span className="inline-flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: COLOR_HEX[c] }} />
                  {c}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(hasActiveFilters || colorFilter !== 'all' || genderFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setStockFilters({ search: '', stockType: [], qualityGrade: [], status: [] }); setColorFilter('all'); setGenderFilter('all') }}
            className="text-muted-foreground"
          >
            <X className="mr-1 size-3" />
            Clear filters
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {filteredStocks.length} items
          </span>
          <div className="flex rounded-md border border-border">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="icon"
              className="size-8 rounded-r-none"
              onClick={() => setViewMode('table')}
            >
              <List className="size-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="size-8 rounded-l-none"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Selected Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <span className="text-sm font-medium">
            {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <Button variant="outline" size="sm">
            <Tag className="mr-1 size-3" />
            Tag
          </Button>
          <Button variant="outline" size="sm">
            <MapPin className="mr-1 size-3" />
            Move
          </Button>
          <Button variant="outline" size="sm" className="text-destructive">
            <Trash2 className="mr-1 size-3" />
            Delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setSelectedIds([])}
          >
            Clear selection
          </Button>
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' ? (
        <motion.div className="rounded-bento border border-border bg-card p-2 shadow-bento-soft overflow-hidden" variants={fadeInUp} initial="hidden" animate="visible">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === sortedStocks.length && sortedStocks.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 font-medium"
                    onClick={() => handleSort('code')}
                  >
                    Stock Code
                    <ArrowUpDown className="ml-1 size-3" />
                  </Button>
                </TableHead>
                <TableHead>Fabric Type</TableHead>
                <TableHead>Stock Type</TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-mr-3 h-8 font-medium"
                    onClick={() => handleSort('quantity')}
                  >
                    Quantity
                    <ArrowUpDown className="ml-1 size-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-mr-3 h-8 font-medium"
                    onClick={() => handleSort('purchasePrice')}
                  >
                    Price
                    <ArrowUpDown className="ml-1 size-3" />
                  </Button>
                </TableHead>
                <TableHead>Location</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 font-medium"
                    onClick={() => handleSort('daysInStock')}
                  >
                    Age
                    <ArrowUpDown className="ml-1 size-3" />
                  </Button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStocks.map((stock) => (
                <TableRow
                  key={stock.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedStock(stock.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(stock.id)}
                      onCheckedChange={() => toggleSelect(stock.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono font-medium">{stock.code}</TableCell>
                  <TableCell>{stock.fabricType}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={stockTypeColors[stock.stockType]}
                    >
                      {stockTypeLabels[stock.stockType]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {stock.quantity.toLocaleString()}m
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    Rs {stock.purchasePrice}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">
                      {stock.rackLocation}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-medium ${
                        stock.daysInStock > 60
                          ? 'text-red-400'
                          : stock.daysInStock > 30
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {stock.daysInStock}d
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(stock.status)}>
                      {stock.status}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedStock(stock.id)}>
                          <Eye className="mr-2 size-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Tag className="mr-2 size-4" />
                          Add Tag
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <MapPin className="mr-2 size-4" />
                          Move Location
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      ) : (
        /* Grid View */
        <motion.div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" variants={fadeInUp} initial="hidden" animate="visible">
          {sortedStocks.map((stock) => (
            <div
              key={stock.id}
              onClick={() => setSelectedStock(stock.id)}
              className="group cursor-pointer rounded-bento border border-border bg-card p-6 shadow-bento-soft transition-all hover:border-primary/50 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-mono font-semibold">{stock.code}</h3>
                  <p className="text-sm text-muted-foreground">{stock.fabricType}</p>
                </div>
                <Badge variant="outline" className={getStatusColor(stock.status)}>
                  {stock.status}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Quantity</span>
                  <p className="font-mono font-medium">{stock.quantity.toLocaleString()}m</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Price</span>
                  <p className="font-mono font-medium">Rs {stock.purchasePrice}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Location</span>
                  <p className="font-mono font-medium">{stock.rackLocation}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Age</span>
                  <p
                    className={`font-medium ${
                      stock.daysInStock > 60
                        ? 'text-red-400'
                        : stock.daysInStock > 30
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {stock.daysInStock} days
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <Badge variant="outline" className={stockTypeColors[stock.stockType]}>
                  {stockTypeLabels[stock.stockType]}
                </Badge>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
