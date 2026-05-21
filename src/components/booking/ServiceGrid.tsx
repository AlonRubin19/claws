import type { Service } from '@/lib/types'

interface Props {
  services: Service[]
  selected: string | null
  onSelect: (id: string) => void
}

export default function ServiceGrid({ services, selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {services.map(s => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={`rounded-xl border-2 p-3 text-right transition-all
            ${selected === s.id
              ? 'border-dark bg-light-grey'
              : 'border-light-grey bg-white hover:border-dark/50'}`}
        >
          <p className="font-semibold text-sm text-charcoal">{s.name}</p>
          <p className="text-mid-grey text-xs mt-1">₪{s.price}</p>
          <p className="text-gray-400 text-xs">{s.duration_min} דק׳</p>
        </button>
      ))}
    </div>
  )
}
