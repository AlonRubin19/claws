# Claws Features V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add salon settings, black/white/grey color redesign, greyed booked slots, customer inspiration image upload, admin calendar view, and admin settings page to the existing Claws booking app.

**Architecture:** Six additive features on the existing Next.js 16 App Router / Supabase app. Database gets a `salon_settings` single-row table and an `inspiration_image_url` column on `appointments`. A new `computeAllSlots` pure function splits slots into available/booked. The admin panel gains two new pages (calendar with `react-big-calendar`, settings form).

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS v4, Supabase (Postgres + Storage + Auth), `react-big-calendar`, `date-fns` (already installed)

---

## File Map

### New files
- `src/lib/constants.ts` — `SETTINGS_ID` UUID used by migration seed and settings form
- `src/app/admin/(protected)/calendar/page.tsx` — server component, fetches appointments, renders `AppointmentsCalendar`
- `src/app/admin/(protected)/settings/page.tsx` — server component, fetches `salon_settings`, renders `SettingsForm`
- `src/components/admin/AppointmentsCalendar.tsx` — client component wrapping `react-big-calendar`
- `src/components/admin/AppointmentPopover.tsx` — modal overlay for appointment detail + actions
- `src/components/admin/SettingsForm.tsx` — form to edit the single salon settings row
- `supabase/migrations/005_salon_settings.sql`
- `supabase/migrations/006_inspiration_image.sql`

### Modified files
- `src/lib/types.ts` — add `SalonSettings`, add `inspiration_image_url` to `Appointment`
- `src/lib/slots.ts` — add `computeAllSlots` returning `{ available, booked }`
- `src/lib/__tests__/slots.test.ts` — tests for `computeAllSlots`
- `src/app/globals.css` — swap 6 color tokens to charcoal/warm-white palette
- `src/app/page.tsx` — fetch `salon_settings`, pass to `BookingClient`
- `src/app/BookingClient.tsx` — accept `settings` prop; show description in header, footer strip; pass `availableSlots`/`bookedSlots` to `TimeSlots`
- `src/app/api/slots/route.ts` — use `computeAllSlots`, return `{ available, booked }`
- `src/app/api/bookings/route.ts` — accept optional `inspirationImageUrl`
- `src/hooks/useBooking.ts` — split slot state into `availableSlots`/`bookedSlots`; add image file state + upload
- `src/components/booking/TimeSlots.tsx` — accept `available`+`booked` props, render booked slots grey
- `src/components/booking/CustomerForm.tsx` — add optional image file input
- `src/components/admin/Sidebar.tsx` — add Calendar and Settings nav items
- All components referencing old color tokens (`espresso`, `rose`, `terracotta`, `cream`, `blush`, `sand`)

---

## Task 1: DB Migrations and Constants

**Files:**
- Create: `src/lib/constants.ts`
- Create: `supabase/migrations/005_salon_settings.sql`
- Create: `supabase/migrations/006_inspiration_image.sql`

- [ ] **Step 1: Create the constants file**

```typescript
// src/lib/constants.ts
export const SETTINGS_ID = '00000000-0000-0000-0000-000000000001'
```

- [ ] **Step 2: Create migration 005**

```sql
-- supabase/migrations/005_salon_settings.sql
create table salon_settings (
  id          uuid primary key,
  address     text not null default '',
  phone       text not null default '',
  instagram   text not null default '',
  description text not null default '',
  updated_at  timestamptz default now()
);

alter table salon_settings enable row level security;

create policy "public read salon settings"
  on salon_settings for select to anon using (true);

create policy "staff manage salon settings"
  on salon_settings for all to authenticated
  using (true) with check (true);

grant select on salon_settings to anon;
grant select, insert, update, delete on salon_settings to authenticated;

-- Seed the single settings row with the fixed ID
insert into salon_settings (id, address, phone, instagram, description)
values (
  '00000000-0000-0000-0000-000000000001',
  '',
  '',
  '',
  ''
);
```

- [ ] **Step 3: Create migration 006**

```sql
-- supabase/migrations/006_inspiration_image.sql
alter table appointments
  add column inspiration_image_url text;
```

- [ ] **Step 4: Run both migrations in Supabase SQL Editor**

Paste and run `005_salon_settings.sql`, then `006_inspiration_image.sql`.
Expected: "Success. No rows returned" for both.

- [ ] **Step 5: Commit**

