/*
  Security-review archive of uploaded chat exports, and encrypted
  provider API keys saved to a signed-in account.

  This migration is in the repo only. Do not apply it to the live project
  from this branch; the owner reviews it first.

  No client select, update, or delete on the archive table or its bucket.
  No delete path for provider keys. Self-serve deletion is intentionally
  not included.

  The encryption passphrase is NOT in this file. After applying, create a
  Vault secret named provider_key_encryption from the server environment
  variable PROVIDER_KEY_ENCRYPTION_SECRET. Never put that value in the
  client, and never commit it.
*/

create extension if not exists pgcrypto with schema extensions;
create extension if not exists supabase_vault;

-- ---------------------------------------------------------------------------
-- Upload archive. Service role writes. Clients have no policies and no grants.
-- ---------------------------------------------------------------------------

create table if not exists public.upload_archive (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  storage_path text not null unique,
  original_filename text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 209715200),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  detected_format text not null check (char_length(detected_format) between 1 and 64),
  conversation_count integer not null check (conversation_count >= 0 and conversation_count <= 1000000)
);

create index if not exists upload_archive_created_at_idx
  on public.upload_archive (created_at desc);

create index if not exists upload_archive_user_id_idx
  on public.upload_archive (user_id);

alter table public.upload_archive enable row level security;

-- No policies: anon and authenticated cannot read or write. RLS is not forced,
-- so the table owner can review rows in the SQL editor. service_role is the
-- only API role granted write, and it is what the archive function uses.
revoke all on table public.upload_archive from public, anon, authenticated, service_role;
grant select, insert on table public.upload_archive to service_role;

comment on table public.upload_archive is
  'Private security-review copies of uploaded chat exports. No client policies.';

-- Rate-limit rows. Hashed subjects only. Clients cannot read or write them.
create table if not exists public.upload_rate_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  subject text not null check (char_length(subject) between 1 and 128)
);

create index if not exists upload_rate_events_subject_created_idx
  on public.upload_rate_events (subject, created_at desc);

alter table public.upload_rate_events enable row level security;

revoke all on table public.upload_rate_events from public, anon, authenticated, service_role;
grant select, insert on table public.upload_rate_events to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'upload-archive',
  'upload-archive',
  false,
  209715200,
  array[
    'application/json',
    'text/plain',
    'text/markdown',
    'text/csv',
    'text/html',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-ndjson',
    'application/octet-stream'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Restrictive policies are AND-ed with any permissive policy. This bucket
-- stays closed to anon and authenticated even if a broad storage policy exists.
-- service_role bypasses RLS and is the only writer.
create policy "upload_archive_no_client_access"
  on storage.objects
  as restrictive
  for all
  to anon, authenticated
  using (bucket_id <> 'upload-archive')
  with check (bucket_id <> 'upload-archive');

-- ---------------------------------------------------------------------------
-- Provider keys. Ciphertext only. Passphrase lives in Vault, not the client.
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.user_provider_keys (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider ~ '^[a-z0-9_-]{1,64}$'),
  encrypted_key bytea not null,
  key_hint text not null check (char_length(key_hint) = 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.user_provider_keys enable row level security;

revoke all on table public.user_provider_keys from public, anon, authenticated;
grant select (user_id, provider, key_hint, created_at, updated_at)
  on table public.user_provider_keys to authenticated;

create policy "users read own provider key metadata"
  on public.user_provider_keys
  for select
  to authenticated
  using (user_id = (select auth.uid()));

comment on column public.user_provider_keys.encrypted_key is
  'pgp_sym_encrypt output. The passphrase is Vault secret provider_key_encryption.';

create or replace function private.provider_key_secret()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  found text;
begin
  select decrypted_secret into found
  from vault.decrypted_secrets
  where name = 'provider_key_encryption'
  limit 1;
  if found is null or char_length(found) < 32 then
    raise exception 'encryption is not configured';
  end if;
  return found;
end;
$$;

revoke all on function private.provider_key_secret() from public, anon, authenticated;

create or replace function private.save_provider_key(
  p_user_id uuid,
  p_provider text,
  p_secret text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  passphrase text;
  hint text;
begin
  if p_user_id is null or p_user_id is distinct from auth.uid() then
    raise exception 'not authenticated';
  end if;
  if p_provider is null or p_provider !~ '^[a-z0-9_-]{1,64}$' then
    raise exception 'invalid provider';
  end if;
  if p_secret is null
    or char_length(p_secret) < 8
    or char_length(p_secret) > 4096
    or position(E'\n' in p_secret) > 0
    or position(E'\r' in p_secret) > 0
  then
    raise exception 'invalid key';
  end if;
  passphrase := private.provider_key_secret();
  hint := right(p_secret, 4);
  insert into public.user_provider_keys as saved (
    user_id, provider, encrypted_key, key_hint
  )
  values (
    p_user_id,
    p_provider,
    extensions.pgp_sym_encrypt(p_secret, passphrase),
    hint
  )
  on conflict (user_id, provider) do update
  set
    encrypted_key = excluded.encrypted_key,
    key_hint = excluded.key_hint,
    updated_at = now();
end;
$$;

revoke all on function private.save_provider_key(uuid, text, text) from public, anon, authenticated;

create or replace function private.load_provider_key(
  p_user_id uuid,
  p_provider text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  passphrase text;
  row public.user_provider_keys%rowtype;
  plain text;
begin
  if p_user_id is null or p_user_id is distinct from auth.uid() then
    raise exception 'not authenticated';
  end if;
  if p_provider is null or p_provider !~ '^[a-z0-9_-]{1,64}$' then
    raise exception 'invalid provider';
  end if;
  select * into row
  from public.user_provider_keys
  where user_id = p_user_id and provider = p_provider;
  if not found then
    return null;
  end if;
  passphrase := private.provider_key_secret();
  plain := extensions.pgp_sym_decrypt(row.encrypted_key, passphrase);
  return jsonb_build_object('key_hint', row.key_hint, 'secret', plain);
end;
$$;

revoke all on function private.load_provider_key(uuid, text) from public, anon, authenticated;

-- Exposed wrappers. security definer so they can call private (which is not
-- on the API) while still refusing any caller whose JWT is not auth.uid().
-- search_path is empty. Arguments are bound parameters, not dynamic SQL.
create or replace function public.save_my_provider_key(
  p_provider text,
  p_secret text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  perform private.save_provider_key(auth.uid(), p_provider, p_secret);
end;
$$;

create or replace function public.load_my_provider_key(
  p_provider text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  return private.load_provider_key(auth.uid(), p_provider);
end;
$$;

revoke all on function public.save_my_provider_key(text, text) from public, anon;
revoke all on function public.load_my_provider_key(text) from public, anon;
grant execute on function public.save_my_provider_key(text, text) to authenticated;
grant execute on function public.load_my_provider_key(text) to authenticated;
