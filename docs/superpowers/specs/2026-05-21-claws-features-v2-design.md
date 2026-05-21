# Claws — Features V2 Design Spec

**Date:** 2026-05-21
**Stack:** Next.js (App Router), TypeScript, Tailwind CSS v4, Supabase, Vercel
**Builds on:** `docs/superpowers/specs/2026-05-20-claws-booking-app-design.md`

---

## 1. Overview

Six additive features on top of the existing Claws nail salon booking app:

1. **Salon settings** — address, phone, instagram, description stored in DB and editable by admin
2. **Color redesign** — replace warm pink/terracotta palette with charcoal & warm-white
3. **Grey booked slots** — show all time slots on booking page; booked ones greyed out and unclickable
4. **Inspiration image upload** — customer optionally attaches a photo during booking; admin sees it in appointment detail
5. **Admin calendar view** — new calendar page with day/week/month views using `react-big-calendar`; click appointment to see detail popover with actions
6. **Admin settings page** — form to edit `salon_settings` row

---

## 2. Database Changes

### New table: `salon_settings`

```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
address      text NOT NULL DEFAULT ''
phone        text NOT NULL DEFAULT ''
instagram    text NOT NULL DEFAULT ''   -- e.g. "@claws.nails"
description  text NOT NULL DEFAULT ''   -- shown on booking page header
updated_at   timestamptz DEFAULT now()
```

Single row. Seeded with empty strings on migration. Public read, authenticated write.

### Modified table: `appointments`

```sql
inspiration_image_url  text   -- nullable; Supabase Storage public URL
```

### Supabase Storage

New bucket: `inspiration-images`
- Public read (images displayable in admin without auth)
- Anon upload (customers upload without logging in)
- File size limit: 5MB
- Accepted types: image/jpeg, image/png, image/webp

### RLS additions

```sql
-- salon_settings
create policy "public read salon settings"
  on salon_settings for select to anon using (true);

create policy "staff manage salon settings"
  on salon_settings for all to authenticated
  using (true) with check (true);
```

---

## 3. Color Palette

Replace all 6 warm tokens in `src/app/globals.css`:

| Token | Hex | Replaces | Usage |
|---|---|---|---|
| `--color-charcoal` | `#1a1a1a` | espresso | Header bg, primary dark text |
| `--color-dark` | `#2d2d2d` | terracotta | Selected states, CTA buttons, sidebar |
| `--color-mid-grey` | `#555555` | rose | Labels, secondary text, section titles |
| `--color-warm-white` | `#f5f0eb` | cream | Page background, logo text on dark |
| `--color-light-grey` | `#e8e4df` | sand | Card borders, dividers, input borders |
| `--color-off-white` | `#f0ece8` | blush | Card backgrounds, selected service bg |

All component files that reference the old token names (`text-espresso`, `bg-rose`, `border-sand`, etc.) are updated to the new tokens.

---

## 4. Booking Page Changes (`src/app/page.tsx`, `BookingClient.tsx`)

### Salon info display

`page.tsx` fetches `salon_settings` alongside services/availability and passes it to `BookingClient`.

- **Description**: rendered below the tagline in the header (`<p>` tag, `text-sm`, warm-white at 80% opacity)
- **Footer strip**: dark charcoal band at the bottom of the page showing address, phone, instagram — always visible even before a service is selected

### Greyed booked slots

`/api/slots` response changes from:
```ts
{ slots: string[] }
```
to:
```ts
{ available: string[], booked: string[] }
```

The API generates all candidate slots as before, then separates them into available vs booked (overlap check determines which bucket). Cancelled appointments are still ignored.

`TimeSlots` component receives both arrays and renders:
- Available → clickable, normal styling
- Booked → grey, `cursor-not-allowed`, `opacity-50`, not clickable, no selection possible

`useBooking` hook updated to handle new response shape.

### Inspiration image upload

New optional file input in `CustomerForm` below the phone field:

```
השראה לציפורניים (אופציונלי)
[📎 בחרי תמונה]  ← shows filename when selected
```

On booking submit (`useBooking.handleSubmit`):
1. If file selected: upload to `inspiration-images/{uuid}.{ext}` via Supabase Storage browser client
2. Get public URL from storage response
3. Include `inspirationImageUrl` in the `POST /api/bookings` body

