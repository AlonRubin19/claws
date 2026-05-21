import { computeAvailableSlots, computeAllSlots } from '@/lib/slots'
import type { WeeklyAvailability, AvailabilityException, AppointmentSlot } from '@/lib/types'

const baseAvailability: WeeklyAvailability = {
  id: '1', day_of_week: 0, open_time: '10:00', close_time: '13:00', is_open: true,
}

describe('computeAvailableSlots', () => {
  it('returns slots at 30-min intervals within open hours', () => {
    const slots = computeAvailableSlots({
      date: '2026-06-07',
      serviceDurationMin: 60,
      weeklyAvailability: baseAvailability,
      exception: null,
      existingAppointments: [],
      now: new Date('2026-06-07T07:00:00'),
    })
    // 60-min service, open 10:00-13:00, slots every 30 min
    // 10:00 ends 11:00 ✓, 10:30 ends 11:30 ✓, 11:00 ends 12:00 ✓, 11:30 ends 12:30 ✓, 12:00 ends 13:00 ✓
    // 12:30 ends 13:30 — exceeds close time ✗
    expect(slots).toEqual(['10:00', '10:30', '11:00', '11:30', '12:00'])
  })

  it('returns empty array when day is closed', () => {
    const closed = { ...baseAvailability, is_open: false }
    const slots = computeAvailableSlots({
      date: '2026-06-07',
      serviceDurationMin: 60,
      weeklyAvailability: closed,
      exception: null,
      existingAppointments: [],
      now: new Date('2026-06-07T07:00:00'),
    })
    expect(slots).toEqual([])
  })

  it('exception overrides weekly schedule', () => {
    const exception: AvailabilityException = {
      id: '2', date: '2026-06-07', is_open: true,
      open_time: '14:00', close_time: '16:00', note: null,
    }
    const slots = computeAvailableSlots({
      date: '2026-06-07',
      serviceDurationMin: 60,
      weeklyAvailability: baseAvailability,
      exception,
      existingAppointments: [],
      now: new Date('2026-06-07T07:00:00'),
    })
    expect(slots).toEqual(['14:00', '14:30', '15:00'])
  })

  it('exception with is_open=false returns empty', () => {
    const exception: AvailabilityException = {
      id: '3', date: '2026-06-07', is_open: false,
      open_time: null, close_time: null, note: 'חג',
    }
    const slots = computeAvailableSlots({
      date: '2026-06-07',
      serviceDurationMin: 60,
      weeklyAvailability: baseAvailability,
      exception,
      existingAppointments: [],
      now: new Date('2026-06-07T07:00:00'),
    })
    expect(slots).toEqual([])
  })

  it('blocks slots overlapping an existing appointment', () => {
    const appointment: AppointmentSlot = {
      start_time: '11:00', end_time: '12:00', status: 'confirmed',
    }
    const slots = computeAvailableSlots({
      date: '2026-06-07',
      serviceDurationMin: 60,
      weeklyAvailability: baseAvailability,
      exception: null,
      existingAppointments: [appointment],
      now: new Date('2026-06-07T07:00:00'),
    })
    // Overlap check is exclusive: candidateEnd > apptStart.
    // 10:00-11:00 vs 11:00-12:00: 660 > 660 is false → NOT blocked (10:00 is free)
    // 10:30-11:30 vs 11:00-12:00: 690 > 660 is true → blocked
    // 11:00-12:00 vs 11:00-12:00: direct overlap → blocked
    // 11:30-12:30 vs 11:00-12:00: 750 > 660 → blocked
    // 12:00-13:00 vs 11:00-12:00: 720 > 720 is false → NOT blocked (12:00 is free)
    expect(slots).toContain('10:00')
    expect(slots).not.toContain('10:30')
    expect(slots).not.toContain('11:00')
    expect(slots).not.toContain('11:30')
    expect(slots).toContain('12:00')
  })

  it('ignores cancelled appointments when blocking slots', () => {
    const cancelled: AppointmentSlot = {
      start_time: '11:00', end_time: '12:00', status: 'cancelled',
    }
    const slots = computeAvailableSlots({
      date: '2026-06-07',
      serviceDurationMin: 60,
      weeklyAvailability: baseAvailability,
      exception: null,
      existingAppointments: [cancelled],
      now: new Date('2026-06-07T07:00:00'),
    })
    expect(slots).toContain('11:00')
  })

  it('filters out past slots when date is today', () => {
    const slots = computeAvailableSlots({
      date: '2026-06-07',
      serviceDurationMin: 60,
      weeklyAvailability: baseAvailability,
      exception: null,
      existingAppointments: [],
      now: new Date('2026-06-07T10:45:00'), // current time is 10:45
    })
    expect(slots).not.toContain('10:00')
    expect(slots).not.toContain('10:30')
    expect(slots).toContain('11:00')
  })
})

describe('computeAllSlots', () => {
  it('returns available and booked split correctly', () => {
    const booked: AppointmentSlot = { start_time: '11:00', end_time: '12:00', status: 'confirmed' }
    const result = computeAllSlots({
      date: '2026-06-07',
      serviceDurationMin: 60,
      weeklyAvailability: baseAvailability,
      exception: null,
      existingAppointments: [booked],
      now: new Date('2026-06-07T07:00:00'),
    })
    expect(result.available).toContain('10:00')
    expect(result.available).toContain('12:00')
    expect(result.booked).toContain('10:30')
    expect(result.booked).toContain('11:00')
    expect(result.booked).not.toContain('10:00')
    expect(result.available).not.toContain('10:30')
  })

  it('returns empty arrays when closed', () => {
    const result = computeAllSlots({
      date: '2026-06-07',
      serviceDurationMin: 60,
      weeklyAvailability: { ...baseAvailability, is_open: false },
      exception: null,
      existingAppointments: [],
      now: new Date('2026-06-07T07:00:00'),
    })
    expect(result.available).toEqual([])
    expect(result.booked).toEqual([])
  })

  it('excludes past slots from both arrays when today', () => {
    const result = computeAllSlots({
      date: '2026-06-07',
      serviceDurationMin: 60,
      weeklyAvailability: baseAvailability,
      exception: null,
      existingAppointments: [],
      now: new Date('2026-06-07T10:45:00'),
    })
    expect(result.available).not.toContain('10:00')
    expect(result.booked).not.toContain('10:00')
    expect(result.available).toContain('11:00')
  })
})
