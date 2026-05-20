# Claws Booking App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Hebrew, mobile-first nail salon appointment booking web app with a public booking flow and a staff admin panel, backed by Supabase and deployed on Vercel.

**Architecture:** Next.js 14 App Router with TypeScript and Tailwind CSS. Public routes handle booking; `/admin/*` routes are protected by `middleware.ts` checking Supabase session cookies. Slot availability is computed server-side in `GET /api/slots` using pure logic in `src/lib/slots.ts`. All text is Hebrew, layout is RTL.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS v3, Supabase (Postgres + Auth + RLS), `@supabase/ssr`, `date-fns` (Hebrew locale), Vercel

---

## File Map

```
claws/
├── middleware.ts                              ← Auth guard for /admin/*
├── supabase/migrations/001_initial.sql        ← DB schema + RLS
├── src/
│   ├── app/
│   │   ├── layout.tsx                         ← Root layout: dir="rtl", font, theme
│   │   ├── globals.css                        ← Tailwind base + CSS custom properties
│   │   ├── page.tsx                           ← Customer booking page (client component)
│   │   ├── confirmation/[token]/page.tsx      ← Confirmation (server component)
│   │   ├── admin/
│   │   │   ├── layout.tsx                     ← Admin shell with Sidebar
│   │   │   ├── login/page.tsx                 ← Login form
│   │   │   ├── page.tsx                       ← Dashboard: stats + appointments table
│   │   │   ├── services/page.tsx              ← Services CRUD
│   │   │   └── availability/page.tsx          ← Weekly hours + exceptions
│   │   └── api/
│   │       ├── slots/route.ts                 ← GET /api/slots
│   │       └── bookings/route.ts              ← POST /api/bookings
│   ├── components/
│   │   ├── booking/
│   │   │   ├── ServiceGrid.tsx                ← Service selection cards
│   │   │   ├── DateStrip.tsx                  ← Scrollable 14-day date picker
│   │   │   ├── TimeSlots.tsx                  ← Available time slot grid
│   │   │   └── CustomerForm.tsx               ← Name, phone, confirm button
│   │   ├── admin/
│   │   │   ├── Sidebar.tsx                    ← Nav sidebar
│   │   │   ├── StatsRow.tsx                   ← Today/week/pending KPI cards
│   │   │   ├── AppointmentsTable.tsx          ← Table + filters + row actions
│   │   │   ├── ServiceModal.tsx               ← Add/edit service modal
│   │   │   └── AvailabilityForm.tsx           ← Weekly schedule + exceptions
│   │   └── ui/
│   │       ├── StatusBadge.tsx                ← Color-coded appointment status chip
│   │       └── Modal.tsx                      ← Reusable modal wrapper
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                      ← Browser Supabase client (singleton)
│   │   │   └── server.ts                      ← Server Supabase client (cookie-based)
│   │   ├── slots.ts                           ← Pure slot computation function
│   │   └── types.ts                           ← Shared TypeScript interfaces
│   └── hooks/
│       └── useBooking.ts                      ← Booking page state + API calls
```

---

## Task 1: Project Bootstrap

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json` (via CLI)
- Create: `.env.local`
- Create: `.gitignore`

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd C:/projects/claws
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-git
```

Answer prompts: Yes to TypeScript, Yes to Tailwind, Yes to App Router, Yes to src dir.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr date-fns
npm install -D jest @types/jest jest-environment-jsdom ts-jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Configure Jest**

Create `jest.config.ts`:

```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
}

export default createJestConfig(config)
```

- [ ] **Step 4: Create `.env.local`**

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace the placeholder values with your actual Supabase project credentials (found in Supabase Dashboard → Settings → API).

- [ ] **Step 5: Configure Tailwind with custom colors**

Replace `tailwind.config.ts` content:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: '#fdf6f0',
        blush: '#f7c5b8',
        rose: '#e8a89a',
        terracotta: '#c9866f',
        espresso: '#4a3728',
        sand: '#f5ede8',
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
        sans: ['system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 6: Initialize git and commit**

```bash
git init
echo ".env.local" >> .gitignore
echo ".superpowers/" >> .gitignore
git add -A
git commit -m "chore: bootstrap Next.js project with Tailwind and Supabase deps"
```

---

## Task 2: Database Migration

**Files:**
- Create: `supabase/migrations/001_initial.sql`

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/001_initial.sql`:

```sql
-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Services
create table services (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  duration_min integer not null,
  price        integer not null,
  is_active    boolean not null default true,
  created_at   timestamptz default now()
);

-- Weekly availability (one row per day of week)
create table weekly_availability (
  id          uuid primary key default gen_random_uuid(),
  day_of_week integer not null unique check (day_of_week between 0 and 6),
  open_time   time not null,
  close_time  time not null,
  is_open     boolean not null default true
);

-- Availability exceptions (overrides for specific dates)
create table availability_exceptions (
  id         uuid primary key default gen_random_uuid(),
  date       date not null unique,
  is_open    boolean not null,
  open_time  time,
  close_time time,
  note       text
);

-- Appointments
create table appointments (
  id             uuid primary key default gen_random_uuid(),
  token          uuid not null unique default gen_random_uuid(),
  service_id     uuid not null references services(id),
  customer_name  text not null,
  customer_phone text not null,
  date           date not null,
  start_time     time not null,
  end_time       time not null,
  status         text not null default 'pending'
                   check (status in ('pending','confirmed','completed','cancelled')),
  created_at     timestamptz default now()
);

-- RLS: enable on all tables
alter table services enable row level security;
alter table weekly_availability enable row level security;
alter table availability_exceptions enable row level security;
alter table appointments enable row level security;

-- services: public can read active; staff (authenticated) can do everything
create policy "public read active services"
  on services for select to anon
  using (is_active = true);

create policy "staff full access services"
  on services for all to authenticated
  using (true) with check (true);

-- weekly_availability: public read; staff full access
create policy "public read availability"
  on weekly_availability for select to anon
  using (true);

create policy "staff full access availability"
  on weekly_availability for all to authenticated
  using (true) with check (true);

-- availability_exceptions: public read; staff full access
create policy "public read exceptions"
  on availability_exceptions for select to anon
  using (true);

create policy "staff full access exceptions"
  on availability_exceptions for all to authenticated
  using (true) with check (true);

-- appointments: anon can insert; staff can read/update
create policy "public insert appointment"
  on appointments for insert to anon
  with check (true);

create policy "staff read appointments"
  on appointments for select to authenticated
  using (true);

create policy "staff update appointments"
  on appointments for update to authenticated
  using (true) with check (true);

-- Seed: default weekly schedule (Sun–Thu open 10-19, Fri 10-14, Sat closed)
insert into weekly_availability (day_of_week, open_time, close_time, is_open) values
  (0, '10:00', '19:00', true),
  (1, '10:00', '19:00', true),
  (2, '10:00', '19:00', true),
  (3, '10:00', '19:00', true),
  (4, '10:00', '19:00', true),
  (5, '10:00', '14:00', true),
  (6, '10:00', '19:00', false);

-- Seed: sample services
insert into services (name, duration_min, price) values
  ('מניקור ג''ל', 60, 150),
  ('מניקור קלאסי', 45, 90),
  ('פדיקור', 50, 120),
  ('ציפורניים מלאכותיות', 90, 220);
```

- [ ] **Step 2: Apply migration in Supabase**

Open the Supabase Dashboard → SQL Editor → paste the contents of `001_initial.sql` → Run.

Verify: go to Table Editor and confirm all 4 tables exist with the seed rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add initial database schema and seed data"
```

---

## Task 3: Shared Types and Supabase Clients

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`

- [ ] **Step 1: Create shared TypeScript types**

Create `src/lib/types.ts`:

```typescript
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export interface Service {
  id: string
  name: string
  duration_min: number
  price: number
  is_active: boolean
  created_at: string
}

export interface WeeklyAvailability {
  id: string
  day_of_week: number
  open_time: string
  close_time: string
  is_open: boolean
}

export interface AvailabilityException {
  id: string
  date: string
  is_open: boolean
  open_time: string | null
  close_time: string | null
  note: string | null
}

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
  service?: Service
}

