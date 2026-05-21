interface Props {
  slots: string[]
  selected: string | null
  loading: boolean
  onSelect: (time: string) => void
}

export default function TimeSlots({ slots, selected, loading, onSelect }: Props) {
  if (loading) {
    return <p className="text-sm text-mid-grey text-center py-4">טוען שעות...</p>
  }
  if (slots.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">אין תורים פנויים ביום זה</p>
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {slots.map(time => (
        <button
          key={time}
          onClick={() => onSelect(time)}
          className={`rounded-lg border-2 py-2 text-sm font-medium transition-all
            ${selected === time
              ? 'bg-dark border-dark text-white'
              : 'border-light-grey bg-white hover:border-dark/50 text-charcoal'}`}
        >
          {time}
        </button>
      ))}
    </div>
  )
}
