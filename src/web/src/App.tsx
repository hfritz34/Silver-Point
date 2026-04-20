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
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto max-w-[900px] px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-black tracking-tight select-none">
                SP
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight leading-none text-foreground">
                  SilverPoint
                </h1>
                <p className="text-[0.7rem] text-muted-foreground leading-none mt-0.5">
                  Local price intelligence
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {points > 0 && (
                <Badge
                  variant="outline"
                  className="gap-1 border-primary/40 px-2.5 py-1 text-primary text-xs font-semibold"
                >
                  <BadgeDollarSign className="size-3" />
                  {points} pts
                </Badge>
              )}
              <Button
                type="button"
                variant={location ? 'secondary' : 'outline'}
                size="sm"
                onClick={handleUseLocation}
                disabled={locating}
                className={location ? 'border-primary/40 text-primary bg-primary/10 hover:bg-primary/15' : ''}
              >
                {locating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <MapPin className="size-3.5" />
                )}
                <span className="hidden sm:inline">
                  {locating
                    ? 'Locating...'
                    : location
                      ? `Near ${locationLabel || '...'}`
                      : 'Use location'}
                </span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setShowDealModal(true)}
              >
                <Plus className="size-3.5" />
                Post Deal
              </Button>
            </div>
          </div>
          {locationError && (
            <p className="mt-1.5 text-xs text-destructive">{locationError}</p>
          )}
        </div>
      </header>

      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-4 rounded-xl bg-muted/60 p-1 [&>[data-state=active]]:bg-background [&>[data-state=active]]:text-primary [&>[data-state=active]]:shadow-sm">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="gap-1.5 px-2 py-2 text-xs sm:text-sm rounded-lg">
              <Icon className="size-3.5 sm:size-4" />
              <span>{label}</span>
              {value === 'list' && listItems.length > 0 && (
                <Badge className="ml-0.5 h-4 min-w-4 justify-center px-1 text-[0.6rem] bg-primary text-primary-foreground hover:bg-primary">
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