export interface TimeSlot {
  time: string   // "HH:MM"
  available: boolean
}
```

- [ ] **Step 2: Create browser Supabase client**

Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Create server Supabase client**

Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/
git commit -m "feat: add shared types and Supabase client helpers"
```

---

## Task 4: Slot Computation Logic

**Files:**
- Create: `src/lib/slots.ts`
- Create: `src/lib/__tests__/slots.test.ts`

This is the core business logic. It's a pure function — no I/O, easy to test.

- [ ] **Step 1: Write the failing tests first**

Create `src/lib/__tests__/slots.test.ts`:

```typescript
import { computeAvailableSlots } from '@/lib/slots'
import type { WeeklyAvailability, AvailabilityException, Appointment } from '@/lib/types'

const baseAvailability: WeeklyAvailability = {
  id: '1', day_of_week: 0, open_time: '10:00', close_time: '13:00', is_open: true,
}

describe('computeAvailableSlots', () => {
  it('returns slots at 30-min intervals within open hours', () => {
    const slots = computeAvailableSlots({
      date: '2026-06-07',        // a Sunday
      serviceDurationMin: 60,
      weeklyAvailability: baseAvailability,
      exception: null,
      existingAppointments: [],
      now: new Date('2026-06-07T07:00:00'),
    })
    // 10:00 and 11:00 fit (end by 13:00); 11:30 would end at 12:30 ✓; 12:00 ends at 13:00 ✓; 12:30 would end at 13:30 ✗
    expect(slots).toEqual(['10:00', '10:30', '11:00', '11:30', '12:00'])
  })

  it('returns empty array when day is closed', () => {
    const closed = { ...baseAvailability, is_open: false }
    const slots = computeAvailableSlots({
      date: '2026-06-07',
      serviceDurationMin: 60,
      weeklyAvailability: closed,
      exception: null,
      existingAppointments: [],
      now: new Date('2026-06-07T07:00:00'),
    })
    expect(slots).toEqual([])
  })

  it('exception overrides weekly schedule', () => {
    const exception: AvailabilityException = {
      id: '2', date: '2026-06-07', is_open: true,
      open_time: '14:00', close_time: '16:00', note: null,
    }
    const slots = computeAvailableSlots({
      date: '2026-06-07',
      serviceDurationMin: 60,
      weeklyAvailability: baseAvailability,
      exception,
      existingAppointments: [],
      now: new Date('2026-06-07T07:00:00'),
    })
    expect(slots).toEqual(['14:00', '14:30', '15:00'])
  })

  it('exception with is_open=false returns empty', () => {
    const exception: AvailabilityException = {
      id: '3', date: '2026-06-07', is_open: false,
      open_time: null, close_time: null, note: 'חג',
    }
    const slots = computeAvailableSlots({
      date: '2026-06-07',
      serviceDurationMin: 60,
      weeklyAvailability: baseAvailability,
      exception,
      existingAppointments: [],
      now: new Date('2026-06-07T07:00:00'),
    })
    expect(slots).toEqual([])
  })

  it('blocks slots overlapping an existing appointment', () => {
    const appointment: Appointment = {
      id: 'a1', token: 't1', service_id: 's1',
      customer_name: 'Test', customer_phone: '050',
      date: '2026-06-07', start_time: '11:00', end_time: '12:00',
      status: 'confirmed', created_at: '',
    }
    const slots = computeAvailableSlots({
      date: '2026-06-07',
      serviceDurationMin: 60,
      weeklyAvailability: baseAvailability,
      exception: null,
      existingAppointments: [appointment],
      now: new Date('2026-06-07T07:00:00'),
    })
    // Overlap check is exclusive: candidateEnd > apptStart.
    // 10:00–11:00 vs 11:00–12:00: 660 > 660 is false → NOT blocked (10:00 is free)
    // 10:30–11:30 vs 11:00–12:00: 690 > 660 is true → blocked
    // 11:00–12:00 vs 11:00–12:00: direct overlap → blocked
    // 11:30–12:30 vs 11:00–12:00: 750 > 660 but 12:30 > closeTime 13:00 — still in window, blocked
    // 12:00–13:00 vs 11:00–12:00: 720 > 720 is false → NOT blocked (12:00 is free)
    expect(slots).toContain('10:00')
    expect(slots).not.toContain('10:30')
    expect(slots).not.toContain('11:00')
    expect(slots).not.toContain('11:30')
    expect(slots).toContain('12:00')
  })

  it('ignores cancelled appointments when blocking slots', () => {
    const cancelled: Appointment = {
      id: 'a2', token: 't2', service_id: 's1',
      customer_name: 'Test', customer_phone: '050',
      date: '2026-06-07', start_time: '11:00', end_time: '12:00',
      status: 'cancelled', created_at: '',
    }
    const slots = computeAvailableSlots({
      date: '2026-06-07',
      serviceDurationMin: 60,
      weeklyAvailability: baseAvailability,
      exception: null,
      existingAppointments: [cancelled],
      now: new Date('2026-06-07T07:00:00'),
    })
    expect(slots).toContain('11:00')
  })

  it('filters out past slots when date is today', () => {
    const slots = computeAvailableSlots({
      date: '2026-06-07',
      serviceDurationMin: 60,
      weeklyAvailability: baseAvailability,
      exception: null,
      existingAppointments: [],
      now: new Date('2026-06-07T10:45:00'), // current time is 10:45
    })
    expect(slots).not.toContain('10:00')
    expect(slots).not.toContain('10:30')
    expect(slots).toContain('11:00')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest src/lib/__tests__/slots.test.ts --no-coverage
```

