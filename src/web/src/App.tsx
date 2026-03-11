import { useState, useMemo } from 'react'
import './App.css'

type Stock = 'in_stock' | 'low_stock' | 'out_of_stock'

type SearchResult = {
  productName: string
  storeName: string
  price: number
  distanceMi: number
  stock: Stock
  community: boolean
}

const POPULAR = ['milk', 'infant formula', 'eggs', 'ibuprofen', 'diapers']

const STOCK_LABEL: Record<Stock, string> = {
  in_stock: 'In Stock',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const d = await res.json()
    const addr = d.address
    return addr.city || addr.town || addr.village || addr.county || 'your area'
  } catch {
    return 'your area'
  }
}

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationLabel, setLocationLabel] = useState<string | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'price' | 'distance'>('price')
  const [showDealModal, setShowDealModal] = useState(false)
  const [dealForm, setDealForm] = useState({ productName: '', storeName: '', price: '' })
  const [dealPosting, setDealPosting] = useState(false)
  const [dealSuccess, setDealSuccess] = useState(false)

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
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      setLocation(coords)
      const label = await reverseGeocode(coords.lat, coords.lng)
      setLocationLabel(label)
    }, () => setLocationError('Location denied or unavailable'))
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

  async function handlePostDeal(e: React.FormEvent) {
    e.preventDefault()
    const price = parseFloat(dealForm.price)
    if (!dealForm.productName || !dealForm.storeName || isNaN(price) || price <= 0) return
    setDealPosting(true)
    try {
      await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: dealForm.productName, storeName: dealForm.storeName, price }),
      })
      setDealSuccess(true)
      setTimeout(() => {
        setShowDealModal(false)
        setDealSuccess(false)
        setDealForm({ productName: '', storeName: '', price: '' })
        search(dealForm.productName)
      }, 1200)
    } finally {
      setDealPosting(false)
    }
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
        {locationLabel && (
          <span className="location-badge">Near {locationLabel}</span>
        )}
        {locationError && <span className="location-error">{locationError}</span>}
      </div>

      <div className="chips">
        {POPULAR.map((p) => (
          <button key={p} type="button" className="chip" onClick={() => handleChip(p)}>
            {p}
          </button>
        ))}
        <button type="button" className="chip chip-deal" onClick={() => setShowDealModal(true)}>
          + Post a Deal
        </button>
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
                <div key={i} className={`result-card${isBest ? ' best' : ''}${r.community ? ' community' : ''}`}>
                  <div className="card-top">
                    <div className="card-left">
                      {isBest && <span className="best-badge">Best Price</span>}
                      {r.community && <span className="community-badge">Community Deal</span>}
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

      {showDealModal && (
        <div className="modal-overlay" onClick={() => setShowDealModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Post a Deal</h2>
            <p className="modal-sub">Spotted a great price? Share it with your community.</p>
            {dealSuccess ? (
              <p className="deal-success">Deal posted! Thanks for contributing.</p>
            ) : (
              <form onSubmit={handlePostDeal}>
                <label>Product</label>
                <input
                  type="text"
                  placeholder="e.g. milk, diapers..."
                  value={dealForm.productName}
                  onChange={(e) => setDealForm((f) => ({ ...f, productName: e.target.value }))}
                  required
                />
                <label>Store</label>
                <input
                  type="text"
                  placeholder="e.g. Walmart, Aldi..."
                  value={dealForm.storeName}
                  onChange={(e) => setDealForm((f) => ({ ...f, storeName: e.target.value }))}
                  required
                />
                <label>Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 1.99"
                  value={dealForm.price}
                  onChange={(e) => setDealForm((f) => ({ ...f, price: e.target.value }))}
                  required
                />
                <div className="modal-actions">
                  <button type="button" className="btn-ghost" onClick={() => setShowDealModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" disabled={dealPosting}>
                    {dealPosting ? 'Posting…' : 'Post Deal'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

export default App
