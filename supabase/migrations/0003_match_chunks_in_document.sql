-- Same ranking as match_document_chunks, scoped to one document. Used right
-- after the lookupRegulation tool (chat route) ingests a document a chat turn
-- asked for by name — returns only the handful of pasal actually relevant to
-- the question instead of feeding the model the entire law (a law can run to
-- hundreds of pasal, which would blow past useful context size for nothing).
create or replace function match_document_chunks_in_document(
  target_document_id uuid,
  query_embedding vector(1536),
  match_count int default 8
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
  where dc.document_id = target_document_id
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;
