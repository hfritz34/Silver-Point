import { useState, useMemo, useRef } from 'react'

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

  const maxPrice = sorted ? Math.max(...sorted.map((r) => r.price)) : 0

  return (
    <div className="tab-content">
      <div className="search-wrap">
        <div className="search">
          <div className="input-wrap">
            <input
              type="text"
              placeholder="Search for a product..."
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
              <ul className="suggestions">
                {suggestions.map((s) => (
                  <li key={s} onMouseDown={() => handleSuggestionClick(s)}>
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button type="button" onClick={() => search(query)} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
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
                  {onAddToList && (
                    <button
                      type="button"
                      className="add-to-list-btn"
                      onClick={() => onAddToList(r.productName)}
                    >
                      + Add to List
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {sorted && sorted.length === 0 && <p className="no-results">No results found.</p>}
    </div>
  )
}
