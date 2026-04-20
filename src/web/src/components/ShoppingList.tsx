import { useState, useMemo } from 'react'

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
    <div className="tab-content">
      <div className="section-header">
        <h2>My Shopping List</h2>
        <p className="text-muted">Add items and find the cheapest combination of stores.</p>
      </div>

      <div className="list-input">
        <input
          type="text"
          placeholder="Add an item (e.g. milk, eggs...)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addItem() }}
        />
        <button type="button" onClick={addItem}>Add</button>
      </div>

      {items.length > 0 && (
        <div className="list-items">
          {items.map((item, i) => (
            <div key={i} className="list-item">
              <span>{item}</span>
              <button type="button" className="remove-btn" onClick={() => removeItem(i)}>
                &#10005;
              </button>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="optimize-controls">
          <div className="mode-toggle">
            <button
              type="button"
              className={mode === 'cheapest' ? 'sort-btn active' : 'sort-btn'}
              onClick={() => { setMode('cheapest'); setRoutes(null) }}
            >
              Cheapest Overall
            </button>
            <button
              type="button"
              className={mode === 'fewest_stops' ? 'sort-btn active' : 'sort-btn'}
              onClick={() => { setMode('fewest_stops'); setRoutes(null) }}
            >
              Fewest Stops
            </button>
          </div>
          <button type="button" className="optimize-btn" onClick={optimize} disabled={loading}>
            {loading ? 'Optimizing...' : 'Find Best Route'}
          </button>
        </div>
      )}

      {routes && routes.length > 0 && (
        <div className="route-results">
          <div className="route-summary">
            <div className="summary-stat">
              <span className="stat-value">${totalCost.toFixed(2)}</span>
              <span className="stat-label">Total Cost</span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">{totalStores}</span>
              <span className="stat-label">{totalStores === 1 ? 'Store' : 'Stores'}</span>
            </div>
          </div>

          {routes.map((route, i) => (
            <div key={i} className="route-card">
              <div className="route-card-header">
                <div>
                  <span className="route-step">Stop {i + 1}</span>
                  <span className="store-name">{route.storeName}</span>
                </div>
                <span className="distance">{route.distanceMi} mi</span>
              </div>
              <div className="route-items">
                {route.items.map((item, j) => (
                  <div key={j} className="route-item">
                    <span>{item.name}</span>
                    <span className="price">${item.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="route-subtotal">
                Subtotal: <strong>${route.subtotal.toFixed(2)}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      {routes && routes.length === 0 && (
        <p className="no-results">Could not find prices for these items.</p>
      )}

      {items.length === 0 && (
        <div className="empty-list">
          <p className="text-muted">
            Your list is empty. Add items above or use "Add to List" from search results.
          </p>
        </div>
      )}
    </div>
  )
}
