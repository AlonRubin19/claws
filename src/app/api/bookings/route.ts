import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeAvailableSlots } from '@/lib/slots'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { serviceId, date, startTime, customerName, customerPhone, inspirationImageUrl } = body

  if (!serviceId || !date || !startTime || !customerName || !customerPhone) {
    return NextResponse.json({ error: 'שדות חובה חסרים' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: service, error: svcError } = await supabase
    .from('services')
    .select('id, duration_min')
    .eq('id', serviceId)
    .eq('is_active', true)
    .single()

  if (svcError || !service) {
    return NextResponse.json({ error: 'שירות לא נמצא' }, { status: 404 })
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

  const { data: existing } = await supabase
    .from('appointments')
    .select('start_time, end_time, status')
    .eq('date', date)
    .neq('status', 'cancelled')

  const available = computeAvailableSlots({
    date,
    serviceDurationMin: service.duration_min,
    weeklyAvailability: weekly ?? null,
    exception: exception ?? null,
    existingAppointments: existing ?? [],
    now: new Date(),
  })

  if (!available.includes(startTime)) {
    return NextResponse.json({ error: 'התור הזה כבר תפוס' }, { status: 409 })
  }

  const [h, m] = startTime.split(':').map(Number)
  const endMinutes = h * 60 + m + service.duration_min
  const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`

  const { data: appointment, error: insertError } = await supabase
    .from('appointments')
    .insert({
      service_id: serviceId,
      customer_name: customerName,
      customer_phone: customerPhone,
      date,
      start_time: startTime,
      end_time: endTime,
      ...(inspirationImageUrl ? { inspiration_image_url: inspirationImageUrl } : {}),
    })
    .select('token')
    .single()

  if (insertError || !appointment) {
    return NextResponse.json({ error: 'שגיאה ביצירת התור' }, { status: 500 })
  }

  return NextResponse.json({ token: appointment.token }, { status: 201 })
}
