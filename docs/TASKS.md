# TaskPricer — Breakdown Task Pekerjaan

> Diturunkan dari [taskpricer-prd-v2.md](taskpricer-prd-v2.md) (sumber utama) dan [taskpricer-prd.md](taskpricer-prd.md). Referensi `§n` = nomor section di PRD v2.

Status: seluruh item MVP sudah dibangun (kecuali yang ditandai terbuka di bawah). Backlog v1.1/v2.0 belum dikerjakan.
Release gate AI: golden set 53 kasus sudah dilabeli 2 reviewer. Gate masih merah — complexity accuracy 44,6% dan flag precision 27,4% (lihat bagian Evaluation).

Deploy: lihat [DEPLOY.md](DEPLOY.md) (Vercel; migrasi database otomatis di deployment production).

Setup lokal: Postgres jalan di Docker (`taskpricer-db`, port 5433). Jalankan `npm run dev`, `npm run test:run`.

---

## MVP — Must Have

### 1. Auth & Workspace (§4 Multi-Tenancy, Integration Points) — SELESAI (magic link ditunda)
- [x] Auth.js v5 dengan Credentials (email+password); Google OAuth aktif otomatis jika `AUTH_GOOGLE_ID/SECRET` diisi
- [x] Auto-create `workspace` + `workspace_members` (OWNER) + pricing profile default saat sign up
- [x] `requireScope()` di `src/lib/workspace.ts` sebagai satu-satunya pintu masuk query ber-scope `workspace_id`
- [ ] Email magic link (butuh Resend/SMTP — digabung dengan Email quotation di v1.1)
- [x] Test otomatis cross-tenant (`src/tenancy.integration.test.ts`, butuh `TEST_DATABASE_URL` ke Postgres yang sudah dimigrasi; di-skip tanpa itu)
- [x] ~~Rate limit analisis AI~~ — **tidak dipakai**: aplikasi BYOK (API key milik user), biaya model tidak ditanggung aplikasi, jadi tidak ada kuota. Kode dan tabel `analysis_runs` sudah dihapus

### 2. Database (§4 Data Model) — SELESAI
- [x] Postgres lokal via Docker + `DATABASE_URL`
- [x] Migrasi awal + `updatedAt` dari `prisma/schema.prisma`
- [x] Pricing profile default (Freelance Standard: Simple 100K / Medium 200K / Complex 300K)

### 3. Dashboard (§2 Main Screens) — SELESAI
- [x] Project list: klien, nilai, status, filter by status
- [x] KPI: revenue bulan ini, project aktif, tingkat diterima, rata-rata nilai
- [x] Chart 6 bulan + pipeline per status + tombol New Estimation

### 4. New Estimation — input requirement (§2) — SELESAI
- [x] Form: nama project, klien, textarea requirement
- [x] Autosave draft tiap 10 detik ke `estimations`

### 5. AI Pipeline (§3) — SELESAI
- [x] Integrasi Vercel AI SDK (OpenAI / OpenAI-compatible / Ollama)
- [x] Zod schema structured output (`tasks[]`, `assumptions[]`, `milestones_suggestion[]`)
- [x] Structured output lewat **tool call terpaksa** — `response_format: json_schema` diabaikan banyak gateway
- [x] Auto-retry 1x; jika tetap gagal → error jelas, **tanpa** membuat harga palsu (terverifikasi)
- [x] Guardrails: auto-flag third-party/migrasi, Very Complex wajib range + ≥1 pertanyaan, confidence low → CLARIFICATION_REQUIRED
- [x] UI progress 5 tahap
- [x] UI Settings (`/settings`): provider, Base URL, model, temperature, instruksi global, **API key (BYOK)** + Tes koneksi, serta identitas perusahaan untuk PDF. **Konfigurasi AI hanya dari DB — tidak ada fallback ke env** (`OPENAI_*` tidak dibaca). Key dienkripsi AES-256-GCM (kunci turunan `AUTH_SECRET`), write-only di UI; Base URL dibatasi ke tujuan publik: validasi saat simpan + guard saat koneksi (cek alamat hasil DNS saat connect = anti DNS rebinding, IP literal, redirect ditolak; `src/lib/ai/guarded-fetch.ts`). Localhost/jaringan privat hanya untuk self-host lewat `AI_ALLOW_PRIVATE_ENDPOINTS=true`. Tanpa konfigurasi lengkap analisis tidak dimulai dan user diarahkan ke Settings
- [x] Halaman Pricing (`/pricing`): ubah harga per kompleksitas sebagai versi rule baru
- [x] Progress per tahap yang nyata (`src/lib/ai/stages.ts`, `job.ts`): extract → breakdown → kompleksitas → dependensi (4 panggilan AI, masing-masing satu tool call terstruktur) → estimasi (mesin harga + guardrail, tanpa AI). Keluaran tiap tahap disimpan di `analysis_jobs`; tahap yang gagal diulang sendirian ("Ulangi tahap ini"), analisis yang terhenti bisa dilanjutkan setelah reload. Tiap tahap wajib menjawab SEMUA task (jawaban parsial = tahap gagal). Lease bertoken (fencing) mencegah pekerja basi menimpa hasil; job yang sudah digantikan job lebih baru tidak bisa dilanjutkan/menimpa.
- [x] Latensi per tahap terukur (1 kasus, 5 task, `glm/glm-5.3`): extract 17,4s · breakdown 21,9s · **complexity 17,6s** · **dependencies 43,5s** · total 100,4s. Tahap dependensi (flag + usulan milestone) sendirian memakan 43% waktu — kandidat utama kalau analisis perlu dipercepat untuk user
- [ ] Kualitas pipeline bertahap vs satu panggilan belum dibandingkan langsung (butuh varian satu-panggilan untuk diukur dengan golden set yang sama)

