-- Fase 3: dokumen hukum & vector search.
-- Dimensi embedding = 1536 (openai/text-embedding-3-small, dipanggil lewat OpenRouter — sudah diverifikasi).

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  base_url text,
  adapter_key text not null,
  enabled boolean not null default true,
  config jsonb not null default '{}',
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists legal_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id),
  source_type text not null, -- uu | pp | perpres | putusan | permen | perda | ...
  title text not null,
  number text,
  year int,
  tanggal_penetapan date,
  url_asli text,
  raw_text text,
  checksum text,
  status text not null default 'pending', -- pending | chunked | embedded | failed | stale
  version int not null default 1,
  previous_version_id uuid references legal_documents(id),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, number, year, version)
);
create index if not exists legal_documents_lookup_idx on legal_documents(source_type, number, year);

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references legal_documents(id) on delete cascade,
  chunk_index int not null,
  chunk_text text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}', -- { bab, pasal, ayat }
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);
-- HNSW: tidak perlu retrain "lists" seperti IVFFlat saat korpus tumbuh inkremental.
create index if not exists document_chunks_embedding_hnsw_idx
  on document_chunks using hnsw (embedding vector_cosine_ops);

create table if not exists ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id),
  status text not null default 'pending', -- pending | running | success | partial | failed
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  documents_found int not null default 0,
  documents_ingested int not null default 0,
  documents_failed int not null default 0,
  error_log jsonb not null default '[]',
  triggered_by text not null default 'manual' -- manual | cron | n8n
);

create or replace function match_document_chunks(
  query_embedding vector(1536),
  match_count int default 8,
  match_threshold float default 0.3
) returns table (
  chunk_id uuid,
  document_id uuid,
  chunk_text text,
  chunk_index int,
  metadata jsonb,
  title text,
  number text,
  year int,
  source_type text,
  url_asli text,
  similarity float
) language sql stable as $$
  select
    dc.id,
    dc.document_id,
    dc.chunk_text,
    dc.chunk_index,
    dc.metadata,
    ld.title,
    ld.number,
    ld.year,
    ld.source_type,
    ld.url_asli,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  join legal_documents ld on ld.id = dc.document_id
  where 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;
