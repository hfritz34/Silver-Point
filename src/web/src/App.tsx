import { useState } from 'react'
import './App.css'

type SearchResult = {
  productName: string
  storeName: string
  price: number
  distanceMi: number
  inStock: boolean
}

type LocationStatus = 'idle' | 'loading' | 'set' | 'error'

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [searched, setSearched] = useState('')
  const [usingMock, setUsingMock] = useState(false)

  function handleUseLocation() {
    if (locationStatus === 'set') {
      setLocation(null)
      setLocationStatus('idle')
      return
    }
    setLocationStatus('loading')
    if (!navigator.geolocation) {
      setLocationStatus('error')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationStatus('set')
      },
      () => setLocationStatus('error')
    )
  }

  async function handleSearch() {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setResults(null)
    setFetchError(null)
    setSearched(q)
    setUsingMock(false)
    try {
      let url = `/api/search?q=${encodeURIComponent(q)}`
      if (location) url += `&lat=${location.lat}&lng=${location.lng}`
      const res = await fetch(url)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
      setUsingMock(!location)
    } catch {
      setFetchError('Could not reach the server. Is the API running?')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const cheapestPrice = results && results.length > 0 ? Math.min(...results.map(r => r.price)) : null
  const priciest = results && results.length > 0 ? Math.max(...results.map(r => r.price)) : null

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-mark">◈</span>
          <span className="logo-text">SilverPoint</span>
        </div>
        <p className="tagline">Find the lowest price near you</p>
      </header>

      <main className="main">
        <div className="search-section">
          <div className="search-bar">
            <svg className="search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="M15 15l-3-3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search milk, formula, olive oil…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="search-input"
              autoFocus
            />
            <button onClick={handleSearch} disabled={loading || !query.trim()} className="search-btn">
              {loading ? <span className="spinner" /> : 'Search'}
            </button>
          </div>

          <button
            onClick={handleUseLocation}
            className={[
              'location-btn',
              locationStatus === 'set' ? 'location-btn--active' : '',
              locationStatus === 'error' ? 'location-btn--error' : '',
            ].join(' ')}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="pin-icon">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {locationStatus === 'set'
              ? 'Location active · tap to clear'
              : locationStatus === 'loading'
              ? 'Getting location…'
              : locationStatus === 'error'
              ? 'Location unavailable'
              : 'Use my location'}
          </button>
        </div>

        {fetchError && <div className="error-banner">{fetchError}</div>}

        {loading && (
          <div className="results-list">
            {[1, 2, 3].map(i => <div key={i} className="card skeleton" />)}
          </div>
        )}

        {results && !loading && (
          results.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🔍</div>
              <p>No results found for "<strong>{searched}</strong>"</p>
              <p className="empty-sub">Try a different search term</p>
            </div>
          ) : (
            <>
              {usingMock && (
                <div className="mock-banner">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="pin-icon"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                  Demo prices — <button className="mock-banner-btn" onClick={handleUseLocation}>enable location</button> for real Kroger prices near you
                </div>
              )}
              <p className="results-count">
                {results.length} store{results.length !== 1 ? 's' : ''} found
                {cheapestPrice !== null && (
                  <> · lowest <strong>${cheapestPrice.toFixed(2)}</strong></>
                )}
              </p>
              <div className="results-list">
                {results.map((r, i) => {
                  const isCheapest = r.price === cheapestPrice
                  const savings =
                    isCheapest && priciest && priciest !== cheapestPrice
                      ? (priciest - cheapestPrice).toFixed(2)
                      : null
                  return (
                    <div key={i} className={`card ${isCheapest ? 'card--best' : ''}`}>
                      {isCheapest && <div className="best-badge">Best Deal</div>}
                      <div className="card-header">
                        <span className="store-name">{r.storeName}</span>
                        <span className="distance">{r.distanceMi} mi away</span>
                      </div>
                      <div className="price-row">
                        <span className="price">${r.price.toFixed(2)}</span>
                        {savings && (
                          <span className="savings">Save ${savings} vs highest</span>
                        )}
                      </div>
                      <div className="card-footer">
                        <span className="product-label">{r.productName}</span>
                        <span className={`stock-badge ${r.inStock ? 'stock-badge--in' : 'stock-badge--out'}`}>
                          {r.inStock ? 'In stock' : 'Out of stock'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )
        )}

        {!results && !loading && !fetchError && (
          <div className="hint">
            <p>Search for any grocery or household item to compare prices nearby.</p>
            <div className="hint-examples">
              {['milk', 'eggs', 'olive oil', 'baby formula'].map(term => (
                <button
                  key={term}
                  className="hint-chip"
                  onClick={() => { setQuery(term); }}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