```bash
git add src/lib/constants.ts supabase/migrations/005_salon_settings.sql supabase/migrations/006_inspiration_image.sql
git commit -m "feat: add salon_settings table, inspiration_image_url column, SETTINGS_ID constant"
```

---

## Task 2: Color Palette

**Files:**
- Modify: `src/app/globals.css`
- Modify: all component files referencing old tokens

- [ ] **Step 1: Find all files using old color tokens**

```bash
grep -rl "espresso\|terracotta\|cream\|blush\|rose\|sand" src/ --include="*.tsx" --include="*.css"
```

Note every file in the output — you will update each one.

- [ ] **Step 2: Replace the `@theme` block in `src/app/globals.css`**

Replace:
```css
@theme {
  --color-cream: #fdf6f0;
  --color-blush: #f7c5b8;
  --color-rose: #e8a89a;
  --color-terracotta: #c9866f;
  --color-espresso: #4a3728;
  --color-sand: #f5ede8;
  --font-serif: Georgia, serif;
  --font-sans: system-ui, sans-serif;
}
```

With:
```css
@theme {
  --color-charcoal: #1a1a1a;
  --color-dark: #2d2d2d;
  --color-mid-grey: #555555;
  --color-warm-white: #f5f0eb;
  --color-light-grey: #e8e4df;
  --color-off-white: #f0ece8;
  --font-serif: Georgia, serif;
  --font-sans: system-ui, sans-serif;
}
```

- [ ] **Step 3: Update `body` background and base styles in `src/app/globals.css`**

Replace:
```css
body {
  background-color: #fdf6f0;
  color: #4a3728;
}
```
With:
```css
body {
  background-color: #f5f0eb;
  color: #1a1a1a;
}
```

Replace the `.label-style` color:
```css
  .label-style {
    ...
    color: #555555;   /* was #c9866f */
    ...
  }
```

Replace the `.input-style` border and focus colors:
```css
  .input-style {
    ...
    border: 2px solid #e8e4df;   /* was #f5ede8 */
    color: #1a1a1a;               /* was #4a3728 */
    ...
  }
  .input-style:focus {
    border-color: #2d2d2d;        /* was #e8a89a */
  }
```

- [ ] **Step 4: Update `src/app/BookingClient.tsx`**

Replace all old token references with new ones:
- `bg-cream` → `bg-warm-white`
- `from-blush to-rose` → `from-charcoal to-dark` (header gradient)
- `text-terracotta` → `text-mid-grey`
- `bg-rose/10` → `bg-off-white`
- `text-espresso` → `text-charcoal`

- [ ] **Step 5: Update `src/components/booking/CustomerForm.tsx`**

Replace:
- `from-terracotta to-rose` → `from-dark to-charcoal`
- `shadow-rose/30` → `shadow-charcoal/20`

- [ ] **Step 6: Update `src/components/booking/TimeSlots.tsx`**

Replace:
- `text-terracotta` → `text-mid-grey`
- `bg-rose border-rose` → `bg-dark border-dark`
- `border-sand` → `border-light-grey`
- `hover:border-rose/50` → `hover:border-dark/50`
- `text-espresso` → `text-charcoal`

- [ ] **Step 7: Update `src/components/admin/Sidebar.tsx`**

Replace:
- `bg-espresso` → `bg-charcoal`
- `text-blush` → `text-warm-white`
- `border-rose` → `border-warm-white`

- [ ] **Step 8: Update `src/components/admin/AppointmentsTable.tsx`**

Replace:
- `bg-rose border-rose` → `bg-dark border-dark`
- `border-sand` → `border-light-grey`
- `bg-cream` → `bg-warm-white`
- `hover:bg-cream` → `hover:bg-off-white`

- [ ] **Step 9: Update all remaining files from Step 1**

For each remaining file, replace every old token with the new equivalent:

| Old | New |
|-----|-----|
| `espresso` | `charcoal` |
| `terracotta` | `mid-grey` |
| `rose` | `dark` |
| `blush` | `warm-white` |
| `cream` | `warm-white` |
| `sand` | `light-grey` |

Files typically affected: `src/app/admin/(protected)/page.tsx`, `src/components/admin/StatsRow.tsx`, `src/components/admin/ServiceModal.tsx`, `src/components/admin/AvailabilityForm.tsx`, `src/app/confirmation/[token]/page.tsx`, `src/app/admin/login/page.tsx`, `src/components/booking/ServiceGrid.tsx`, `src/components/booking/DateStrip.tsx`, `src/components/ui/StatusBadge.tsx`, `src/components/ui/Modal.tsx`

