'use client'

import { format, addDays, isSameDay } from 'date-fns'

interface Props {
  closedDates: Set<string>
  selected: Date | null
  onSelect: (date: Date) => void
}

const DAY_LABELS = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳']

export default function DateStrip({ closedDates, selected, onSelect }: Props) {
  const today = new Date()
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i))

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const isClosed = closedDates.has(dateStr)
        const isSelected = selected ? isSameDay(day, selected) : false

        return (
          <button
            key={dateStr}
            disabled={isClosed}
            onClick={() => onSelect(day)}
            className={`flex-shrink-0 w-12 rounded-xl border-2 py-2 text-center transition-all
              ${isSelected ? 'bg-rose border-rose text-white'
                : isClosed ? 'border-sand bg-sand text-gray-300 cursor-not-allowed'
                : 'border-sand bg-white hover:border-rose/50'}`}
          >
            <p className="text-xs opacity-70">{DAY_LABELS[day.getDay()]}</p>
            <p className="text-base font-semibold leading-tight">{format(day, 'd')}</p>
          </button>
        )
      })}
    </div>
  )
}
