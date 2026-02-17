import { useState } from 'react'
import './App.css'

type SearchResult = {
  productName: string
  storeName: string
  price: number
  distanceMi: number
}

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSearch() {
    if (!query.trim()) return
    setLoading(true)
    setResults(null)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main>
      <h1>SilverPoint</h1>
      <p>Find the lowest price near you.</p>
      <div className="search">
        <input
          type="text"
          placeholder="Search for a product..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button type="button" onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      {results && (
        <ul className="results">
          {results.length === 0 ? (
            <li>No results.</li>
          ) : (
            results.map((r, i) => (
              <li key={i}>
                <strong>{r.storeName}</strong> — ${r.price.toFixed(2)} · {r.distanceMi} mi
              </li>
            ))
          )}
        </ul>
      )}
    </main>
  )
}

export default App
