-- Grant table-level privileges to roles.
-- RLS policies are evaluated only after these base grants pass.
-- Raw SQL migrations do not auto-grant like the Supabase dashboard does.

grant select on services             to anon;
grant select on weekly_availability  to anon;
grant select on availability_exceptions to anon;
grant insert, select on appointments to anon;

grant select, insert, update, delete on services                 to authenticated;
grant select, insert, update, delete on weekly_availability      to authenticated;
grant select, insert, update, delete on availability_exceptions  to authenticated;
grant select, insert, update, delete on appointments             to authenticated;