Expected: FAIL — `computeAvailableSlots` not found.

- [ ] **Step 3: Implement slot computation**

Create `src/lib/slots.ts`:

```typescript
import type { WeeklyAvailability, AvailabilityException, Appointment } from '@/lib/types'

interface ComputeSlotsParams {
  date: string                           // 'YYYY-MM-DD'
  serviceDurationMin: number
  weeklyAvailability: WeeklyAvailability | null
  exception: AvailabilityException | null
  existingAppointments: Appointment[]
  now: Date
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function overlaps(
  candidateStart: number,
  candidateEnd: number,
  apptStart: number,
  apptEnd: number,
): boolean {
  return candidateStart < apptEnd && candidateEnd > apptStart
}

export function computeAvailableSlots(params: ComputeSlotsParams): string[] {
  const { date, serviceDurationMin, weeklyAvailability, exception, existingAppointments, now } = params

  // Determine effective hours
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
    return []
  }

  if (!isOpen) return []

  // Current time in minutes (only relevant if date === today)
  const todayStr = now.toISOString().split('T')[0]
  const isToday = date === todayStr
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  // Active (non-cancelled) appointments
  const active = existingAppointments.filter(a => a.status !== 'cancelled')

  const slots: string[] = []
  let cursor = openMinutes

  while (cursor + serviceDurationMin <= closeMinutes) {
    const candidateEnd = cursor + serviceDurationMin

    // Filter past slots on today
    if (isToday && cursor <= nowMinutes) {
      cursor += 30
      continue
    }

    // Check overlap with existing appointments
    const blocked = active.some(a => {
      const aStart = timeToMinutes(a.start_time)
      const aEnd = timeToMinutes(a.end_time)
      return overlaps(cursor, candidateEnd, aStart, aEnd)
    })

    if (!blocked) slots.push(minutesToTime(cursor))
    cursor += 30
  }

  return slots
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest src/lib/__tests__/slots.test.ts --no-coverage
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/slots.ts src/lib/__tests__/slots.test.ts
git commit -m "feat: add slot computation logic with tests"
```

---

## Task 5: API Routes

**Files:**
- Create: `src/app/api/slots/route.ts`
- Create: `src/app/api/bookings/route.ts`

- [ ] **Step 1: Create GET /api/slots**

Create `src/app/api/slots/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeAvailableSlots } from '@/lib/slots'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const serviceId = searchParams.get('serviceId')

  if (!date || !serviceId) {
    return NextResponse.json({ error: 'date and serviceId are required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Fetch service
  const { data: service, error: svcError } = await supabase
    .from('services')
    .select('duration_min')
    .eq('id', serviceId)
    .single()

  if (svcError || !service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }

  // Fetch weekly availability for this day
  const dayOfWeek = new Date(date + 'T00:00:00').getDay()
  const { data: weekly } = await supabase
    .from('weekly_availability')
    .select('*')
    .eq('day_of_week', dayOfWeek)
    .single()

  // Fetch exception for this date
  const { data: exception } = await supabase
    .from('availability_exceptions')
    .select('*')
    .eq('date', date)
    .single()

  // Fetch existing non-cancelled appointments for this date
  const { data: appointments } = await supabase
    .from('appointments')
    .select('start_time, end_time, status')
    .eq('date', date)
    .neq('status', 'cancelled')

  const slots = computeAvailableSlots({
    date,
    serviceDurationMin: service.duration_min,
    weeklyAvailability: weekly ?? null,
    exception: exception ?? null,
    existingAppointments: appointments ?? [],
    now: new Date(),
  })

  return NextResponse.json({ slots })
}
```

- [ ] **Step 2: Create POST /api/bookings**

Create `src/app/api/bookings/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeAvailableSlots } from '@/lib/slots'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { serviceId, date, startTime, customerName, customerPhone } = body

  if (!serviceId || !date || !startTime || !customerName || !customerPhone) {
    return NextResponse.json({ error: 'שדות חובה חסרים' }, { status: 400 })
  }

  const supabase = await createClient()

  // Fetch service to get duration
  const { data: service, error: svcError } = await supabase
    .from('services')
    .select('id, duration_min')
    .eq('id', serviceId)
    .eq('is_active', true)
    .single()

  if (svcError || !service) {
    return NextResponse.json({ error: 'שירות לא נמצא' }, { status: 404 })
  }

  // Re-validate slot is still available (prevent race condition)
  const dayOfWeek = new Date(date + 'T00:00:00').getDay()
  const { data: weekly } = await supabase
    .from('weekly_availability')
    .select('*')
    .eq('day_of_week', dayOfWeek)
    .single()

  const { data: exception } = await supabase
    .from('availability_exceptions')
    .select('*')
    .eq('date', date)
    .single()

  const { data: existing } = await supabase
    .from('appointments')
    .select('start_time, end_time, status')
    .eq('date', date)

  const available = computeAvailableSlots({
    date,
    serviceDurationMin: service.duration_min,
    weeklyAvailability: weekly ?? null,
    exception: exception ?? null,
    existingAppointments: existing ?? [],
    now: new Date(),
  })

  if (!available.includes(startTime)) {
    return NextResponse.json({ error: 'התור הזה כבר תפוס' }, { status: 409 })
  }

  // Compute end time
  const [h, m] = startTime.split(':').map(Number)
  const endMinutes = h * 60 + m + service.duration_min
  const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`

  const { data: appointment, error: insertError } = await supabase
    .from('appointments')
    .insert({
      service_id: serviceId,
      customer_name: customerName,
      customer_phone: customerPhone,
      date,
      start_time: startTime,
      end_time: endTime,
    })
    .select('token')
    .single()

  if (insertError || !appointment) {
    return NextResponse.json({ error: 'שגיאה ביצירת התור' }, { status: 500 })
  }

  return NextResponse.json({ token: appointment.token }, { status: 201 })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/
