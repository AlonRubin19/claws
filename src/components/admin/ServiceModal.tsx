'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import type { Service } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: Partial<Service>) => Promise<void>
  initial?: Service | null
}

export default function ServiceModal({ open, onClose, onSave, initial }: Props) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initial) {
      setName(initial.name)
      setPrice(String(initial.price))
      setDuration(String(initial.duration_min))
      setIsActive(initial.is_active)
    } else {
      setName(''); setPrice(''); setDuration(''); setIsActive(true)
    }
  }, [initial, open])

  async function handleSave() {
    if (!name.trim() || !price || !duration) return
    setLoading(true)
    await onSave({ name, price: Number(price), duration_min: Number(duration), is_active: isActive })
    setLoading(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'עריכת שירות' : 'שירות חדש'}>
      <div className="space-y-4">
        <div>
          <label className="label-style">שם השירות</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="input-style" placeholder="מניקור ג׳ל" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-style">מחיר (₪)</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)}
              className="input-style" placeholder="150" />
          </div>
          <div>
            <label className="label-style">משך (דקות)</label>
            <input type="number" value={duration} onChange={e => setDuration(e.target.value)}
              className="input-style" placeholder="60" />
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}
            className="accent-rose w-4 h-4" />
          <span className="text-sm text-espresso">פעיל (מוצג ללקוחות)</span>
        </label>
        <button onClick={handleSave} disabled={loading}
          className="w-full bg-gradient-to-l from-terracotta to-rose text-white rounded-xl py-3 font-semibold disabled:opacity-50">
          {loading ? 'שומרת...' : 'שמירה'}
        </button>
      </div>
    </Modal>
  )
}
