-- Fase 0: skema dasar (users, conversations, messages).
-- Tabel dokumen hukum & vector (legal_documents, document_chunks, sources, ingestion_jobs)
-- ditambahkan di migrasi 0002 (Fase 3).

create extension if not exists pgcrypto;
create extension if not exists vector;

-- Siap multi-user walau MVP hanya memakai satu baris default (DEFAULT_USER_ID di .env).
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz not null default now()
);

insert into users (id, email)
values ('00000000-0000-0000-0000-000000000001', null)
on conflict (id) do nothing;

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) default '00000000-0000-0000-0000-000000000001',
  title text not null default 'Percakapan Baru',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists conversations_user_updated_idx on conversations(user_id, updated_at desc);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  citations jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on messages(conversation_id, created_at);

-- Jaga updated_at pada conversations tetap akurat setiap ada pesan baru.
create or replace function touch_conversation_updated_at()
returns trigger
language plpgsql
as $$
begin
  update conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on messages;
create trigger messages_touch_conversation
  after insert on messages
  for each row
  execute function touch_conversation_updated_at();
