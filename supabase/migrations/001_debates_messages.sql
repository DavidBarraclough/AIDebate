-- Day 2: Debate Persistence
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- ─── debates ────────────────────────────────────────────────────────────────
create table if not exists public.debates (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        references auth.users(id) on delete cascade not null,
  topic          text        not null,
  name_a         text,
  name_b         text,
  personality_a  text,
  personality_b  text,
  style          text,
  category       text,
  summary        jsonb,
  created_at     timestamptz not null default now()
);

alter table public.debates enable row level security;

-- Owner can insert / update / delete their own debates
create policy "owner_write_debates" on public.debates
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Anyone can read any debate (needed for public share links — Day 3)
create policy "public_read_debates" on public.debates
  for select
  using (true);

-- ─── messages ───────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id           uuid        primary key default gen_random_uuid(),
  debate_id    uuid        references public.debates(id) on delete cascade not null,
  speaker      text        not null,  -- 'A' | 'B' | 'host' | 'user'
  text         text        not null,
  image_prompt text,                  -- prompt used for image generation (stored for future replay)
  image_url    text,                  -- populated later when Supabase Storage is wired up
  audio_url    text,                  -- populated later when audio storage is wired up
  turn_index   integer,               -- 0-based position in the debate transcript
  created_at   timestamptz not null default now()
);

alter table public.messages enable row level security;

-- Owner can write messages (via debate ownership)
create policy "owner_write_messages" on public.messages
  for all
  using (
    exists (
      select 1 from public.debates
      where debates.id = messages.debate_id
      and   debates.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.debates
      where debates.id = messages.debate_id
      and   debates.user_id = auth.uid()
    )
  );

-- Anyone can read messages (needed for public share links — Day 3)
create policy "public_read_messages" on public.messages
  for select
  using (true);

-- ─── indexes ────────────────────────────────────────────────────────────────
create index if not exists debates_user_id_idx     on public.debates (user_id);
create index if not exists debates_created_at_idx  on public.debates (created_at desc);
create index if not exists messages_debate_id_idx  on public.messages (debate_id);
create index if not exists messages_turn_index_idx on public.messages (debate_id, turn_index);