git commit -m "feat: add /api/slots and /api/bookings routes"
```

---

## Task 6: Root Layout and Global Styles

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update root layout with RTL and Hebrew font setup**

Replace `src/app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CLAWS – תור לציפורניים',
  description: 'הזמני תור לסטודיו לציפורניים CLAWS',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="bg-cream text-espresso font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Update globals.css**

Replace `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    box-sizing: border-box;
  }
  body {
    background-color: #fdf6f0;
    color: #4a3728;
  }
  /* Scrollbar styling for date strip */
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: configure RTL Hebrew layout and global styles"
```

---

## Task 7: UI Primitives

**Files:**
- Create: `src/components/ui/Modal.tsx`
- Create: `src/components/ui/StatusBadge.tsx`

- [ ] **Step 1: Create Modal component**

Create `src/components/ui/Modal.tsx`:

```typescript
'use client'

import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-espresso/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-espresso">{title}</h2>
          <button onClick={onClose} className="text-terracotta hover:text-espresso text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create StatusBadge component**

Create `src/components/ui/StatusBadge.tsx`:

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add Modal and StatusBadge UI primitives"
```

---

## Task 8: Booking Page Components

**Files:**
- Create: `src/components/booking/ServiceGrid.tsx`
- Create: `src/components/booking/DateStrip.tsx`
- Create: `src/components/booking/TimeSlots.tsx`
- Create: `src/components/booking/CustomerForm.tsx`
- Create: `src/hooks/useBooking.ts`

- [ ] **Step 1: Create ServiceGrid**

Create `src/components/booking/ServiceGrid.tsx`:

```typescript
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
              ? 'border-rose bg-rose/10'
              : 'border-sand bg-white hover:border-rose/50'}`}
        >
          <p className="font-semibold text-sm text-espresso">{s.name}</p>
          <p className="text-terracotta text-xs mt-1">₪{s.price}</p>
          <p className="text-gray-400 text-xs">{s.duration_min} דק׳</p>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create DateStrip**

Create `src/components/booking/DateStrip.tsx`:

```typescript
'use client'

import { format, addDays, isSameDay } from 'date-fns'
import { he } from 'date-fns/locale'

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
```

- [ ] **Step 3: Create TimeSlots**

Create `src/components/booking/TimeSlots.tsx`:

```typescript
interface Props {
  slots: string[]
  selected: string | null
  loading: boolean
  onSelect: (time: string) => void
}

export default function TimeSlots({ slots, selected, loading, onSelect }: Props) {
  if (loading) {
    return <p className="text-sm text-terracotta text-center py-4">טוען שעות...</p>
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
              ? 'bg-rose border-rose text-white'
              : 'border-sand bg-white hover:border-rose/50 text-espresso'}`}
        >
          {time}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create CustomerForm**

Create `src/components/booking/CustomerForm.tsx`:

```typescript
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
        <label className="block text-xs font-semibold uppercase tracking-widest text-terracotta mb-1">
          שם מלא
        </label>
        <input
          type="text"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          placeholder="למשל: שרה כהן"
          className="w-full rounded-xl border-2 border-sand px-4 py-3 text-sm text-espresso focus:border-rose focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-terracotta mb-1">
          מספר טלפון
        </label>
        <input
          type="tel"
          value={phone}
          onChange={e => onPhoneChange(e.target.value)}
          placeholder="050-123-4567"
          className="w-full rounded-xl border-2 border-sand px-4 py-3 text-sm text-espresso focus:border-rose focus:outline-none"
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
```

- [ ] **Step 5: Create useBooking hook**

Create `src/hooks/useBooking.ts`:

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import type { Service } from '@/lib/types'

