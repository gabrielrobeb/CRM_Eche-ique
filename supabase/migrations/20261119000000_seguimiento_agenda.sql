create table if not exists public.booking_followups (
  conversation_id text primary key references public.conversations(id) on delete cascade,
  link_message_id text not null references public.messages(id) on delete cascade,
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'skipped', 'failed')),
  reason text,
  updated_at timestamptz not null default now()
);
create index if not exists booking_followups_due on public.booking_followups(due_at) where status = 'pending';
alter table public.booking_followups enable row level security;
revoke all on public.booking_followups from anon, authenticated;
