import { useState } from 'react'

type Props = {
  onClose: () => void
  onPosted: () => void
}

export default function PostDealModal({ onClose, onPosted }: Props) {
  const [form, setForm] = useState({ productName: '', storeName: '', price: '' })
  const [posting, setPosting] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Post a Deal</h2>
        <p className="modal-sub">Spotted a great price? Share it with your community.</p>
        {success ? (
          <p className="deal-success">Deal posted! Thanks for contributing.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>Product</label>
            <input
              type="text"
              placeholder="e.g. milk, diapers..."
              value={form.productName}
              onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
              required
            />
            <label>Store</label>
            <input
              type="text"
              placeholder="e.g. Walmart, Aldi..."
              value={form.storeName}
              onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))}
              required
            />
            <label>Price ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 1.99"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              required
            />
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" disabled={posting}>
                {posting ? 'Posting...' : 'Post Deal'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
