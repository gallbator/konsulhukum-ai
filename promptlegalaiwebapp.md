# Prompt untuk Claude Code — Web App AI Chat Riset Hukum Indonesia

Salin seluruh isi di bawah ini dan tempelkan ke Claude Code sebagai instruksi awal proyek.

---

## Konteks & Tujuan

Bangun sebuah web app berbasis AI chat yang digunakan oleh praktisi hukum (lawyer) di Indonesia untuk mencari dan bertanya seputar Peraturan Perundang-undangan, Undang-Undang, Putusan Pengadilan, dan berbagai persoalan hukum lainnya. Cara kerjanya mirip ChatGPT/Claude.ai: pengguna mengetik pertanyaan hukum dalam bahasa natural, AI menjawab dengan referensi yang akurat (pasal, nomor UU/PP/Perpres, nomor putusan, dll), dan setiap jawaban harus menyertakan sitasi sumber yang jelas.

Saat ini web app akan dipakai oleh 1 orang saja (internal use), tapi desain database dan arsitektur harus tetap rapi supaya mudah dikembangkan ke multi-user di kemudian hari.

## Prinsip Utama: Akurasi di Atas Segalanya

Ini adalah aplikasi untuk domain hukum — kesalahan kutip pasal, nomor UU, atau nomor putusan bisa berakibat fatal secara profesional. Karena itu:

- **Jangan** mengandalkan pengetahuan bawaan model AI saja untuk sitasi hukum (rawan halusinasi nomor pasal/putusan).
- **Wajib** menggunakan pendekatan RAG (Retrieval-Augmented Generation): AI harus mengambil potongan dokumen hukum asli dari database vector sebelum menjawab, lalu menjawab berdasarkan dokumen yang benar-benar ditemukan, sambil mengutip sumbernya (nama peraturan/putusan, nomor, pasal, tautan sumber asli bila ada).
- Jika dokumen relevan tidak ditemukan di database, AI harus jujur mengatakan tidak menemukan sumber yang cukup, bukan mengarang jawaban.
- Sertakan disclaimer bahwa aplikasi ini adalah alat bantu riset, bukan pengganti pertimbangan profesional/nasihat hukum resmi.

## Arsitektur yang Diinginkan

**1. Jalur Chat (real-time, harus terasa cepat/responsif):**
- Web app (frontend + backend) melakukan direct API call ke AI model (misalnya via OpenRouter, atau langsung ke Anthropic/OpenAI API) dengan streaming response — jangan lewat n8n untuk jalur ini, karena n8n menambah latency yang terasa saat chat.
- Sebelum memanggil AI model, lakukan retrieval: query pertanyaan user → cari top-k chunk dokumen hukum paling relevan dari vector database → masukkan sebagai context ke prompt AI model → AI jawab berdasarkan context tersebut + kutip sumbernya.

**2. Jalur Data Pipeline (background, tidak real-time):**
- Gunakan n8n (atau cron job/worker terpisah jika Claude Code menilai itu lebih simpel untuk MVP) untuk proses ingest dokumen hukum secara berkala: scraping/fetch dari sumber resmi → chunking teks → generate embedding → simpan ke vector database.
- Sumber data yang perlu dipertimbangkan (verifikasi ketersediaan API/struktur halaman masing-masing, karena bisa berubah sewaktu-waktu): JDIH Nasional (jdihn.go.id), peraturan.go.id (Peraturan Perundang-undangan), Direktori Putusan Mahkamah Agung (putusan3.mahkamahagung.go.id), JDIH BPK/instansi terkait. Untuk MVP, boleh mulai dengan subset kecil (misal hanya UU dan PP terbaru, atau kategori hukum tertentu sesuai kebutuhan awal user) lalu diperluas bertahap.
- Karena scraping situs pemerintah bisa punya rate limit/struktur HTML yang berubah, buat pipeline ini modular per sumber sehingga mudah di-maintain terpisah.

**3. Model AI:**
- Gunakan koneksi langsung ke API model (rekomendasi: mulai dengan model dari Anthropic Claude atau lewat OpenRouter supaya fleksibel ganti-ganti model), dengan API key disimpan di environment variable, jangan hardcode.
- Desain layer pemanggilan model agar model-agnostic (mudah ganti provider/model tanpa merombak banyak kode) — ini penting karena harga & kemampuan model legal-reasoning bisa berubah.

## Tech Stack

