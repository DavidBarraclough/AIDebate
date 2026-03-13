-- Day 6: Stripe Subscriptions
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

create table if not exists public.subscriptions (
  id                     uuid        primary key default gen_random_uuid(),
  user_id                uuid        references auth.users(id) on delete cascade not null unique,
  stripe_customer_id     text,
  stripe_subscription_id text,
  status                 text        not null default 'inactive', -- active | canceled | past_due | inactive
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Users can read and write their own subscription row
create policy "users_manage_own_subscription" on public.subscriptions
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
