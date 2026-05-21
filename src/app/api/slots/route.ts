import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeAllSlots } from '@/lib/slots'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const serviceId = searchParams.get('serviceId')

  if (!date || !serviceId) {
    return NextResponse.json({ error: 'date and serviceId are required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: service, error: svcError } = await supabase
    .from('services')
    .select('duration_min')
    .eq('id', serviceId)
    .single()

  if (svcError || !service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }

  const dayOfWeek = new Date(date + 'T00:00:00').getDay()
  const { data: weekly } = await supabase
    .from('weekly_availability')
    .select('*')
    .eq('day_of_week', dayOfWeek)
    .single()

  const { data: exception } = await supabase
    .from('availability_exceptions')
    .select('*')
    .eq('date', date)
    .single()

  const { data: appointments } = await supabase
    .from('appointments')
    .select('start_time, end_time, status')
    .eq('date', date)

  const { available, booked } = computeAllSlots({
    date,
    serviceDurationMin: service.duration_min,
    weeklyAvailability: weekly ?? null,
    exception: exception ?? null,
    existingAppointments: appointments ?? [],
    now: new Date(),
  })

  return NextResponse.json({ available, booked })
}
