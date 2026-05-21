interface Props {
  name: string
  phone: string
  onNameChange: (v: string) => void
  onPhoneChange: (v: string) => void
  onFileChange: (file: File | null) => void
  onSubmit: () => void
  loading: boolean
  error: string | null
}

export default function CustomerForm({ name, phone, onNameChange, onPhoneChange, onFileChange, onSubmit, loading, error }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="label-style">שם מלא</label>
        <input
          type="text"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          placeholder="למשל: שרה כהן"
          className="input-style"
        />
      </div>
      <div>
        <label className="label-style">מספר טלפון</label>
        <input
          type="tel"
          value={phone}
          onChange={e => onPhoneChange(e.target.value)}
          placeholder="050-123-4567"
          className="input-style"
          dir="ltr"
        />
      </div>
      <div>
        <label className="label-style">השראה לציפורניים (אופציונלי)</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={e => onFileChange(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-mid-grey file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-off-white file:text-charcoal hover:file:bg-light-grey cursor-pointer"
        />
      </div>
      {error && (
        <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2">{error}</p>
      )}
      <button
        onClick={onSubmit}
        disabled={loading}
        className="w-full rounded-2xl bg-charcoal py-4 text-white font-semibold tracking-wide shadow-lg shadow-charcoal/20 disabled:opacity-50 transition-opacity"
      >
        {loading ? 'שולחת...' : '✦ אישור תור'}
      </button>
    </div>
  )
}
