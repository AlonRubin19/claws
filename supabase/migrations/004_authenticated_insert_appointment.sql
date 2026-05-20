-- Allow authenticated users (staff) to also insert appointments.
-- The server-side Supabase client inherits auth cookies, so when an admin
-- visits the booking page while logged in, requests use the authenticated
-- role instead of anon. Without this policy the INSERT returns 403.
create policy "staff insert appointment"
  on appointments for insert to authenticated
  with check (true);
