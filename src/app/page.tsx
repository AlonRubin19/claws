import { createClient } from '@/lib/supabase/server'
import BookingClient from './BookingClient'

export default async function BookingPage() {
  const supabase = await createClient()
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('price')

  const { data: weekly } = await supabase
    .from('weekly_availability')
    .select('day_of_week, is_open')

  const { data: exceptions } = await supabase
    .from('availability_exceptions')
    .select('date, is_open')

  return (
    <BookingClient
      services={services ?? []}
      weeklyAvailability={weekly ?? []}
      exceptions={exceptions ?? []}
    />
  )
}
