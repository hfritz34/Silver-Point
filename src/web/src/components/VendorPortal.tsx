import { useState } from 'react'
import { CheckCircle, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type PriceEntry = {
  product: string
  price: string
}

export default function VendorPortal() {
  const [storeName, setStoreName] = useState('')
  const [entries, setEntries] = useState<PriceEntry[]>([
    { product: '', price: '' },
    { product: '', price: '' },
    { product: '', price: '' },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  function updateEntry(index: number, field: keyof PriceEntry, value: string) {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e))
    )
  }

  function addRow() {
    setEntries((prev) => [...prev, { product: '', price: '' }])
  }

  function removeRow(index: number) {
    if (entries.length <= 1) return
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!storeName.trim()) return

    const validEntries = entries.filter(
      (e) => e.product.trim() && !isNaN(parseFloat(e.price)) && parseFloat(e.price) > 0
    )
    if (validEntries.length === 0) return

    setSubmitting(true)
    try {
      for (const entry of validEntries) {
        await fetch('/api/deals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productName: entry.product.trim(),
            storeName: storeName.trim(),
            price: parseFloat(entry.price),
            source: 'vendor',
          }),
        })
      }
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setEntries([
          { product: '', price: '' },
          { product: '', price: '' },
          { product: '', price: '' },
        ])
      }, 2000)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="tab-content space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Vendor Portal</h2>
        <p className="text-sm text-muted-foreground">
          Local store owners: submit your prices to reach nearby shoppers.
        </p>
      </div>

      {success && (
        <div className="flex items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary font-medium">
          <CheckCircle className="size-4 shrink-0" />
          Prices submitted! They are now visible to shoppers.
        </div>
      )}

      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="vendor-store">Store Name</Label>
              <Input
                id="vendor-store"
                type="text"
                placeholder="e.g. Joe's Market, Fresh Mart..."
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_90px_36px] gap-2 px-1 text-xs font-medium text-muted-foreground">
                <span>Product</span>
                <span>Price ($)</span>
                <span />
              </div>
              {entries.map((entry, i) => (
                <div key={i} className="grid grid-cols-[1fr_90px_36px] gap-2 items-center">
                  <Input
                    type="text"
                    placeholder="Product name"
                    value={entry.product}
                    onChange={(e) => updateEntry(i, 'product', e.target.value)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={entry.price}
                    onChange={(e) => updateEntry(i, 'price', e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeRow(i)}
                    disabled={entries.length <= 1}
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
              onClick={addRow}
            >
              <Plus className="size-4" />
              Add Row
            </Button>

            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={submitting || !storeName.trim()}>
                {submitting ? 'Submitting...' : 'Submit Prices'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-muted/30">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold">Why list on SilverPoint?</CardTitle>
          <CardDescription className="text-xs">Reach price-conscious shoppers actively looking nearby.</CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <ul className="space-y-1 pl-4 list-disc text-sm text-muted-foreground">
            <li>Compete on value, not just advertising spend</li>
            <li>Update prices anytime — no contracts or fees</li>
            <li>Build trust with verified, community-backed pricing</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
