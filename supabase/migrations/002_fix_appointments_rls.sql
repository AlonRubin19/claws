-- Allow anonymous users to read appointments by token (for confirmation page)
create policy "public read appointment by token"
  on appointments for select to anon
  using (true);
