-- Phase 1.5: Curated Debate Library
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- NOTE: already applied to production database on 14 March 2026

-- ─── debates: library columns ────────────────────────────────────────────────

-- Marks a debate as part of the public replay library (visible to free users)
alter table public.debates
  add column if not exists is_library boolean default false;

-- Marks a debate as featured (shown first on the homepage library section)
alter table public.debates
  add column if not exists is_featured boolean default false;

-- Groups library debates into homepage categories (tech | philosophy | world | fun)
-- NOTE: this is separate from the existing `category` column which stores the
-- debate generation style (wild-card | comedy | science | philosophy etc.)
alter table public.debates
  add column if not exists library_category text;

-- ─── indexes ─────────────────────────────────────────────────────────────────
-- Run separately if not already applied:
create index if not exists debates_is_library_idx  on public.debates (is_library) where is_library = true;
create index if not exists debates_is_featured_idx on public.debates (is_featured) where is_featured = true;
