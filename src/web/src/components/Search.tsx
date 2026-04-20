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
  CardDescription,
  CardHeader,
  CardTitle,
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
    <div className="tab-content space-y-4">
      <Card className="overflow-visible">
        <CardHeader className="gap-1">
          <CardTitle className="flex items-center gap-2 text-xl">
            <SearchIcon className="size-5" />
            Search local prices
          </CardTitle>
          <CardDescription>
            Compare store prices, stock, distance, and community freshness.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute top-[calc(100%+0.35rem)] z-50 w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                {suggestions.map((s) => (
                  <li
                    key={s}
                    className="cursor-pointer rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                    onMouseDown={() => handleSuggestionClick(s)}
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
            <Button type="button" onClick={() => search(query)} disabled={loading} className="sm:w-32">
              {loading ? 'Searching...' : 'Search'}
            </Button>
        </div>

          <div className="flex flex-wrap gap-2">
            {POPULAR.map((p) => (
              <Button
                key={p}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleChip(p)}
                className="h-8 rounded-full"
              >
                {p}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="grid gap-3">
          {[0, 1, 2].map((item) => (
            <Card key={item}>
              <CardContent className="space-y-3 pt-6">
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
            <Badge variant="outline" className="gap-1.5">
              <SlidersHorizontal className="size-3.5" />
              Sort by
            </Badge>
            <Button
              type="button"
              variant={sortBy === 'price' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('price')}
            >
              Price
            </Button>
            <Button
              type="button"
              variant={sortBy === 'distance' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('distance')}
            >
              Distance
            </Button>
          </div>

          <div className="grid gap-3">
            {sorted.map((r, i) => {
              const savings = maxPrice - r.price
              const isBest = i === 0 && sortBy === 'price'
              return (
                <Card
                  key={`${r.storeName}-${r.productName}-${i}`}
                  className={isBest ? 'border-emerald-500/50' : r.community ? 'border-sky-500/40' : undefined}
                >
                  <CardContent className="space-y-4 pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {isBest && (
                            <Badge className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-600">
                              <Sparkles className="size-3.5" />
                              Best Price
                            </Badge>
                          )}
                          {r.community && (
                            <Badge variant="secondary">Community Deal</Badge>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold leading-tight">{r.storeName}</h3>
                          <p className="text-sm text-muted-foreground">{r.productName}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0 gap-1.5">
                        <MapPin className="size-3.5" />
                        {r.distanceMi} mi
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-3xl font-bold">${r.price.toFixed(2)}</span>
                      <Badge
                        variant={r.stock === 'out_of_stock' ? 'destructive' : 'outline'}
                        className={
                          r.stock === 'in_stock'
                            ? 'border-emerald-500/30 text-emerald-600'
                            : r.stock === 'low_stock'
                              ? 'border-amber-500/40 text-amber-600'
                              : undefined
                        }
                      >
                        {STOCK_LABEL[r.stock]}
                      </Badge>
                    {savings > 0.005 && sortBy === 'price' && (
                        <Badge variant="secondary">Save ${savings.toFixed(2)}</Badge>
                    )}
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="size-3.5" />
                        {SOURCE_LABEL[r.source] ?? 'Community data'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="size-3.5" />
                        {formatFreshness(r.verifiedAt)}
                      </span>
                      <span>{Math.round(r.confidence * 100)}% confidence</span>
                    </div>

                    {onAddToList && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onAddToList(r.productName)}
                      >
                        <Plus className="size-4" />
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
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No results found.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
