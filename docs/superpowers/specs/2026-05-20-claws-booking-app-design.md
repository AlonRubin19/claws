# Claws — Nail Salon Booking App · Design Spec

**Date:** 2026-05-20  
**Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase, Vercel  
**Language:** Hebrew throughout, `dir="rtl"` on `<html>`

---

## 1. Overview

A mobile-first appointment booking web app for a nail salon called **Claws**. Customers can browse services, pick a date and time, and confirm a booking in Hebrew. Staff log in to an admin panel to manage appointments, services, working hours, and date exceptions.

**Out of scope (MVP):** payments, SMS, Google Calendar integration.

---

## 2. Architecture

### App Router pages

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Customer booking page |
| `/confirmation/[token]` | Public | Booking confirmation + shareable link |
| `/admin/login` | Public | Staff login |
| `/admin` | Staff only | Appointments dashboard |
| `/admin/services` | Staff only | Manage services |
| `/admin/availability` | Staff only | Weekly hours + date exceptions |

### API routes

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/slots` | GET | Compute and return available time slots |
| `/api/bookings` | POST | Create a booking, return confirmation token |

Query params for `/api/slots`: `date` (YYYY-MM-DD), `serviceId` (uuid).

### Auth

- Supabase Auth — email + password for staff accounts
- `middleware.ts` intercepts all `/admin/*` requests, checks Supabase session cookie, redirects to `/admin/login` if unauthenticated
- Public routes require no auth

### Slot computation (server-side, `/api/slots`)

1. Look up `weekly_availability` for the requested day of week
2. Check `availability_exceptions` for that specific date — override if found
3. If closed → return `[]`
4. Generate candidate slots at 30-minute intervals within open hours
5. If the requested date is today, discard any candidate slot whose start time is in the past (compared to current server time)
6. For each remaining candidate: check whether `[candidate_start, candidate_start + service.duration_min]` overlaps any non-cancelled appointment on that date
7. Return only non-overlapping slots

---

## 3. Database Schema

### `services`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
name          text NOT NULL              -- Hebrew
duration_min  integer NOT NULL           -- e.g. 60, 90
price         integer NOT NULL           -- ILS (₪)
is_active     boolean NOT NULL DEFAULT true
created_at    timestamptz DEFAULT now()
```

### `weekly_availability`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
day_of_week   integer NOT NULL UNIQUE    -- 0=Sun, 1=Mon, … 6=Sat; one row per day
open_time     time NOT NULL              -- e.g. '10:00'
close_time    time NOT NULL              -- e.g. '19:00'
is_open       boolean NOT NULL DEFAULT true
```

### `availability_exceptions`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
date          date NOT NULL UNIQUE
is_open       boolean NOT NULL           -- false = fully blocked
open_time     time                       -- nullable: override hours when is_open=true
close_time    time                       -- nullable
note          text                       -- nullable, e.g. 'חג'
```

### `appointments`
```sql
id             uuid PRIMARY KEY DEFAULT gen_random_uuid()
token          uuid NOT NULL UNIQUE DEFAULT gen_random_uuid()
service_id     uuid NOT NULL REFERENCES services(id)
customer_name  text NOT NULL
customer_phone text NOT NULL
date           date NOT NULL
start_time     time NOT NULL
end_time       time NOT NULL             -- start_time + duration_min
status         text NOT NULL DEFAULT 'pending'
               -- CHECK status IN ('pending','confirmed','completed','cancelled')
created_at     timestamptz DEFAULT now()
```

### Row Level Security

| Table | Public read | Public write | Staff read | Staff write |
|---|---|---|---|---|
| `services` | ✓ (active only) | ✗ | ✓ | ✓ |
| `weekly_availability` | ✓ | ✗ | ✓ | ✓ |
| `availability_exceptions` | ✓ | ✗ | ✓ | ✓ |
| `appointments` | ✗ | insert only | ✓ | ✓ |

---

## 4. Customer Booking Flow (`/`)

Single scrollable page, mobile-first, RTL Hebrew.

### Sections (top to bottom)

1. **Header** — "✦ CLAWS ✦" logo, tagline, blush-to-rose gradient
2. **Service selection** — 2-column card grid. Cards show name (Hebrew), price (₪), duration. One selection at a time. Selecting a service refetches available slots.
3. **Date selection** — horizontal scrollable strip of today + next 13 days (14 days total, today included). Days closed per weekly schedule or exception are greyed and unclickable. Selecting a date + service triggers slot fetch.
4. **Time slots** — fetched from `GET /api/slots`. Only available slots shown. If none, display friendly Hebrew message: *"אין תורים פנויים ביום זה"*.
5. **Customer details** — שם מלא (full name) + מספר טלפון (phone). Both required. Client-side validation before submit.
6. **Confirm button** — calls `POST /api/bookings`. On success → redirect to `/confirmation/[token]`.

### Error handling

- Slot taken between selection and submit → inline Hebrew error, slot list refreshed automatically; customer name and phone fields are preserved so the user doesn't have to retype them
- Network error → Hebrew retry message

---

## 5. Confirmation Page (`/confirmation/[token]`)

- Implemented as a Next.js Server Component that queries Supabase directly (no separate API route needed). Fetches appointment by token (public, no auth).
- Displays: service name, date (Hebrew format), time, customer name
- This URL is the shareable confirmation link
- **"שתפי בוואטסאפ" button** — opens `https://wa.me/?text=...` with appointment summary pre-filled in Hebrew
- If the token is not found in the database → show a Hebrew 404 message: *"הקישור אינו תקין או שהתור לא נמצא"* (no redirect)

---

## 6. Admin Panel

### Login (`/admin/login`)
- Email + password form using Supabase Auth
- On success → `/admin`
- Failed login → Hebrew error message

### Dashboard (`/admin`)
- Stats row: היום / השבוע / ממתינים
- Appointments table, filters: הכל (all) / היום (today's date) / קרוב (future pending or confirmed, sorted by date asc) / הושלם (completed)
- Columns: customer name, service, date+time, phone, status badge, actions
- Status badges: ממתין (yellow) · מאושר (green) · הושלם (purple) · בוטל (red)
- Actions per row: ✓ confirm (pending → confirmed), ✓✓ mark complete (confirmed → completed), ✕ cancel (any → cancelled)
- `confirmed` is a staff-actionable state meaning the admin has acknowledged the booking; it is not auto-set

### Services (`/admin/services`)
- List all services (including inactive)
- Add / Edit via modal: name, price, duration_min, is_active toggle
- Delete: soft-delete only — sets `is_active = false` rather than removing the row, to preserve historical appointment data. The confirmation prompt uses Hebrew text.

### Availability (`/admin/availability`)
- **Weekly schedule section** — one row per day (ראשון–שבת): is_open toggle, open_time, close_time. Save button.
- **Exceptions section** — date picker + is_open toggle + optional override hours + optional note. List of existing exceptions with delete button.

---

## 7. Visual Design

### Color palette

| Token | Hex | Usage |
|---|---|---|
| Cream | `#fdf6f0` | Page background |
| Blush | `#f7c5b8` | Header gradient start, accents |
| Rose | `#e8a89a` | Selected states, CTA gradient, active nav |
| Terracotta | `#c9866f` | Labels, prices, CTA gradient end |
| Espresso | `#4a3728` | Sidebar background, primary text |
| Sand | `#f5ede8` | Admin background, card borders |

### Principles
- Mobile-first (360px base), responsive up to desktop for admin
- RTL: `dir="rtl"` on `<html>`, Tailwind `rtl:` variants where needed
- Soft, feminine, minimal — no harsh borders, rounded corners (10–14px), subtle shadows
- Font: system serif for headings, sans-serif for body

---

## 8. Out of Scope (MVP)

- Payments
- SMS / WhatsApp notifications (server-sent)
- Google Calendar sync
- Customer accounts / login
- Customer self-cancellation
- Multi-staff scheduling (one shared calendar)
