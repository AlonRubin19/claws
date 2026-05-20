import type { AppointmentStatus } from '@/lib/types'

const config: Record<AppointmentStatus, { label: string; classes: string }> = {
  pending:   { label: 'ממתין',  classes: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'מאושר',  classes: 'bg-green-100 text-green-700'  },
  completed: { label: 'הושלם',  classes: 'bg-purple-100 text-purple-700' },
  cancelled: { label: 'בוטל',   classes: 'bg-red-100 text-red-500'      },
}

export default function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, classes } = config[status]
  return (
    <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${classes}`}>
      {label}
    </span>
  )
}
