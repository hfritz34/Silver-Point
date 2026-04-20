import { useState, useRef } from 'react'
import { CheckCircle, Upload, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ScannedItem = {
  name: string
  price: string
  store: string
}

type Props = {
  onPointsEarned: (pts: number) => void
}

export default function ScanReceipt({ onPointsEarned }: Props) {
  const [step, setStep] = useState<'upload' | 'review' | 'success'>('upload')
  const [preview, setPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [items, setItems] = useState<ScannedItem[]>([])
  const [storeName, setStoreName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  async function handleScan() {
    if (!preview) return
    setScanning(true)

    await new Promise((r) => setTimeout(r, 1500))

    const mockItems: ScannedItem[] = [
      { name: '2% Milk 1 Gal', price: '3.29', store: '' },
      { name: 'Large Eggs 12ct', price: '4.49', store: '' },
      { name: 'Wheat Bread', price: '2.89', store: '' },
      { name: 'Bananas 1 lb', price: '0.59', store: '' },
      { name: 'Chicken Breast', price: '8.99', store: '' },
    ]

    setItems(mockItems)
    setScanning(false)
    setStep('review')
  }

  function updateItem(index: number, field: keyof ScannedItem, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function addItem() {
    setItems((prev) => [...prev, { name: '', price: '', store: '' }])
  }

  async function handleSubmit() {
    if (!storeName.trim() || items.length === 0) return

    setSubmitting(true)
    try {
      for (const item of items) {
        const price = parseFloat(item.price)
        if (!item.name.trim() || isNaN(price) || price <= 0) continue
        await fetch('/api/deals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productName: item.name.trim(),
            storeName: storeName.trim(),
            price,
            source: 'receipt',
          }),
        })
      }

      const validItems = items.filter((i) => {
        const p = parseFloat(i.price)
        return i.name.trim() && !isNaN(p) && p > 0
      })
      const points = validItems.length * 10
      onPointsEarned(points)
      setStep('success')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setStep('upload')
    setPreview(null)
    setItems([])
    setStoreName('')
  }

  if (step === 'success') {
    const validCount = items.filter((i) => parseFloat(i.price) > 0 && i.name.trim()).length
    return (
      <div className="tab-content">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="size-7 text-primary" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Receipt Submitted!</h2>
              <p className="text-sm text-muted-foreground">
                Your prices have been added to the community database.
                <br />
                Thanks for helping others save!
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 text-primary px-3 py-1 text-sm font-semibold"
            >
              +{validCount * 10} points earned
            </Badge>
            <Button type="button" onClick={reset} className="mt-2">
              Scan Another Receipt
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'review') {
    return (
      <div className="tab-content space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Review Extracted Items</CardTitle>
            <CardDescription>Verify and correct the data before submitting.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="store-name">Store Name</Label>
              <Input
                id="store-name"
                type="text"
                placeholder="e.g. Kroger, Walmart..."
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    type="text"
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => updateItem(i, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Price"
                    value={item.price}
                    onChange={(e) => updateItem(i, 'price', e.target.value)}
                    className="w-24"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeItem(i)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed text-muted-foreground hover:text-foreground"
              onClick={addItem}
            >
              + Add Item
            </Button>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={reset}>
                Start Over
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !storeName.trim() || items.length === 0}
              >
                {submitting ? 'Submitting...' : `Submit ${items.length} Items`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="tab-content space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Scan & Save</CardTitle>
          <CardDescription>
            Upload a receipt photo to share prices with the community and earn points.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors ${
              preview
                ? 'border-border p-2'
                : 'border-border p-10 hover:border-primary/50'
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            {preview ? (
              <img
                src={preview}
                alt="Receipt preview"
                className="max-h-72 max-w-full rounded-lg object-contain"
              />
            ) : (
              <>
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <Upload className="size-5 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Drop a receipt image here</p>
                  <p className="text-xs text-muted-foreground mt-0.5">or tap to upload · JPG, PNG supported</p>
                </div>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileInput}
              hidden
            />
          </div>

          {preview && (
            <div className="flex justify-center gap-2">
              <Button type="button" variant="outline" onClick={reset}>
                Remove
              </Button>
              <Button type="button" onClick={handleScan} disabled={scanning}>
                {scanning ? 'Scanning...' : 'Extract Items'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-muted/30">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">How it works</p>
          <ol className="space-y-1 pl-4 list-decimal text-sm text-muted-foreground">
            <li>Upload or photograph your receipt</li>
            <li>We extract the items and prices</li>
            <li>Review and correct any errors</li>
            <li>Submit to earn points and help the community</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
