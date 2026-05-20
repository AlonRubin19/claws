'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/ui/StatusBadge'
import type { Appointment, AppointmentStatus } from '@/lib/types'

type Filter = 'all' | 'today' | 'upcoming' | 'completed'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'הכל' },
  { key: 'today', label: 'היום' },
  { key: 'upcoming', label: 'קרוב' },
  { key: 'completed', label: 'הושלם' },
]

interface Props { appointments: Appointment[] }

export default function AppointmentsTable({ appointments }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState<string | null>(null)
  const todayStr = new Date().toISOString().split('T')[0]

  const filtered = appointments.filter(a => {
    if (filter === 'today') return a.date === todayStr
    if (filter === 'upcoming') return a.date >= todayStr && (a.status === 'pending' || a.status === 'confirmed')
    if (filter === 'completed') return a.status === 'completed'
    return true
  })

  async function updateStatus(id: string, status: AppointmentStatus) {
    setLoading(id + status)
    const supabase = createClient()
    await supabase.from('appointments').update({ status }).eq('id', id)
    router.refresh()
    setLoading(null)
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs px-4 py-1.5 rounded-full border-2 transition-colors
              ${filter === f.key ? 'bg-rose border-rose text-white' : 'border-sand text-gray-500 hover:border-rose/50'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-sand overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sand">
              {['לקוחה','שירות','תאריך ושעה','טלפון','סטטוס','פעולות'].map(h => (
                <th key={h} className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-8 text-sm">אין תורים</td>
              </tr>
            )}
            {filtered.map(a => (
              <tr key={a.id} className="border-b border-sand/50 hover:bg-cream transition-colors">
                <td className="px-4 py-3 font-medium">{a.customer_name}</td>
                <td className="px-4 py-3 text-gray-500">{a.service?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 tabular-nums" dir="ltr">{a.date} {a.start_time}</td>
                <td className="px-4 py-3 text-gray-500 tabular-nums" dir="ltr">{a.customer_phone}</td>
                <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {a.status === 'pending' && (
                      <button
                        onClick={() => updateStatus(a.id, 'confirmed')}
                        disabled={loading === a.id + 'confirmed'}
                        className="text-green-600 hover:bg-green-50 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
                        title="אשר"
                      >✓</button>
                    )}
                    {a.status === 'confirmed' && (
                      <button
                        onClick={() => updateStatus(a.id, 'completed')}
                        disabled={loading === a.id + 'completed'}
                        className="text-purple-600 hover:bg-purple-50 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
                        title="סמן הושלם"
                      >✓✓</button>
                    )}
                    {a.status !== 'cancelled' && a.status !== 'completed' && (
                      <button
                        onClick={() => { if (confirm('לבטל את התור?')) updateStatus(a.id, 'cancelled') }}
                        disabled={loading === a.id + 'cancelled'}
                        className="text-red-400 hover:bg-red-50 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
                        title="בטל"
                      >✕</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
