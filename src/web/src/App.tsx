import { useState, useMemo } from 'react'
import './App.css'

type Stock = 'in_stock' | 'low_stock' | 'out_of_stock'

type SearchResult = {
  productName: string
  storeName: string
  price: number
  distanceMi: number
  stock: Stock
}

const POPULAR = ['milk', 'infant formula', 'eggs', 'ibuprofen', 'diapers']

const STOCK_LABEL: Record<Stock, string> = {
  in_stock: 'In Stock',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
}

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'price' | 'distance'>('price')

  const sorted = useMemo(() => {
    if (!results) return null
    return [...results].sort((a, b) =>
      sortBy === 'price' ? a.price - b.price : a.distanceMi - b.distanceMi
    )
  }, [results, sortBy])

  function handleUseLocation() {
    setLocationError(null)
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationError('Location denied or unavailable')
    )
  }

  async function search(q: string) {
    const trimmed = q.trim()
    if (!trimmed) return
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

  const maxPrice = sorted ? Math.max(...sorted.map((r) => r.price)) : 0

  return (
    <main>
      <header>
        <h1>SilverPoint</h1>
        <p className="tagline">Find the lowest price near you.</p>
      </header>

      <div className="search">
        <input
          type="text"
          placeholder="Search for a product..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search(query)}
        />
        <button type="button" onClick={() => search(query)} disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      <div className="location">
        <button type="button" className="location-btn" onClick={handleUseLocation}>
          📍 Use my location
        </button>
        {location && <span className="location-badge">Location active</span>}
        {locationError && <span className="location-error">{locationError}</span>}
      </div>

      <div className="chips">
        {POPULAR.map((p) => (
          <button key={p} type="button" className="chip" onClick={() => handleChip(p)}>
            {p}
          </button>
        ))}
      </div>

      {sorted && sorted.length > 0 && (
        <>
          <div className="sort-controls">
            <span className="sort-label">Sort by</span>
            <button
              type="button"
              className={sortBy === 'price' ? 'sort-btn active' : 'sort-btn'}
              onClick={() => setSortBy('price')}
            >
              Price
            </button>
            <button
              type="button"
              className={sortBy === 'distance' ? 'sort-btn active' : 'sort-btn'}
              onClick={() => setSortBy('distance')}
            >
              Distance
            </button>
          </div>

          <div className="results">
            {sorted.map((r, i) => {
              const savings = maxPrice - r.price
              const isBest = i === 0 && sortBy === 'price'
              return (
                <div key={i} className={`result-card${isBest ? ' best' : ''}`}>
                  <div className="card-top">
                    <div className="card-left">
                      {isBest && <span className="best-badge">Best Price</span>}
                      <span className="store-name">{r.storeName}</span>
                    </div>
                    <span className="distance">{r.distanceMi} mi</span>
                  </div>
                  <div className="card-bottom">
                    <span className="price">${r.price.toFixed(2)}</span>
                    <span className={`stock-badge ${r.stock}`}>{STOCK_LABEL[r.stock]}</span>
                    {savings > 0.005 && sortBy === 'price' && (
                      <span className="savings">Save ${savings.toFixed(2)} vs most expensive</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {sorted && sorted.length === 0 && <p className="no-results">No results found.</p>}
    </main>
  )
}

export default App