- **Framework:** Next.js (App Router) + TypeScript
- **UI Chat:** Vercel AI SDK untuk streaming response, styling dengan Tailwind CSS
- **Database:** PostgreSQL (untuk chat history, sessions, metadata dokumen) dengan ekstensi pgvector untuk penyimpanan embedding dokumen hukum (bisa pakai Vercel Postgres, Supabase, atau Neon — pilih yang paling mudah diintegrasikan dengan Vercel)
- **Hosting:** Vercel untuk frontend + backend (API routes/serverless functions)
- **Data pipeline:** n8n (self-hosted atau n8n cloud) untuk scraping & ingestion terjadwal

## Fitur Utama (MVP)

1. **Antarmuka chat** — mirip ChatGPT/Claude: input pesan di bawah, bubble chat kiri (AI)/kanan (user), markdown rendering untuk jawaban (termasuk format sitasi/pasal yang rapi), loading/typing indicator saat AI sedang menjawab (streaming).
2. **Riwayat chat (chat history)** — sidebar kiri berisi daftar percakapan sebelumnya, bisa diklik untuk melanjutkan, bisa rename/hapus percakapan, judul percakapan otomatis digenerate dari isi chat pertama.
3. **Sitasi sumber** — setiap jawaban AI yang mengutip peraturan/putusan menampilkan referensi yang jelas (nama peraturan, nomor, pasal, tanggal, dan idealnya tautan ke dokumen sumber/PDF asli bila tersedia).
4. **Pencarian dalam riwayat chat** — fitur cari cepat di semua percakapan lama.
5. **New chat** — tombol untuk memulai percakapan baru.
6. **Desain bersih & profesional** — tampilan nyaman dipakai lama (long session), mendukung dark mode & light mode, tipografi yang enak dibaca untuk teks hukum yang panjang.
7. **(Opsional MVP+)** Panel untuk melihat/mengunggah dokumen tambahan yang ingin ditanyakan (misal user upload draft kontrak untuk direview terhadap regulasi).

## Struktur Database (contoh, silakan sesuaikan)

- `conversations` (id, title, created_at, updated_at, user_id — siapkan kolom user_id walau belum ada sistem auth, default ke satu user tetap)
- `messages` (id, conversation_id, role [user/assistant], content, citations [jsonb], created_at)
- `legal_documents` (id, source_type [uu/pp/perpres/putusan/dll], title, number, year, url_asli, raw_text, metadata jsonb)
- `document_chunks` (id, document_id, chunk_text, embedding vector, chunk_index)

## Non-Fungsional

- Tanpa login/auth dulu untuk MVP (single user), tapi struktur data tetap siap untuk multi-user nanti.
- Bahasa antarmuka & jawaban AI: Bahasa Indonesia (istilah hukum tetap dalam bahasa aslinya).
- Respons chat harus streaming (tidak menunggu jawaban lengkap baru muncul).
- Environment variables untuk semua API key/secret (AI model API key, database connection string, n8n webhook URL bila dipakai) — sediakan file `.env.example`.
- Sertakan README yang menjelaskan cara setup lokal, cara menjalankan pipeline ingestion, dan cara deploy ke Vercel.

## Urutan Pengerjaan yang Disarankan

1. Setup project Next.js + Tailwind + koneksi database Postgres/pgvector.
2. Bangun antarmuka chat dasar (tanpa AI dulu) + chat history di sidebar, simpan ke database.
3. Integrasikan direct API call ke AI model dengan streaming, tanpa RAG dulu (jawaban umum).
4. Bangun skema `legal_documents` & `document_chunks`, buat script/pipeline ingestion sederhana (bisa manual dulu, misal ingest dari beberapa file PDF/teks contoh) untuk validasi alur RAG end-to-end.
5. Hubungkan retrieval ke jalur chat: query → cari chunk relevan → inject ke prompt → AI jawab dengan sitasi.
6. Setelah alur inti berjalan, baru bangun otomasi n8n untuk scraping berkala dari sumber resmi.
7. Polish UI/UX (dark mode, search history, rename/delete conversation, disclaimer hukum).

## Yang Perlu Ditanyakan Balik ke Saya Jika Belum Jelas

Sebelum mulai coding, silakan konfirmasi ke saya dulu jika ada hal berikut yang belum jelas:
- Sumber dokumen hukum spesifik mana yang jadi prioritas awal (semua bidang hukum, atau fokus ke bidang tertentu dulu seperti perdata/pidana/korporasi)?
- Model AI mana yang akan dipakai (dan apakah saya sudah punya API key-nya)?
- Preferensi provider database (Supabase/Neon/Vercel Postgres)?
- Apakah butuh fitur upload dokumen user (kontrak, dsb) di fase MVP awal atau nanti saja?
