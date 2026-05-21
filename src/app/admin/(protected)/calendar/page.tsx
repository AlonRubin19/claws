import { createClient } from '@/lib/supabase/server'
import AppointmentsCalendar from '@/components/admin/AppointmentsCalendar'
import type { Appointment } from '@/lib/types'

export default async function CalendarPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('appointments')
    .select('*, service:services(name)')
    .neq('status', 'cancelled')
    .order('date')
    .order('start_time')

  const appointments = (data ?? []) as Appointment[]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-charcoal">לוח שנה</h1>
      </div>
      <AppointmentsCalendar appointments={appointments} />
    </div>
  )
}
