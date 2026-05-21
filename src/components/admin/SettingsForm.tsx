'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SETTINGS_ID } from '@/lib/constants'
import type { SalonSettings } from '@/lib/types'

interface Props {
  settings: SalonSettings
}

export default function SettingsForm({ settings }: Props) {
  const router = useRouter()
  const [address, setAddress] = useState(settings.address)
  const [phone, setPhone] = useState(settings.phone)
  const [instagram, setInstagram] = useState(settings.instagram)
  const [description, setDescription] = useState(settings.description)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSave() {
    setLoading(true)
    setMessage(null)
    const supabase = createClient()
    const { error } = await supabase
      .from('salon_settings')
      .update({ address, phone, instagram, description, updated_at: new Date().toISOString() })
      .eq('id', SETTINGS_ID)
      .select('id')
    if (error || !data || data.length === 0) {
      setMessage({ type: 'error', text: 'שגיאה בשמירת ההגדרות. נסי שוב.' })
    } else {
      setMessage({ type: 'success', text: 'ההגדרות נשמרו בהצלחה ✓' })
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <label className="label-style">כתובת הסלון</label>
        <input
          type="text"
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="למשל: רחוב הרצל 12, תל אביב"
          className="input-style"
        />
      </div>
      <div>
        <label className="label-style">טלפון</label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="050-123-4567"
          className="input-style"
          dir="ltr"
        />
      </div>
      <div>
        <label className="label-style">אינסטגרם</label>
        <input
          type="text"
          value={instagram}
          onChange={e => setInstagram(e.target.value)}
          placeholder="@claws.nails"
          className="input-style"
          dir="ltr"
        />
      </div>
      <div>
        <label className="label-style">תיאור הסלון</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="כמה מילים על הסלון — יוצג בראש דף ההזמנות"
          rows={4}
          className="input-style resize-none"
        />
      </div>
      {message && (
        <p className={`text-sm rounded-xl px-4 py-2 ${message.type === 'success' ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
          {message.text}
        </p>
      )}
      <button
        onClick={handleSave}
        disabled={loading}
        className="rounded-xl bg-charcoal text-warm-white px-6 py-3 text-sm font-semibold tracking-wide disabled:opacity-50 transition-opacity"
      >
        {loading ? 'שומרת...' : 'שמירת הגדרות'}
      </button>
    </div>
  )
}
