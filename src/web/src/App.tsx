import { useState } from 'react'
import './App.css'
import Search from './components/Search'
import ScanReceipt from './components/ScanReceipt'
import ShoppingList from './components/ShoppingList'
import VendorPortal from './components/VendorPortal'
import PostDealModal from './components/PostDealModal'

type Tab = 'search' | 'scan' | 'list' | 'vendor'

const TAB_LABELS: Record<Tab, string> = {
  search: 'Search',
  scan: 'Scan & Save',
  list: 'My List',
  vendor: 'Vendors',
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
  const [tab, setTab] = useState<Tab>('search')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationLabel, setLocationLabel] = useState<string | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [showLocationHelp, setShowLocationHelp] = useState(false)
  const [showDealModal, setShowDealModal] = useState(false)
  const [points, setPoints] = useState(0)
  const [listItems, setListItems] = useState<string[]>([])

  function handleUseLocation() {
    if (location) {
      setLocation(null)
      setLocationLabel(null)
      setLocationError(null)
      return
    }
    setLocationError(null)
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setLocation(coords)
        const label = await reverseGeocode(coords.lat, coords.lng)
        setLocationLabel(label)
        setLocating(false)
      },
      () => {
        setLocationError('Location permission denied.')
        setShowLocationHelp(true)
        setLocating(false)
      },
      { timeout: 10000 }
    )
  }

  function handleAddToList(product: string) {
    setListItems((prev) =>
      prev.includes(product.toLowerCase()) ? prev : [...prev, product.toLowerCase()]
    )
    setTab('list')
  }

  return (
    <main>
      <header>
        <div className="header-top">
          <div>
            <h1>SilverPoint</h1>
            <p className="tagline">Find the lowest price near you.</p>
          </div>
          {points > 0 && (
            <div className="points-badge">
              <span className="points-value">{points}</span>
              <span className="points-label">pts</span>
            </div>
          )}
        </div>

        <div className="location-bar">
          <button
            type="button"
            className={`location-btn${location ? ' active' : ''}${locating ? ' locating' : ''}`}
            onClick={handleUseLocation}
            disabled={locating}
          >
            {locating
              ? 'Getting location...'
              : location
                ? `Near ${locationLabel || '...'}`
                : 'Use my location'}
          </button>
          <button
            type="button"
            className="chip chip-deal"
            onClick={() => setShowDealModal(true)}
          >
            + Post a Deal
          </button>
          {locationError && <span className="location-error">{locationError}</span>}
        </div>
      </header>

      <nav className="tab-nav">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`tab-btn${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
            {t === 'list' && listItems.length > 0 && (
              <span className="tab-badge">{listItems.length}</span>
            )}
          </button>
        ))}
      </nav>

      {tab === 'search' && (
        <Search location={location} onAddToList={handleAddToList} />
      )}
      {tab === 'scan' && (
        <ScanReceipt onPointsEarned={(pts) => setPoints((p) => p + pts)} />
      )}
      {tab === 'list' && (
        <ShoppingList location={location} initialItems={listItems} />
      )}
      {tab === 'vendor' && <VendorPortal />}

      {showLocationHelp && (
        <div className="modal-overlay" onClick={() => setShowLocationHelp(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Enable Location Access</h2>
            <p className="modal-sub">Your browser blocked location. Here's how to fix it:</p>
            <div className="location-help">
              <div className="help-block">
                <strong>Chrome</strong>
                <ol>
                  <li>Click the lock icon in the address bar</li>
                  <li>Find <em>Location</em> &rarr; set to <em>Allow</em></li>
                  <li>Reload the page</li>
                </ol>
              </div>
              <div className="help-block">
                <strong>Safari</strong>
                <ol>
                  <li>Go to <em>Settings &rarr; Privacy &rarr; Location Services</em></li>
                  <li>Find Safari &rarr; set to <em>While Using</em></li>
                  <li>Reload the page</li>
                </ol>
              </div>
              <div className="help-block">
                <strong>Firefox</strong>
                <ol>
                  <li>Click the lock icon &rarr; <em>Connection Secure</em></li>
                  <li>Find <em>Location</em> &rarr; set to <em>Allow</em></li>
                  <li>Reload the page</li>
                </ol>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowLocationHelp(false)}>Got it</button>
            </div>
          </div>
        </div>
      )}

      {showDealModal && (
        <PostDealModal
          onClose={() => setShowDealModal(false)}
          onPosted={() => setPoints((p) => p + 10)}
        />
      )}
    </main>
  )
}

export default App