export function useBooking(services: Service[]) {
  const router = useRouter()
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSlots = useCallback(async (date: Date, serviceId: string) => {
    setSlotsLoading(true)
    setSelectedTime(null)
    setError(null)
    const dateStr = format(date, 'yyyy-MM-dd')
    const res = await fetch(`/api/slots?date=${dateStr}&serviceId=${serviceId}`)
    const data = await res.json()
    setSlots(data.slots ?? [])
    setSlotsLoading(false)
  }, [])

  const handleServiceSelect = useCallback((id: string) => {
    setSelectedServiceId(id)
    setSelectedTime(null)
    if (selectedDate) fetchSlots(selectedDate, id)
  }, [selectedDate, fetchSlots])

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date)
    setSelectedTime(null)
    if (selectedServiceId) fetchSlots(date, selectedServiceId)
  }, [selectedServiceId, fetchSlots])

  const handleSubmit = useCallback(async () => {
    if (!selectedServiceId || !selectedDate || !selectedTime) {
      setError('יש לבחור שירות, תאריך ושעה')
      return
    }
    if (!name.trim() || !phone.trim()) {
      setError('יש למלא שם ומספר טלפון')
      return
    }
    setSubmitLoading(true)
    setError(null)
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId: selectedServiceId,
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: selectedTime,
        customerName: name,
        customerPhone: phone,
      }),
    })
    const data = await res.json()
    if (res.status === 409) {
      setError('התור הזה כבר תפוס. אנא בחרי שעה אחרת.')
      if (selectedDate && selectedServiceId) fetchSlots(selectedDate, selectedServiceId)
      setSelectedTime(null)
    } else if (!res.ok) {
      setError(data.error ?? 'שגיאה בשליחת הטופס')
    } else {
      router.push(`/confirmation/${data.token}`)
    }
    setSubmitLoading(false)
  }, [selectedServiceId, selectedDate, selectedTime, name, phone, router, fetchSlots])

  return {
    selectedServiceId, handleServiceSelect,
    selectedDate, handleDateSelect,
    slots, slotsLoading, selectedTime, setSelectedTime,
    name, setName, phone, setPhone,
    submitLoading, error, handleSubmit,
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/booking/ src/hooks/
git commit -m "feat: add booking components and useBooking hook"
```

---

## Task 9: Customer Booking Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write the booking page**

Replace `src/app/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import BookingClient from './BookingClient'

export default async function BookingPage() {
  const supabase = await createClient()
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('price')

  const { data: weekly } = await supabase
    .from('weekly_availability')
    .select('day_of_week, is_open')

  const { data: exceptions } = await supabase
    .from('availability_exceptions')
    .select('date, is_open')

  return (
    <BookingClient
      services={services ?? []}
      weeklyAvailability={weekly ?? []}
      exceptions={exceptions ?? []}
    />
  )
}
```

- [ ] **Step 2: Create BookingClient component**

Create `src/app/BookingClient.tsx`:

```typescript
'use client'

import { useMemo } from 'react'
import { format, addDays } from 'date-fns'
import ServiceGrid from '@/components/booking/ServiceGrid'
import DateStrip from '@/components/booking/DateStrip'
import TimeSlots from '@/components/booking/TimeSlots'
import CustomerForm from '@/components/booking/CustomerForm'
import { useBooking } from '@/hooks/useBooking'
import type { Service } from '@/lib/types'

interface WeeklyRow { day_of_week: number; is_open: boolean }
interface ExceptionRow { date: string; is_open: boolean }

interface Props {
  services: Service[]
  weeklyAvailability: WeeklyRow[]
  exceptions: ExceptionRow[]
}

export default function BookingClient({ services, weeklyAvailability, exceptions }: Props) {
  const booking = useBooking(services)

  // Compute closed dates for the 14-day strip
  const closedDates = useMemo(() => {
    const closed = new Set<string>()
    const today = new Date()
    const exMap = new Map(exceptions.map(e => [e.date, e.is_open]))

    for (let i = 0; i < 14; i++) {
      const day = addDays(today, i)
      const dateStr = format(day, 'yyyy-MM-dd')
      if (exMap.has(dateStr)) {
        if (!exMap.get(dateStr)) closed.add(dateStr)
      } else {
        const dow = day.getDay()
        const wa = weeklyAvailability.find(w => w.day_of_week === dow)
        if (!wa || !wa.is_open) closed.add(dateStr)
      }
    }
    return closed
  }, [weeklyAvailability, exceptions])

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-gradient-to-l from-blush to-rose px-6 py-8 text-center shadow-sm">
        <h1 className="text-3xl font-serif font-bold tracking-widest text-white">✦ CLAWS ✦</h1>
        <p className="mt-1 text-sm text-white/80 tracking-wider">סטודיו לציפורניים · קביעת תור</p>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {/* Services */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-terracotta">
            בחרי שירות
          </h2>
          <ServiceGrid
            services={services}
            selected={booking.selectedServiceId}
            onSelect={booking.handleServiceSelect}
          />
        </section>

        {/* Date */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-terracotta">
            בחרי תאריך
          </h2>
          <DateStrip
            closedDates={closedDates}
            selected={booking.selectedDate}
            onSelect={booking.handleDateSelect}
          />
        </section>

        {/* Time slots (only show when service + date selected) */}
        {booking.selectedServiceId && booking.selectedDate && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-terracotta">
              שעות פנויות
            </h2>
            <TimeSlots
              slots={booking.slots}
              selected={booking.selectedTime}
              loading={booking.slotsLoading}
              onSelect={booking.setSelectedTime}
            />
          </section>
        )}

        {/* Customer details (only show when time is selected) */}
        {booking.selectedTime && (
          <section>
            <div className="mb-4 rounded-xl bg-rose/10 px-4 py-3 text-sm text-espresso">
              תור ב{booking.selectedDate && format(booking.selectedDate, 'd/M/yyyy')} בשעה {booking.selectedTime}
            </div>
            <CustomerForm
              name={booking.name}
              phone={booking.phone}
              onNameChange={booking.setName}
              onPhoneChange={booking.setPhone}
              onSubmit={booking.handleSubmit}
              loading={booking.submitLoading}
              error={booking.error}
            />
          </section>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx src/app/BookingClient.tsx
git commit -m "feat: build customer booking page"
```

---

## Task 10: Confirmation Page

**Files:**
- Create: `src/app/confirmation/[token]/page.tsx`

- [ ] **Step 1: Create confirmation server component**

Create `src/app/confirmation/[token]/page.tsx`:

```typescript
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
      <div className="min-h-screen bg-cream flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-4xl mb-4">✦</p>
          <h1 className="text-xl font-semibold text-espresso mb-2">הקישור אינו תקין</h1>
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
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <p className="text-5xl mb-3">💅</p>
          <h1 className="text-2xl font-serif font-bold text-espresso">התור אושר!</h1>
          <p className="text-sm text-gray-400 mt-1">פרטי התור שלך</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4 border border-sand">
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
          className="mt-3 block text-center text-sm text-terracotta hover:underline"
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
      <span className="font-medium text-espresso">{value}</span>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/confirmation/
git commit -m "feat: add confirmation page with WhatsApp share button"
```

---

## Task 11: Auth Middleware

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Create middleware**

Create `middleware.ts` at the project root:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith('/admin') &&
      !request.nextUrl.pathname.startsWith('/admin/login')) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  if (user && request.nextUrl.pathname === '/admin/login') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add auth middleware for /admin routes"
```

---

## Task 12: Admin Login Page

**Files:**
- Create: `src/app/admin/login/page.tsx`

- [ ] **Step 1: Create login page**

Create `src/app/admin/login/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('אימייל או סיסמה שגויים')
    } else {
      router.push('/admin')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-sand flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-serif font-bold text-espresso tracking-widest">✦ CLAWS</h1>
          <p className="text-sm text-gray-400 mt-1">כניסה לפאנל הניהול</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-terracotta mb-1">
              אימייל
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-xl border-2 border-sand px-4 py-3 text-sm focus:border-rose focus:outline-none"
              dir="ltr"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-terracotta mb-1">
              סיסמה
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl border-2 border-sand px-4 py-3 text-sm focus:border-rose focus:outline-none"
              dir="ltr"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-l from-terracotta to-rose py-3 text-white font-semibold shadow-lg disabled:opacity-50"
          >
            {loading ? 'נכנסת...' : 'כניסה'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/login/
git commit -m "feat: add admin login page"
```

---

## Task 13: Admin Layout and Sidebar

**Files:**
- Create: `src/components/admin/Sidebar.tsx`
- Create: `src/app/admin/layout.tsx`

- [ ] **Step 1: Create Sidebar**

Create `src/components/admin/Sidebar.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/admin', label: 'תורים', icon: '📅', exact: true },
  { href: '/admin/services', label: 'שירותים', icon: '💅', exact: false },
  { href: '/admin/availability', label: 'זמינות', icon: '🕐', exact: false },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <aside className="w-52 flex-shrink-0 bg-espresso flex flex-col min-h-screen">
      <div className="px-4 py-6 border-b border-white/10">
        <p className="text-blush font-bold tracking-widest text-lg">✦ CLAWS</p>
        <p className="text-white/40 text-xs tracking-widest mt-0.5">ניהול</p>
      </div>

      <nav className="flex-1 py-4">
        {navItems.map(item => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 text-sm border-r-4 transition-colors
                ${isActive
                  ? 'border-rose bg-white/10 text-blush'
                  : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors"
        >
          <span>🔓</span> יציאה
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Create admin layout**

Create `src/app/admin/layout.tsx`:

```typescript
import Sidebar from '@/components/admin/Sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-sand">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/Sidebar.tsx src/app/admin/layout.tsx
git commit -m "feat: add admin layout with sidebar navigation"
```

---

## Task 14: Admin Dashboard

**Files:**
- Create: `src/components/admin/StatsRow.tsx`
- Create: `src/components/admin/AppointmentsTable.tsx`
- Create: `src/app/admin/page.tsx`

- [ ] **Step 1: Create StatsRow**

Create `src/components/admin/StatsRow.tsx`:

```typescript
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
```

- [ ] **Step 2: Create AppointmentsTable**

Create `src/components/admin/AppointmentsTable.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/ui/StatusBadge'
import type { Appointment, AppointmentStatus } from '@/lib/types'

type Filter = 'all' | 'today' | 'upcoming' | 'completed'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'הכל' },
  { key: 'today', label: 'היום' },
  { key: 'upcoming', label: 'קרוב' },
  { key: 'completed', label: 'הושלם' },
]

interface Props { appointments: Appointment[] }

export default function AppointmentsTable({ appointments }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState<string | null>(null)
  const todayStr = new Date().toISOString().split('T')[0]

  const filtered = appointments.filter(a => {
    if (filter === 'today') return a.date === todayStr
    if (filter === 'upcoming') return a.date >= todayStr && (a.status === 'pending' || a.status === 'confirmed')
    if (filter === 'completed') return a.status === 'completed'
    return true
  })

  async function updateStatus(id: string, status: AppointmentStatus) {
    setLoading(id + status)
    const supabase = createClient()
    await supabase.from('appointments').update({ status }).eq('id', id)
    router.refresh()
    setLoading(null)
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs px-4 py-1.5 rounded-full border-2 transition-colors
              ${filter === f.key ? 'bg-rose border-rose text-white' : 'border-sand text-gray-500 hover:border-rose/50'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-sand overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sand">
              {['לקוחה','שירות','תאריך ושעה','טלפון','סטטוס','פעולות'].map(h => (
                <th key={h} className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-8 text-sm">אין תורים</td>
              </tr>
            )}
            {filtered.map(a => (
              <tr key={a.id} className="border-b border-sand/50 hover:bg-cream transition-colors">
                <td className="px-4 py-3 font-medium">{a.customer_name}</td>
                <td className="px-4 py-3 text-gray-500">{a.service?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 tabular-nums" dir="ltr">{a.date} {a.start_time}</td>
                <td className="px-4 py-3 text-gray-500 tabular-nums" dir="ltr">{a.customer_phone}</td>
                <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {a.status === 'pending' && (
                      <button
                        onClick={() => updateStatus(a.id, 'confirmed')}
                        disabled={loading === a.id + 'confirmed'}
                        className="text-green-600 hover:bg-green-50 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
                        title="אשר"
                      >
                        ✓
                      </button>
                    )}
                    {a.status === 'confirmed' && (
                      <button
                        onClick={() => updateStatus(a.id, 'completed')}
                        disabled={loading === a.id + 'completed'}
                        className="text-purple-600 hover:bg-purple-50 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
                        title="סמן הושלם"
                      >
                        ✓✓
                      </button>
                    )}
                    {a.status !== 'cancelled' && a.status !== 'completed' && (
                      <button
                        onClick={() => { if (confirm('לבטל את התור?')) updateStatus(a.id, 'cancelled') }}
                        disabled={loading === a.id + 'cancelled'}
                        className="text-red-400 hover:bg-red-50 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
                        title="בטל"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create admin dashboard page**

Create `src/app/admin/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import StatsRow from '@/components/admin/StatsRow'
import AppointmentsTable from '@/components/admin/AppointmentsTable'
import type { Appointment } from '@/lib/types'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const todayStr = new Date().toISOString().split('T')[0]
  const weekStart = todayStr
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, service:services(name)')
    .order('date', { ascending: false })
    .order('start_time', { ascending: false })

  const list = (appointments ?? []) as Appointment[]

  const todayCount = list.filter(a => a.date === todayStr && a.status !== 'cancelled').length
  const weekCount = list.filter(a => a.date >= weekStart && a.date <= weekEnd && a.status !== 'cancelled').length
  const pendingCount = list.filter(a => a.status === 'pending').length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-espresso">תורים</h1>
        <span className="text-xs text-gray-400 bg-white rounded-full px-3 py-1 border border-sand">
          {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>
      <StatsRow todayCount={todayCount} weekCount={weekCount} pendingCount={pendingCount} />
      <AppointmentsTable appointments={list} />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/StatsRow.tsx src/components/admin/AppointmentsTable.tsx src/app/admin/page.tsx
git commit -m "feat: add admin dashboard with stats and appointments table"
```

---

## Task 15: Admin Services Page

**Files:**
- Create: `src/components/admin/ServiceModal.tsx`
- Create: `src/app/admin/services/page.tsx`

- [ ] **Step 1: Create ServiceModal**

Create `src/components/admin/ServiceModal.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import type { Service } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: Partial<Service>) => Promise<void>
  initial?: Service | null
}

export default function ServiceModal({ open, onClose, onSave, initial }: Props) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initial) {
      setName(initial.name)
      setPrice(String(initial.price))
      setDuration(String(initial.duration_min))
      setIsActive(initial.is_active)
    } else {
      setName(''); setPrice(''); setDuration(''); setIsActive(true)
    }
  }, [initial, open])

  async function handleSave() {
    if (!name.trim() || !price || !duration) return
    setLoading(true)
    await onSave({ name, price: Number(price), duration_min: Number(duration), is_active: isActive })
    setLoading(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'עריכת שירות' : 'שירות חדש'}>
      <div className="space-y-4">
        <div>
          <label className="label-style">שם השירות</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="input-style" placeholder="מניקור ג׳ל" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-style">מחיר (₪)</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)}
              className="input-style" placeholder="150" />
          </div>
          <div>
            <label className="label-style">משך (דקות)</label>
            <input type="number" value={duration} onChange={e => setDuration(e.target.value)}
              className="input-style" placeholder="60" />
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}
            className="accent-rose w-4 h-4" />
          <span className="text-sm text-espresso">פעיל (מוצג לקוחות)</span>
        </label>
        <button onClick={handleSave} disabled={loading}
          className="w-full bg-gradient-to-l from-terracotta to-rose text-white rounded-xl py-3 font-semibold disabled:opacity-50">
          {loading ? 'שומרת...' : 'שמירה'}
        </button>
      </div>
    </Modal>
  )
}
```

Add to `src/app/globals.css` under `@layer base`:

```css
.label-style {
  @apply block text-xs font-semibold uppercase tracking-widest text-terracotta mb-1;
}
.input-style {
  @apply w-full rounded-xl border-2 border-sand px-4 py-3 text-sm text-espresso focus:border-rose focus:outline-none;
}
```

- [ ] **Step 2: Create services page**

Create `src/app/admin/services/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ServiceModal from '@/components/admin/ServiceModal'
import type { Service } from '@/lib/types'

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('services').select('*').order('created_at')
    setServices(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleSave(data: Partial<Service>) {
    const supabase = createClient()
    if (editing) {
      await supabase.from('services').update(data).eq('id', editing.id)
    } else {
      await supabase.from('services').insert(data)
    }
    load()
  }

  async function handleDeactivate(id: string) {
    if (!confirm('להסיר את השירות מהרשימה הפעילה?')) return
    const supabase = createClient()
    await supabase.from('services').update({ is_active: false }).eq('id', id)
    load()
  }

  function openEdit(s: Service) { setEditing(s); setModalOpen(true) }
  function openAdd() { setEditing(null); setModalOpen(true) }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-espresso">שירותים</h1>
        <button onClick={openAdd}
          className="bg-gradient-to-l from-terracotta to-rose text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-lg shadow-rose/30">
          + שירות חדש
        </button>
      </div>

      <div className="space-y-3">
        {services.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-sand p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="font-semibold text-espresso">{s.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  ₪{s.price} · {s.duration_min} דקות
                </p>
              </div>
              {!s.is_active && (
                <span className="text-xs bg-gray-100 text-gray-400 rounded-full px-2 py-0.5">לא פעיל</span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(s)}
                className="text-terracotta text-xs hover:bg-sand rounded-lg px-3 py-1.5 transition-colors">
                עריכה
              </button>
              {s.is_active && (
                <button onClick={() => handleDeactivate(s.id)}
                  className="text-red-400 text-xs hover:bg-red-50 rounded-lg px-3 py-1.5 transition-colors">
                  הסרה
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ServiceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={editing}
      />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ServiceModal.tsx src/app/admin/services/ src/app/globals.css
git commit -m "feat: add admin services page with add/edit/deactivate"
```

---

## Task 16: Admin Availability Page

**Files:**
- Create: `src/components/admin/AvailabilityForm.tsx`
- Create: `src/app/admin/availability/page.tsx`

- [ ] **Step 1: Create AvailabilityForm**

Create `src/components/admin/AvailabilityForm.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WeeklyAvailability, AvailabilityException } from '@/lib/types'

const DAY_NAMES = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת']

interface Props {
  weekly: WeeklyAvailability[]
  exceptions: AvailabilityException[]
  onRefresh: () => void
}

export default function AvailabilityForm({ weekly, exceptions, onRefresh }: Props) {
  const [weeklyState, setWeeklyState] = useState<WeeklyAvailability[]>(weekly)
  const [savingWeekly, setSavingWeekly] = useState(false)
  const [newExDate, setNewExDate] = useState('')
  const [newExIsOpen, setNewExIsOpen] = useState(false)
  const [newExOpenTime, setNewExOpenTime] = useState('10:00')
  const [newExCloseTime, setNewExCloseTime] = useState('19:00')
  const [newExNote, setNewExNote] = useState('')

  function updateDay(index: number, field: keyof WeeklyAvailability, value: unknown) {
    setWeeklyState(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d))
  }

  async function saveWeekly() {
    setSavingWeekly(true)
    const supabase = createClient()
    await Promise.all(
      weeklyState.map(d =>
        supabase.from('weekly_availability').update({
          is_open: d.is_open,
          open_time: d.open_time,
          close_time: d.close_time,
        }).eq('id', d.id)
      )
    )
    setSavingWeekly(false)
    onRefresh()
  }

  async function addException() {
    if (!newExDate) return
    const supabase = createClient()
    await supabase.from('availability_exceptions').upsert({
      date: newExDate,
      is_open: newExIsOpen,
      open_time: newExIsOpen ? newExOpenTime : null,
      close_time: newExIsOpen ? newExCloseTime : null,
      note: newExNote || null,
    }, { onConflict: 'date' })
    setNewExDate(''); setNewExNote(''); setNewExIsOpen(false)
    onRefresh()
  }

  async function deleteException(id: string) {
    const supabase = createClient()
    await supabase.from('availability_exceptions').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div className="space-y-8">
      {/* Weekly schedule */}
      <section>
        <h2 className="text-base font-semibold text-espresso mb-4">לוח שבועי</h2>
        <div className="bg-white rounded-2xl border border-sand overflow-hidden">
          {weeklyState.map((day, i) => (
            <div key={day.id} className="flex items-center gap-4 px-5 py-4 border-b border-sand/50 last:border-0">
              <span className="w-16 text-sm font-medium text-espresso">{DAY_NAMES[day.day_of_week]}</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={day.is_open}
                  onChange={e => updateDay(i, 'is_open', e.target.checked)}
                  className="accent-rose w-4 h-4"
                />
                <span className="text-xs text-gray-500">פתוח</span>
              </label>
              {day.is_open && (
                <div className="flex items-center gap-2 mr-auto">
                  <input type="time" value={day.open_time}
                    onChange={e => updateDay(i, 'open_time', e.target.value)}
                    className="border-2 border-sand rounded-lg px-2 py-1 text-sm focus:border-rose focus:outline-none" />
                  <span className="text-gray-400 text-xs">עד</span>
                  <input type="time" value={day.close_time}
                    onChange={e => updateDay(i, 'close_time', e.target.value)}
                    className="border-2 border-sand rounded-lg px-2 py-1 text-sm focus:border-rose focus:outline-none" />
                </div>
              )}
            </div>
          ))}
        </div>
        <button onClick={saveWeekly} disabled={savingWeekly}
          className="mt-4 bg-gradient-to-l from-terracotta to-rose text-white rounded-xl px-6 py-2.5 text-sm font-semibold shadow-lg shadow-rose/30 disabled:opacity-50">
          {savingWeekly ? 'שומרת...' : 'שמירת לוח שבועי'}
        </button>
      </section>

      {/* Exceptions */}
      <section>
        <h2 className="text-base font-semibold text-espresso mb-4">חריגות לפי תאריך</h2>
        <div className="bg-white rounded-2xl border border-sand p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-style">תאריך</label>
              <input type="date" value={newExDate} onChange={e => setNewExDate(e.target.value)}
                className="input-style" />
            </div>
            <div>
              <label className="label-style">הערה (אופציונלי)</label>
              <input value={newExNote} onChange={e => setNewExNote(e.target.value)}
                className="input-style" placeholder="חג, אירוע..." />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={newExIsOpen} onChange={e => setNewExIsOpen(e.target.checked)}
              className="accent-rose w-4 h-4" />
            <span className="text-sm text-espresso">פתוח באותו יום (שונה מהשגרה)</span>
          </label>
          {newExIsOpen && (
            <div className="flex items-center gap-3">
              <input type="time" value={newExOpenTime} onChange={e => setNewExOpenTime(e.target.value)}
                className="border-2 border-sand rounded-lg px-2 py-1 text-sm focus:border-rose focus:outline-none" />
              <span className="text-gray-400 text-xs">עד</span>
              <input type="time" value={newExCloseTime} onChange={e => setNewExCloseTime(e.target.value)}
                className="border-2 border-sand rounded-lg px-2 py-1 text-sm focus:border-rose focus:outline-none" />
            </div>
          )}
          <button onClick={addException}
            className="bg-gradient-to-l from-terracotta to-rose text-white rounded-xl px-5 py-2 text-sm font-semibold">
            + הוסף חריגה
          </button>
        </div>

        {exceptions.length > 0 && (
          <div className="mt-4 space-y-2">
            {exceptions.map(ex => (
              <div key={ex.id} className="bg-white rounded-xl border border-sand px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-espresso" dir="ltr">{ex.date}</span>
                  {ex.note && <span className="text-xs text-gray-400 mr-2">{ex.note}</span>}
                  <span className={`text-xs mr-2 ${ex.is_open ? 'text-green-600' : 'text-red-400'}`}>
                    {ex.is_open ? `פתוח ${ex.open_time}–${ex.close_time}` : 'סגור'}
                  </span>
                </div>
                <button onClick={() => deleteException(ex.id)}
                  className="text-red-400 text-xs hover:bg-red-50 rounded-lg px-2 py-1">
                  מחיקה
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Create availability page**

Create `src/app/admin/availability/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AvailabilityForm from '@/components/admin/AvailabilityForm'
import type { WeeklyAvailability, AvailabilityException } from '@/lib/types'

export default function AvailabilityPage() {
  const [weekly, setWeekly] = useState<WeeklyAvailability[]>([])
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([])

  async function load() {
    const supabase = createClient()
    const { data: w } = await supabase.from('weekly_availability').select('*').order('day_of_week')
    const { data: e } = await supabase.from('availability_exceptions').select('*').order('date')
    setWeekly(w ?? [])
    setExceptions(e ?? [])
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <h1 className="text-xl font-bold text-espresso mb-6">זמינות</h1>
      {weekly.length > 0 && (
        <AvailabilityForm weekly={weekly} exceptions={exceptions} onRefresh={load} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AvailabilityForm.tsx src/app/admin/availability/
git commit -m "feat: add admin availability page with weekly schedule and exceptions"
```

---

## Task 17: Vercel Deployment

- [ ] **Step 1: Push to GitHub**

Create a new repository on GitHub (e.g. `claws-booking`), then:

```bash
git remote add origin https://github.com/<your-username>/claws-booking.git
git branch -M main
git push -u origin main
```

- [ ] **Step 2: Import project on Vercel**

1. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
2. Framework Preset: **Next.js** (auto-detected)
3. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon key
4. Click **Deploy**

- [ ] **Step 3: Add Vercel domain to Supabase allowed URLs**

In Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://your-project.vercel.app`
- Redirect URLs: `https://your-project.vercel.app/**`

- [ ] **Step 4: Create first admin user**

In Supabase Dashboard → Authentication → Users → Invite User → enter email.
The invited user receives a magic link and sets their password. Repeat for each staff member.

- [ ] **Step 5: Smoke test**

1. Open the deployed URL — booking page loads in Hebrew, RTL ✓
2. Select a service + date — slots appear ✓
3. Complete a booking — confirmation page loads with shareable URL ✓
4. Log in at `/admin/login` — dashboard shows the new appointment ✓
5. Confirm the appointment (pending → confirmed) ✓

---

## Summary

| Task | What it delivers |
|---|---|
| 1 | Project scaffolding + Tailwind theme |
| 2 | Database schema + RLS + seed data |
| 3 | TypeScript types + Supabase clients |
| 4 | Slot computation logic (7 tests) |
| 5 | API routes: /api/slots + /api/bookings |
| 6 | Root layout: RTL Hebrew, global styles |
| 7 | Modal + StatusBadge UI primitives |
| 8 | Booking components + useBooking hook |
| 9 | Customer booking page |
| 10 | Confirmation page + WhatsApp share |
| 11 | Auth middleware for /admin |
| 12 | Admin login page |
| 13 | Admin layout + sidebar |
| 14 | Admin dashboard: stats + appointments table |
| 15 | Admin services CRUD |
| 16 | Admin availability: weekly + exceptions |
| 17 | Vercel deployment |
