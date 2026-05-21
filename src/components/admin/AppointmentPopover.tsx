'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/ui/StatusBadge'
import type { Appointment, AppointmentStatus } from '@/lib/types'

interface Props {
  appointment: Appointment
  onClose: () => void
}

export default function AppointmentPopover({ appointment: initial, onClose }: Props) {
  const router = useRouter()
  const [appointment, setAppointment] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  async function updateStatus(status: AppointmentStatus) {
    if (loading) return
    setLoading(true)
    setConfirmCancel(false)
    const supabase = createClient()
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointment.id)
    if (error) {
      alert('שגיאה בעדכון הסטטוס')
    } else {
      setAppointment(prev => ({ ...prev, status }))
      router.refresh()
    }
    setLoading(false)
  }

  const dateLabel = new Date(`${appointment.date}T${appointment.start_time}`)
    .toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-bold text-charcoal">{appointment.customer_name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-charcoal text-xl leading-none">✕</button>
        </div>

        <p className="text-sm text-mid-grey mb-4">{appointment.service?.name ?? '—'}</p>

        <div className="space-y-2 text-sm text-mid-grey mb-4">
          <p>📅 {dateLabel}, {appointment.start_time}–{appointment.end_time}</p>
          <p dir="ltr" className="text-right">📞 {appointment.customer_phone}</p>
        </div>

        {appointment.inspiration_image_url && (
          <a
            href={appointment.inspiration_image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block mb-4"
          >
            <img
              src={appointment.inspiration_image_url}
              alt="תמונת השראה"
              className="w-full h-32 object-cover rounded-xl border border-light-grey"
            />
            <p className="text-xs text-mid-grey mt-1 text-center">לחצי לפתיחת התמונה המלאה</p>
          </a>
        )}

        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-mid-grey">סטטוס</span>
          <StatusBadge status={appointment.status} />
        </div>

        <div className="flex gap-2">
          {appointment.status === 'pending' && (
            <button
              onClick={() => updateStatus('confirmed')}
              disabled={loading}
              className="flex-1 py-2 rounded-xl bg-charcoal text-warm-white text-sm font-semibold disabled:opacity-50"
            >
              {loading ? '...' : '✓ אישור'}
            </button>
          )}
          {appointment.status === 'confirmed' && (
            <button
              onClick={() => updateStatus('completed')}
              disabled={loading}
              className="flex-1 py-2 rounded-xl bg-charcoal text-warm-white text-sm font-semibold disabled:opacity-50"
            >
              {loading ? '...' : '✓✓ הושלם'}
            </button>
          )}
          {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
            confirmCancel ? (
              <button
                onClick={() => updateStatus('cancelled')}
                disabled={loading}
                className="flex-1 py-2 rounded-xl bg-red-100 text-red-700 text-sm font-semibold disabled:opacity-50"
              >
                {loading ? '...' : 'בטוחה? לחצי לאישור'}
              </button>
            ) : (
              <button
                onClick={() => setConfirmCancel(true)}
                disabled={loading}
                className="flex-1 py-2 rounded-xl bg-off-white text-mid-grey text-sm font-semibold disabled:opacity-50"
              >
                ✕ ביטול
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
