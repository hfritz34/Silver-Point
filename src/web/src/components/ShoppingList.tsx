import { useState, useMemo } from 'react'
import { MapPin, ShoppingCart, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

type StoreRoute = {
  storeName: string
  items: { name: string; price: number }[]
  subtotal: number
  distanceMi: number
}

type Props = {
  location: { lat: number; lng: number } | null
  initialItems?: string[]
}

export default function ShoppingList({ location, initialItems = [] }: Props) {
  const [items, setItems] = useState<string[]>(initialItems)
  const [input, setInput] = useState('')
  const [routes, setRoutes] = useState<StoreRoute[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'cheapest' | 'fewest_stops'>('cheapest')

  function addItem() {
    const trimmed = input.trim()
    if (!trimmed || items.includes(trimmed.toLowerCase())) return
    setItems((prev) => [...prev, trimmed.toLowerCase()])
    setInput('')
    setRoutes(null)
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
    setRoutes(null)
  }

  async function optimize() {
    if (items.length === 0) return
    setLoading(true)
    setRoutes(null)
    try {
      let url = `/api/list/optimize?mode=${mode}`
      items.forEach((item) => { url += `&items=${encodeURIComponent(item)}` })
      if (location) url += `&lat=${location.lat}&lng=${location.lng}`
      const res = await fetch(url)
      const data = await res.json()
      setRoutes(Array.isArray(data) ? data : [])
    } catch {
      setRoutes([])
    } finally {
      setLoading(false)
    }
  }

  const totalCost = useMemo(
    () => routes?.reduce((sum, r) => sum + r.subtotal, 0) ?? 0,
    [routes]
  )

  const totalStores = routes?.length ?? 0

  return (
    <div className="tab-content space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">My Shopping List</h2>
        <p className="text-sm text-muted-foreground">Add items and find the cheapest combination of stores.</p>
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Add an item (e.g. milk, eggs...)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addItem() }}
          className="flex-1"
        />
        <Button type="button" onClick={addItem}>Add</Button>
      </div>

      {items.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-3 space-y-1">
            {items.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              >
                <span className="capitalize">{item}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeItem(i)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'cheapest' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setMode('cheapest'); setRoutes(null) }}
            >
              Cheapest Overall
            </Button>
            <Button
              type="button"
              variant={mode === 'fewest_stops' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setMode('fewest_stops'); setRoutes(null) }}
            >
              Fewest Stops
            </Button>
          </div>
          <Button type="button" className="w-full" onClick={optimize} disabled={loading}>
            {loading ? 'Optimizing...' : 'Find Best Route'}
          </Button>
        </div>
      )}

      {routes && routes.length > 0 && (
        <div className="space-y-3">
          <Card className="border-primary/30 bg-primary/[0.03]">
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold tabular-nums text-primary">${totalCost.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Total Cost</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{totalStores}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{totalStores === 1 ? 'Store' : 'Stores'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {routes.map((route, i) => (
            <Card key={i}>
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="secondary" className="text-[0.6rem] font-semibold uppercase tracking-wide mb-1">
                      Stop {i + 1}
                    </Badge>
                    <CardTitle className="text-base">{route.storeName}</CardTitle>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-1 shrink-0">
                    <MapPin className="size-3" />
                    {route.distanceMi} mi
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pb-4 space-y-2">
                <Separator />
                <div className="space-y-1.5">
                  {route.items.map((item, j) => (
                    <div key={j} className="flex justify-between text-sm py-0.5">
                      <span className="text-muted-foreground capitalize">{item.name}</span>
                      <span className="font-medium tabular-nums">${item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-semibold pt-0.5">
                  <span>Subtotal</span>
                  <span className="tabular-nums">${route.subtotal.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {routes && routes.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-6">
          Could not find prices for these items.
        </p>
      )}

      {items.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <ShoppingCart className="size-6 text-muted-foreground/60" />
          </div>
          <p className="text-sm text-muted-foreground">
            Your list is empty. Add items above or use<br />"Add to List" from search results.
          </p>
        </div>
      )}
    </div>
  )
}