`/api/bookings` accepts optional `inspirationImageUrl` and writes it to `appointments.inspiration_image_url`.

---

## 5. Admin Calendar Page

### Route

`src/app/admin/(protected)/calendar/page.tsx` — server component that fetches all non-cancelled appointments with service name join, passes to client component.

### Library

`react-big-calendar` with `date-fns` localizer (already installed). Calendar messages translated to Hebrew.

### Component: `src/components/admin/AppointmentsCalendar.tsx`

Client component. Props: `appointments: Appointment[]`.

Features:
- Day / Week / Month view toggle (controlled state, default: week)
- Previous / Next / Today navigation
- Hebrew day/month names via `date-fns` `he` locale
- Events colored by status:
  - `pending` → mid-grey (`#888`)
  - `confirmed` → charcoal (`#2d2d2d`)
  - `completed` → light grey (`#ccc`, muted)
  - `cancelled` → not shown
- Clicking an event opens `AppointmentPopover` (see below)

### Component: `src/components/admin/AppointmentPopover.tsx`

Modal overlay (fixed position, centered, backdrop) rendered inside the calendar page. Shows:
- Customer name, service, date+time, phone
- Inspiration image thumbnail (if `inspiration_image_url` is set) — clicking opens full image in new tab
- Status badge
- Action buttons: confirm (pending→confirmed), complete (confirmed→completed), cancel (any→cancelled)
- Actions call existing `/api/admin/appointments/[id]` pattern or direct Supabase mutation with router refresh

### Sidebar update

`src/components/admin/Sidebar.tsx` gets two new nav items:
- 📅 לוח שנה → `/admin/calendar`
- ⚙️ הגדרות → `/admin/settings`

---

## 6. Admin Settings Page

### Route

`src/app/admin/(protected)/settings/page.tsx` — server component fetching the `salon_settings` row, passing to client form component.

### Component: `src/components/admin/SettingsForm.tsx`

Client component. Fields (all Hebrew labels):
- **כתובת** — address (text input)
- **טלפון** — phone (text input, `dir="ltr"`)
- **אינסטגרם** — instagram handle (text input, `dir="ltr"`, placeholder `@claws.nails`)
- **תיאור הסלון** — description (textarea, ~4 rows)

On save: the migration seeds one row with a fixed `id` (UUID constant defined in the migration). `SettingsForm` updates that row by `id` (`update().eq('id', SETTINGS_ID)`). The constant is exported from a shared `src/lib/constants.ts` file so both the migration seed and the form use the same value. Hebrew success/error feedback inline (no alert()).

Image upload orphans (upload succeeds, booking POST fails) are acceptable — the storage overhead is negligible and no cleanup is needed.

---

## 7. File Map

### New files
- `src/lib/constants.ts` — `SETTINGS_ID` UUID constant
- `src/app/admin/(protected)/calendar/page.tsx`
- `src/app/admin/(protected)/settings/page.tsx`
- `src/components/admin/AppointmentsCalendar.tsx`
- `src/components/admin/AppointmentPopover.tsx`
- `src/components/admin/SettingsForm.tsx`
- `supabase/migrations/005_salon_settings.sql`
- `supabase/migrations/006_inspiration_image.sql`

### Modified files
- `src/app/globals.css` — new color tokens
- `src/lib/types.ts` — `SalonSettings` type, `Appointment.inspiration_image_url`
- `src/app/page.tsx` — fetch `salon_settings`
- `src/app/BookingClient.tsx` — pass settings to header/footer
- `src/app/api/slots/route.ts` — return `{ available, booked }`
- `src/app/api/bookings/route.ts` — accept `inspirationImageUrl`
- `src/hooks/useBooking.ts` — handle new slots shape, image upload
- `src/components/booking/TimeSlots.tsx` — render booked slots grey
- `src/components/booking/CustomerForm.tsx` — add image upload input
- `src/components/admin/Sidebar.tsx` — add Calendar + Settings nav items
- Every component using old color token names (search codebase for `espresso`, `rose`, `terracotta`, `cream`, `blush`, `sand` — approximately 12–15 files)

---

## 8. Out of Scope

- AI-based duration estimation from uploaded image
- Customer self-cancellation
- Push/SMS notifications
- Multi-staff calendars
