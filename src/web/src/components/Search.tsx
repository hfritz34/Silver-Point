import { useState, useMemo, useRef } from 'react'
import {
  Clock3,
  MapPin,
  Plus,
  Search as SearchIcon,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

type Stock = 'in_stock' | 'low_stock' | 'out_of_stock'

type SearchResult = {
  productName: string
  storeName: string
  price: number
  distanceMi: number
  stock: Stock
  community: boolean
  verifiedAt: string | null
  source: string
  confidence: number
}

const POPULAR = ['milk', 'infant formula', 'eggs', 'ibuprofen', 'diapers']

const STOCK_LABEL: Record<Stock, string> = {
  in_stock: 'In Stock',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
}

const SOURCE_LABEL: Record<string, string> = {
  demo: 'Demo estimate',
  kroger_api: 'Retailer API',
  receipt: 'Receipt verified',
  vendor: 'Store submitted',
  manual: 'Community posted',
  community: 'Community posted',
}

function formatFreshness(verifiedAt: string | null) {
  if (!verifiedAt) return 'No live timestamp'

  const verifiedMs = new Date(verifiedAt).getTime()
  if (Number.isNaN(verifiedMs)) return 'Timestamp pending'

  const diffMinutes = Math.max(0, Math.floor((Date.now() - verifiedMs) / 60000))
  if (diffMinutes < 1) return 'Verified just now'
  if (diffMinutes < 60) return `Verified ${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `Verified ${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  return `Verified ${diffDays}d ago`
}

type Props = {
  location: { lat: number; lng: number } | null
  onAddToList?: (product: string) => void
}

export default function Search({ location, onAddToList }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState<'price' | 'distance'>('price')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return POPULAR
    return POPULAR.filter((p) => p.includes(q) && p !== q)
  }, [query])

  const sorted = useMemo(() => {
    if (!results) return null
    return [...results].sort((a, b) =>
      sortBy === 'price' ? a.price - b.price : a.distanceMi - b.distanceMi
    )
  }, [results, sortBy])

  async function search(q: string) {
    const trimmed = q.trim()
    if (!trimmed) return
    setShowSuggestions(false)
    setLoading(true)
    setResults(null)
    setSortBy('price')
    try {
      let url = `/api/search?q=${encodeURIComponent(trimmed)}`
      if (location) url += `&lat=${location.lat}&lng=${location.lng}`
      const res = await fetch(url)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  function handleChip(chip: string) {
    setQuery(chip)
    search(chip)
  }

  function handleInputChange(val: string) {
    setQuery(val)
    setShowSuggestions(true)
  }

  function handleInputBlur() {
    blurTimeout.current = setTimeout(() => setShowSuggestions(false), 150)
  }

  function handleSuggestionClick(s: string) {
    if (blurTimeout.current) clearTimeout(blurTimeout.current)
    setQuery(s)
    search(s)
  }

  const maxPrice = sorted && sorted.length > 0 ? Math.max(...sorted.map((r) => r.price)) : 0

  return (
    <div className="tab-content space-y-5">
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground">Search local prices</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compare store prices, stock, distance, and community freshness.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Search for milk, eggs, formula..."
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={handleInputBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') search(query)
                if (e.key === 'Escape') setShowSuggestions(false)
              }}
              className="h-10"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute top-[calc(100%+0.35rem)] z-50 w-full rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg">
                {suggestions.map((s) => (
                  <li
                    key={s}
                    className="cursor-pointer rounded-md px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors"
                    onMouseDown={() => handleSuggestionClick(s)}
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button
            type="button"
            onClick={() => search(query)}
            disabled={loading}
            className="sm:w-28 h-10"
          >
            <SearchIcon className="size-3.5" />
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {POPULAR.map((p) => (
            <Button
              key={p}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleChip(p)}
              className="h-7 rounded-full text-xs hover:border-primary/50 hover:text-primary transition-colors"
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="grid gap-3">
          {[0, 1, 2].map((item) => (
            <Card key={item}>
              <CardContent className="space-y-3 pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-36" />
                  </div>
                  <Skeleton className="h-4 w-14" />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {sorted && sorted.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <SlidersHorizontal className="size-3.5" />
              Sort by
            </span>
            <Button
              type="button"
              variant={sortBy === 'price' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSortBy('price')}
            >
              Price
            </Button>
            <Button
              type="button"
              variant={sortBy === 'distance' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSortBy('distance')}
            >
              Distance
            </Button>
          </div>

          <div className="grid gap-2.5">
            {sorted.map((r, i) => {
              const savings = maxPrice - r.price
              const isBest = i === 0 && sortBy === 'price'
              return (
                <Card
                  key={`${r.storeName}-${r.productName}-${i}`}
                  className={
                    isBest
                      ? 'border-primary/50 bg-primary/[0.03]'
                      : r.community
                        ? 'border-sky-500/30'
                        : undefined
                  }
                >
                  <CardContent className="space-y-3.5 pt-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap gap-1.5">
                          {isBest && (
                            <Badge className="gap-1 bg-primary text-primary-foreground hover:bg-primary text-[0.65rem] px-2 py-0.5">
                              <Sparkles className="size-3" />
                              Best Price
                            </Badge>
                          )}
                          {r.community && (
                            <Badge variant="secondary" className="text-[0.65rem] px-2 py-0.5">Community Deal</Badge>
                          )}
                        </div>
                        <div>
                          <h3 className="text-base font-semibold leading-tight">{r.storeName}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{r.productName}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0 gap-1 text-[0.65rem]">
                        <MapPin className="size-3" />
                        {r.distanceMi} mi
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-2xl font-bold tabular-nums${isBest ? ' text-primary' : ''}`}>
                        ${r.price.toFixed(2)}
                      </span>
                      <Badge
                        variant={r.stock === 'out_of_stock' ? 'destructive' : 'outline'}
                        className={
                          r.stock === 'in_stock'
                            ? 'border-primary/30 text-primary text-[0.65rem]'
                            : r.stock === 'low_stock'
                              ? 'border-amber-500/40 text-amber-600 text-[0.65rem]'
                              : 'text-[0.65rem]'
                        }
                      >
                        {STOCK_LABEL[r.stock]}
                      </Badge>
                      {savings > 0.005 && sortBy === 'price' && (
                        <Badge
                          variant="outline"
                          className="border-primary/20 bg-primary/10 text-primary text-[0.65rem]"
                        >
                          Save ${savings.toFixed(2)}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.7rem] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="size-3" />
                        {SOURCE_LABEL[r.source] ?? 'Community data'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="size-3" />
                        {formatFreshness(r.verifiedAt)}
                      </span>
                      <span>{Math.round(r.confidence * 100)}% confidence</span>
                    </div>

                    {onAddToList && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10"
                        onClick={() => onAddToList(r.productName)}
                      >
                        <Plus className="size-3.5" />
                        Add to List
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {sorted && sorted.length === 0 && !loading && (
        <div className="flex flex-col items-center py-14 text-center">
          <SearchIcon className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No results found</p>
          <p className="text-xs text-muted-foreground/70 mt-1 mb-4">Try one of the popular searches below</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {POPULAR.map((p) => (
              <Button
                key={p}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleChip(p)}
                className="h-7 rounded-full text-xs"
              >
                {p}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