> **Catatan provider (penting):** `@ai-sdk/openai` default memakai Responses API. Kode memakai
> `.chat()` agar lewat `/v1/chat/completions`. Ada pula `sanitizingFetch` di `src/lib/ai/provider.ts`
> untuk gateway yang membalas non-streaming dengan `text/event-stream` + `data: [DONE]`.
> Diagnosa provider: `npx tsx --env-file=.env scripts/probe-ai.mts --workspace=<id>` (konfigurasi dibaca dari Settings workspace). Catatan: `AUTH_SECRET` wajib stabil — jika diganti, API key tersimpan tidak terbaca dan harus diisi ulang di Settings.

### 6. Pricing Engine — SELESAI
- [x] Terhubung ke `pricing_profiles`/`pricing_rules` per workspace, fallback ke default
- [x] `VERY_COMPLEX` wajib `custom_estimate_min/max`, menolak range terbalik
- [x] Unit test (16 test lulus)
- [x] Snapshot harga ke `quotation_items` saat quotation dibuat (nomor versi dijaga `UNIQUE(estimationId, version)`; migrasi menomori ulang duplikat lama)

### 7. Task Review UI (§2) — SELESAI
- [x] Tabel task: nama, tipe, kompleksitas, flag, confidence, harga + baris expand
- [x] Editable: nama, tipe, kompleksitas, flag, rincian langkah, pertanyaan, range custom
- [x] Harga **selalu** dihitung ulang di server dari complexity — angka dari client diabaikan
- [x] Total live di panel ringkasan; `edited = true` tersimpan (untuk KPI §1)
- [x] Tambah/hapus task, warning "harga masih indikatif", halaman Lihat Requirement
- [x] Auto-flag third-party/migrasi (dikerjakan di guardrail AI, lihat §5)
- [x] Reorder task (tombol naik/turun), field `description` dan `priority` kini ada di editor
- [x] Very Complex tanpa pertanyaan ditolak server saat simpan

### 8. Clarification (§2) — SELESAI
- [x] Halaman `/projects/[id]/clarification`: pertanyaan per task; edit/hapus/tambah (server action ter-scope workspace)
- [x] Tombol "Copy all" (teks siap kirim, dikelompokkan per tugas)
- [x] `VERY_COMPLEX` wajib minimal 1 pertanyaan: peringatan di UI + pertanyaan terakhir tidak bisa dihapus di server (§2 US4)
- [x] Tombol "Lanjut ke Penawaran" aktif (menuju `/projects/[id]/quotation`)

### 9. Quotation (§2) — SELESAI
- [x] 3 mode: Detailed / Summary (per tipe + subtotal) / Client Friendly (tanpa istilah teknis) di `/projects/[id]/quotation`
- [x] Assumptions (kini disimpan di `estimations.assumptions` saat analisis) + scope exclusions (dasar + turunan flag) tampil otomatis
- [x] PDF server-side via `@react-pdf/renderer` (`/projects/[id]/quotation/pdf?mode=`), 40 item ≈ 0,26 detik; memakai branding workspace
- [x] Tombol "Copy Customer Summary" → teks WhatsApp bahasa Indonesia, tanpa istilah teknis
- [x] Snapshot harga (`price`/`priceMax`, `currency`, `profile_id`, `profile_version`) per item; versi quotation bertambah tiap "Buat versi baru"; project → QUOTED
- [ ] Estimation lama (dianalisis sebelum migrasi `quotation_snapshot`) tidak punya asumsi — analisis ulang untuk mengisinya

### 10. Project Lifecycle & History (§2) — SELESAI
- [x] Status flow: Draft → Analyzed → Quoted → Accepted/Rejected → Completed → Archived (`src/lib/project-status.ts`); analisis ulang / versi quotation baru tidak menurunkan status
- [x] Soft delete project & quotation (audit trail, `deletedAt`)
- [x] Halaman History (`/history`): semua project + versi quotation, filter status, opsi tampilkan yang dihapus
- [x] Un-archive: tombol "Pulihkan dari arsip" mengembalikan project ke status sebelum diarsipkan (`projects.archivedFrom`); jika isinya berubah (mis. quotation dihapus) diturunkan ke status yang konsisten, dan project lama tanpa riwayat ditebak dari isinya (`restoreTarget`)

