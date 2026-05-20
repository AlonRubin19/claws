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

-- Seed: default weekly schedule (Sun-Thu open 10-19, Fri 10-14, Sat closed)
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
  (E'מניקור ג\'ל', 60, 150),
  (E'מניקור קלאסי', 45, 90),
  (E'פדיקור', 50, 120),
  (E'ציפורניים מלאכותיות', 90, 220);
