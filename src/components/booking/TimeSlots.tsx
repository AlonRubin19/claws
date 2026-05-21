interface Props {
  available: string[]
  booked: string[]
  selected: string | null
  loading: boolean
  onSelect: (time: string) => void
}

export default function TimeSlots({ available, booked, selected, loading, onSelect }: Props) {
  if (loading) {
    return <p className="text-sm text-mid-grey text-center py-4">טוען שעות...</p>
  }
  if (available.length === 0 && booked.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">אין תורים פנויים ביום זה</p>
  }
  if (available.length === 0 && booked.length > 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-mid-grey text-center py-1">היום מלא — כל השעות תפוסות</p>
        <div className="grid grid-cols-3 gap-2">
          {[...booked].sort().map(time => (
            <button key={time} disabled className="rounded-lg border-2 py-2 text-sm font-medium border-light-grey bg-off-white text-gray-300 cursor-not-allowed opacity-50">
              {time}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Merge and sort all slots for display
  const allTimes = Array.from(new Set([...available, ...booked])).sort()
  const bookedSet = new Set(booked)

  return (
    <div className="grid grid-cols-3 gap-2">
      {allTimes.map(time => {
        const isTaken = bookedSet.has(time)
        return (
          <button
            key={time}
            onClick={() => !isTaken && onSelect(time)}
            disabled={isTaken}
            className={`rounded-lg border-2 py-2 text-sm font-medium transition-all
              ${isTaken
                ? 'border-light-grey bg-off-white text-gray-300 cursor-not-allowed opacity-50'
                : selected === time
                  ? 'bg-dark border-dark text-warm-white'
                  : 'border-light-grey bg-white hover:border-dark/50 text-charcoal'}`}
          >
            {time}
          </button>
        )
      })}
    </div>
  )
}
