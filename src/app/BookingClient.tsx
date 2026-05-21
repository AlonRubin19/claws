'use client'

import { useMemo } from 'react'
import { format, addDays } from 'date-fns'
import ServiceGrid from '@/components/booking/ServiceGrid'
import DateStrip from '@/components/booking/DateStrip'
import TimeSlots from '@/components/booking/TimeSlots'
import CustomerForm from '@/components/booking/CustomerForm'
import { useBooking } from '@/hooks/useBooking'
import type { Service, SalonSettings } from '@/lib/types'

interface WeeklyRow { day_of_week: number; is_open: boolean }
interface ExceptionRow { date: string; is_open: boolean }

interface Props {
  services: Service[]
  weeklyAvailability: WeeklyRow[]
  exceptions: ExceptionRow[]
  settings: SalonSettings
}

export default function BookingClient({ services, weeklyAvailability, exceptions, settings }: Props) {
  const booking = useBooking(services)

  const closedDates = useMemo(() => {
    const closed = new Set<string>()
    const today = new Date()
    const exMap = new Map(exceptions.map(e => [e.date, e.is_open]))

    for (let i = 0; i < 14; i++) {
      const day = addDays(today, i)
      const dateStr = format(day, 'yyyy-MM-dd')
      if (exMap.has(dateStr)) {
        if (!exMap.get(dateStr)) closed.add(dateStr)
      } else {
        const dow = day.getDay()
        const wa = weeklyAvailability.find(w => w.day_of_week === dow)
        if (!wa || !wa.is_open) closed.add(dateStr)
      }
    }
    return closed
  }, [weeklyAvailability, exceptions])

  return (
    <div className="min-h-screen bg-warm-white">
      <header className="bg-charcoal px-6 py-8 text-center shadow-sm">
        <h1 className="text-3xl font-serif font-bold tracking-widest text-warm-white">✦ CLAWS ✦</h1>
        <p className="mt-1 text-sm text-warm-white/70 tracking-wider">סטודיו לציפורניים · קביעת תור</p>
        {settings.description && (
          <p className="mt-3 text-sm text-warm-white/60 max-w-sm mx-auto leading-relaxed">{settings.description}</p>
        )}
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-mid-grey">
            בחרי שירות
          </h2>
          <ServiceGrid
            services={services}
            selected={booking.selectedServiceId}
            onSelect={booking.handleServiceSelect}
          />
        </section>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-mid-grey">
            בחרי תאריך
          </h2>
          <DateStrip
            closedDates={closedDates}
            selected={booking.selectedDate}
            onSelect={booking.handleDateSelect}
          />
        </section>

        {booking.selectedServiceId && booking.selectedDate && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-mid-grey">
              שעות פנויות
            </h2>
            <TimeSlots
              available={booking.availableSlots}
              booked={booking.bookedSlots}
              selected={booking.selectedTime}
              loading={booking.slotsLoading}
              onSelect={booking.setSelectedTime}
            />
          </section>
        )}

        {booking.selectedTime && (
          <section>
            <div className="mb-4 rounded-xl bg-off-white px-4 py-3 text-sm text-charcoal">
              תור ב{booking.selectedDate && format(booking.selectedDate, 'd/M/yyyy')} בשעה {booking.selectedTime}
            </div>
            <CustomerForm
              name={booking.name}
              phone={booking.phone}
              onNameChange={booking.setName}
              onPhoneChange={booking.setPhone}
              onFileChange={booking.onFileChange}
              onSubmit={booking.handleSubmit}
              loading={booking.submitLoading}
              error={booking.error}
            />
          </section>
        )}
      </main>

      {(settings.address || settings.phone || settings.instagram) && (
        <footer className="bg-dark text-warm-white/60 text-xs text-center py-4 px-6 space-y-1">
          {settings.address && <p>📍 {settings.address}</p>}
          {(settings.phone || settings.instagram) && (
            <div className="flex justify-center gap-4">
              {settings.phone && <span dir="ltr">📞 {settings.phone}</span>}
              {settings.instagram && <span>📸 {settings.instagram}</span>}
            </div>
          )}
        </footer>
      )}
    </div>
  )
}
