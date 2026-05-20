'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ServiceModal from '@/components/admin/ServiceModal'
import type { Service } from '@/lib/types'

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('services').select('*').order('created_at')
    setServices(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleSave(data: Partial<Service>) {
    const supabase = createClient()
    if (editing) {
      await supabase.from('services').update(data).eq('id', editing.id)
    } else {
      await supabase.from('services').insert(data)
    }
    load()
  }

  async function handleDeactivate(id: string) {
    if (!confirm('להסיר את השירות מהרשימה הפעילה?')) return
    const supabase = createClient()
    await supabase.from('services').update({ is_active: false }).eq('id', id)
    load()
  }

  function openEdit(s: Service) { setEditing(s); setModalOpen(true) }
  function openAdd() { setEditing(null); setModalOpen(true) }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-espresso">שירותים</h1>
        <button onClick={openAdd}
          className="bg-gradient-to-l from-terracotta to-rose text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-lg shadow-rose/30">
          + שירות חדש
        </button>
      </div>

      <div className="space-y-3">
        {services.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-sand p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="font-semibold text-espresso">{s.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">₪{s.price} · {s.duration_min} דקות</p>
              </div>
              {!s.is_active && (
                <span className="text-xs bg-gray-100 text-gray-400 rounded-full px-2 py-0.5">לא פעיל</span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(s)}
                className="text-terracotta text-xs hover:bg-sand rounded-lg px-3 py-1.5 transition-colors">
                עריכה
              </button>
              {s.is_active && (
                <button onClick={() => handleDeactivate(s.id)}
                  className="text-red-400 text-xs hover:bg-red-50 rounded-lg px-3 py-1.5 transition-colors">
                  הסרה
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ServiceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={editing}
      />
    </div>
  )
}
