begin;

create table public.exercises (
  id text primary key,
  name text not null check (length(trim(name)) > 0),
  equipment text not null check (equipment in ('Bodyweight', 'Dumbbells')),
  muscle text not null check (muscle in ('Glutes', 'Legs', 'Chest', 'Back', 'Core')),
  difficulty text not null check (difficulty in ('Beginner', 'Intermediate')),
  instructions text[] not null check (cardinality(instructions) > 0),
  video_path text,
  gif_path text,
  review_status text not null default 'draft' check (review_status in ('draft', 'reviewed')),
  reviewed_at timestamptz,
  media_license text,
  media_source text,
  created_at timestamptz not null default now(),
  constraint reviewed_content_complete check (
    review_status = 'draft' or
    (reviewed_at is not null and nullif(trim(video_path), '') is not null
      and nullif(trim(media_license), '') is not null)
  )
);

create index exercises_filters_idx on public.exercises (equipment, muscle, difficulty);
alter table public.exercises enable row level security;
create policy "Read reviewed exercises" on public.exercises for select
  to anon, authenticated using (review_status = 'reviewed');
grant select on public.exercises to anon, authenticated;
revoke insert, update, delete on public.exercises from anon, authenticated;

-- Only complete, reviewed entries can feed the future AI workout tools.
create view public.recommendable_exercises with (security_invoker = true) as
  select * from public.exercises
  where review_status = 'reviewed' and video_path is not null;
grant select on public.recommendable_exercises to anon, authenticated;

-- Upload reviewed/licensed demonstrations through trusted admin tooling.
insert into storage.buckets (id, name, public)
values ('exercise-media', 'exercise-media', true)
on conflict (id) do nothing;
-- Public bucket serves known URLs. No client upload/write policies are granted.
commit;
