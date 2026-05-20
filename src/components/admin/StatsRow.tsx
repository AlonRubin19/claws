interface Props {
  todayCount: number
  weekCount: number
  pendingCount: number
}

export default function StatsRow({ todayCount, weekCount, pendingCount }: Props) {
  const stats = [
    { label: 'היום', value: todayCount },
    { label: 'השבוע', value: weekCount },
    { label: 'ממתינים', value: pendingCount },
  ]
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {stats.map(s => (
        <div key={s.label} className="bg-white rounded-xl border border-sand p-4">
          <p className="text-2xl font-bold text-terracotta">{s.value}</p>
          <p className="text-xs text-gray-400 mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  )
}
