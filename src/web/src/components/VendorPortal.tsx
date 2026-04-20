import { useState } from 'react'

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

  async function handleSubmit(e: React.FormEvent) {
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
    <div className="tab-content">
      <div className="section-header">
        <h2>Vendor Portal</h2>
        <p className="text-muted">
          Local store owners: submit your prices to reach nearby shoppers.
        </p>
      </div>

      {success && (
        <div className="vendor-success">
          Prices submitted successfully! They are now visible to shoppers.
        </div>
      )}

      <form onSubmit={handleSubmit} className="vendor-form">
        <div className="vendor-store">
          <label>Store Name</label>
          <input
            type="text"
            placeholder="e.g. Joe's Market, Fresh Mart..."
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            required
          />
        </div>

        <div className="vendor-entries">
          <div className="vendor-row vendor-header-row">
            <span>Product</span>
            <span>Price ($)</span>
            <span></span>
          </div>
          {entries.map((entry, i) => (
            <div key={i} className="vendor-row">
              <input
                type="text"
                placeholder="Product name"
                value={entry.product}
                onChange={(e) => updateEntry(i, 'product', e.target.value)}
              />
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={entry.price}
                onChange={(e) => updateEntry(i, 'price', e.target.value)}
              />
              <button
                type="button"
                className="remove-btn"
                onClick={() => removeRow(i)}
                disabled={entries.length <= 1}
              >
                &#10005;
              </button>
            </div>
          ))}
        </div>

        <button type="button" className="add-item-btn" onClick={addRow}>
          + Add Row
        </button>

        <div className="vendor-actions">
          <button type="submit" disabled={submitting || !storeName.trim()}>
            {submitting ? 'Submitting...' : 'Submit Prices'}
          </button>
        </div>
      </form>

      <div className="vendor-info">
        <h3>Why list on SilverPoint?</h3>
        <ul>
          <li>Reach price-conscious shoppers actively looking nearby</li>
          <li>Compete on value, not just advertising spend</li>
          <li>Update prices anytime — no contracts or fees</li>
        </ul>
      </div>
    </div>
  )
}
