'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WeeklyAvailability, AvailabilityException } from '@/lib/types'

const DAY_NAMES = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת']

interface Props {
  weekly: WeeklyAvailability[]
  exceptions: AvailabilityException[]
  onRefresh: () => void
}

export default function AvailabilityForm({ weekly, exceptions, onRefresh }: Props) {
  const [weeklyState, setWeeklyState] = useState<WeeklyAvailability[]>(weekly)
  const [savingWeekly, setSavingWeekly] = useState(false)
  const [newExDate, setNewExDate] = useState('')
  const [newExIsOpen, setNewExIsOpen] = useState(false)
  const [newExOpenTime, setNewExOpenTime] = useState('10:00')
  const [newExCloseTime, setNewExCloseTime] = useState('19:00')
  const [newExNote, setNewExNote] = useState('')

  function updateDay(index: number, field: keyof WeeklyAvailability, value: unknown) {
    setWeeklyState(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d))
  }

  async function saveWeekly() {
    setSavingWeekly(true)
    const supabase = createClient()
    const results = await Promise.all(
      weeklyState.map(d =>
        supabase.from('weekly_availability').update({
          is_open: d.is_open,
          open_time: d.open_time,
          close_time: d.close_time,
        }).eq('id', d.id)
      )
    )
    const failed = results.some(r => r.error)
    if (failed) alert('שגיאה בשמירת לוח השבועי. נסי שוב.')
    else onRefresh()
    setSavingWeekly(false)
  }

  async function addException() {
    if (!newExDate) return
    const supabase = createClient()
    const { error } = await supabase.from('availability_exceptions').upsert({
      date: newExDate,
      is_open: newExIsOpen,
      open_time: newExIsOpen ? newExOpenTime : null,
      close_time: newExIsOpen ? newExCloseTime : null,
      note: newExNote || null,
    }, { onConflict: 'date' })
    if (error) { alert('שגיאה בהוספת החריגה. נסי שוב.'); return }
    setNewExDate(''); setNewExNote(''); setNewExIsOpen(false)
    onRefresh()
  }

  async function deleteException(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('availability_exceptions').delete().eq('id', id)
    if (error) alert('שגיאה במחיקת החריגה. נסי שוב.')
    else onRefresh()
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-base font-semibold text-charcoal mb-4">לוח שבועי</h2>
        <div className="bg-white rounded-2xl border border-light-grey overflow-hidden">
          {weeklyState.map((day, i) => (
            <div key={day.id} className="flex items-center gap-4 px-5 py-4 border-b border-light-grey/50 last:border-0">
              <span className="w-16 text-sm font-medium text-charcoal">{DAY_NAMES[day.day_of_week]}</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={day.is_open}
                  onChange={e => updateDay(i, 'is_open', e.target.checked)}
                  className="accent-dark w-4 h-4"
                />
                <span className="text-xs text-gray-500">פתוח</span>
              </label>
              {day.is_open && (
                <div className="flex items-center gap-2 mr-auto">
                  <input type="time" value={day.open_time}
                    onChange={e => updateDay(i, 'open_time', e.target.value)}
                    className="border-2 border-light-grey rounded-lg px-2 py-1 text-sm focus:border-dark focus:outline-none" />
                  <span className="text-gray-400 text-xs">עד</span>
                  <input type="time" value={day.close_time}
                    onChange={e => updateDay(i, 'close_time', e.target.value)}
                    className="border-2 border-light-grey rounded-lg px-2 py-1 text-sm focus:border-dark focus:outline-none" />
                </div>
              )}
            </div>
          ))}
        </div>
        <button onClick={saveWeekly} disabled={savingWeekly}
          className="mt-4 bg-gradient-to-l from-dark to-charcoal text-white rounded-xl px-6 py-2.5 text-sm font-semibold shadow-lg shadow-charcoal/20 disabled:opacity-50">
          {savingWeekly ? 'שומרת...' : 'שמירת לוח שבועי'}
        </button>
      </section>

      <section>
        <h2 className="text-base font-semibold text-charcoal mb-4">חריגות לפי תאריך</h2>
        <div className="bg-white rounded-2xl border border-light-grey p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-style">תאריך</label>
              <input type="date" value={newExDate} onChange={e => setNewExDate(e.target.value)}
                className="input-style" />
            </div>
            <div>
              <label className="label-style">הערה (אופציונלי)</label>
              <input value={newExNote} onChange={e => setNewExNote(e.target.value)}
                className="input-style" placeholder="חג, אירוע..." />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={newExIsOpen} onChange={e => setNewExIsOpen(e.target.checked)}
              className="accent-dark w-4 h-4" />
            <span className="text-sm text-charcoal">פתוח באותו יום (שונה מהשגרה)</span>
          </label>
          {newExIsOpen && (
            <div className="flex items-center gap-3">
              <input type="time" value={newExOpenTime} onChange={e => setNewExOpenTime(e.target.value)}
                className="border-2 border-light-grey rounded-lg px-2 py-1 text-sm focus:border-dark focus:outline-none" />
              <span className="text-gray-400 text-xs">עד</span>
              <input type="time" value={newExCloseTime} onChange={e => setNewExCloseTime(e.target.value)}
                className="border-2 border-light-grey rounded-lg px-2 py-1 text-sm focus:border-dark focus:outline-none" />
            </div>
          )}
          <button onClick={addException}
            className="bg-gradient-to-l from-dark to-charcoal text-white rounded-xl px-5 py-2 text-sm font-semibold">
            + הוסף חריגה
          </button>
        </div>

        {exceptions.length > 0 && (
          <div className="mt-4 space-y-2">
            {exceptions.map(ex => (
              <div key={ex.id} className="bg-white rounded-xl border border-light-grey px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-charcoal" dir="ltr">{ex.date}</span>
                  {ex.note && <span className="text-xs text-gray-400 mr-2">{ex.note}</span>}
                  <span className={`text-xs mr-2 ${ex.is_open ? 'text-green-600' : 'text-red-400'}`}>
                    {ex.is_open ? `פתוח ${ex.open_time}–${ex.close_time}` : 'סגור'}
                  </span>
                </div>
                <button onClick={() => deleteException(ex.id)}
                  className="text-red-400 text-xs hover:bg-red-50 rounded-lg px-2 py-1">
                  מחיקה
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
