export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export interface Service {
  id: string
  name: string
  duration_min: number
  price: number
  is_active: boolean
  created_at: string
}

export interface WeeklyAvailability {
  id: string
  day_of_week: number
  open_time: string
  close_time: string
  is_open: boolean
}

export interface AvailabilityException {
  id: string
  date: string
  is_open: boolean
  open_time: string | null
  close_time: string | null
  note: string | null
}

export interface Appointment {
  id: string
  token: string
  service_id: string
  customer_name: string
  customer_phone: string
  date: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  created_at: string
  service?: Service
}

export interface TimeSlot {
  time: string   // "HH:MM"
  available: boolean
}
