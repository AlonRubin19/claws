import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'

interface Props { params: Promise<{ token: string }> }

export default async function ConfirmationPage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()

  const { data: appointment } = await supabase
    .from('appointments')
    .select('*, service:services(name)')
    .eq('token', token)
    .single()

  if (!appointment) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-4xl mb-4">✦</p>
          <h1 className="text-xl font-semibold text-charcoal mb-2">הקישור אינו תקין</h1>
          <p className="text-sm text-gray-400">הקישור אינו תקין או שהתור לא נמצא</p>
        </div>
      </div>
    )
  }

  const dateFormatted = format(
    new Date(appointment.date + 'T00:00:00'),
    "EEEE, d בMMMM yyyy",
    { locale: he }
  )

  const whatsappText = encodeURIComponent(
    `התור שלי ב-CLAWS ✦\nשירות: ${appointment.service?.name}\nתאריך: ${dateFormatted}\nשעה: ${appointment.start_time}\nשם: ${appointment.customer_name}`
  )

  return (
    <div className="min-h-screen bg-warm-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <p className="text-5xl mb-3">💅</p>
          <h1 className="text-2xl font-serif font-bold text-charcoal">התור אושר!</h1>
          <p className="text-sm text-gray-400 mt-1">פרטי התור שלך</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4 border border-light-grey">
          <Row label="שירות" value={appointment.service?.name ?? ''} />
          <Row label="תאריך" value={dateFormatted} />
          <Row label="שעה" value={appointment.start_time} />
          <Row label="שם" value={appointment.customer_name} />
          <Row label="טלפון" value={appointment.customer_phone} />
        </div>

        <a
          href={`https://wa.me/?text=${whatsappText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white rounded-2xl py-4 font-semibold text-sm shadow-lg shadow-green-500/30 transition-colors"
        >
          <span>📲</span> שתפי בוואטסאפ
        </a>

        <a
          href="/"
          className="mt-3 block text-center text-sm text-mid-grey hover:underline"
        >
          קביעת תור נוסף ←
        </a>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-charcoal">{value}</span>
    </div>
  )
}
