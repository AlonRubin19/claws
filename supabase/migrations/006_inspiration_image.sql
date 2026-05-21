-- supabase/migrations/006_inspiration_image.sql
alter table appointments
  add column inspiration_image_url text;
