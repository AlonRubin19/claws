import { createClient } from '@/lib/supabase/server'
import BookingClient from './BookingClient'
import { SETTINGS_ID } from '@/lib/constants'

export default async function BookingPage() {
  const supabase = await createClient()

  const [
    { data: services },
    { data: weekly },
    { data: exceptions },
    { data: settings, error: settingsError },
  ] = await Promise.all([
    supabase.from('services').select('*').eq('is_active', true).order('price'),
    supabase.from('weekly_availability').select('day_of_week, is_open'),
    supabase.from('availability_exceptions').select('date, is_open'),
    supabase.from('salon_settings').select('*').eq('id', SETTINGS_ID).single(),
  ])

  if (settingsError && settingsError.code !== 'PGRST116') {
    console.error('Failed to fetch salon_settings:', settingsError.message)
  }

  return (
    <BookingClient
      services={services ?? []}
      weeklyAvailability={weekly ?? []}
      exceptions={exceptions ?? []}
      settings={settings ?? { id: SETTINGS_ID, address: '', phone: '', instagram: '', description: '', updated_at: '' }}
    />
  )
}
