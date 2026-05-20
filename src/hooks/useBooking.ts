'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import type { Service } from '@/lib/types'

export function useBooking(services: Service[]) {
  const router = useRouter()
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSlots = useCallback(async (date: Date, serviceId: string) => {
    setSlotsLoading(true)
    setSelectedTime(null)
    setError(null)
    const dateStr = format(date, 'yyyy-MM-dd')
    const res = await fetch(`/api/slots?date=${dateStr}&serviceId=${serviceId}`)
    const data = await res.json()
    setSlots(data.slots ?? [])
    setSlotsLoading(false)
  }, [])

  const handleServiceSelect = useCallback((id: string) => {
    setSelectedServiceId(id)
    setSelectedTime(null)
    if (selectedDate) fetchSlots(selectedDate, id)
  }, [selectedDate, fetchSlots])

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date)
    setSelectedTime(null)
    if (selectedServiceId) fetchSlots(date, selectedServiceId)
  }, [selectedServiceId, fetchSlots])

  const handleSubmit = useCallback(async () => {
    if (!selectedServiceId || !selectedDate || !selectedTime) {
      setError('יש לבחור שירות, תאריך ושעה')
      return
    }
    if (!name.trim() || !phone.trim()) {
      setError('יש למלא שם ומספר טלפון')
      return
    }
    setSubmitLoading(true)
    setError(null)
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId: selectedServiceId,
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: selectedTime,
        customerName: name,
        customerPhone: phone,
      }),
    })
    const data = await res.json()
    if (res.status === 409) {
      setError('התור הזה כבר תפוס. אנא בחרי שעה אחרת.')
      if (selectedDate && selectedServiceId) fetchSlots(selectedDate, selectedServiceId)
      setSelectedTime(null)
    } else if (!res.ok) {
      setError(data.error ?? 'שגיאה בשליחת הטופס')
    } else {
      router.push(`/confirmation/${data.token}`)
    }
    setSubmitLoading(false)
  }, [selectedServiceId, selectedDate, selectedTime, name, phone, router, fetchSlots])

  return {
    selectedServiceId, handleServiceSelect,
    selectedDate, handleDateSelect,
    slots, slotsLoading, selectedTime, setSelectedTime,
    name, setName, phone, setPhone,
    submitLoading, error, handleSubmit,
  }
}
