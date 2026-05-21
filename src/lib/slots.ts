import type { WeeklyAvailability, AvailabilityException, AppointmentSlot } from '@/lib/types'

interface ComputeSlotsParams {
  date: string
  serviceDurationMin: number
  weeklyAvailability: WeeklyAvailability | null
  exception: AvailabilityException | null
  existingAppointments: AppointmentSlot[]
  now: Date
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function overlaps(
  candidateStart: number,
  candidateEnd: number,
  apptStart: number,
  apptEnd: number,
): boolean {
  return candidateStart < apptEnd && candidateEnd > apptStart
}

export function computeAvailableSlots(params: ComputeSlotsParams): string[] {
  const { date, serviceDurationMin, weeklyAvailability, exception, existingAppointments, now } = params

  let isOpen: boolean
  let openMinutes: number
  let closeMinutes: number

  if (exception) {
    isOpen = exception.is_open
    openMinutes = exception.open_time ? timeToMinutes(exception.open_time) : 0
    closeMinutes = exception.close_time ? timeToMinutes(exception.close_time) : 0
  } else if (weeklyAvailability) {
    isOpen = weeklyAvailability.is_open
    openMinutes = timeToMinutes(weeklyAvailability.open_time)
    closeMinutes = timeToMinutes(weeklyAvailability.close_time)
  } else {
    return []
  }

  if (!isOpen) return []

  const todayStr = now.toISOString().split('T')[0]
  const isToday = date === todayStr
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const active = existingAppointments.filter(a => a.status !== 'cancelled')

  const slots: string[] = []
  let cursor = openMinutes

  while (cursor + serviceDurationMin <= closeMinutes) {
    const candidateEnd = cursor + serviceDurationMin

    if (isToday && cursor <= nowMinutes) {
      cursor += 30
      continue
    }

    const blocked = active.some(a => {
      const aStart = timeToMinutes(a.start_time)
      const aEnd = timeToMinutes(a.end_time)
      return overlaps(cursor, candidateEnd, aStart, aEnd)
    })

    if (!blocked) slots.push(minutesToTime(cursor))
    cursor += 30
  }

  return slots
}

export function computeAllSlots(params: ComputeSlotsParams): { available: string[]; booked: string[] } {
  const { date, serviceDurationMin, weeklyAvailability, exception, existingAppointments, now } = params

  let isOpen: boolean
  let openMinutes: number
  let closeMinutes: number

  if (exception) {
    isOpen = exception.is_open
    openMinutes = exception.open_time ? timeToMinutes(exception.open_time) : 0
    closeMinutes = exception.close_time ? timeToMinutes(exception.close_time) : 0
  } else if (weeklyAvailability) {
    isOpen = weeklyAvailability.is_open
    openMinutes = timeToMinutes(weeklyAvailability.open_time)
    closeMinutes = timeToMinutes(weeklyAvailability.close_time)
  } else {
    return { available: [], booked: [] }
  }

  if (!isOpen) return { available: [], booked: [] }

  const todayStr = now.toISOString().split('T')[0]
  const isToday = date === todayStr
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const active = existingAppointments.filter(a => a.status !== 'cancelled')

  const available: string[] = []
  const booked: string[] = []
  let cursor = openMinutes

  while (cursor + serviceDurationMin <= closeMinutes) {
    const candidateEnd = cursor + serviceDurationMin

    if (isToday && cursor <= nowMinutes) {
      cursor += 30
      continue
    }

    const blocked = active.some(a => {
      const aStart = timeToMinutes(a.start_time)
      const aEnd = timeToMinutes(a.end_time)
      return overlaps(cursor, candidateEnd, aStart, aEnd)
    })

    if (blocked) booked.push(minutesToTime(cursor))
    else available.push(minutesToTime(cursor))

    cursor += 30
  }

  return { available, booked }
}
