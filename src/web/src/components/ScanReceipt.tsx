import { useState, useRef } from 'react'

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

    // Simulate OCR processing with mock extracted data
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
      // Post each item as a community deal
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
    return (
      <div className="tab-content scan-success">
        <div className="success-icon">&#10003;</div>
        <h2>Receipt Submitted!</h2>
        <p className="text-muted">
          Your prices have been added to the community database.
          <br />
          Thanks for helping others save!
        </p>
        <p className="points-earned">
          +{items.filter((i) => parseFloat(i.price) > 0 && i.name.trim()).length * 10} points earned
        </p>
        <button type="button" onClick={reset}>
          Scan Another Receipt
        </button>
      </div>
    )
  }

  if (step === 'review') {
    return (
      <div className="tab-content">
        <div className="section-header">
          <h2>Review Extracted Items</h2>
          <p className="text-muted">Verify and correct the data before submitting.</p>
        </div>

        <div className="review-store">
          <label>Store Name</label>
          <input
            type="text"
            placeholder="e.g. Kroger, Walmart..."
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />
        </div>

        <div className="review-items">
          {items.map((item, i) => (
            <div key={i} className="review-item">
              <div className="review-item-fields">
                <input
                  type="text"
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => updateItem(i, 'name', e.target.value)}
                />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Price"
                  className="price-input"
                  value={item.price}
                  onChange={(e) => updateItem(i, 'price', e.target.value)}
                />
              </div>
              <button type="button" className="remove-btn" onClick={() => removeItem(i)}>
                &#10005;
              </button>
            </div>
          ))}
        </div>

        <button type="button" className="add-item-btn" onClick={addItem}>
          + Add Item
        </button>

        <div className="review-actions">
          <button type="button" className="btn-ghost" onClick={reset}>
            Start Over
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !storeName.trim() || items.length === 0}
          >
            {submitting ? 'Submitting...' : `Submit ${items.length} Items`}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="tab-content">
      <div className="section-header">
        <h2>Scan & Save</h2>
        <p className="text-muted">
          Upload a receipt photo to share prices with the community and earn points.
        </p>
      </div>

      <div
        className={`upload-zone${preview ? ' has-preview' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="Receipt preview" className="receipt-preview" />
        ) : (
          <div className="upload-placeholder">
            <div className="upload-icon">&#128247;</div>
            <p>Drop a receipt image here or tap to upload</p>
            <span className="text-muted text-sm">JPG, PNG supported</span>
          </div>
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
        <div className="scan-actions">
          <button type="button" className="btn-ghost" onClick={reset}>
            Remove
          </button>
          <button type="button" onClick={handleScan} disabled={scanning}>
            {scanning ? 'Scanning...' : 'Extract Items'}
          </button>
        </div>
      )}

      <div className="scan-info">
        <h3>How it works</h3>
        <ol>
          <li>Upload or photograph your receipt</li>
          <li>We extract the items and prices</li>
          <li>Review and correct any errors</li>
          <li>Submit to earn points and help the community</li>
        </ol>
      </div>
    </div>
  )
}
