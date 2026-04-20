import { useState } from 'react'
import {
  BadgeDollarSign,
  ListChecks,
  Loader2,
  MapPin,
  Plus,
  ReceiptText,
  Search as SearchIcon,
  Store,
} from 'lucide-react'
import './App.css'
import Search from './components/Search'
import ScanReceipt from './components/ScanReceipt'
import ShoppingList from './components/ShoppingList'
import VendorPortal from './components/VendorPortal'
import PostDealModal from './components/PostDealModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/sonner'

type Tab = 'search' | 'scan' | 'list' | 'vendor'

const TABS = [
  { value: 'search', label: 'Search', icon: SearchIcon },
  { value: 'scan', label: 'Scan', icon: ReceiptText },
  { value: 'list', label: 'List', icon: ListChecks },
  { value: 'vendor', label: 'Vendors', icon: Store },
] satisfies { value: Tab; label: string; icon: typeof SearchIcon }[]

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
    <main className="min-h-screen pb-8">
      <header className="rounded-xl border border-border bg-card/95 p-4 text-card-foreground shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="w-fit gap-1.5">
              <BadgeDollarSign className="size-3.5" />
              Local price intelligence
            </Badge>
            <div>
              <h1 className="text-3xl font-bold tracking-normal text-card-foreground">
                SilverPoint
              </h1>
              <p className="text-sm text-muted-foreground">
                Find the lowest verified price near you.
              </p>
            </div>
          </div>

          {points > 0 && (
            <Badge variant="outline" className="w-fit border-emerald-500/30 px-3 py-1 text-emerald-600">
              {points} pts
            </Badge>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={location ? 'secondary' : 'outline'}
            size="sm"
            onClick={handleUseLocation}
            disabled={locating}
          >
            {locating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MapPin className="size-4" />
            )}
            {locating
              ? 'Getting location...'
              : location
                ? `Near ${locationLabel || '...'}`
                : 'Use my location'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowDealModal(true)}
          >
            <Plus className="size-4" />
            Post Deal
          </Button>
          {locationError && (
            <span className="text-sm text-destructive">{locationError}</span>
          )}
        </div>
      </header>

      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="mt-5 space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-4 rounded-xl bg-muted p-1">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="gap-1.5 px-2 py-2 text-xs sm:text-sm">
              <Icon className="size-4" />
              <span>{label}</span>
              {value === 'list' && listItems.length > 0 && (
                <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 justify-center px-1 text-[0.65rem]">
                  {listItems.length}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="search" className="m-0">
          <Search location={location} onAddToList={handleAddToList} />
        </TabsContent>
        <TabsContent value="scan" className="m-0">
          <ScanReceipt onPointsEarned={(pts) => setPoints((p) => p + pts)} />
        </TabsContent>
        <TabsContent value="list" className="m-0">
          <ShoppingList location={location} initialItems={listItems} />
        </TabsContent>
        <TabsContent value="vendor" className="m-0">
          <VendorPortal />
        </TabsContent>
      </Tabs>

      <Dialog open={showLocationHelp} onOpenChange={setShowLocationHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Location Access</DialogTitle>
            <DialogDescription>
              Your browser blocked location. Update the setting and reload the app.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <strong>Chrome</strong>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>Click the lock icon in the address bar</li>
                <li>Find Location and set it to Allow</li>
                <li>Reload the page</li>
              </ol>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <strong>Safari</strong>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>Open Settings, then Privacy, then Location Services</li>
                <li>Find Safari and allow location while using it</li>
                <li>Reload the page</li>
              </ol>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <strong>Firefox</strong>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>Click the lock icon in the address bar</li>
                <li>Find Location and set it to Allow</li>
                <li>Reload the page</li>
              </ol>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setShowLocationHelp(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showDealModal && (
        <PostDealModal
          onClose={() => setShowDealModal(false)}
          onPosted={() => setPoints((p) => p + 10)}
        />
      )}
      <Toaster richColors />
    </main>
  )
}

export default App
