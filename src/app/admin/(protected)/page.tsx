import { createClient } from '@/lib/supabase/server'
import StatsRow from '@/components/admin/StatsRow'
import AppointmentsTable from '@/components/admin/AppointmentsTable'
import type { Appointment } from '@/lib/types'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const todayStr = new Date().toISOString().split('T')[0]
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, service:services(name)')
    .order('date', { ascending: false })
    .order('start_time', { ascending: false })

  const list = (appointments ?? []) as Appointment[]

  const todayCount = list.filter(a => a.date === todayStr && a.status !== 'cancelled').length
  const weekCount = list.filter(a => a.date >= todayStr && a.date <= weekEnd && a.status !== 'cancelled').length
  const pendingCount = list.filter(a => a.status === 'pending').length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-charcoal">תורים</h1>
        <span className="text-xs text-gray-400 bg-white rounded-full px-3 py-1 border border-light-grey">
          {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>
      <StatsRow todayCount={todayCount} weekCount={weekCount} pendingCount={pendingCount} />
      <AppointmentsTable appointments={list} />
    </div>
  )
}
