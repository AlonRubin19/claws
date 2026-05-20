interface Props {
  name: string
  phone: string
  onNameChange: (v: string) => void
  onPhoneChange: (v: string) => void
  onSubmit: () => void
  loading: boolean
  error: string | null
}

export default function CustomerForm({ name, phone, onNameChange, onPhoneChange, onSubmit, loading, error }: Props) {
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
      {error && (
        <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2">{error}</p>
      )}
      <button
        onClick={onSubmit}
        disabled={loading}
        className="w-full rounded-2xl bg-gradient-to-l from-terracotta to-rose py-4 text-white font-semibold tracking-wide shadow-lg shadow-rose/30 disabled:opacity-50 transition-opacity"
      >
        {loading ? 'שולחת...' : '✦ אישור תור'}
      </button>
    </div>
  )
}