- [ ] **Step 10: Verify build passes**

```bash
npm run build
```
Expected: no TypeScript or Tailwind errors.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: replace warm palette with charcoal/warm-white color system"
```

---

## Task 3: Slots API — Return Available and Booked

**Files:**
- Modify: `src/lib/slots.ts`
- Modify: `src/lib/__tests__/slots.test.ts`
- Modify: `src/app/api/slots/route.ts`
- Modify: `src/hooks/useBooking.ts`
- Modify: `src/components/booking/TimeSlots.tsx`
- Modify: `src/app/BookingClient.tsx`

- [ ] **Step 1: Write failing tests for `computeAllSlots`**

Add to `src/lib/__tests__/slots.test.ts`:

```typescript
import { computeAvailableSlots, computeAllSlots } from '@/lib/slots'
// (keep existing imports and tests unchanged)

describe('computeAllSlots', () => {
  it('returns available and booked split correctly', () => {
    const booked: AppointmentSlot = { start_time: '11:00', end_time: '12:00', status: 'confirmed' }
    const result = computeAllSlots({
      date: '2026-06-07',
      serviceDurationMin: 60,
      weeklyAvailability: baseAvailability,
      exception: null,
      existingAppointments: [booked],
      now: new Date('2026-06-07T07:00:00'),
    })
    expect(result.available).toContain('10:00')
    expect(result.available).toContain('12:00')
    expect(result.booked).toContain('10:30')
    expect(result.booked).toContain('11:00')
    expect(result.booked).not.toContain('10:00')
    expect(result.available).not.toContain('10:30')
  })

  it('returns empty arrays when closed', () => {
    const result = computeAllSlots({
      date: '2026-06-07',
      serviceDurationMin: 60,
      weeklyAvailability: { ...baseAvailability, is_open: false },
      exception: null,
      existingAppointments: [],
      now: new Date('2026-06-07T07:00:00'),
    })
    expect(result.available).toEqual([])
    expect(result.booked).toEqual([])
  })

  it('excludes past slots from both arrays when today', () => {
    const result = computeAllSlots({
      date: '2026-06-07',
      serviceDurationMin: 60,
      weeklyAvailability: baseAvailability,
      exception: null,
      existingAppointments: [],
      now: new Date('2026-06-07T10:45:00'),
    })
    expect(result.available).not.toContain('10:00')
    expect(result.booked).not.toContain('10:00')
    expect(result.available).toContain('11:00')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern=slots
```
Expected: FAIL — `computeAllSlots` is not exported

- [ ] **Step 3: Add `computeAllSlots` to `src/lib/slots.ts`**

Add after the existing `computeAvailableSlots` function:

```typescript
export function computeAllSlots(params: ComputeSlotsParams): { available: string[]; booked: string[] } {
  const { date, serviceDurationMin, weeklyAvailability, exception, existingAppointments, now } = params

  let isOpen: boolean
  let openMinutes: number
  let closeMinutes: number

  if (exception) {
    isOpen = exception.is_open
    openMinutes = exception.open_time ? timeToMinutes(exception.open_time) : 0
    closeMinutes = exception.close_time ? timeToMinutes(exception.close_time) : 0
  } else if (weeklyAvailability) {
    isOpen = weeklyAvailability.is_open
    openMinutes = timeToMinutes(weeklyAvailability.open_time)
    closeMinutes = timeToMinutes(weeklyAvailability.close_time)
  } else {
    return { available: [], booked: [] }
  }

  if (!isOpen) return { available: [], booked: [] }

  const todayStr = now.toISOString().split('T')[0]
  const isToday = date === todayStr
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const active = existingAppointments.filter(a => a.status !== 'cancelled')

  const available: string[] = []
  const booked: string[] = []
  let cursor = openMinutes

  while (cursor + serviceDurationMin <= closeMinutes) {
    const candidateEnd = cursor + serviceDurationMin

    if (isToday && cursor <= nowMinutes) {
      cursor += 30
      continue
    }

    const blocked = active.some(a => {
      const aStart = timeToMinutes(a.start_time)
      const aEnd = timeToMinutes(a.end_time)
      return overlaps(cursor, candidateEnd, aStart, aEnd)
    })

    if (blocked) booked.push(minutesToTime(cursor))
    else available.push(minutesToTime(cursor))

    cursor += 30
  }

  return { available, booked }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern=slots
```
Expected: all tests PASS

- [ ] **Step 5: Update `/api/slots` route**

In `src/app/api/slots/route.ts`, replace the import and the final computation:

```typescript
import { computeAllSlots } from '@/lib/slots'
// (remove computeAvailableSlots import)
```

Replace the computation block at the end:
```typescript
  const { available, booked } = computeAllSlots({
    date,
    serviceDurationMin: service.duration_min,
    weeklyAvailability: weekly ?? null,
    exception: exception ?? null,
    existingAppointments: appointments ?? [],
    now: new Date(),
  })

  return NextResponse.json({ available, booked })
```

- [ ] **Step 6: Update `src/hooks/useBooking.ts`**

Replace the `slots` state with split state and update `fetchSlots` and the return value:

```typescript
  // Replace:
  // const [slots, setSlots] = useState<string[]>([])
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
```

In `fetchSlots`, replace:
```typescript
      setSlots(data.slots ?? [])
```
With:
```typescript
      setAvailableSlots(data.available ?? [])
      setBookedSlots(data.booked ?? [])
```

In `handleServiceSelect` and `handleDateSelect`, after the `fetchSlots` call, also reset both:
```typescript
  const handleServiceSelect = useCallback((id: string) => {
    setSelectedServiceId(id)
    setSelectedTime(null)
    setAvailableSlots([])
    setBookedSlots([])
    if (selectedDate) fetchSlots(selectedDate, id)
  }, [selectedDate, fetchSlots])

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date)
    setSelectedTime(null)
    setAvailableSlots([])
    setBookedSlots([])
    if (selectedServiceId) fetchSlots(date, selectedServiceId)
  }, [selectedServiceId, fetchSlots])
```

Update the return value:
```typescript
  return {
    selectedServiceId, handleServiceSelect,
    selectedDate, handleDateSelect,
    availableSlots, bookedSlots, slotsLoading,
    selectedTime, setSelectedTime,
    name, setName, phone, setPhone,
    submitLoading, error, handleSubmit,
  }
```

- [ ] **Step 7: Update `src/components/booking/TimeSlots.tsx`**

```typescript
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
```

- [ ] **Step 8: Update `src/app/BookingClient.tsx` to pass new props**

Replace the `TimeSlots` usage:
```tsx
            <TimeSlots
              available={booking.availableSlots}
              booked={booking.bookedSlots}
              selected={booking.selectedTime}
              loading={booking.slotsLoading}
              onSelect={booking.setSelectedTime}
            />
```

Also update the condition that shows the time slots section (now checks `availableSlots` or `bookedSlots`):
```tsx
        {booking.selectedServiceId && booking.selectedDate && (
```
(This condition is unchanged — it still shows as soon as service + date are selected, even if all slots are booked.)

- [ ] **Step 9: Run build**

```bash
npm run build
```
Expected: no errors

- [ ] **Step 10: Commit**

```bash
git add src/lib/slots.ts src/lib/__tests__/slots.test.ts src/app/api/slots/route.ts src/hooks/useBooking.ts src/components/booking/TimeSlots.tsx src/app/BookingClient.tsx
git commit -m "feat: show booked slots greyed out on booking page"
```

---

## Task 4: Booking Page — Salon Info

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/BookingClient.tsx`

- [ ] **Step 1: Add `SalonSettings` type to `src/lib/types.ts`**

```typescript
export interface SalonSettings {
  id: string
  address: string
  phone: string
  instagram: string
  description: string
  updated_at: string
}
```

- [ ] **Step 2: Update `src/app/page.tsx` to fetch settings**

```typescript
import { createClient } from '@/lib/supabase/server'
import BookingClient from './BookingClient'
import { SETTINGS_ID } from '@/lib/constants'

export default async function BookingPage() {
  const supabase = await createClient()

  const [
    { data: services },
    { data: weekly },
    { data: exceptions },
    { data: settings },
  ] = await Promise.all([
    supabase.from('services').select('*').eq('is_active', true).order('price'),
    supabase.from('weekly_availability').select('day_of_week, is_open'),
    supabase.from('availability_exceptions').select('date, is_open'),
    supabase.from('salon_settings').select('*').eq('id', SETTINGS_ID).single(),
  ])

  return (
    <BookingClient
      services={services ?? []}
      weeklyAvailability={weekly ?? []}
      exceptions={exceptions ?? []}
      settings={settings ?? { id: SETTINGS_ID, address: '', phone: '', instagram: '', description: '', updated_at: '' }}
    />
  )
}
```

- [ ] **Step 3: Update `src/app/BookingClient.tsx`**

Add `SalonSettings` to the import and extend `Props`:
```typescript
import type { Service, SalonSettings } from '@/lib/types'

interface Props {
  services: Service[]
  weeklyAvailability: WeeklyRow[]
  exceptions: ExceptionRow[]
  settings: SalonSettings
}
```

Update the component signature:
```typescript
export default function BookingClient({ services, weeklyAvailability, exceptions, settings }: Props) {
```

Update the header to show description:
```tsx
      <header className="bg-charcoal px-6 py-8 text-center shadow-sm">
        <h1 className="text-3xl font-serif font-bold tracking-widest text-warm-white">✦ CLAWS ✦</h1>
        <p className="mt-1 text-sm text-warm-white/70 tracking-wider">סטודיו לציפורניים · קביעת תור</p>
        {settings.description && (
          <p className="mt-3 text-sm text-warm-white/60 max-w-sm mx-auto leading-relaxed">{settings.description}</p>
        )}
      </header>
```

Add a footer strip just before the closing `</div>` of the outer wrapper:
```tsx
      {(settings.address || settings.phone || settings.instagram) && (
        <footer className="bg-dark text-warm-white/60 text-xs text-center py-4 px-6 space-y-1">
          {settings.address && <p>📍 {settings.address}</p>}
          <div className="flex justify-center gap-4">
            {settings.phone && <span dir="ltr">📞 {settings.phone}</span>}
            {settings.instagram && <span>📸 {settings.instagram}</span>}
          </div>
        </footer>
      )}
```

- [ ] **Step 4: Run build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/app/page.tsx src/app/BookingClient.tsx
git commit -m "feat: show salon description and contact info on booking page"
```

---

## Task 5: Inspiration Image Upload

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/components/booking/CustomerForm.tsx`
- Modify: `src/hooks/useBooking.ts`
- Modify: `src/app/api/bookings/route.ts`

- [ ] **Step 1: Create the Supabase Storage bucket (manual)**

In your Supabase dashboard → **Storage** → **New bucket**:
- Name: `inspiration-images`
- Public bucket: **yes** (toggle on)
- Click Save

Then go to **Storage → Policies** and add:
- For `inspiration-images`: allow anon INSERT (upload)

Or run in SQL Editor:
```sql
insert into storage.buckets (id, name, public)
values ('inspiration-images', 'inspiration-images', true)
on conflict do nothing;

create policy "anon upload inspiration images"
  on storage.objects for insert to anon
  with check (bucket_id = 'inspiration-images');
```

- [ ] **Step 2: Add `inspiration_image_url` to the `Appointment` type in `src/lib/types.ts`**

```typescript
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
  inspiration_image_url?: string | null
  service?: Service
}
```

- [ ] **Step 3: Update `src/components/booking/CustomerForm.tsx`**

Add `inspirationFile` state and file input. Update the Props interface and component:

```typescript
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
        className="w-full rounded-2xl bg-charcoal py-4 text-warm-white font-semibold tracking-wide shadow-lg disabled:opacity-50 transition-opacity"
      >
        {loading ? 'שולחת...' : '✦ אישור תור'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Update `src/hooks/useBooking.ts`**

Add file state and upload logic:

```typescript
import { createClient } from '@/lib/supabase/client'
// add to existing import
```

Add state after other state declarations:
```typescript
  const [inspirationFile, setInspirationFile] = useState<File | null>(null)
```

In `handleSubmit`, add upload logic before the fetch call:
```typescript
    setSubmitLoading(true)
    setError(null)
    try {
      let inspirationImageUrl: string | undefined

      if (inspirationFile) {
        const ext = inspirationFile.name.split('.').pop()
        const path = `${crypto.randomUUID()}.${ext}`
        const supabase = createClient()
        const { data: upload, error: uploadError } = await supabase.storage
          .from('inspiration-images')
          .upload(path, inspirationFile, { contentType: inspirationFile.type })
        if (!uploadError && upload) {
          const { data: urlData } = supabase.storage.from('inspiration-images').getPublicUrl(upload.path)
          inspirationImageUrl = urlData.publicUrl
        }
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          date: format(selectedDate, 'yyyy-MM-dd'),
          startTime: selectedTime,
          customerName: name,
          customerPhone: phone,
          ...(inspirationImageUrl ? { inspirationImageUrl } : {}),
        }),
      })
      // ... rest unchanged
```

Add `inspirationFile` to the return value and add `setInspirationFile` as `onFileChange`:
```typescript
  return {
    ...
    onFileChange: setInspirationFile,
    ...
  }
```

- [ ] **Step 5: Update `src/app/BookingClient.tsx` to pass `onFileChange`**

```tsx
            <CustomerForm
              name={booking.name}
              phone={booking.phone}
              onNameChange={booking.setName}
              onPhoneChange={booking.setPhone}
              onFileChange={booking.onFileChange}
              onSubmit={booking.handleSubmit}
              loading={booking.submitLoading}
              error={booking.error}
            />
```

- [ ] **Step 6: Update `src/app/api/bookings/route.ts`**

Add `inspirationImageUrl` to the destructured body and the insert:
```typescript
  const { serviceId, date, startTime, customerName, customerPhone, inspirationImageUrl } = body
```

In the insert object:
```typescript
    .insert({
      service_id: serviceId,
      customer_name: customerName,
      customer_phone: customerPhone,
      date,
      start_time: startTime,
      end_time: endTime,
      ...(inspirationImageUrl ? { inspiration_image_url: inspirationImageUrl } : {}),
    })
```

- [ ] **Step 7: Run build**

```bash
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/types.ts src/components/booking/CustomerForm.tsx src/hooks/useBooking.ts src/app/BookingClient.tsx src/app/api/bookings/route.ts
git commit -m "feat: add inspiration image upload to customer booking form"
```

---

## Task 6: Admin Sidebar, Settings Page

**Files:**
- Modify: `src/components/admin/Sidebar.tsx`
- Create: `src/components/admin/SettingsForm.tsx`
- Create: `src/app/admin/(protected)/settings/page.tsx`

- [ ] **Step 1: Update `src/components/admin/Sidebar.tsx`**

Add two new nav items to the `navItems` array:
```typescript
const navItems = [
  { href: '/admin', label: 'תורים', icon: '📋', exact: true },
  { href: '/admin/calendar', label: 'לוח שנה', icon: '📅', exact: false },
  { href: '/admin/services', label: 'שירותים', icon: '💅', exact: false },
  { href: '/admin/availability', label: 'זמינות', icon: '🕐', exact: false },
  { href: '/admin/settings', label: 'הגדרות', icon: '⚙️', exact: false },
]
```

Also update the color tokens in the JSX (done as part of Task 2, but verify here):
- `bg-espresso` → `bg-charcoal`
- `text-blush` → `text-warm-white`
- `border-rose` → `border-warm-white`

- [ ] **Step 2: Create `src/components/admin/SettingsForm.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SETTINGS_ID } from '@/lib/constants'
import type { SalonSettings } from '@/lib/types'

interface Props { settings: SalonSettings }

export default function SettingsForm({ settings }: Props) {
  const router = useRouter()
  const [address, setAddress] = useState(settings.address)
  const [phone, setPhone] = useState(settings.phone)
  const [instagram, setInstagram] = useState(settings.instagram)
  const [description, setDescription] = useState(settings.description)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSave() {
    setLoading(true)
    setMessage(null)
    const supabase = createClient()
    const { error } = await supabase
      .from('salon_settings')
      .update({ address, phone, instagram, description, updated_at: new Date().toISOString() })
      .eq('id', SETTINGS_ID)
    if (error) {
      setMessage({ type: 'error', text: 'שגיאה בשמירת ההגדרות. נסי שוב.' })
    } else {
      setMessage({ type: 'success', text: 'ההגדרות נשמרו בהצלחה ✓' })
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <label className="label-style">כתובת הסלון</label>
        <input
          type="text"
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="למשל: רחוב הרצל 12, תל אביב"
          className="input-style"
        />
      </div>
      <div>
        <label className="label-style">טלפון</label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="050-123-4567"
          className="input-style"
          dir="ltr"
        />
      </div>
      <div>
        <label className="label-style">אינסטגרם</label>
        <input
          type="text"
          value={instagram}
          onChange={e => setInstagram(e.target.value)}
          placeholder="@claws.nails"
          className="input-style"
          dir="ltr"
        />
      </div>
      <div>
        <label className="label-style">תיאור הסלון</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="כמה מילים על הסלון — יוצג בראש דף ההזמנות"
          rows={4}
          className="input-style resize-none"
        />
      </div>
      {message && (
        <p className={`text-sm rounded-xl px-4 py-2 ${message.type === 'success' ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
          {message.text}
        </p>
      )}
      <button
        onClick={handleSave}
        disabled={loading}
        className="rounded-xl bg-charcoal text-warm-white px-6 py-3 text-sm font-semibold tracking-wide disabled:opacity-50 transition-opacity"
      >
        {loading ? 'שומרת...' : 'שמירת הגדרות'}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/app/admin/(protected)/settings/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { SETTINGS_ID } from '@/lib/constants'
import SettingsForm from '@/components/admin/SettingsForm'
import type { SalonSettings } from '@/lib/types'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('salon_settings')
    .select('*')
    .eq('id', SETTINGS_ID)
    .single()

  const settings: SalonSettings = data ?? {
    id: SETTINGS_ID,
    address: '',
    phone: '',
    instagram: '',
    description: '',
    updated_at: '',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-charcoal">הגדרות סלון</h1>
      </div>
      <SettingsForm settings={settings} />
    </div>
  )
}
```

- [ ] **Step 4: Run build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/Sidebar.tsx src/components/admin/SettingsForm.tsx src/app/admin/\(protected\)/settings/page.tsx
git commit -m "feat: add admin settings page for salon address, phone, instagram, description"
```

---

## Task 7: Admin Calendar Page

**Files:**
- Create: `src/components/admin/AppointmentPopover.tsx`
- Create: `src/components/admin/AppointmentsCalendar.tsx`
- Create: `src/app/admin/(protected)/calendar/page.tsx`

- [ ] **Step 1: Install `react-big-calendar`**

```bash
npm install react-big-calendar
npm install --save-dev @types/react-big-calendar
```

- [ ] **Step 2: Create `src/components/admin/AppointmentPopover.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/ui/StatusBadge'
import type { Appointment, AppointmentStatus } from '@/lib/types'

interface Props {
  appointment: Appointment
  onClose: () => void
}

export default function AppointmentPopover({ appointment: initial, onClose }: Props) {
  const router = useRouter()
  const [appointment, setAppointment] = useState(initial)
  const [loading, setLoading] = useState<string | null>(null)

  async function updateStatus(status: AppointmentStatus) {
    setLoading(status)
    const supabase = createClient()
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointment.id)
    if (error) {
      alert('שגיאה בעדכון הסטטוס')
    } else {
      setAppointment(prev => ({ ...prev, status }))
      router.refresh()
    }
    setLoading(null)
  }

  const dateLabel = new Date(`${appointment.date}T${appointment.start_time}`)
    .toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-bold text-charcoal">{appointment.customer_name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-charcoal text-xl leading-none">✕</button>
        </div>

        <p className="text-sm text-mid-grey mb-4">{appointment.service?.name ?? '—'}</p>

        <div className="space-y-2 text-sm text-mid-grey mb-4">
          <p>📅 {dateLabel}, {appointment.start_time}–{appointment.end_time}</p>
          <p dir="ltr" className="text-right">📞 {appointment.customer_phone}</p>
        </div>

        {appointment.inspiration_image_url && (
          <a
            href={appointment.inspiration_image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block mb-4"
          >
            <img
              src={appointment.inspiration_image_url}
              alt="תמונת השראה"
              className="w-full h-32 object-cover rounded-xl border border-light-grey"
            />
            <p className="text-xs text-mid-grey mt-1 text-center">לחצי לפתיחת התמונה המלאה</p>
          </a>
        )}

        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-mid-grey">סטטוס</span>
          <StatusBadge status={appointment.status} />
        </div>

        <div className="flex gap-2">
          {appointment.status === 'pending' && (
            <button
              onClick={() => updateStatus('confirmed')}
              disabled={loading === 'confirmed'}
              className="flex-1 py-2 rounded-xl bg-charcoal text-warm-white text-sm font-semibold disabled:opacity-50"
            >
              {loading === 'confirmed' ? '...' : '✓ אישור'}
            </button>
          )}
          {appointment.status === 'confirmed' && (
            <button
              onClick={() => updateStatus('completed')}
              disabled={loading === 'completed'}
              className="flex-1 py-2 rounded-xl bg-charcoal text-warm-white text-sm font-semibold disabled:opacity-50"
            >
              {loading === 'completed' ? '...' : '✓✓ הושלם'}
            </button>
          )}
          {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
            <button
              onClick={() => { if (confirm('לבטל את התור?')) updateStatus('cancelled') }}
              disabled={loading === 'cancelled'}
              className="flex-1 py-2 rounded-xl bg-off-white text-mid-grey text-sm font-semibold disabled:opacity-50"
            >
              {loading === 'cancelled' ? '...' : '✕ ביטול'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/components/admin/AppointmentsCalendar.tsx`**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { he } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import AppointmentPopover from './AppointmentPopover'
import type { Appointment } from '@/lib/types'

const locales = { he }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

const messages = {
  today: 'היום', previous: '‹', next: '›',
  month: 'חודש', week: 'שבוע', day: 'יום',
  agenda: 'יומן', date: 'תאריך', time: 'שעה',
  event: 'תור', noEventsInRange: 'אין תורים בטווח זה',
}

const STATUS_COLORS: Record<string, { backgroundColor: string; color: string }> = {
  pending:   { backgroundColor: '#888888', color: '#fff' },
  confirmed: { backgroundColor: '#2d2d2d', color: '#f5f0eb' },
  completed: { backgroundColor: '#cccccc', color: '#555555' },
}

interface CalEvent {
  title: string
  start: Date
  end: Date
  resource: Appointment
}

interface Props { appointments: Appointment[] }

export default function AppointmentsCalendar({ appointments }: Props) {
  const [view, setView] = useState<View>('week')
  const [selected, setSelected] = useState<Appointment | null>(null)

  const events: CalEvent[] = appointments
    .filter(a => a.status !== 'cancelled')
    .map(a => ({
      title: `${a.customer_name}${a.service?.name ? ' — ' + a.service.name : ''}`,
      start: new Date(`${a.date}T${a.start_time}`),
      end: new Date(`${a.date}T${a.end_time}`),
      resource: a,
    }))

  const eventPropGetter = useCallback((event: CalEvent) => ({
    style: STATUS_COLORS[event.resource.status] ?? STATUS_COLORS.pending,
  }), [])

  const handleSelectEvent = useCallback((event: CalEvent) => {
    setSelected(event.resource)
  }, [])

  return (
    <div style={{ direction: 'ltr' }}>
      <div className="bg-white rounded-2xl border border-light-grey overflow-hidden" style={{ height: 600 }}>
        <Calendar
          localizer={localizer}
          events={events}
          view={view}
          onView={setView}
          views={['day', 'week', 'month']}
          messages={messages}
          culture="he"
          eventPropGetter={eventPropGetter}
          onSelectEvent={handleSelectEvent}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%', fontFamily: 'system-ui, sans-serif' }}
        />
      </div>
      {selected && (
        <AppointmentPopover
          appointment={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create `src/app/admin/(protected)/calendar/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import AppointmentsCalendar from '@/components/admin/AppointmentsCalendar'
import type { Appointment } from '@/lib/types'

export default async function CalendarPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('appointments')
    .select('*, service:services(name)')
    .neq('status', 'cancelled')
    .order('date')
    .order('start_time')

  const appointments = (data ?? []) as Appointment[]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-charcoal">לוח שנה</h1>
      </div>
      <AppointmentsCalendar appointments={appointments} />
    </div>
  )
}
```

- [ ] **Step 5: Run build**

```bash
npm run build
```
Expected: clean build. If `react-big-calendar` CSS import causes issues in Next.js, add `transpilePackages: ['react-big-calendar']` to `next.config.ts`:

```typescript
// next.config.ts
const nextConfig = {
  transpilePackages: ['react-big-calendar'],
}
export default nextConfig
```

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/AppointmentPopover.tsx src/components/admin/AppointmentsCalendar.tsx src/app/admin/\(protected\)/calendar/page.tsx package.json package-lock.json
git commit -m "feat: add admin calendar page with day/week/month views and appointment detail popover"
```

---

## Task 8: Final Build, Push, Redeploy

- [ ] **Step 1: Run full build and tests**

```bash
npm test
npm run build
```
Expected: all tests pass, build succeeds.

- [ ] **Step 2: Push to GitHub**

```bash
git push
```

- [ ] **Step 3: Trigger Vercel redeploy**

In Vercel dashboard → Deployments → click `...` on the latest deployment → **Redeploy**.

- [ ] **Step 4: Smoke test the live site**

- Booking page: confirm new colors, description shows (if set), footer shows (if set), booked slots appear grey
- Admin → Settings: fill in address/phone/description, save, reload booking page to confirm display
- Admin → Calendar: navigate to current week, verify appointments appear, click one to see popover
- Upload an image during a test booking, confirm it appears in the admin calendar popover
