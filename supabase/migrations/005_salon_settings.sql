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
insert into salon_settings (id)
values ('00000000-0000-0000-0000-000000000001');
