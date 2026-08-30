# Dokumen contoh

Pasangan `{nama}.txt` (isi pasal) + `{nama}.json` (metadata) di folder ini
dipakai **hanya untuk memvalidasi alur ingestion → embedding → RAG** (Fase 3),
bukan hasil scraping otomatis dan bukan korpus produksi.

Isi teks diketik ulang dari ingatan atas pasal-pasal yang cukup dikenal luas
(UU Ketenagakerjaan). **Verifikasi ke sumber resmi** (mis. peraturan.go.id atau
JDIH Kementerian Ketenagakerjaan) sebelum mengandalkan teks ini untuk jawaban
produksi — jangan mengganti langkah verifikasi ini dengan asumsi bahwa data di
sini sudah akurat.

Format metadata JSON mengikuti `LegalDocumentMetadata`
(`src/lib/ingestion/types.ts`): `sourceType`, `title`, `number`, `year`,
`tanggalPenetapan` (opsional), `urlAsli` (opsional).
