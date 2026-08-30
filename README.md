# Riset Hukum AI

Web app chat AI (mirip ChatGPT/Claude.ai) untuk riset Peraturan Perundang-undangan,
Undang-Undang, dan Putusan Pengadilan Indonesia. Setiap jawaban di-ground lewat RAG
(Retrieval-Augmented Generation) terhadap dokumen hukum asli yang tersimpan di
database — bukan dari pengetahuan bawaan model — dan menyertakan sitasi sumber.
Jika dokumen relevan tidak ditemukan, AI akan mengatakannya secara jujur alih-alih
mengarang jawaban.

MVP ini untuk 1 pengguna internal (tanpa login), tapi skema database sudah siap
untuk multi-user di kemudian hari.

## Tech stack

- Next.js (App Router) + TypeScript, Tailwind CSS
- Vercel AI SDK untuk chat streaming
- Model chat & embedding lewat [OpenRouter](https://openrouter.ai) (model-agnostic — mudah ganti provider di `src/lib/ai/chatModel.ts` / `src/lib/ai/embeddings.ts`)
- Supabase (Postgres + ekstensi `pgvector`) untuk chat history dan vector search dokumen hukum

## Setup lokal

### 1. Prasyarat

- Node.js 20+ (skrip di sini memakai `process.loadEnvFile`, butuh Node 20.6+)
- Sebuah project [Supabase](https://supabase.com) (gratis untuk MVP)
- API key [OpenRouter](https://openrouter.ai/keys)

### 2. Install dependencies

```bash
npm install
```

### 3. Siapkan environment variables

Salin `.env.example` ke `.env.local` lalu isi:

```bash
cp .env.example .env.local
```

- `OPENROUTER_API_KEY`, `AI_CHAT_MODEL`, `AI_TITLE_MODEL` — model chat & auto-title percakapan.
- `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL` — default sudah lewat OpenRouter (`openai/text-embedding-3-small`, 1536 dimensi). **Jika ganti model embedding, dimensi kolom `vector` di migrasi SQL harus disesuaikan sebelum ada data** — ganti dimensi setelah ada data berarti re-embed seluruh korpus.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — dari dashboard Supabase: **Project Settings → API**. `SUPABASE_SERVICE_ROLE_KEY` hanya dipakai di server (API routes, script ingestion) — jangan pernah expose ke client.
- `DEFAULT_USER_ID` — UUID user tetap untuk MVP single-user; harus sama dengan baris yang di-seed migrasi `0001_init.sql`.
- `INGEST_CRON_SECRET` — secret untuk melindungi endpoint trigger ingestion terjadwal (dipakai saat Fase 6/cron diaktifkan).

### 4. Jalankan migrasi database

Buka **Supabase Dashboard → SQL Editor → New query**, jalankan isi file berikut
berurutan (masing-masing sekali saja):

1. `supabase/migrations/0001_init.sql` — tabel `users`, `conversations`, `messages`.
2. `supabase/migrations/0002_documents.sql` — tabel `legal_documents`, `document_chunks`,
   `sources`, `ingestion_jobs`, dan fungsi `match_document_chunks` (vector search).

### 5. Jalankan dev server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) — otomatis redirect ke `/chat`.

## Menjalankan ingestion (mengisi database dokumen hukum)

Alur RAG butuh dokumen di tabel `legal_documents`/`document_chunks` sebelum bisa
menjawab dengan sitasi. Untuk validasi awal, sudah disediakan beberapa dokumen
contoh di `sample-docs/` (lihat `sample-docs/README.md` — **ini teks contoh untuk
uji pipeline, verifikasi ke sumber resmi sebelum dipakai produksi**).

```bash
npx tsx scripts/ingest.ts --source manual-local
```

Skrip ini idempoten — menjalankannya lagi tanpa perubahan file akan melewati
(skip) dokumen yang checksum-nya sama, dan membuat versi baru jika isinya berubah.

Untuk menambah dokumen contoh sendiri: tambahkan pasangan `{nama}.txt` (isi
pasal/putusan) + `{nama}.json` (metadata — lihat bentuk `LegalDocumentMetadata`
di `src/lib/ingestion/types.ts`) ke folder `sample-docs/`, lalu jalankan ulang
skrip di atas.

**Scraping otomatis dari sumber resmi** (JDIH Nasional, peraturan.go.id, Direktori
Putusan MA, dst.) belum diimplementasikan di MVP ini — arsitekturnya sudah
disiapkan modular per sumber (`src/lib/ingestion/registry.ts` +
`src/lib/ingestion/sources/`), tinggal menambah adapter baru yang mengikuti
interface `LegalSourceAdapter` tanpa mengubah pipeline (`runJob.ts`) atau skema.

## Deploy ke Vercel

1. Push repo ke GitHub/GitLab, import ke [Vercel](https://vercel.com/new).
2. Set semua environment variable dari `.env.local` di **Project Settings → Environment Variables** pada Vercel (jangan commit `.env.local`).
3. Deploy. Vercel otomatis mendeteksi Next.js App Router.
4. Jalankan migrasi SQL (langkah 4 di atas) terhadap project Supabase yang dipakai untuk produksi, jika belum.
5. Ingestion dokumen (`scripts/ingest.ts`) dijalankan manual dari mesin lokal/CI — belum ada scheduling otomatis (lihat catatan Fase 6 di atas).

## Struktur folder penting

```
src/
  app/
    chat/                 # halaman chat (baru & lanjutan percakapan)
    api/
      chat/                route.ts        # jalur chat streaming + RAG
      conversations/       CRUD percakapan
      search/               pencarian riwayat (judul + isi pesan)
  components/
    chat/                  # bubble pesan, input, sitasi, dsb.
    sidebar/                # riwayat percakapan
    layout/                 # shell, tema, disclaimer
  lib/
    ai/                     # provider model chat, embedding, prompt, judul
    rag/                    # retrieval & ekstraksi sitasi
    chunking/               # pemecah teks (pasal/ayat vs generic)
    ingestion/               # adapter sumber dokumen + pipeline ingest
    db/queries/               # query Supabase
supabase/migrations/         # skema SQL, jalankan lewat SQL Editor
sample-docs/                 # dokumen contoh untuk validasi pipeline
scripts/ingest.ts            # CLI ingestion
```

## Catatan akurasi

Aplikasi ini adalah **alat bantu riset**, bukan pengganti nasihat hukum resmi —
disclaimer ini selalu ditampilkan di UI dan disertakan di setiap jawaban AI.
Sistem sengaja dirancang agar AI **menolak menjawab** dengan kepastian ketika
tidak menemukan dokumen relevan di database, alih-alih menebak nomor pasal atau
putusan dari pengetahuan umum model.
