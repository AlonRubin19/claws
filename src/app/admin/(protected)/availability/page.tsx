'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AvailabilityForm from '@/components/admin/AvailabilityForm'
import type { WeeklyAvailability, AvailabilityException } from '@/lib/types'

export default function AvailabilityPage() {
  const [weekly, setWeekly] = useState<WeeklyAvailability[]>([])
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([])

  async function load() {
    const supabase = createClient()
    const { data: w } = await supabase.from('weekly_availability').select('*').order('day_of_week')
    const { data: e } = await supabase.from('availability_exceptions').select('*').order('date')
    setWeekly(w ?? [])
    setExceptions(e ?? [])
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <h1 className="text-xl font-bold text-charcoal mb-6">זמינות</h1>
      {weekly.length > 0 && (
        <AvailabilityForm weekly={weekly} exceptions={exceptions} onRefresh={load} />
      )}
    </div>
  )
}
