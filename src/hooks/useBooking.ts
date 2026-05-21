'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import type { Service } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

export function useBooking(services: Service[]) {
  const router = useRouter()
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inspirationFile, setInspirationFile] = useState<File | null>(null)

  const fetchSlots = useCallback(async (date: Date, serviceId: string) => {
    setSlotsLoading(true)
    setSelectedTime(null)
    setError(null)
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const res = await fetch(`/api/slots?date=${dateStr}&serviceId=${serviceId}`)
      const data = await res.json()
      setAvailableSlots(data.available ?? [])
      setBookedSlots(data.booked ?? [])
    } catch {
      setError('שגיאה בטעינת השעות הפנויות')
      setAvailableSlots([])
      setBookedSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }, [])

  const handleServiceSelect = useCallback((id: string) => {
    setSelectedServiceId(id)
    setSelectedTime(null)
    setAvailableSlots([])
    setBookedSlots([])
    if (selectedDate) fetchSlots(selectedDate, id)
  }, [selectedDate, fetchSlots])

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date)
    setSelectedTime(null)
    setAvailableSlots([])
    setBookedSlots([])
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
    try {
      let inspirationImageUrl: string | undefined

      if (inspirationFile) {
        const ALLOWED: Record<string, string> = {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
        }
        const safeExt = ALLOWED[inspirationFile.type]
        const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
        if (safeExt && inspirationFile.size <= MAX_BYTES) {
          const path = `${crypto.randomUUID()}.${safeExt}`
          const supabase = createClient()
          const { data: upload, error: uploadError } = await supabase.storage
            .from('inspiration-images')
            .upload(path, inspirationFile, { contentType: inspirationFile.type })
          if (uploadError) {
            console.warn('[inspiration upload]', uploadError.message)
          } else if (upload) {
            const { data: urlData } = supabase.storage.from('inspiration-images').getPublicUrl(upload.path)
            inspirationImageUrl = urlData.publicUrl
          }
        }
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          date: format(selectedDate, 'yyyy-MM-dd'),
          startTime: selectedTime,
          customerName: name,
          customerPhone: phone,
          ...(inspirationImageUrl ? { inspirationImageUrl } : {}),
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
    } catch {
      setError('שגיאה בשליחת הטופס. אנא נסי שוב.')
    } finally {
      setSubmitLoading(false)
    }
  }, [selectedServiceId, selectedDate, selectedTime, name, phone, inspirationFile, router, fetchSlots])

  return {
    selectedServiceId, handleServiceSelect,
    selectedDate, handleDateSelect,
    availableSlots, bookedSlots, slotsLoading, selectedTime, setSelectedTime,
    name, setName, phone, setPhone,
    submitLoading, error, handleSubmit,
    onFileChange: setInspirationFile,
  }
}
