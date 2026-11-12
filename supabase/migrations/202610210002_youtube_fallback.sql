alter table public.exercises add column youtube_video_id text
  check (youtube_video_id is null or youtube_video_id ~ '^[A-Za-z0-9_-]{11}$');
-- Recreate the view so the added column is available to future catalog clients.
create or replace view public.recommendable_exercises with (security_invoker = true) as
  select * from public.exercises
  where review_status = 'reviewed' and video_path is not null;
