/*
  Saved case files for the bring-your-own-key read.

  A rerun of the same export upserts on (user_id, export_fingerprint).
  partial is true unless the chosen depth finished. Do not mark a partial
  read as a complete success.

  This migration is in the repo only. Do not apply it to the live project
  from this branch; the owner reviews it first.

  Self-serve deletion is intentionally not included.
*/

create table if not exists public.case_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  export_fingerprint text not null,
  filename text,
  case_file jsonb not null,
  partial boolean not null default true,
  depth text not null,
  model_provider text,
  model_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, export_fingerprint)
);

create index if not exists case_files_user_id_idx on public.case_files (user_id);

alter table public.case_files enable row level security;

create policy "Users can read own case files"
  on public.case_files
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own case files"
  on public.case_files
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own case files"
  on public.case_files
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