---

## v1.1 — Should Have (backlog setelah MVP, §5)
- [ ] Multiple pricing profiles penuh (switch per project) + UI assumptions/exclusions
- [x] Milestone generator (`/projects/[id]/milestone`): saran AI disimpan saat analisis (task dicocokkan lewat nama, nama asing dibuang), tugas bisa dipindah antar milestone, rename/hapus/geser, subtotal per milestone, fallback "Susun otomatis per tipe" tanpa AI. Milestone belum ikut tampil di quotation/PDF
- [x] Quotation versioning + diff antar versi: pemilih versi (`?v=`), bandingkan dengan versi lain (`?compare=`) menampilkan item ditambah/dihapus/berubah (harga & kompleksitas), selisih total (termasuk range), perubahan asumsi/pengecualian (`src/lib/quotation-diff.ts`). PDF dan Copy Summary mengikuti versi yang dipilih
- [ ] Email quotation (Resend/SMTP), template quotation multiple

## v2.0 — Phase 2–3 (backlog, §5)
- [ ] Change Request workflow (flag `CHANGE_REQUEST`, bandingkan vs original scope)
- [ ] Analytics: avg project value, win rate, estimate accuracy, complexity distribution
- [ ] Team/organization multi-member + RBAC (role member/viewer)
- [ ] Manajemen multi-provider/fallback provider + local LLM onboarding (konfigurasi satu provider per workspace sudah ada di Settings)
- [ ] Multi-format input (PDF/DOCX/XLSX)
- [ ] Billing SaaS (Midtrans/Xendit/Stripe)

## Evaluation & Release Gate (§3, §5 — wajib sebelum rilis)
- [x] Golden set: `evals/golden/v1.json` berisi **53 kasus, semuanya dilabeli 2 reviewer** (kurob, bagas) — syarat §5 terpenuhi, skor eval kini sah sebagai bukti rilis. Pelabelan dibantu `npm run label -- --reviewer="Nama"` (lihat `evals/README.md`)
- [ ] **Gate masih merah.** Eval penuh pertama (53 kasus, `glm/glm-5.3`, 19m50s):

  | Metrik | Hasil | Ambang | |
  |---|---|---|---|
  | schema validity | 100% | 98% | ✅ |
  | extraction recall | 96,6% | 95% | ✅ |
  | complexity accuracy | 44,6% | 85% | ❌ |
  | flag precision | 27,4% | 90% | ❌ |
  | hallucinations | 7 | 0 | ❌ |

  Tindak lanjut:
  1. **Complexity accuracy** — murni kualitas model, bukan prompt (angka stabil lintas run). Dengan model ini lebih dari separuh harga yang keluar salah. **Langkah berikutnya: uji model kelas berat** dari daftar provider (mis. `cmc/deepseek/deepseek-v4-pro`, `alitp-intl/qwen3.7-max`), baru nilai apakah prompt perlu disentuh
  2. **Flag precision** — bug `\bapi\b` sudah diperbaiki (regex lama menandai "Rapikan"), efeknya belum diukur. Sisanya keputusan produk: pemicu seperti "pembayaran" menandai task yang hanya menyebut kata itu (mis. "Kirim email konfirmasi setelah pembayaran"). Mempersempitnya menukar presisi flag dengan risiko underprice (§2 US4) — **belum diputuskan**
  3. **7 halusinasi** — belum didiagnosis. Heuristiknya konservatif (task tanpa kecocokan label dan tanpa kata bersama requirement), jadi bisa saja task sah seperti "Setup struktur proyek". Run berikutnya menyimpan `evals/last-run.json`, jadi bisa diperiksa tanpa memanggil model lagi
- [x] Script eval offline (`npm run eval`, metrik di `src/lib/eval/metrics.ts`): complexity accuracy ≥ 85%, extraction recall ≥ 95%, flag precision ≥ 90%, hallucination = 0, schema validity ≥ 98%. **Sudah dijalankan terhadap model sungguhan** (lihat temuan di bawah). Tambahan: `--limit=N` untuk uji murah (hasil ditandai parsial, tidak bisa jadi baseline), `--show` untuk melihat keluaran model saat melabeli, dan `labelProblems()` menolak label cacat sebelum model dipanggil
- [x] Regression check: bandingkan dengan `evals/baseline.json`, gagal jika turun > 5 poin (`--update-baseline` untuk menyimpan). Baseline belum ada sampai eval pertama dijalankan
- [x] Runner menolak "layak rilis" jika golden set < 50 kasus atau ada kasus dengan < 2 reviewer
