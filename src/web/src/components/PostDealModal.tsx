import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  onClose: () => void
  onPosted: () => void
}

export default function PostDealModal({ onClose, onPosted }: Props) {
  const [form, setForm] = useState({ productName: '', storeName: '', price: '' })
  const [posting, setPosting] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    const price = parseFloat(form.price)
    if (!form.productName || !form.storeName || isNaN(price) || price <= 0) return
    setPosting(true)
    try {
      await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: form.productName,
          storeName: form.storeName,
          price,
          source: 'manual',
        }),
      })
      setSuccess(true)
      setTimeout(() => {
        onPosted()
        onClose()
      }, 1200)
    } finally {
      setPosting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Post a Deal</DialogTitle>
          <DialogDescription>
            Spotted a great price? Share it with your community.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="size-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-primary">Deal posted! Thanks for contributing.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="deal-product">Product</Label>
              <Input
                id="deal-product"
                type="text"
                placeholder="e.g. milk, diapers..."
                value={form.productName}
                onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deal-store">Store</Label>
              <Input
                id="deal-store"
                type="text"
                placeholder="e.g. Walmart, Aldi..."
                value={form.storeName}
                onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deal-price">Price ($)</Label>
              <Input
                id="deal-price"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 1.99"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={posting}>
                {posting ? 'Posting...' : 'Post Deal'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
