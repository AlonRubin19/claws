'use client'

import { useState, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { he } from 'date-fns/locale/he'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import AppointmentPopover from './AppointmentPopover'
import type { Appointment } from '@/lib/types'

const locales = { he }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

const messages = {
  today: 'היום', previous: '‹', next: '›',
  month: 'חודש', week: 'שבוע', day: 'יום',
  agenda: 'יומן', date: 'תאריך', time: 'שעה',
  event: 'תור', noEventsInRange: 'אין תורים בטווח זה',
}

const STATUS_COLORS: Record<string, { backgroundColor: string; color: string }> = {
  pending:   { backgroundColor: '#888888', color: '#fff' },
  confirmed: { backgroundColor: '#2d2d2d', color: '#f5f0eb' },
  completed: { backgroundColor: '#cccccc', color: '#555555' },
}

interface CalEvent {
  title: string
  start: Date
  end: Date
  resource: Appointment
}

interface Props { appointments: Appointment[] }

export default function AppointmentsCalendar({ appointments }: Props) {
  const [view, setView] = useState<View>('week')
  const [selected, setSelected] = useState<Appointment | null>(null)

  const events: CalEvent[] = appointments
    .filter(a => a.status !== 'cancelled')
    .map(a => ({
      title: `${a.customer_name}${a.service?.name ? ' — ' + a.service.name : ''}`,
      start: new Date(`${a.date}T${a.start_time}`),
      end: new Date(`${a.date}T${a.end_time}`),
      resource: a,
    }))

  const eventPropGetter = useCallback((event: CalEvent) => ({
    style: STATUS_COLORS[event.resource.status] ?? STATUS_COLORS.pending,
  }), [])

  const handleSelectEvent = useCallback((event: CalEvent) => {
    setSelected(event.resource)
  }, [])

  return (
    <div style={{ direction: 'ltr' }}>
      <div className="bg-white rounded-2xl border border-light-grey overflow-hidden" style={{ height: 600 }}>
        <Calendar
          localizer={localizer}
          events={events}
          view={view}
          onView={setView}
          views={['day', 'week', 'month']}
          messages={messages}
          culture="he"
          eventPropGetter={eventPropGetter}
          onSelectEvent={handleSelectEvent}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%', fontFamily: 'system-ui, sans-serif' }}
        />
      </div>
      {selected && (
        <AppointmentPopover
          appointment={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
